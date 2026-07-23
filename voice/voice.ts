import { spawn } from "child_process";
import path from "path";

export async function listenToVoice(): Promise<string> {
  return new Promise((resolve, reject) => {
    const script = path.join(__dirname, "listen.py");

    const python = spawn("python", [script]);

    let output = "";

    python.stdout.on("data", (data) => {
      output += data.toString();
    });

    python.stderr.on("data", (data) => {
      console.error(data.toString());
    });

    python.on("close", () => {
      const lines = output.split("\n");

      const heard = lines.find((l) => l.startsWith("You said:"));

      if (!heard) {
        resolve("");
        return;
      }

      resolve(
        heard.replace("You said:", "").trim()
      );
    });

    python.on("error", reject);
  });
}
