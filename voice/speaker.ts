import { spawn } from "child_process";
import path from "path";

export async function speak(text: string): Promise<void> {
    return new Promise((resolve) => {

        const script = path.join(__dirname, "speak.py");

        const py = spawn("python", [script, text]);

        py.on("close", () => resolve());

    });
}
