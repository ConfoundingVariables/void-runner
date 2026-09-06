// GitHub Pages uses the public multiplayer server; local play uses its local server.
window.VOIDRUNNER_SERVER = location.hostname.endsWith('github.io') || location.protocol === 'file:'
  ? 'https://void-runner.onrender.com'
  : '';
