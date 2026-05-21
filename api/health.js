// /health and /api/health — thin entry that shares the bundled Hono app in index.js.
// Do not duplicate server logic here. See docs/VERCEL_DEPLOY.md.
module.exports = require("./index.js");
