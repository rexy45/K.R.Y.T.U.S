import fs from "fs";

const CORE_PATH = "./src/memory/core.json";
const LONGTERM_PATH = "./src/memory/longterm.json";
const SESSION_PATH = "./src/memory/session.json";


export class MemoryManager {

  loadCore() {
    return JSON.parse(
      fs.readFileSync(CORE_PATH, "utf-8")
    );
  }


  loadLongTerm() {
    if (!fs.existsSync(LONGTERM_PATH)) {
      fs.writeFileSync(LONGTERM_PATH, "[]");
    }

    return JSON.parse(
      fs.readFileSync(LONGTERM_PATH, "utf-8")
    );
  }


  saveMemory(memory: string, importance: number = 5) {

    const memories = this.loadLongTerm();

    memories.push({
      date: new Date().toISOString(),
      memory,
      importance
    });


    fs.writeFileSync(
      LONGTERM_PATH,
      JSON.stringify(memories, null, 2)
    );
  }


  searchMemory(keyword: string) {

    const memories = this.loadLongTerm();

    return memories.filter((item: any) =>
      item.memory
        .toLowerCase()
        .includes(keyword.toLowerCase())
    );
  }


  loadSession() {

    return JSON.parse(
      fs.readFileSync(SESSION_PATH, "utf-8")
    );

  }
}
