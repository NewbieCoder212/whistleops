import { handle } from "hono/vercel";
import { app } from "../backend/src/index";

export default handle(app);
