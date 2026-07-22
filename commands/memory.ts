import { MemoryManager } from "../memory/memoryManager";

const memory = new MemoryManager();

export function handleMemoryCommand(command: string): boolean {

    console.log("Memory command received:", command);

    const cmd = command.trim().toLowerCase();

    if (cmd === "/memory") {

        const memories = memory.listMemories();

        console.clear();

        console.log(`
══════════════════════════════════════

        LONG TERM MEMORY

══════════════════════════════════════

Entries : ${memories.length}

Commands

/memory list

/memory clear

══════════════════════════════════════
`);

        return true;
    }

    if (cmd === "/memory list") {

        const memories = memory.listMemories();

        console.clear();

        console.log(`
══════════════════════════════════════

          MEMORY LIST

══════════════════════════════════════
`);

        if (memories.length === 0) {

            console.log("No memories stored.\n");
            return true;
        }

        memories.forEach((item: any, index: number) => {
            console.log(`${index + 1}. ${item.memory}`);
        });

        console.log("");

        return true;
    }

    if (cmd === "/memory clear") {

        memory.clearMemory();

        console.log("\n✓ Long-Term Memory Cleared.\n");

        return true;
    }

    return false;
}
