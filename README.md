# VOIDRUNNER

Pixel-art space roguelike with solo play and **online co-op for up to four players in one shared arena**. Each pilot controls a separate colored ship. No Sites account or dependency.

## Portable HTML client

Download `downloads/voidrunner.html` (or use **Download HTML** in the game header). It is one self-contained file: no installation, dependencies, or asset downloads. Open it in a modern desktop browser.

- **Solo:** works offline.
- **Join online:** uses the configured Render service by default; enter a different service in Server connection if desired.
- **Host direct co-op:** choose Player browser and Create Room. The simulation runs inside this HTML file; Render only introduces the peers. Share the code with friends.
- Online still needs internet, signaling and possibly TURN. This file does not start a Node/HTTP/WebSocket listening server. For a laptop server use `npm start` and a tunnel as documented below.
- Keep the host tab visible. Desktop Chromium and Firefox are the intended targets; file-opening behavior varies on mobile.

Rebuild after changing game code with `npm run build:client`. The generated HTML is tracked so it can be downloaded from any static host. CI checks that it is current, loads it from a real `file://` URL, and exercises peer connections.

## Connection modes

**Player browser (default):** one player's browser runs the authoritative simulation. Other browsers exchange controls and snapshots directly with that host via WebRTC data channels. Render handles room discovery and SDP/ICE signaling only; gameplay does not travel through Render. Everyone must choose the same mode. Keep the host tab visible and the laptop awake. If the host leaves, the match ends; host migration is not implemented in direct mode.

**Dedicated server (fallback):** the Node server runs the same simulation. Choose this when direct peer connections fail, or use a nearby server. The lobby shows measured round-trip latency to the match host, not just the signaling service.

WebRTC still needs signaling and ICE discovery. The default public STUN server helps discover direct routes; some corporate/mobile networks need TURN. No TURN service is bundled. Configure `window.VOIDRUNNER_ICE_SERVERS` with your own ICE servers if needed; never commit long-lived TURN secrets to a public repository. Without TURN, use dedicated-server mode when direct connections fail.

## Responsiveness and combat

- Local movement runs immediately at 60 Hz, then reconciles authoritative positions by replaying unacknowledged input frames. Inputs carry sequence numbers and run epochs; duplicates and stale-run inputs are ignored.
- The shared simulation runs at 60 Hz and emits snapshots at 30 Hz. A 75 ms interpolation buffer smooths remote movement and ignores out-of-order snapshots.
- Local muzzle feedback plays immediately. Damage remains authoritative, not guessed on each client.
- Swept relative-motion collision checks prevent fast projectiles skipping through targets between ticks.
- Every hit broadcasts the shooter's color, target, and damage. All players see impact flashes and damage numbers, including nonlethal and splash hits.
- Prediction cannot remove latency from confirmed damage. This version has no historical server rewind / lag compensation, so a host near the squad still helps.

## Host the server on your own laptop

```sh
npm ci
npm start
ngrok http 3000
```

In the GitHub Pages lobby choose **Dedicated server**, open Server connection, and enter the HTTPS forwarding URL shown by ngrok. Friends use that same URL and room code. No router port-forwarding is needed for an ngrok HTTP tunnel. Your laptop must stay awake with both processes running. A tunnel adds a routing hop and is not automatically faster than a nearby cloud server. Keep the service at Render as an alternative; do not replace it until you compare the lobby ping while playing.

ngrok WebSocket documentation: https://ngrok.com/docs/using-ngrok-with/websockets
WebRTC connectivity: https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Connectivity

## Play

- **Solo:** open `index.html` locally or on GitHub Pages, then Launch Run.
- **Online:** open the deployed game, select **Online Co-op**, create a room, and share the six-character code. Friends join using the same server. The host launches with 1–4 pilots.
- Arrow keys move; hold Space to fire; 1/2/3 choose an upgrade.
- Each pilot picks their own upgrade. The next sector starts after everyone chooses.
- Stay within 55 game pixels of a downed pilot for 3 seconds to revive them. Downed pilots also return when a sector clears.
- Boss every fifth sector. Enemy health and wave size scale with squad size. All pilots down means run over.
- Online play never pauses. Leaving, switching tabs, or losing focus clears movement input. In dedicated-server mode, if the host leaves, another pilot becomes lobby host. In direct mode, host departure ends the room.
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

- The match authority (browser host or server) owns the simulation. Guests send only controls and choices. A browser host is trusted and can modify its own simulation; this is casual co-op, not anti-cheat infrastructure.
- Guests predict movement and reconcile against the match authority. Remote entities use buffered snapshot interpolation.
- Maximum four pilots per room. New joins are lobby-only. Disconnected pilots leave immediately, and an empty room is deleted. Reconnecting into an active run is not implemented.
- Rooms live in memory on **one server instance**. Server restarts/deploys lose active runs. Do not horizontally scale this version.
- Room codes are invite codes, not accounts or authentication. Use for casual co-op. Input message limits, payload limits, connection limits, room limits, and heartbeat cleanup are included.
- Free hosting can sleep when idle. Initial connection may be slow. Runs are not persisted.
- Solo gameplay remains in `game.js`; online rendering/lobby in `online.js`; shared authoritative gameplay in `shared/engine.js` and peer transport in `peer.js`; HTTP/WebSocket transport in `server/index.js`.

## Tests

```sh
npm test
```

The suite connects four real WebSocket clients, rejects a fifth, checks host-only launching and handoff, movement and shots, cleanup, revives, upgrades, defeat/restart, boss scaling, stale inputs, and static-file exposure. GitHub Actions runs it on pushes and pull requests. Manual browser playtesting with four people is still recommended.
