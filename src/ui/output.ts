export function showThinking() {
  console.log("\nThinking...\n");
}

export function showError(error: unknown) {
  console.error("\nAI Error:", error);
}

export function showReply(author: string, reply: string) {
  console.log(`
${author}:
${reply}
`);
}
