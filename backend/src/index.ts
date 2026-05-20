// Vibecode proxy only for local/Vibecode dev — not loaded on Vercel (see api/index.ts → vercel.ts).
if (process.env.VIBECODE_PROJECT_ID) {
  await import("@vibecodeapp/proxy");
}

import { app } from "./app";

const port = Number(process.env.PORT) || 3000;

export default {
  port,
  fetch: app.fetch,
};

export { app };
