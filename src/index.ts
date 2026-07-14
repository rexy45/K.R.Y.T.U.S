import { showBanner } from "./ui/banner";
import { startCLI } from "./core/app";

showBanner();

startCLI().catch((err) => {
  console.error("Fatal Error:", err);
  process.exit(1);
});
