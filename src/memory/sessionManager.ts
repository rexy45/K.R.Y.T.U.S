import fs from "fs";

const SESSION_PATH = "./src/memory/session.json";
const MAX_MESSAGES = 20;

export interface SessionMessage {
  role: "user" | "assistant";
  content: string;
}

export class SessionManager {

  constructor() {
    if (!fs.existsSync(SESSION_PATH)) {
      fs.writeFileSync(SESSION_PATH, "[]", "utf8");
    }
  }

  getHistory(): SessionMessage[] {
    try {
      return JSON.parse(
        fs.readFileSync(SESSION_PATH, "utf8")
      );
    } catch {
      return [];
    }
  }

  private saveHistory(history: SessionMessage[]) {
    fs.writeFileSync(
      SESSION_PATH,
      JSON.stringify(history, null, 2),
      "utf8"
    );
  }

  addMessage(role: "user" | "assistant", content: string) {
    const history = this.getHistory();

    history.push({
      role,
      content,
    });

    while (history.length > MAX_MESSAGES) {
      history.shift();
    }

    this.saveHistory(history);
  }

  clearSession() {
    this.saveHistory([]);
  }
}
