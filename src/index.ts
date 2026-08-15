#!/usr/bin/env node
import { showBanner } from "./ui/banner";
import { startCLI } from "./core/app";
import { SessionManager } from "./memory/sessionManager";
import { ConfigManager } from "./config/configManager";
import { cleanupVoiceTemp } from "./voice/piper";
import "dotenv/config";

async function main() {
  await ConfigManager.init();
  cleanupVoiceTemp();
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
