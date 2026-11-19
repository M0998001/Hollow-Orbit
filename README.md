# Hollow Orbit

A browser-based, isometric space-station restoration game, built in small, playable milestones.

## Current milestone: 0.2.1 — Visible engineer and station operations UI

The playable prototype includes:
- High-contrast, larger engineer with a persistent **YOU** identifier
- A mobile camera that follows the engineer while keeping the game canvas interactive
- A station operations dashboard with mission steps, progress bar, resource inventory, power state, and selected-target inspector
- Context-sensitive action button for moving, salvaging, reactor repair, and terminal inspection
- On-canvas keyboard arrow movement (desktop)
- Tap-to-move engineer controls on desktop, iPhone, and iPad
- Obstacle-aware shortest-path movement and animated walking
- Walk-to-interact behavior for debris, reactor, and terminal
- An isometric view of a damaged space-station deck
- Three salvageable debris piles, each worth **2 scrap**
- A reactor repair that costs **6 scrap**
- Touch and mouse interaction
- Browser-local save progress, including the engineer's position, and a Restart button
- Compatibility with milestone 0.1 saves

**Play locally:** open `index.html` in your browser, or serve these files with any static web server. No libraries, installs, or build tools are required.

### How to play
1. Find the engineer by looking for the bright **▼ YOU** label. On a narrow screen, the camera stays centered on your engineer. The **Locate engineer** button also highlights them.
2. Tap or click an empty floor tile to direct your engineer there.
3. Tap or click each glowing debris pile. Your engineer walks to it and collects **2 scrap**.
4. Once you have **6 scrap**, tap the red central reactor. Your engineer walks to it and makes the repair.
5. Tap the station terminal to inspect it, or explore the deck.
6. Use **Restart** to reset the game.

## Publish on GitHub Pages

1. Open [Settings → Pages](https://github.com/M0998001/Hollow-Orbit/settings/pages).
2. Under **Build and deployment**, select **Deploy from a branch**.
3. Set branch to **main** and folder to **/(root)**, then click **Save**.
4. After GitHub confirms the deployment, play at **https://m0998001.github.io/Hollow-Orbit/**.

The URL above is the intended Pages address; it may not work until Pages is enabled and the first deployment finishes.

## Next milestones

| Version | Focus |
| --- | --- |
| 0.2 | ✅ Engineer movement and mobile-friendly controls |
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

## Notes for testing

- Test movement by tapping several distant tiles while the engineer is walking; the route should change without teleporting.
- Uncollected debris, the reactor, and the station terminal block movement; the engineer approaches them from an adjacent tile to interact.
- Reload after moving to confirm the engineer reappears at the last completed tile.
- Progress is local to the browser/device and can be reset using **Restart**.

## Visibility and browser troubleshooting

The 0.2.1 interface replaces the older screen-overlay UI. Its scripts and styles use versioned URLs to avoid stale GitHub Pages caches. If the interface still looks like version 0.2, hard-reload the website or open it in a private browser window. The top-left title should show **ALPHA 0.2.1**.

Gameplay checks run during this update covered rendering the player marker, movement, salvage, reactor repair, mission progress, restart, an older save, and small-screen initialization. These are simulated checks; the game should also be reviewed visually on an actual phone and desktop browser.
