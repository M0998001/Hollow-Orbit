# Hollow Orbit

A browser-based, isometric space-station restoration game, built in small, playable milestones.

## Milestone 0.1 — Salvage and power

The first playable slice includes:
- An isometric view of a damaged space-station deck
- Three salvageable debris piles, each worth **2 scrap**
- A reactor repair that costs **6 scrap**
- Touch and mouse interaction
- Browser-local save progress and a Restart button

**Play locally:** open `index.html` in your browser, or serve these files with any static web server. No libraries, installs, or build tools are required.

### How to play
1. Tap or click the three glowing debris piles to collect 6 scrap.
2. Tap or click the red central reactor to restore emergency power.
3. Use **Restart** to play again.

## Publish on GitHub Pages

1. Open [Settings → Pages](https://github.com/M0998001/Hollow-Orbit/settings/pages).
2. Under **Build and deployment**, select **Deploy from a branch**.
3. Set branch to **main** and folder to **/(root)**, then click **Save**.
4. After GitHub confirms the deployment, play at **https://m0998001.github.io/Hollow-Orbit/**.

The URL above is the intended Pages address; it may not work until Pages is enabled and the first deployment finishes.

## Next milestones

| Version | Focus |
| --- | --- |
| 0.2 | Engineer movement and mobile-friendly controls |
| 0.3 | Repairable rooms and station upgrades |
| 0.4 | Maintenance drone automation |
| 0.5 | First interactive asteroid expedition |
| 0.6 | Tower defense prototype |
| 0.7 | Alien egg hatching and companion abilities |

## Project structure

- `index.html` — page layout and game UI
- `style.css` — responsive styles
- `game.js` — simulation, drawing, interactions, and saving

Game progress is saved in the browser's local storage, not in GitHub or across devices. The game is designed for browsers first, with iOS-friendly design decisions throughout.
