import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import path from "path";

let python: ChildProcessWithoutNullStreams | null = null;
let callback: ((text: string) => void) | null = null;

export function onTranscript(cb: (text: string) => void) {
    callback = cb;
}

export function startVoice() {

    if (python) return;

    const script = path.join(__dirname, "listen.py");

    python = spawn("python", [script]);

    python.stdout.on("data", (data) => {

        const lines = data.toString().split(/\r?\n/);

        for (const line of lines) {

            const text = line.trim();

            if (!text) continue;

            if (
                text.startsWith("Microphone") ||
                text.startsWith("Listening")
            ) {
                console.log(text);
                continue;
            }

            if (text.startsWith("You:")) {

                const spoken = text
                    .replace("You:", "")
                    .trim();

                if (callback) {
                    callback(spoken);
                }

            }

        }

    });

    python.stderr.on("data", (data) => {
        console.error("[VOICE]", data.toString());
    });

    python.on("close", () => {
        console.log("[VOICE] Python stopped.");
        python = null;
    });

}

export function stopVoice() {

    if (!python) return;

    python.kill();

    python = null;

}
