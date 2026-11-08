# Human Bingo

A networking game where every player uses their own phone to find a **different person** for each square on their bingo card.

Part of the [Community Games Bank](../../README.md).

## How to play

1. The organizer creates a game and shares the **room code** or **QR code**.
2. Players join and get a card of prompts plus their own **player code**.
3. Find someone who matches a square, ask for **their code**, tap the square and enter it.
4. Complete the full card (or one line, if the organizer chose that) to win.

## Run locally

From the repository root:

```
python3 -m http.server 8000
```

Open <http://localhost:8000/games/human-bingo/>.


## Privacy

Only the player's name, code and score are stored. Games are deleted after 24 hours.