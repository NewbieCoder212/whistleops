import { handle } from "@hono/node-server/vercel";
import { app } from "../backend/src/app";

export default handle(app);
