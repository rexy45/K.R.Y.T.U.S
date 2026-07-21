export class TokenCutter {

    buildPrompt(
        system: string,
        user: string,
        memories: string[] = []
    ): string {

        const unique = [...new Set(memories)];

        const selected = unique.slice(0, 5);

        const memoryBlock =
            selected.length > 0
                ? `Relevant Memory:\n${selected.join("\n")}\n\n`
                : "";

        return `${system}

${memoryBlock}User:
${user}`;
    }
}
