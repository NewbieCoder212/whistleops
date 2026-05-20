import { handle } from "@hono/node-server/vercel";
import { app } from "./app";

module.exports = handle(app);
