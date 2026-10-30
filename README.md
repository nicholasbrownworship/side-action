# Side Action

A tiny static site for the golf group: a "what should we play?" picker with rules for each side game, a scorecard (stroke play, Stableford, skins), and a personal yardage chart. No build step, no dependencies.

## Put it on GitHub Pages
1. Create a new repo on GitHub and upload these files to the root (index.html, styles.css, app.js, games.js, README.md).
2. In the repo: Settings → Pages → Build and deployment → Source: "Deploy from a branch", Branch: `main`, folder `/ (root)`.
3. After a minute the site is live at `https://YOUR-USERNAME.github.io/REPO-NAME/`.

## Adding games
Open `games.js` and copy one of the entries. Fields: `name`, `min`/`max` players, `vibe` (chill, competitive, chaos), `time`, `pitch`, and `steps`.

## Notes
Scores and yardages are stored in your browser's localStorage, so they stay on the device you entered them on.
