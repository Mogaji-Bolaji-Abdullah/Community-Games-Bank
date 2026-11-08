# Contributing to Community Games Bank

Thanks for helping people have more fun together! Community managers, event hosts, facilitators, designers, writers and developers are all welcome.

## Ways to contribute

**Suggest a game.** Use the [directory suggestion form](https://community-games-bank.vercel.app/#contribute) or [GitHub game suggestion template](https://github.com/Mogaji-Bolaji-Abdullah/Community-Games-Bank/issues/new?template=game-suggestion.yml). Explain who the game is for, how it works, and what makes it engaging.

**Improve a game.** Suggest better prompts, accessible instructions, fixes, and features by opening an issue or pull request. Before making a large change, discuss the idea in an issue so we can align first.

**Add a playable game.** Contribute a standalone game in a new `games/<slug>/` folder, including instructions for hosts and a clear way to reset.

**Help with accessibility or design.** Review mobile layouts, keyboard usability, readable controls, motion preferences and facilitator workflows.

## Build and submit a new game

1. Fork the repository, then create a branch for your contribution.
2. Create `games/<slug>/index.html` plus `games/<slug>/README.md`. Aim for a game that runs without paid APIs or logins.
3. Make the host flow clear: setup, start, pause, finish, and reset. Hide answers from the audience when relevant.
4. Keep game data and controls simple. Avoid third-party code or assets that you cannot legally redistribute.
5. Add a catalogue entry to `data/games.json`, with `status: "live"` only for playable games. See the existing Charades entry for the required fields.
6. Run `python3 -m http.server 8000`, and test your changes on desktop and mobile. Check links, search, filters, keyboard navigation and game flow.
7. Open a pull request explaining the new game, how it works, and how you tested it. Screenshots or short clips help reviewers.

## Catalogue entry example

```json
{
  "id": "your-game-slug",
  "title": "Your Game",
  "eyebrow": "SHORT TAGLINE",
  "description": "What players do and why it's fun.",
  "category": "Team games",
  "tags": ["Team games", "Energizers"],
  "searchTerms": ["networking", "icebreaker"],
  "details": ["4+ players", "10 min", "No equipment"],
  "status": "live",
  "href": "/games/your-game-slug/",
  "sourceHref": "https://github.com/Mogaji-Bolaji-Abdullah/Community-Games-Bank/tree/main/games/your-game-slug"
}
```

The directory uses this data to generate its filters and game cards automatically. For a new card design, open a separate proposal so the catalogue stays consistent.

## Code of conduct

Be kind, inclusive and respectful. Avoid insulting or discriminatory game prompts. Respect intellectual property, privacy, and credit original creators when appropriate. Avoid collecting participant personal data unless strictly required and clearly explained.

## Reporting problems

Use the [bug report template](https://github.com/Mogaji-Bolaji-Abdullah/Community-Games-Bank/issues/new?template=bug-report.yml). Include your device/browser, what happened, and how to reproduce it.

## Review expectations

Contributions are reviewed by project maintainers before they become part of the live directory. Please do not include credentials, proprietary assets, or unnecessary dependencies in pull requests.
