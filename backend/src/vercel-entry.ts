import type { IncomingMessage, ServerResponse } from "node:http";
import { handle } from "@hono/node-server/vercel";
import { app } from "./app";

const listener = handle(app);

/** Vercel rewrites /api/* → /api?path=…; restore full path for Hono routing. */
function restoreApiPath(incoming: IncomingMessage) {
  const raw = incoming.url ?? "/";
  const q = raw.indexOf("?");
  const pathname = q >= 0 ? raw.slice(0, q) : raw;
  const search = q >= 0 ? raw.slice(q) : "";

  if (pathname !== "/api" && pathname !== "/api/") return;

  const params = new URLSearchParams(search);
  const segments = params.getAll("path").filter(Boolean);
  if (segments.length === 0) return;

  params.delete("path");
  const rest = params.toString();
  incoming.url = `/api/${segments.join("/")}${rest ? `?${rest}` : ""}`;
}

module.exports = (incoming: IncomingMessage, outgoing: ServerResponse) => {
  restoreApiPath(incoming);
  return listener(incoming, outgoing);
};
