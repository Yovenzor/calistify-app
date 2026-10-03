import { httpRouter } from "convex/server";
import { auth } from "./auth";
import { httpAction } from "./_generated/server";
import { handleHealthSync, HEALTH_SYNC_PREFIX } from "./healthSyncRoute";

const http = httpRouter();

auth.addHttpRoutes(http);

http.route({
  pathPrefix: HEALTH_SYNC_PREFIX,
  method: "POST",
  handler: httpAction(handleHealthSync),
});

http.route({
  pathPrefix: HEALTH_SYNC_PREFIX,
  method: "GET",
  handler: httpAction(async () =>
    Response.json({
      ok: true,
      info: "Calistify health sync — POST your health data as JSON to this URL.",
    }),
  ),
});

export default http;
