import { createApp } from "./app.js";
import { closeBrowser } from "./verifier.js";

const port = Number(process.env.PORT ?? 4001);
const host = process.env.HOST ?? "0.0.0.0";
const server = createApp().listen(port, host, () => {
  console.log(`[verify-runner] listening on http://${host}:${port}`);
});

async function shutdown() {
  server.close();
  await closeBrowser();
  process.exit(0);
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
