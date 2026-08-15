import { spawn } from "child_process";
import fs from "fs";

const PIPER =
    "D:\\krytus\\AI\\piper\\piper.exe";

const MODEL =
    "D:\\krytus\\AI\\piper\\en_US-ryan-high.onnx";

const OUTPUT =
    "D:\\krytus\\AI\\temp\\voice.wav";

// Directory Piper writes one .wav file into per input line, when we run
// it in "batch" mode (one process, many lines of stdin). This is what
// lets us load the model ONCE instead of once-per-chunk.
const OUTPUT_DIR =
    "D:\\krytus\\AI\\temp\\voice_chunks";

// Optional diagnostics file. All Piper/player stdout+stderr chatter and
// internal status messages go here instead of the KRYTUS CLI, so the
// user-facing terminal stays clean while still leaving a trail to
// inspect if something needs debugging.
const LOG_FILE =
    "D:\\krytus\\AI\\temp\\piper.log";

/**
 * Appends a line to LOG_FILE. Never throws — logging failures must
 * never surface in (or break) the user-facing CLI.
 */
function logDiagnostic(line: string): void {
    try {
        const stamp = new Date().toISOString();
        fs.appendFileSync(LOG_FILE, `[${stamp}] ${line}\n`);
    } catch {
        // Diagnostics are best-effort only; swallow any write failure.
    }
}

// ---------------------------------------------------------------------
// Performance tuning
// ---------------------------------------------------------------------
// Intra-op thread count passed to the Piper executable (ONNX Runtime).
// On an 8GB RAM / CPU-only box, 4 is usually the sweet spot: enough
// parallelism to cut latency without thrashing memory bandwidth.
// Adjust to match your physical core count.
const NUM_THREADS = 4;

// Max characters per chunk before we split on sentence boundaries.
// Smaller chunks make playback feel more continuous, at the cost of
// a few more audio chunks.
const MAX_CHUNK_CHARS = 160;

const FILE_READY_POLL_INTERVAL = 40;
const FILE_READY_TIMEOUT = 5000;

// ---------------------------------------------------------------------
// Custom vocabulary / pronunciation overrides
// ---------------------------------------------------------------------
// Easily editable lookup table. Keys are matched as whole words,
// case-insensitively, and swapped for the phonetic spelling on the right
// before the string ever reaches Piper/espeak.
const CUSTOM_VOCAB: Record<string, string> = {
    "AI": "ay eye",
    "CLI": "see ell eye",
    "API": "ay pee eye",
    "GPU": "gee pee you",
    "CPU": "see pee you",
    "Nvidia": "In-vid-ee-uh",
    "ONNX": "on-icks",
    "JSON": "jay-son",
    "SQL": "sequel",
    "URL": "you are ell",
};

// Pre-build a single regex for all vocab keys so we do one pass instead
// of iterating + re-scanning the string per entry.
const VOCAB_REGEX = new RegExp(
    `\\b(${Object.keys(CUSTOM_VOCAB)
        .map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
        .join("|")})\\b`,
    "gi"
);

// Matches markdown emphasis/heading characters we want to strip but
// whose *inner* content should survive: *bold*, _italic_, #heading.
const MARKDOWN_CHARS_REGEX = /[*_#`~]/g;

// Matches standalone special symbols that Piper would otherwise try to
// speak aloud (@, %, ^, &, etc.). Word characters, whitespace and basic
// sentence punctuation are preserved.
const STRAY_SYMBOLS_REGEX = /[^\w\s.,!?;:'"()\-]/g;

// Collapse repeated whitespace left behind after stripping.
const WHITESPACE_REGEX = /\s+/g;

// Naive sentence-boundary splitter: splits after ., !, or ? that is
// followed by whitespace (or end of string).
const SENTENCE_SPLIT_REGEX = /(?<=[.!?])\s+/;

/**
 * Sanitizes and normalizes raw text before it's handed to the TTS engine:
 *  1. Strips markdown formatting characters (keeping inner words).
 *  2. Removes stray special symbols.
 *  3. Applies custom pronunciation vocabulary.
 *  4. Collapses whitespace.
 *
 * Designed to run in a single pass per regex (no per-character loops)
 * to keep overhead low on constrained hardware.
 */
function sanitizeText(input: string): string {
    let text = input;

    text = text.replace(MARKDOWN_CHARS_REGEX, "");
    text = text.replace(STRAY_SYMBOLS_REGEX, "");
    text = text.replace(VOCAB_REGEX, (match) => CUSTOM_VOCAB[match.toUpperCase()] ?? CUSTOM_VOCAB[match] ?? match);
    text = text.replace(WHITESPACE_REGEX, " ").trim();

    return text;
}

/**
 * Splits sanitized text into sentence-level chunks capped at
 * MAX_CHUNK_CHARS, merging short sentences together where possible so we
 * don't spawn more Piper processes than necessary.
 */
function chunkText(input: string): string[] {
    const sentences = input.split(SENTENCE_SPLIT_REGEX).filter(Boolean);

    const chunks: string[] = [];
    let current = "";

    for (const sentence of sentences) {
        const candidate = current ? `${current} ${sentence}` : sentence;

        if (candidate.length > MAX_CHUNK_CHARS && current) {
            chunks.push(current);
            current = sentence;
        } else {
            current = candidate;
        }
    }

    if (current) chunks.push(current);

    return chunks.length > 0 ? chunks : [input];
}

async function waitForFileReady(filePath: string): Promise<boolean> {
    const deadline = Date.now() + FILE_READY_TIMEOUT;

    while (Date.now() < deadline) {
        try {
            const stats = fs.statSync(filePath);
            if (stats.isFile() && stats.size > 128) {
                return true;
            }
        } catch {
            // file may not exist yet
        }

        await new Promise((resolve) => setTimeout(resolve, FILE_READY_POLL_INTERVAL));
    }

    return false;
}

/**
 * Runs ALL sanitized chunks through a single Piper process. Piper loads
 * the model once, then reads one line of text per chunk from stdin and
 * writes one WAV file per line into OUTPUT_DIR (via --output_dir).
 *
 * This is the fix for the "reloads on every chunk" problem: previously
 * we spawned a fresh `piper.exe` per chunk, so the ~0.7-2.5s model load
 * you saw in the logs happened before every single sentence, creating
 * dead-air gaps that sounded like random stopping. Loading once and
 * streaming all lines through the same process removes that overhead
 * entirely.
 *
 * Returns the wav file paths in generation order.
 */
let currentPiperProcess: ReturnType<typeof spawn> | null = null;
let isSpeaking = false;
let stopRequested = false;

// Call this once at startup to wipe any stale .wav files left from previous runs
export function cleanupVoiceTemp() {
    try {
        if (fs.existsSync(OUTPUT_DIR)) {
            for (const f of fs.readdirSync(OUTPUT_DIR)) {
                try { fs.unlinkSync(`${OUTPUT_DIR}\\${f}`); } catch {}
            }
        } else {
            fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        }
    } catch {}
}

export function stopSpeaking() {
    stopRequested = true;
    if (currentPiperProcess) {
        currentPiperProcess.kill();
        currentPiperProcess = null;
    }
}

/**
 * Spawns a single Piper process and streams chunks to it. It returns an async generator
 * that yields .wav file paths as soon as they are created on disk by Piper.
 */
async function* synthesizeStream(chunks: string[]): AsyncGenerator<string> {
    if (fs.existsSync(OUTPUT_DIR)) {
        for (const f of fs.readdirSync(OUTPUT_DIR)) fs.unlinkSync(`${OUTPUT_DIR}\\${f}`);
    } else {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    if (!fs.existsSync(PIPER)) {
        throw new Error(`[PIPER] executable not found: ${PIPER}`);
    }

    const args = [
        "--model",
        MODEL,
        "--output_dir",
        OUTPUT_DIR,
        "--num_threads",
        String(NUM_THREADS),
    ];

    logDiagnostic(`starting ${PIPER} with ${chunks.length} chunks`);
    const piper = spawn(PIPER, args, { windowsHide: true });
    currentPiperProcess = piper;

    // All Piper stdout/stderr chatter (model load messages, real-time
    // factor stats, phoneme warnings, etc.) is diagnostic noise from the
    // user's point of view — it is captured to LOG_FILE only and never
    // forwarded to the KRYTUS CLI via console.log/console.error.
    piper.stdin.on("error", (err: Error) => logDiagnostic(`stdin error: ${err.message}`));
    piper.stderr.on("data", (d: Buffer) => {
        const msg = d.toString().trim();
        if (msg) logDiagnostic(`[stderr] ${msg}`);
    });
    piper.stdout.on("data", (d: Buffer) => {
        const msg = d.toString().trim();
        if (msg) logDiagnostic(`[stdout] ${msg}`);
    });

    // Write all chunks to Piper's stdin.
    piper.stdin.write(chunks.join("\n") + "\n");
    piper.stdin.end();

    // Give Piper a small head start before we start polling for output files
    await new Promise(resolve => setTimeout(resolve, 200));

    const expectedFiles = chunks.length;
    const generatedFiles = new Set<string>();

    let piperExited = false;
    let piperExitCode: number | null = null;

    piper.on("close", (code: number | null) => {
        piperExited = true;
        piperExitCode = code;
        currentPiperProcess = null;
        if (code !== null && code !== 0) {
            // Still detected/handled internally — just not printed to the
            // CLI here. If it turns out no audio was produced at all,
            // that gets surfaced below as a real, function-preventing error.
            logDiagnostic(`process exited with code ${code}`);
        }
    });
    piper.on("error", (err: Error) => {
        piperExited = true;
        currentPiperProcess = null;
        logDiagnostic(`process error: ${err.message}`);
    });

    while (!stopRequested) {
        const files = fs.readdirSync(OUTPUT_DIR)
            .filter((f: string) => f.endsWith('.wav'))
            .sort();

        for (const file of files) {
            const fullPath = `${OUTPUT_DIR}\\${file}`;
            if (!generatedFiles.has(fullPath)) {
                try {
                    const fd = fs.openSync(fullPath, 'r+');
                    fs.closeSync(fd);

                    if (!(await waitForFileReady(fullPath))) {
                        continue;
                    }

                    generatedFiles.add(fullPath);
                    logDiagnostic(`chunk ready: ${file}`);
                    yield fullPath;
                } catch {
                    // File still being written by Piper
                }
            }
        }

        // All expected files have been yielded
        if (generatedFiles.size >= expectedFiles) break;

        // Piper has exited — do one final scan then stop
        if (piperExited) {
            const finalFiles = fs.readdirSync(OUTPUT_DIR).filter((f: string) => f.endsWith('.wav'));
            for (const file of finalFiles) {
                const fullPath = `${OUTPUT_DIR}\\${file}`;
                if (!generatedFiles.has(fullPath)) {
                    try {
                        const fd = fs.openSync(fullPath, 'r+');
                        fs.closeSync(fd);
                        generatedFiles.add(fullPath);
                        yield fullPath;
                    } catch {}
                }
            }

            // This is the one case that actually prevents TTS from
            // functioning: Piper exited and produced no audio at all.
            // That's worth a real, user-facing error rather than silence.
            if (generatedFiles.size === 0) {
                const detail = piperExitCode !== null ? ` (exit code ${piperExitCode})` : "";
                console.error(`[PIPER] failed to produce any audio${detail}. See ${LOG_FILE} for details.`);
            }
            break;
        }

        await new Promise(resolve => setTimeout(resolve, 50));
    }
}

/**
 * Plays a single WAV file via PowerShell and deletes it
 * afterward to keep OUTPUT_DIR from accumulating files across calls.
 */
function playFile(filePath: string): Promise<void> {
    return new Promise((resolve) => {
        const player = spawn(
            "powershell",
            [
                "-c",
                `(New-Object Media.SoundPlayer '${filePath}').PlaySync();`
            ],
            // Suppress PowerShell's own stdout/stderr so it can't leak
            // into the KRYTUS CLI. "ignore" discards the streams
            // entirely (no pipes to drain, no output to forward).
            { windowsHide: true, stdio: ["ignore", "ignore", "ignore"] }
        );

        const done = () => {
            try {
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            } catch {
                // ignore cleanup failures
            }
            resolve();
        };

        player.on("error", (err: Error) => {
            logDiagnostic(`[PLAYER] error: ${err.message}`);
            done();
        });

        player.on("close", (code: number | null) => {
            if (code !== null && code !== 0) {
                logDiagnostic(`[PLAYER] exited with code ${code}`);
            }
            done();
        });
    });
}

export async function speak(text: string): Promise<void> {
    if (isSpeaking) {
        stopSpeaking();
    }
    
    stopRequested = false;
    isSpeaking = true;

    const sanitized = sanitizeText(text);
    const chunks = chunkText(sanitized).filter((c) => c.trim().length > 0);

    if (chunks.length === 0) {
        isSpeaking = false;
        return;
    }

    try {
        for await (const wavFile of synthesizeStream(chunks)) {
            if (stopRequested) break;
            await playFile(wavFile);
        }
    } finally {
        isSpeaking = false;
    }
}