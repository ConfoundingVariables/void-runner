# VOIDRUNNER

Pixel-art space roguelike with solo play and **online co-op for up to four players in one shared arena**. Each pilot controls a separate colored ship. No Sites account or dependency.

## Play

- **Solo:** open `index.html` locally or on GitHub Pages, then Launch Run.
- **Online:** open the deployed game, select **Online Co-op**, create a room, and share the six-character code. Friends join using the same server. The host launches with 1–4 pilots.
- Arrow keys move; hold Space to fire; 1/2/3 choose an upgrade.
- Each pilot picks their own upgrade. The next sector starts after everyone chooses.
- Stay within 55 game pixels of a downed pilot for 3 seconds to revive them. Downed pilots also return when a sector clears.
- Boss every fifth sector. Enemy health and wave size scale with squad size. All pilots down means run over.
- Online play never pauses. Leaving, switching tabs, or losing focus clears movement input. If the host leaves, another pilot becomes host.
- Touch controls and optional sound are available.

## Run the server locally

Requires Node.js 22 or later.

```sh
npm ci
npm start
```

Open `http://localhost:3000`. The same server serves the game and its WebSocket connection. For a local network test, other devices can use the machine's LAN address and port 3000, subject to your firewall.

## Deploy online with Render

The repository includes `render.yaml` for a single Node web service.

1. In Render, choose **New → Blueprint**, connect this repository, and deploy the included configuration. Review the selected plan before creating the service.
2. Open the resulting HTTPS service URL. It serves the complete game and the multiplayer server together. Create a room and share that URL and room code with friends.

Alternatively, create a Node Web Service with build command `npm ci`, start command `npm start`, and health check `/health`.

Render documentation: https://render.com/docs/deploy-node-express-app and https://render.com/docs/websocket.

### Keep GitHub Pages as the frontend

In repository Settings → Pages, select **Deploy from a branch → main → / (root)**.

Set `window.VOIDRUNNER_SERVER` in `config.js` to your server's HTTPS origin, such as `https://your-service.onrender.com`. Players then do not need to enter a server address. Until configured, the lobby has a Server connection field. You may also supply a `?server=https://your-service.onrender.com` URL parameter.

GitHub Pages alone cannot run the multiplayer server. HTTPS pages require secure WebSockets (`wss://`); the client converts an HTTPS server URL automatically.

## Architecture and limits

- The server owns the simulation at 30 ticks/second and sends snapshots at 20/second. Clients send only controls and choices; they cannot set positions, damage, or health.
- Clients interpolate snapshots for rendering. This version does not include client-side prediction; distant servers add input latency.
- Maximum four pilots per room. New joins are lobby-only. Disconnected pilots leave immediately, and an empty room is deleted. Reconnecting into an active run is not implemented.
- Rooms live in memory on **one server instance**. Server restarts/deploys lose active runs. Do not horizontally scale this version.
- Room codes are invite codes, not accounts or authentication. Use for casual co-op. Input message limits, payload limits, connection limits, room limits, and heartbeat cleanup are included.
- Free hosting can sleep when idle. Initial connection may be slow. Runs are not persisted.
- Solo gameplay remains in `game.js`; online rendering/lobby in `online.js`; authoritative gameplay in `server/engine.js`; HTTP/WebSocket transport in `server/index.js`.

## Tests

```sh
npm test
```

The suite connects four real WebSocket clients, rejects a fifth, checks host-only launching and handoff, movement and shots, cleanup, revives, upgrades, defeat/restart, boss scaling, stale inputs, and static-file exposure. GitHub Actions runs it on pushes and pull requests. Manual browser playtesting with four people is still recommended.
