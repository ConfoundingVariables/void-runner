# VOIDRUNNER

A standalone 2D pixel-art space roguelike. No framework, build step, backend, or Sites account required.

## Play locally

Download or clone this repository and open `index.html` in a browser.

## Controls

- Arrow keys: move
- Hold Space: shoot
- P or Escape: pause/resume
- 1, 2, 3: choose an upgrade
- Enter: start/restart
- On-screen controls support touch devices.

## Gameplay

Survive escalating sectors, choose one of three random upgrades between sectors, and fight a dreadnought every fifth sector. Death resets the run. Includes pixel explosions, screen shake, and optional synthesized sound.

## Publish with GitHub Pages

In repository **Settings → Pages**, select **Deploy from a branch**, choose **main** and **/ (root)**, then **Save**.

After GitHub finishes deploying, the expected game address is https://confoundingvariables.github.io/void-runner/.

## Files

- `index.html`: game interface
- `style.css`: responsive styling
- `game.js`: gameplay, rendering, input, and audio
- `.nojekyll`: serve the static files directly

## Validation

JavaScript syntax and core gameplay logic were checked. Browser playtesting remains.
