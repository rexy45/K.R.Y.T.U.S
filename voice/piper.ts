import { spawn } from "child_process";
import fs from "fs";

const PIPER =
    "D:\\AI\\Piper\\piper.exe";

const MODEL =
    "D:\\AI\\Piper\\voices\\en_US-ryan-high.onnx";

const OUTPUT =
    "D:\\AI\\Piper\\voice.wav";

export async function speak(text: string): Promise<void> {

    return new Promise((resolve, reject) => {

        if (fs.existsSync(OUTPUT))
            fs.unlinkSync(OUTPUT);

        const piper = spawn(
            PIPER,
            [
                "--model",
                MODEL,
                "--output_file",
                OUTPUT
            ]
        );

        piper.stdin.write(text);
        piper.stdin.end();

        piper.stderr.on("data", (d) =>
            console.log("[PIPER]", d.toString())
        );

        piper.on("close", () => {

            const player = spawn(
                "powershell",
                [
                    "-c",
                    `(New-Object Media.SoundPlayer '${OUTPUT}').PlaySync();`
                ]
            );

            player.on("close", () => resolve());

        });

        piper.on("error", reject);

    });

}
