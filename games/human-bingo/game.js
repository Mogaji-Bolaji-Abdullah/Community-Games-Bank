// ================================
// HUMAN BINGO - game.js
// ================================

// ----- Page elements we use -----
const templateSelect = document.getElementById("gameTemplate");
const cardSizeSelect = document.getElementById("cardSize");
const winModeSelect = document.getElementById("winMode");
const createGameForm = document.getElementById("createGameForm");
const joinGameForm = document.getElementById("joinGameForm");

const createMessage = document.getElementById("createMessage");
const joinMessage = document.getElementById("joinMessage");

const organizerLobby = document.getElementById("organizerLobby");
const participantGame = document.getElementById("participantGame");
const connectionStatus = document.getElementById("connectionStatus");

const playerList = document.getElementById("playerList");
const playerCount = document.getElementById("playerCount");
const playersEmpty = document.getElementById("playersEmpty");

// ----- Names used to remember things in this browser -----
const ORGANIZER_KEY = "humanBingoOrganizer"; // which game this phone is running
const PLAYER_KEY = "humanBingoPlayer";       // this phone's bingo card
const SOUND_KEY = "humanBingoSound";         // "on" or "off"

// ----- Game data while the page is open -----
let templates = [];
let currentPlayer = null;

// The live connection that tells the organizer when players change
let lobbyChannel = null;

// The game the organizer is running, and the winners already celebrated
let lobbyGame = null;
let lastPlayers = [];
let celebratedWinners = new Set();
let firstPlayerLoad = true;

// The game this phone is PLAYING in, and its live connection
let playerGame = null;
let gameChannel = null;

// Runs once a second to update the countdown timers
let timerInterval = null;

// ================================
// SUPABASE CONNECTION
// ================================

// The connection to our Supabase database (set up in connectToSupabase)
let supabaseClient = null;

// This phone's hidden ID from the anonymous sign-in
let currentUserId = null;

// Show "Connected" or "Offline" in the header
function setConnectionStatus(state, text) {
  connectionStatus.textContent = text;
  connectionStatus.classList.remove("online", "offline");
  connectionStatus.classList.add(state);
}

// Connect to Supabase and give this phone its hidden ID
async function connectToSupabase() {
  try {
    // Create the connection using the details in config.js
    supabaseClient = window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_PUBLISHABLE_KEY
    );

    // Has this phone signed in before? Reuse the same ID if so.
    const { data: sessionData } = await supabaseClient.auth.getSession();
    let user = sessionData.session ? sessionData.session.user : null;

    // If not, quietly sign in anonymously (no email, no password)
    if (!user) {
      const { data, error } = await supabaseClient.auth.signInAnonymously();

      if (error) {
        throw error;
      }

      user = data.user;
    }

    currentUserId = user.id;
    setConnectionStatus("online", "Connected");
    return true;

  } catch (error) {
    console.error("Could not connect to Supabase:", error);
    setConnectionStatus("offline", "Offline");
    return false;
  }
}

// Make sure we are connected before talking to the database
function isConnected() {
  return supabaseClient !== null && currentUserId !== null;
}

// ================================
// SOUND ON / OFF
// ================================

const soundToggle = document.getElementById("soundToggle");

function isSoundOn() {
  try {
    return localStorage.getItem(SOUND_KEY) !== "off";
  } catch (error) {
    return true;
  }
}

function showSoundSetting() {
  const on = isSoundOn();
  soundToggle.textContent = on ? "🔊" : "🔇";
  soundToggle.setAttribute("aria-pressed", String(on));
  soundToggle.setAttribute("aria-label", on ? "Sound is on. Turn sound off" : "Sound is off. Turn sound on");
  soundToggle.title = on ? "Sound on" : "Sound off";
}

soundToggle.addEventListener("click", () => {
  try {
    localStorage.setItem(SOUND_KEY, isSoundOn() ? "off" : "on");
  } catch (error) {
    // If saving fails, the button just won't remember the choice
  }
  showSoundSetting();
});

// ================================
// OFFLINE / BACK ONLINE
// ================================

const offlineBanner = document.getElementById("offlineBanner");

// The phone lost its internet connection
window.addEventListener("offline", () => {
  setConnectionStatus("offline", "Offline");
  offlineBanner.classList.remove("hidden");
});

// The internet is back: reconnect and send anything we missed
window.addEventListener("online", async () => {
  offlineBanner.classList.add("hidden");

  if (!isConnected()) {
    const connected = await connectToSupabase();
    if (connected) {
      await restoreSession();
    }
    return;
  }

  setConnectionStatus("online", "Connected");

  if (currentPlayer) {
    syncProgress();
    refreshPlayerGame();
  }

  if (lobbyGame) {
    loadPlayers(lobbyGame.id);
  }
});

// ================================
// HELPERS
// ================================

// Load the templates from prompts.json
async function loadTemplates() {
  try {
    const response = await fetch("./prompts.json");

    if (!response.ok) {
      throw new Error("Could not load templates.");
    }

    const data = await response.json();
    templates = data.templates;

    templateSelect.innerHTML = `
      <option value="">Choose a template</option>
    `;

    templates.forEach((template) => {
      const option = document.createElement("option");
      option.value = template.id;
      option.textContent = template.name;
      templateSelect.appendChild(option);
    });

  } catch (error) {
    console.error(error);
    templateSelect.innerHTML = `
      <option value="">Templates could not load</option>
    `;
    createMessage.textContent =
      "Could not load prompts. Open the game through a local server, not by double-clicking the file.";
  }
}

// Shuffle a list randomly (Fisher-Yates shuffle)
function shufflePrompts(prompts) {
  const shuffled = [...prompts];

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

// Generate a six-character room code
function generateRoomCode() {
  const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";

  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    code += characters[randomIndex];
  }

  return code;
}

// Pick the prompts for a game: all custom prompts first,
// then fill the rest of the card from the template
function pickPrompts(customPrompts, templatePrompts, cardSize) {
  const uniqueCustom = [...new Set(customPrompts)];
  const chosenCustom = shufflePrompts(uniqueCustom).slice(0, cardSize);

  const templateFill = shufflePrompts(
    templatePrompts.filter((prompt) => !chosenCustom.includes(prompt))
  ).slice(0, cardSize - chosenCustom.length);

  return [...chosenCustom, ...templateFill];
}

// Describe the game settings in plain words
function describeGame(game) {
  const winText = game.win_mode === "line"
    ? "first full line wins"
    : "full card wins";

  return `${game.template_name} · ${game.card_size} squares · ${winText}`;
}

// Read something saved in this browser
function readSaved(key) {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch (error) {
    return null;
  }
}

// Save something in this browser
function writeSaved(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error("Could not save in this browser.", error);
  }
}

// Forget something saved in this browser
function removeSaved(key) {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error("Could not remove saved data.", error);
  }
}

// ================================
// ORGANIZER: CREATE A GAME
// ================================

// "A line" only works on square cards (3x3, 4x4, 5x5)
function updateWinModeOptions() {
  const cardSize = Number(cardSizeSelect.value);
  const lineOption = winModeSelect.querySelector('option[value="line"]');
  const isSquare = [9, 16, 25].includes(cardSize);

  lineOption.disabled = !isSquare;

  if (!isSquare) {
    winModeSelect.value = "full";
  }
}

cardSizeSelect.addEventListener("change", updateWinModeOptions);

createGameForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  createMessage.textContent = "";

  if (!isConnected()) {
    createMessage.textContent =
      "You are offline. Check your internet connection and refresh the page.";
    return;
  }

  const organizerName = document
    .getElementById("organizerName")
    .value.trim();

  const templateId = templateSelect.value;
  const cardSize = Number(cardSizeSelect.value);
  const winMode = winModeSelect.value;

  const customText = document
    .getElementById("customPrompts")
    .value;

  const template = templates.find(
    (item) => item.id === templateId
  );

  if (!organizerName || !template) {
    createMessage.textContent =
      "Please enter your name and choose a template.";
    return;
  }

  // Turn the custom prompts box into a list (one prompt per line)
  const customPrompts = customText
    .split("\n")
    .map((prompt) => prompt.trim())
    .filter((prompt) => prompt.length > 0);

  // Check there are enough different prompts for the card size
  const uniquePrompts = [...new Set([...customPrompts, ...template.prompts])];

  if (uniquePrompts.length < cardSize) {
    const missing = cardSize - uniquePrompts.length;
    createMessage.textContent =
      `A ${cardSize}-square card needs ${cardSize} different prompts. ` +
      `Add ${missing} more of your own.`;
    return;
  }

  const prompts = pickPrompts(customPrompts, template.prompts, cardSize);

  // Disable the button while we save, so it can't be clicked twice
  const submitButton = createGameForm.querySelector("button[type='submit']");
  submitButton.disabled = true;
  createMessage.textContent = "Creating your game...";

  // Save the game in Supabase. If the room code is already taken
  // (very unlikely), try again with a new code.
  let game = null;
  let lastError = null;

  for (let attempt = 0; attempt < 5 && !game; attempt++) {
    const { data, error } = await supabaseClient
      .from("games")
      .insert({
        room_code: generateRoomCode(),
        organizer_name: organizerName,
        template_name: template.name,
        prompts: prompts,
        card_size: cardSize,
        win_mode: winMode
      })
      .select()
      .single();

    if (!error) {
      game = data;
    } else if (error.code !== "23505") {
      // 23505 means "already exists" (room code taken). Anything else: stop.
      lastError = error;
      break;
    }
  }

  submitButton.disabled = false;

  if (!game) {
    console.error("Could not create game:", lastError);
    createMessage.textContent =
      "Sorry, the game could not be created. Please try again.";
    return;
  }

  createMessage.textContent = "";

  // Remember on this phone that we are the organizer of this game
  writeSaved(ORGANIZER_KEY, { gameId: game.id });
  removeSaved(PLAYER_KEY);

  showOrganizerLobby(game);
});

// Show the organizer lobby
function showOrganizerLobby(game) {
  lobbyGame = game;
  organizerLobby.classList.remove("hidden");
  participantGame.classList.add("hidden");

  document.getElementById("organizerWelcome").textContent =
    `Hello ${game.organizer_name}! Your game has been created.`;

  document.getElementById("displayRoomCode").textContent =
    game.room_code;

  document.getElementById("lobbyTemplateName").textContent =
    describeGame(game);

  const promptList = document.getElementById("organizerPromptList");
  promptList.innerHTML = "";

  game.prompts.forEach((prompt) => {
    const item = document.createElement("li");
    item.textContent = prompt;
    promptList.appendChild(item);
  });

  showJoinTools(game.room_code);
  startLobbyUpdates(game.id);
  updateOrganizerControls();
  startTimerTicks();

  organizerLobby.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

// ================================
// ORGANIZER: QR CODE AND JOIN LINK
// ================================

// The web address that opens this page with the room code filled in
function buildJoinLink(roomCode) {
  return `${window.location.origin}${window.location.pathname}?code=${roomCode}`;
}

function showJoinTools(roomCode) {
  const link = buildJoinLink(roomCode);

  const joinLink = document.getElementById("joinLink");
  joinLink.href = link;
  joinLink.textContent = link;

  const qrBox = document.getElementById("qrBox");
  const qrCode = document.getElementById("joinQrCode");

  // If the QR code library did not load (e.g. no internet), hide the box
  if (typeof window.qrcode !== "function") {
    qrBox.classList.add("hidden");
    return;
  }

  // Draw the QR code as an SVG picture
  const qr = window.qrcode(0, "M");
  qr.addData(link);
  qr.make();

  qrCode.innerHTML = qr.createSvgTag({
    cellSize: 4,
    margin: 0,
    scalable: true,
    title: `Scan to join game ${roomCode}`
  });

  qrBox.classList.remove("hidden");
}

// ================================
// ORGANIZER: LIVE PLAYER LIST
// ================================

// Get the latest list of players from Supabase and show it
async function loadPlayers(gameId) {
  const { data: players, error } = await supabaseClient
    .from("players")
    .select("id, name, completed_count, finished_at, joined_at")
    .eq("game_id", gameId)
    .order("joined_at", { ascending: true });

  if (error) {
    console.error("Could not load players:", error);
    return;
  }

  renderPlayers(players);
}

// Put players in leaderboard order:
// 1. winners first, in the order they finished
// 2. then everyone else, most squares completed first
// 3. if still tied, whoever joined first
function sortLeaderboard(players) {
  return [...players].sort((a, b) => {
    if (a.finished_at && b.finished_at) {
      return new Date(a.finished_at) - new Date(b.finished_at);
    }
    if (a.finished_at) return -1;
    if (b.finished_at) return 1;

    if (b.completed_count !== a.completed_count) {
      return b.completed_count - a.completed_count;
    }

    return new Date(a.joined_at) - new Date(b.joined_at);
  });
}

// Show the live leaderboard on the organizer's screen
function renderPlayers(players) {
  lastPlayers = players;
  const total = players.length;
  const cardSize = lobbyGame ? lobbyGame.card_size : 20;

  playerCount.textContent = total === 1 ? "1 joined" : `${total} joined`;
  playersEmpty.classList.toggle("hidden", total > 0);

  // Remember who was already on screen, so only NEW names get the "pop" effect
  const alreadyShown = new Set(
    [...playerList.children].map((item) => item.dataset.playerId)
  );

  playerList.innerHTML = "";

  sortLeaderboard(players).forEach((player, index) => {
    const row = document.createElement("li");
    row.className = "leader-row";
    row.dataset.playerId = player.id;
    row.classList.toggle("is-winner", Boolean(player.finished_at));

    if (!alreadyShown.has(player.id)) {
      row.classList.add("is-new");
    }

    const rank = document.createElement("span");
    rank.className = "leader-rank";
    rank.textContent = player.finished_at ? "🏆" : index + 1;

    const name = document.createElement("span");
    name.className = "leader-name";
    name.textContent = player.name;

    const bar = document.createElement("span");
    bar.className = "leader-bar";

    const fill = document.createElement("span");
    fill.className = "leader-fill";
    fill.style.width = `${(player.completed_count / cardSize) * 100}%`;
    bar.appendChild(fill);

    const score = document.createElement("span");
    score.className = "leader-score";
    score.textContent = `${player.completed_count}/${cardSize}`;

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "remove-player";
    removeButton.textContent = "×";
    removeButton.title = `Remove ${player.name}`;
    removeButton.setAttribute("aria-label", `Remove ${player.name} from the game`);
    removeButton.addEventListener("click", () => removePlayer(player));

    row.appendChild(rank);
    row.appendChild(name);
    row.appendChild(bar);
    row.appendChild(score);
    row.appendChild(removeButton);

    playerList.appendChild(row);
  });

  showWinners(players);
}

// Show the winner banner, and celebrate anyone who has JUST won
function showWinners(players) {
  const winners = sortLeaderboard(players).filter((player) => player.finished_at);
  const banner = document.getElementById("winnerBanner");

  if (winners.length === 0) {
    banner.classList.add("hidden");
  } else {
    const first = winners[0].name;
    const others = winners.slice(1).map((player) => player.name);

    banner.textContent = others.length > 0
      ? `🏆 ${first} won! Also finished: ${others.join(", ")}`
      : `🏆 ${first} got BINGO and wins the game!`;

    banner.classList.remove("hidden");
  }

  // Celebrate new winners, but not ones that were already there
  // when the page opened (e.g. after a refresh)
  const newWinners = winners.filter((player) => !celebratedWinners.has(player.id));
  newWinners.forEach((player) => celebratedWinners.add(player.id));

  if (newWinners.length > 0 && !firstPlayerLoad) {
    celebrate();
  }

  firstPlayerLoad = false;
}

// Listen to Supabase Realtime: whenever a player joins, leaves or
// updates their progress in THIS game, reload the list
function startLobbyUpdates(gameId) {
  // Stop listening to any older game first
  if (lobbyChannel) {
    supabaseClient.removeChannel(lobbyChannel);
  }

  playerList.innerHTML = "";
  celebratedWinners = new Set();
  firstPlayerLoad = true;

  lobbyChannel = supabaseClient
    .channel(`lobby-${gameId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "players",
        filter: `game_id=eq.${gameId}`
      },
      () => loadPlayers(gameId)
    )
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        // Now listening: load everyone who joined before we started
        loadPlayers(gameId);
      }
    });
}

// ================================
// ORGANIZER: GAME CONTROLS
// ================================

const timerMinutesSelect = document.getElementById("timerMinutes");
const startTimerButton = document.getElementById("startTimer");
const endGameButton = document.getElementById("endGame");
const downloadButton = document.getElementById("downloadResults");

// Is a game over? (ended by the organizer, or the timer ran out)
function isGameOver(game) {
  if (!game) {
    return false;
  }

  if (game.status === "ended") {
    return true;
  }

  return Boolean(game.ends_at) && Date.now() >= new Date(game.ends_at).getTime();
}

// Turn milliseconds into "12:05"
function formatTimeLeft(milliseconds) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

// Show the right buttons and text for the game's current state
function updateOrganizerControls() {
  if (!lobbyGame) {
    return;
  }

  const over = isGameOver(lobbyGame);
  const timerDisplay = document.getElementById("organizerTimer");
  const statusText = document.getElementById("gameStatusText");

  startTimerButton.disabled = over;
  timerMinutesSelect.disabled = over;
  endGameButton.disabled = over;

  if (over) {
    timerDisplay.textContent = "Game over";
    statusText.textContent =
      "This game has ended. Cards are locked and nobody new can join.";
  } else if (lobbyGame.ends_at) {
    const left = new Date(lobbyGame.ends_at).getTime() - Date.now();
    timerDisplay.textContent = `⏱ ${formatTimeLeft(left)}`;
    statusText.textContent =
      "The timer is running on every player's phone. Starting a new timer replaces it.";
    startTimerButton.textContent = "Restart timer";
  } else {
    timerDisplay.textContent = "No timer";
    statusText.textContent =
      "Optional: start a timer so everyone sees the same countdown.";
    startTimerButton.textContent = "Start timer";
  }
}

// Save a change to the game (timer or status) and keep the new version
async function updateGame(changes) {
  const { data, error } = await supabaseClient
    .from("games")
    .update(changes)
    .eq("id", lobbyGame.id)
    .select()
    .single();

  if (error) {
    console.error("Could not update the game:", error);
    alert("Sorry, that didn't work. Check your connection and try again.");
    return false;
  }

  lobbyGame = data;
  updateOrganizerControls();
  return true;
}

// Start (or restart) the countdown
startTimerButton.addEventListener("click", async () => {
  const minutes = Number(timerMinutesSelect.value);
  const endsAt = new Date(Date.now() + minutes * 60 * 1000).toISOString();

  startTimerButton.disabled = true;
  await updateGame({ ends_at: endsAt });
  updateOrganizerControls();
});

// End the game now
endGameButton.addEventListener("click", async () => {
  const sure = confirm(
    "End the game now? Cards will be locked and nobody new can join."
  );

  if (sure) {
    await updateGame({ status: "ended" });
  }
});

// Remove a player from the game (e.g. a mistake or a duplicate)
async function removePlayer(player) {
  const sure = confirm(`Remove ${player.name} from this game?`);

  if (!sure) {
    return;
  }

  const { error } = await supabaseClient
    .from("players")
    .delete()
    .eq("id", player.id);

  if (error) {
    console.error("Could not remove player:", error);
    alert("Sorry, the player could not be removed. Please try again.");
    return;
  }

  loadPlayers(lobbyGame.id);
}

// Make one CSV cell safe (commas, quotes and new lines need care)
function csvCell(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

// Download the leaderboard as a spreadsheet file (CSV)
downloadButton.addEventListener("click", () => {
  const rows = [
    ["Rank", "Name", "Squares completed", "Card size", "Won", "Finished at", "Joined at"]
  ];

  sortLeaderboard(lastPlayers).forEach((player, index) => {
    rows.push([
      index + 1,
      player.name,
      player.completed_count,
      lobbyGame.card_size,
      player.finished_at ? "Yes" : "No",
      player.finished_at ? new Date(player.finished_at).toLocaleString() : "",
      player.joined_at ? new Date(player.joined_at).toLocaleString() : ""
    ]);
  });

  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");

  // "\ufeff" helps Excel show special characters (like é) correctly
  const file = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(file);
  link.download = `human-bingo-${lobbyGame.room_code}-results.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
});

// Close this game and go back to the "Create a game" form
document.getElementById("newGame").addEventListener("click", async () => {
  const sure = confirm(
    isGameOver(lobbyGame)
      ? "Start a new game?"
      : "Start a new game? This game will be ended first."
  );

  if (!sure) {
    return;
  }

  if (!isGameOver(lobbyGame)) {
    const ended = await updateGame({ status: "ended" });
    if (!ended) {
      return;
    }
  }

  if (lobbyChannel) {
    supabaseClient.removeChannel(lobbyChannel);
    lobbyChannel = null;
  }

  lobbyGame = null;
  lastPlayers = [];
  removeSaved(ORGANIZER_KEY);
  organizerLobby.classList.add("hidden");
  createGameForm.reset();
  updateWinModeOptions();
  document.getElementById("organizer").scrollIntoView({ behavior: "smooth" });
});

// ================================
// TIMERS (organizer and players)
// ================================

// Every second: update the countdowns, and end the game when time runs out
function startTimerTicks() {
  if (timerInterval) {
    return;
  }

  timerInterval = setInterval(() => {
    if (lobbyGame && !organizerLobby.classList.contains("hidden")) {
      // The organizer's page ends the game when the timer reaches zero
      if (lobbyGame.status === "active" && isGameOver(lobbyGame)) {
        updateGame({ status: "ended" });
      }
      updateOrganizerControls();
    }

    if (playerGame && !participantGame.classList.contains("hidden")) {
      updatePlayerGameState();
    }
  }, 1000);
}

// Copy the room code
const copyButton = document.getElementById("copyRoomCode");

copyButton.addEventListener("click", async () => {
  const roomCode =
    document.getElementById("displayRoomCode").textContent;

  try {
    await navigator.clipboard.writeText(roomCode);
    copyButton.textContent = "Copied!";

    // Change the button text back after 2 seconds
    setTimeout(() => {
      copyButton.textContent = "Copy";
    }, 2000);
  } catch (error) {
    alert(`Your room code is ${roomCode}. Copy it manually.`);
  }
});

// ================================
// PARTICIPANT: JOIN A GAME
// ================================

joinGameForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  joinMessage.textContent = "";

  if (!isConnected()) {
    joinMessage.textContent =
      "You are offline. Check your internet connection and refresh the page.";
    return;
  }

  const participantName = document
    .getElementById("participantName")
    .value.trim();

  const enteredCode = document
    .getElementById("roomCodeInput")
    .value.trim()
    .toUpperCase();

  if (!participantName || !enteredCode) {
    joinMessage.textContent =
      "Please enter your name and room code.";
    return;
  }

  const submitButton = joinGameForm.querySelector("button[type='submit']");
  submitButton.disabled = true;
  joinMessage.textContent = "Joining...";

  try {
    // 1. Find the game with this room code
    const { data: game, error: gameError } = await supabaseClient
      .from("games")
      .select("*")
      .eq("room_code", enteredCode)
      .maybeSingle();

    if (gameError) {
      throw gameError;
    }

    if (!game) {
      joinMessage.textContent = "Game not found. Check the room code.";
      return;
    }

    // Ended by the organizer, or the timer has run out
    if (isGameOver(game)) {
      joinMessage.textContent = "This game has already ended.";
      return;
    }

    // 2. Has this phone already joined this game? Then reuse that player.
    const { data: existingPlayer, error: findError } = await supabaseClient
      .from("players")
      .select("*")
      .eq("game_id", game.id)
      .eq("user_id", currentUserId)
      .maybeSingle();

    if (findError) {
      throw findError;
    }

    let player = existingPlayer;

    // 3. If not, add a new player to the game.
    //    Supabase gives them a random player code automatically.
    for (let attempt = 0; attempt < 3 && !player; attempt++) {
      const { data: newPlayer, error: joinError } = await supabaseClient
        .from("players")
        .insert({
          game_id: game.id,
          name: participantName
        })
        .select()
        .single();

      if (!joinError) {
        player = newPlayer;
      } else if (joinError.code === "23505" && (joinError.message || "").includes("code")) {
        // Very rare: the random player code was already taken. Try again.
        continue;
      } else if (joinError.code === "23505") {
        joinMessage.textContent =
          "Someone in this game already has that name. Try adding your surname's first letter, e.g. Ada O.";
        return;
      } else {
        throw joinError;
      }
    }

    if (!player) {
      throw new Error("Could not create a player code. Please try again.");
    }

    // 4. Build this player's card. Keep their old card if they had one.
    const saved = readSaved(PLAYER_KEY);

    if (saved && saved.playerId === player.id && Array.isArray(saved.squares)) {
      currentPlayer = saved;
    } else {
      currentPlayer = {
        playerId: player.id,
        playerCode: player.player_code,
        gameId: game.id,
        name: player.name,
        cardSize: game.card_size,
        winMode: game.win_mode,
        // Every player gets the same prompts, in their own random order
        squares: shufflePrompts(game.prompts).map((prompt) => ({
          prompt: prompt,
          personName: "",
          personPlayerId: null,
          completed: false
        }))
      };
    }

    joinMessage.textContent = "";
    writeSaved(PLAYER_KEY, currentPlayer);
    removeSaved(ORGANIZER_KEY);
    showParticipantCard();

  } catch (error) {
    console.error("Could not join game:", error);
    joinMessage.textContent =
      "Sorry, something went wrong while joining. Please try again.";
  } finally {
    submitButton.disabled = false;
  }
});

// ================================
// PARTICIPANT: BINGO CARD
// ================================

// The pop-up window used to fill in a square
const squareDialog = document.getElementById("squareDialog");
const squareForm = document.getElementById("squareForm");
const dialogCodeInput = document.getElementById("dialogCode");
const dialogMessage = document.getElementById("dialogMessage");

// Which square is open in the pop-up right now
let openSquareIndex = null;

// How many columns the card has: 3 x 3, 4 x 4, 5 x 5 (20 squares = 4 x 5)
function getColumnCount(totalSquares) {
  if (totalSquares === 9) return 3;
  if (totalSquares === 25) return 5;
  return 4;
}

function showParticipantCard() {
  organizerLobby.classList.add("hidden");
  participantGame.classList.remove("hidden");

  document.getElementById("participantWelcome").textContent =
    `Let's play, ${currentPlayer.name}!`;

  document.getElementById("progressTrack").setAttribute(
    "aria-valuemax",
    currentPlayer.squares.length
  );

  document.getElementById("myCode").textContent =
    currentPlayer.playerCode || "----";

  const winRule = document.getElementById("winRule");
  winRule.textContent = currentPlayer.winMode === "line"
    ? "Complete one full row, column or diagonal to win."
    : "Complete every square to win.";

  drawBoard();
  updateProgress();
  listenToGame(currentPlayer.gameId);

  participantGame.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

// Draw the bingo card as a grid of squares you can tap
function drawBoard() {
  const board = document.getElementById("bingoBoard");
  const winningSquares = getWinningSquares();

  board.innerHTML = "";
  board.style.setProperty("--cols", getColumnCount(currentPlayer.squares.length));

  currentPlayer.squares.forEach((squareData, index) => {
    const square = document.createElement("button");
    square.type = "button";
    square.className = "bingo-square";
    square.classList.toggle("completed", squareData.completed);
    square.classList.toggle("winning", winningSquares.has(index));

    const number = document.createElement("span");
    number.className = "square-number";
    number.textContent = String(index + 1).padStart(2, "0");

    const promptText = document.createElement("span");
    promptText.className = "square-prompt";
    promptText.textContent = squareData.prompt;

    const person = document.createElement("span");
    person.className = "square-person";
    person.textContent = squareData.completed
      ? `✓ ${squareData.personName}`
      : "Tap to add";

    square.setAttribute(
      "aria-label",
      squareData.completed
        ? `${squareData.prompt}. Completed with ${squareData.personName}.`
        : `${squareData.prompt}. Not completed yet.`
    );

    square.appendChild(number);
    square.appendChild(promptText);
    square.appendChild(person);

    square.addEventListener("click", () => openSquare(index));

    board.appendChild(square);
  });
}

// Open the pop-up for one square
function openSquare(index) {
  if (isGameOver(playerGame)) {
    updatePlayerGameState();
    return;
  }

  const squareData = currentPlayer.squares[index];
  openSquareIndex = index;

  document.getElementById("dialogSquareNumber").textContent =
    `SQUARE ${String(index + 1).padStart(2, "0")}`;
  document.getElementById("dialogPrompt").textContent = squareData.prompt;

  dialogCodeInput.value = "";
  dialogMessage.textContent = "";

  // Show who is already in this square (if anyone)
  const current = document.getElementById("dialogCurrent");
  current.textContent = squareData.completed
    ? `Currently: ${squareData.personName}. Enter a new code to change it.`
    : "";

  // Only show "Clear square" if there is something to clear
  document.getElementById("dialogClear").classList.toggle(
    "hidden",
    !squareData.completed
  );

  squareDialog.showModal();
  dialogCodeInput.focus();
}

function closeSquare() {
  squareDialog.close();
  openSquareIndex = null;
}

// Ask Supabase: "who in my game has this player code?"
// Returns { id, name } or null if nobody has it.
async function findPlayerByCode(code) {
  const { data, error } = await supabaseClient.rpc("find_player_by_code", {
    p_game_id: currentPlayer.gameId,
    p_code: code
  });

  if (error) {
    throw error;
  }

  return data && data.length > 0 ? data[0] : null;
}

// "Mark complete" in the pop-up
squareForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const squareData = currentPlayer.squares[openSquareIndex];
  const code = dialogCodeInput.value.trim().toUpperCase();

  if (code.length !== 4) {
    dialogMessage.textContent =
      "Player codes have 4 characters. Ask the person for the code on their screen.";
    return;
  }

  // Rule: you cannot use your own code
  if (code === currentPlayer.playerCode) {
    dialogMessage.textContent = "That's your own code. Find someone else!";
    return;
  }

  if (!isConnected() || !navigator.onLine) {
    dialogMessage.textContent =
      "You are offline. Connect to the internet and try again.";
    return;
  }

  const submitButton = squareForm.querySelector("button[type='submit']");
  submitButton.disabled = true;
  dialogMessage.textContent = "Checking code...";

  let foundPlayer = null;

  try {
    foundPlayer = await findPlayerByCode(code);
  } catch (error) {
    console.error("Could not check code:", error);
    dialogMessage.textContent = navigator.onLine
      ? "Could not check the code. Please try again."
      : "You are offline. Connect to the internet and try again.";
    submitButton.disabled = false;
    return;
  }

  submitButton.disabled = false;

  if (!foundPlayer) {
    // Maybe the code is wrong, or maybe this player was removed
    const stillIn = await checkStillInGame();

    if (!stillIn) {
      closeSquare();
      return;
    }

    dialogMessage.textContent =
      `Nobody in this game has the code ${code}. Check it and try again.`;
    return;
  }

  // Rule: a different person for every square
  const duplicate = currentPlayer.squares.some((other) => {
    return other !== squareData &&
      other.completed &&
      other.personPlayerId === foundPlayer.id;
  });

  if (duplicate) {
    dialogMessage.textContent =
      `You already found ${foundPlayer.name} on another square. Find a different person!`;
    return;
  }

  const hadWon = hasWon();

  squareData.personName = foundPlayer.name;
  squareData.personPlayerId = foundPlayer.id;
  squareData.completed = true;

  closeSquare();
  saveSquareChange();

  // Did this square make the player win just now?
  if (!hadWon && hasWon()) {
    celebrate();
  }
});

// "Clear square" in the pop-up
document.getElementById("dialogClear").addEventListener("click", () => {
  const squareData = currentPlayer.squares[openSquareIndex];

  squareData.personName = "";
  squareData.personPlayerId = null;
  squareData.completed = false;

  closeSquare();
  saveSquareChange();
});

// The × button in the pop-up
document.getElementById("dialogClose").addEventListener("click", closeSquare);

// Tapping the dark area outside the pop-up also closes it
squareDialog.addEventListener("click", (event) => {
  if (event.target === squareDialog) {
    closeSquare();
  }
});

// After any change: redraw, update progress, save, and tell Supabase
function saveSquareChange() {
  drawBoard();
  updateProgress();
  writeSaved(PLAYER_KEY, currentPlayer);
  syncProgress();
}

// ================================
// PARTICIPANT: GAME STATUS AND TIMER
// ================================

// Is this player still in the game? (The organizer may have removed them.)
async function checkStillInGame() {
  if (!currentPlayer) {
    return false;
  }

  const { data: me, error } = await supabaseClient
    .from("players")
    .select("id")
    .eq("id", currentPlayer.playerId)
    .maybeSingle();

  if (!error && !me) {
    handleRemovedPlayer();
    return false;
  }

  return true;
}

// Get the latest version of the game this player is in
async function refreshPlayerGame() {
  if (!currentPlayer) {
    return;
  }

  const stillIn = await checkStillInGame();

  if (!stillIn) {
    return;
  }

  const { data: game } = await supabaseClient
    .from("games")
    .select("*")
    .eq("id", currentPlayer.gameId)
    .maybeSingle();

  if (game) {
    playerGame = game;
    updatePlayerGameState();
  }
}

// Listen for the organizer starting a timer or ending the game
function listenToGame(gameId) {
  if (gameChannel) {
    supabaseClient.removeChannel(gameChannel);
  }

  gameChannel = supabaseClient
    .channel(`game-${gameId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "games",
        filter: `id=eq.${gameId}`
      },
      () => refreshPlayerGame()
    )
    .subscribe();

  refreshPlayerGame();
  startTimerTicks();
}

// Show the countdown, and lock the card when the game is over
function updatePlayerGameState() {
  const timer = document.getElementById("playerTimer");
  const gameOverMessage = document.getElementById("gameOverMessage");
  const over = isGameOver(playerGame);

  if (playerGame && playerGame.ends_at && !over) {
    const left = new Date(playerGame.ends_at).getTime() - Date.now();
    timer.textContent = `⏱ ${formatTimeLeft(left)} left`;
    timer.classList.toggle("is-ending", left < 60 * 1000);
    timer.classList.remove("hidden");
  } else {
    timer.classList.add("hidden");
  }

  const wasLocked = participantGame.classList.contains("is-locked");
  participantGame.classList.toggle("is-locked", over);

  if (over) {
    gameOverMessage.textContent = playerGame.status === "ended"
      ? "🏁 The organizer has ended the game. Your card is locked."
      : "⏰ Time's up! Your card is locked.";
    gameOverMessage.classList.remove("hidden");

    if (!wasLocked && squareDialog.open) {
      closeSquare();
    }
  } else {
    gameOverMessage.classList.add("hidden");
  }
}

// The player leaves the game themselves
document.getElementById("leaveGame").addEventListener("click", async () => {
  const over = isGameOver(playerGame);

  const sure = confirm(
    over
      ? "Leave this game? Your card will be cleared from this phone."
      : "Leave this game? You will be removed from the leaderboard."
  );

  if (!sure) {
    return;
  }

  // While the game is running, remove the player so their name is freed.
  // After it ends, keep them on the leaderboard for the organizer's results.
  if (!over && isConnected()) {
    const { error } = await supabaseClient
      .from("players")
      .delete()
      .eq("id", currentPlayer.playerId);

    if (error) {
      console.error("Could not leave the game:", error);
      alert("Sorry, that didn't work. Check your connection and try again.");
      return;
    }
  }

  leaveCard("You left the game. You can join another one any time.");
});

// Clear the card from this phone and go back to the "Join" form
function leaveCard(message) {
  removeSaved(PLAYER_KEY);
  currentPlayer = null;
  playerGame = null;

  if (gameChannel) {
    supabaseClient.removeChannel(gameChannel);
    gameChannel = null;
  }

  participantGame.classList.add("hidden");
  participantGame.classList.remove("is-locked");
  joinMessage.textContent = message;
  document.getElementById("join").scrollIntoView({ behavior: "smooth" });
}

// What happens if the organizer removes this player
function handleRemovedPlayer() {
  leaveCard("You were removed from that game by the organizer.");
}

// Count completed squares
function countCompleted() {
  return currentPlayer.squares.filter(
    (squareData) => squareData.completed
  ).length;
}

// Find the squares that make up a win.
// Full card: all squares (once every one is done).
// Line mode: every square in any finished row, column or diagonal.
function getWinningSquares() {
  const squares = currentPlayer.squares;
  const winning = new Set();

  if (currentPlayer.winMode !== "line") {
    if (countCompleted() === squares.length) {
      squares.forEach((square, index) => winning.add(index));
    }
    return winning;
  }

  const size = Math.sqrt(squares.length);
  const lines = [];

  for (let i = 0; i < size; i++) {
    const row = [];
    const col = [];

    for (let j = 0; j < size; j++) {
      row.push(i * size + j);
      col.push(j * size + i);
    }

    lines.push(row, col);
  }

  const diagonal = [];
  const otherDiagonal = [];

  for (let i = 0; i < size; i++) {
    diagonal.push(i * size + i);
    otherDiagonal.push(i * size + (size - 1 - i));
  }

  lines.push(diagonal, otherDiagonal);

  lines.forEach((line) => {
    const lineDone = line.every((index) => squares[index].completed);

    if (lineDone) {
      line.forEach((index) => winning.add(index));
    }
  });

  return winning;
}

// Has the player won?
function hasWon() {
  return getWinningSquares().size > 0;
}

// Update the progress bar and completion message
function updateProgress() {
  const completed = countCompleted();
  const total = currentPlayer.squares.length;
  const percentage = (completed / total) * 100;

  document.getElementById("progressText").textContent =
    `${completed} / ${total} completed`;

  document.getElementById("progressFill").style.width =
    `${percentage}%`;

  document.getElementById("progressTrack").setAttribute(
    "aria-valuenow",
    completed
  );

  const completionMessage =
    document.getElementById("completionMessage");

  completionMessage.textContent = currentPlayer.winMode === "line"
    ? "🎉 BINGO! You completed a full line!"
    : "🎉 Congratulations! You have completed your Human Bingo card!";

  completionMessage.classList.toggle("hidden", !hasWon());
}

// Send this player's progress to Supabase so the organizer can see it.
// Only the NUMBER of completed squares is sent, never the names.
async function syncProgress() {
  if (!isConnected() || !currentPlayer) {
    return;
  }

  // Remember WHEN the player first won, so the winner order stays fair
  if (hasWon()) {
    if (!currentPlayer.finishedAt) {
      currentPlayer.finishedAt = new Date().toISOString();
    }
  } else {
    currentPlayer.finishedAt = null;
  }

  writeSaved(PLAYER_KEY, currentPlayer);

  const { data: updatedRows, error } = await supabaseClient
    .from("players")
    .update({
      completed_count: countCompleted(),
      finished_at: currentPlayer.finishedAt
    })
    .eq("id", currentPlayer.playerId)
    .select("id");

  // Nothing was updated: the organizer has removed this player
  if (!error && updatedRows && updatedRows.length === 0) {
    handleRemovedPlayer();
    return;
  }

  if (error) {
    console.error("Could not sync progress:", error);
    setConnectionStatus("offline", "Offline");
  } else {
    setConnectionStatus("online", "Connected");
  }
}

// ================================
// CELEBRATION: CONFETTI AND SOUND
// ================================

function celebrate() {
  launchConfetti();
  playWinSound();
}

// Throw colourful paper pieces down the screen (skipped if the
// person has asked their phone for less motion)
function launchConfetti() {
  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  if (reduceMotion) {
    return;
  }

  const colors = ["#3ed6b3", "#f9d968", "#ff987b", "#b4a4ff", "#168c75"];
  const layer = document.createElement("div");
  layer.className = "confetti-layer";
  layer.setAttribute("aria-hidden", "true");

  for (let i = 0; i < 120; i++) {
    const piece = document.createElement("span");
    piece.className = "confetti-piece";
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = colors[i % colors.length];
    piece.style.animationDelay = `${Math.random() * 0.6}s`;
    piece.style.animationDuration = `${2.4 + Math.random() * 1.6}s`;
    piece.style.setProperty("--spin", `${360 + Math.random() * 720}deg`);
    piece.style.setProperty("--drift", `${Math.random() * 120 - 60}px`);
    layer.appendChild(piece);
  }

  document.body.appendChild(layer);

  // Clean up once the pieces have fallen
  setTimeout(() => layer.remove(), 4500);
}

// Play a short happy "ta-da" made of four notes (no sound file needed)
let audioContext = null;

function playWinSound() {
  if (!isSoundOn()) {
    return;
  }

  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) {
      return;
    }

    if (!audioContext) {
      audioContext = new AudioContextClass();
    }

    audioContext.resume();

    const notes = [523.25, 659.25, 783.99, 1046.5]; // C, E, G, high C
    const start = audioContext.currentTime;

    notes.forEach((frequency, index) => {
      const oscillator = audioContext.createOscillator();
      const volume = audioContext.createGain();
      const noteStart = start + index * 0.12;

      oscillator.type = "triangle";
      oscillator.frequency.value = frequency;

      volume.gain.setValueAtTime(0.0001, noteStart);
      volume.gain.exponentialRampToValueAtTime(0.25, noteStart + 0.02);
      volume.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.45);

      oscillator.connect(volume);
      volume.connect(audioContext.destination);

      oscillator.start(noteStart);
      oscillator.stop(noteStart + 0.5);
    });
  } catch (error) {
    // Sound is a bonus: if the phone blocks it, the game carries on
    console.warn("Could not play sound:", error);
  }
}

// ================================
// START
// ================================

// If this phone was already in a game, bring it back after a refresh
async function restoreSession() {
  // Was this phone running a game as the organizer?
  const savedOrganizer = readSaved(ORGANIZER_KEY);

  if (savedOrganizer && savedOrganizer.gameId) {
    const { data: game } = await supabaseClient
      .from("games")
      .select("*")
      .eq("id", savedOrganizer.gameId)
      .eq("organizer_id", currentUserId)
      .maybeSingle();

    if (game) {
      showOrganizerLobby(game);
      return;
    }

    removeSaved(ORGANIZER_KEY);
  }

  // Was this phone playing in a game?
  const savedPlayer = readSaved(PLAYER_KEY);

  if (savedPlayer && savedPlayer.playerId && Array.isArray(savedPlayer.squares)) {
    const { data: player } = await supabaseClient
      .from("players")
      .select("id, player_code")
      .eq("id", savedPlayer.playerId)
      .maybeSingle();

    if (player) {
      currentPlayer = savedPlayer;
      currentPlayer.playerCode = player.player_code;
      showParticipantCard();
      return;
    }

    removeSaved(PLAYER_KEY);
  }
}

// If the page was opened from a QR code or join link (?code=ABC123),
// fill in the room code for the player
function prefillRoomCode() {
  const code = new URLSearchParams(window.location.search).get("code");

  if (!code) {
    return;
  }

  document.getElementById("roomCodeInput").value = code.toUpperCase();
  document.getElementById("join").scrollIntoView({ block: "start" });
  document.getElementById("participantName").focus();
}

async function startGame() {
  showSoundSetting();
  updateWinModeOptions();

  if (!navigator.onLine) {
    offlineBanner.classList.remove("hidden");
  }

  loadTemplates();
  prefillRoomCode();

  const connected = await connectToSupabase();

  if (connected) {
    await restoreSession();
  }
}

startGame();