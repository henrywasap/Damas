import type { Config } from "@netlify/functions";
import { handleApiRequest } from "../../server/apiHandler.js";

export default (req: Request) => handleApiRequest(req);

export const config: Config = {
  path: "/api/*",
};
