export function handleExit(command: string): boolean {
  if (command.trim().toLowerCase() !== "exit") {
    return false;
  }

  console.log("\nK.R.Y.T.U.S shutting down...");

  process.exit(0);

  return true;
}
