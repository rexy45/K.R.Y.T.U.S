import { showBanner } from "./ui/banner";
import { startCLI } from "./core/app";
import { SessionManager } from "./memory/sessionManager";

async function main() {
  const session = new SessionManager();

  // Start every launch with a fresh session
  session.clearSession();

  await showBanner();

  await startCLI();
}

main().catch((err) => {
  console.error("Fatal Error:", err);
  process.exit(1);
});
