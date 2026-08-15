import { startVoice, stopVoice, onTranscript } from "./voice";

class VoiceManager {

    private active = false;
    private resolveSession: (() => void) | null = null;

    private callback:
        | ((text: string) => Promise<void>)
        | null = null;

    // Returns a Promise that only resolves when voice mode ends.
    // This blocks the CLI loop so the `? KRYTUS >` prompt doesn't appear.
    start(
        cb: (text: string) => Promise<void>
    ): Promise<void> {

        if (this.active)
            return Promise.resolve();

        this.active = true;
        this.callback = cb;

        console.log("\n🎤 Voice Mode Activated");
        console.log("Say 'exit voice mode' to leave.\n");

        onTranscript(async (text) => {

            if (!this.active)
                return;

            const lower = text.toLowerCase().trim();

            if (
                lower === "exit voice mode" ||
                lower === "voice off" ||
                lower === "stop listening"
            ) {
                console.log("\n👋 Voice Mode Ended\n");
                this.stop();
                return;
            }

            console.log(`\nYou: ${text}\n`);

            if (this.callback)
                await this.callback(text);

        });

        startVoice();

        // Block here until stop() is called
        return new Promise<void>((resolve) => {
            this.resolveSession = resolve;
        });
    }

    stop() {

        if (!this.active)
            return;

        this.active = false;
        this.callback = null;

        stopVoice();

        // Unblock the awaiting start() promise
        if (this.resolveSession) {
            this.resolveSession();
            this.resolveSession = null;
        }
    }

    isActive() {
        return this.active;
    }

}

export const voiceManager = new VoiceManager();

