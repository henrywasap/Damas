import { handleApiRequest } from "../server/apiHandler.js";

// vercel.json rewrites /api/<path> to /api?__path=<path> so a single function serves every route.
function resolvePath(req: Request): string {
  const url = new URL(req.url);
  const rewritten = url.searchParams.get("__path");
  if (rewritten !== null) {
    return `/api/${rewritten}`.replace(/\/+$/, "") || "/api";
  }
  return url.pathname;
}

export default {
  fetch(req: Request) {
    return handleApiRequest(req, resolvePath(req));
  },
};
