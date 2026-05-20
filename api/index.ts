import { handle } from "hono/vercel";
import { app } from "../backend/src/app";

export default handle(app);
