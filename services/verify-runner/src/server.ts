import { createApp } from "./app.js";
import { closeBrowser } from "./verifier.js";

const port = Number(process.env.PORT ?? 4001);
const server = createApp().listen(port, "127.0.0.1", () => {
  console.log(`[verify-runner] listening on http://localhost:${port}`);
});

async function shutdown() {
  server.close();
  await closeBrowser();
  process.exit(0);
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
