# Community Games Bank ✳

**Good people. Good games. Great memories.**

Community Games Bank is a free, open-source collection of ready-to-host games for community managers, facilitators, organizers, and event hosts. The goal is to help people connect through simple, joyful group experiences.

### Live directory

**https://community-games-bank.vercel.app**

## Playable games

| Game | Great for | Play |
| --- | --- | --- |
| **Charades Club** | Meetups, energizers, team socials | [Play Charades](https://community-games-bank.vercel.app/games/iih-charades/) |

The Charades game includes themed rounds, multiple teams, a timer, a leaderboard, team qualification, a projector mode, and optional sounds. It runs entirely in the browser.

## Suggest a game

You don't need to code! Use [the suggestion form on the website](https://community-games-bank.vercel.app/#contribute), or [open an issue on GitHub](https://github.com/Mogaji-Bolaji-Abdullah/Community-Games-Bank/issues/new?template=game-suggestion.yml) to share an idea. Contributions can include activity instructions, question packs, improvements to existing games, or completely new game implementations.

## Contribute to the project

See [CONTRIBUTING.md](CONTRIBUTING.md) to learn how to suggest, design, build, or improve games. Bug reports can be filed with the [GitHub bug report template](https://github.com/Mogaji-Bolaji-Abdullah/Community-Games-Bank/issues/new?template=bug-report.yml).

## Run locally

This is a lightweight static site. You don't need a framework or a build process.

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000. Use a local HTTP server, rather than double-clicking `index.html`, because the game directory reads `data/games.json`.

## Website animations

The homepage uses lightweight CSS animations and progressive JavaScript enhancements: staggered hero entrance, scroll-reveal sections, a looping occasion ribbon, rotating sample game visuals, and subtle animated card illustrations. The sample scores in the hero are **not real game scores**. Visitors can pause or manually select each preview using the controls underneath it. The site automatically respects the operating system's **Reduce Motion** preference, and the catalogue remains usable if animation or JavaScript is unavailable.

## Project structure

```text
.
├── index.html                    # Directory landing page
├── assets/
│   ├── styles.css                # Shared directory styling
│   └── app.js                    # Search, filters and suggestion flow
├── data/games.json               # Add new games here
├── games/
│   └── iih-charades/
│       ├── index.html            # Charades Club game
│       └── README.md
├── .github/ISSUE_TEMPLATE/       # Community contribution templates
├── CONTRIBUTING.md
└── README.md
```

## Add a new game to the directory

1. Create a folder at `games/<your-game-slug>/` with an `index.html` and a small `README.md`.
2. Add an entry to [`data/games.json`](data/games.json) using the same structure as the Charades entry, with `status: "live"` only when the game is actually playable.
3. Set `href` to `/games/<your-game-slug>/` and `sourceHref` to the GitHub folder URL. Give it searchable `tags`, `searchTerms`, and helpful `details`.
4. Test the game and directory on desktop and mobile, then open a pull request.

By keeping each game in its own folder, contributors can extend the library without changing or breaking other games.

## Principles

- **Easy to start**: visitors can open games without creating an account.
- **Accessible by default**: semantic HTML, readable contrast, keyboard controls, and responsive layouts.
- **Honest availability**: only playable games appear in the active directory; wishlist items are explicitly labeled.
- **Made together**: ideas and code contributions are welcomed through GitHub.
- **No tracking by default**: the website does not collect visitor data or store submitted ideas in a proprietary database.

Built for the people who bring people together. 💚