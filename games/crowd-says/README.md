# Crowd Says! — Community Survey Showdown (Playtest)

**Status: Standalone playtest. Not listed in the Community Games Bank catalogue yet.**

A free, two-team, host-controlled guessing game designed for community events, workplace socials, campus hangouts, workshops and retreats. Inspired by the familiar *survey answer board* genre, but created with its own identity, visual design and original questions.

## Start a match

1. Visit the standalone playtest website, or serve this directory with any static web server (e.g. `python -m http.server 8080` and open `http://localhost:8080`). Do **not** open `index.html` directly using a `file://` link; its question bank is loaded through `fetch()`.
2. Enter names for two competing teams. Choose at least one pack: **Nigeria, Africa, Global**. Pick 3, 5, 7, 10 or 12 questions and a 30–90 second turn timer.
3. Open **Audience display** in another browser tab or window on the **same device/browser profile**, move that window to the projector, and leave the host view on your laptop. The host view contains **all secret answers**; don't project it.
4. Select **Project player rules** if you want a big-screen rules briefing, then hide it to begin.
5. Start with one representative from each team facing off. The host reads the question and taps any accepted opening guesses. Pick the higher-ranked team; they choose to **play** or **pass** control.
6. On the active team's turn, click a matching answer row to reveal it and add its illustrative points to the pot. Use **Add strike** for wrong answers.
7. At **three strikes**, the other team gets **one** guess. If it matches an unrevealed answer, tap it and choose **Successful steal** to award the whole round pot to the other team; otherwise select **Steal missed** and award the original team the pot. If the active team finds every answer first, it banks the pot immediately.
8. Select **Drumroll · reveal result** to display the full question board and score to the audience, then proceed to the next question.
9. The highest-scoring team wins after the last question. In a tie, the host can run an extra question. The winning team can optionally attempt **Bonus Dash**, a separate, five-question, two-player 200-point challenge.

## Scoring rules

- **Round 1–2:** one times the point values.
- **Round 3–4:** double points.
- **Round 5 onward, including any tiebreaker:** triple points.
- **Three misses:** unlocks one steal attempt. An unsuccessful steal leaves the current pot with the original team.
- **Skip round:** any currently revealed answers in that round earn no score; proceed to the next question.
- **End/Cancel game:** scores already banked remain available for export, but no winner is declared.
- **Bonus Dash:** two players from the winning team answer five prompts each, with 20 and 25 seconds respectively; the second player cannot repeat a matching answer. Bonus points are **not** added to the regular match leaderboard.

## Rules and fair play

- Teams normally have 3–6 players, but team size is up to the event host. Only two teams compete *per match*; host multiple matches to run a larger event tournament.
- **No mobile searches**, outside help or audience hints. Spectators can cheer but not supply answers.
- Every player should have an opportunity to answer. The host decides acceptable synonyms and handles disputes.
- A question's rankings and scores are **editorially curated examples** for fun; they are **not based on a real survey of 100 people** and should never be described as survey findings.
- All 36 prompts across the three packs are original and intended for mixed-age community settings.

## Host features

- Responsive host console and separate big-screen viewer (`?view=audience`). The audience viewer hides unrevealed answers and withholds the score from a completed round until the host launches the result reveal.
- Projectable player rules, audio cues, synthesized drumroll, timer, manual scores, undo, round skip, cancel, restart, saved progress, CSV export, optional Bonus Dash and final-score board.
- No logins or backend. Game state syncs between **windows of the same browser profile on the same device** through `localStorage` events. It does **not** sync over multiple devices or enable remote player buzz-ins.
- If the host's browser data is cleared, its local game data is lost; export the results if needed.

## Project structure

```text
games/crowd-says/
  index.html        Host and audience page
  styles.css        Responsive design and projector board
  game.js           Play controls, scores, stages, audio and persistence
  questions.json    36 curated prompts (12 Nigeria, 12 Africa, 12 Global)
  README.md         Rules, host guide and limitations
```

## Contributing questions and features

Add prompts to `questions.json`, giving each prompt a unique `id`, one `category` (`Nigeria`, `Africa` or `Global`) and five unique `answers` with nonnegative `points`. For consistency, try to make each set of question scores sum to 100. Keep prompts respectful, accessible and appropriate for community events. The project is maintained in the [Community Games Bank repository](https://github.com/Mogaji-Bolaji-Abdullah/Community-Games-Bank).

**Trademark note:** This is not an official Family Feud game, and it is not affiliated with its television producers or trademark owners.