"""
jarvis_core.py — KRYTUS voice subsystem entry point.

This process is ONLY the audio layer: Whisper STT + pyttsx3 TTS +
microphone handling + instant interruption. All reasoning lives in KRYTUS
(Node.js). Communication happens over stdin/stdout as newline-delimited
JSON — see voice/protocol.py for the full packet spec.

Run directly:
    python jarvis_core.py

Or spawn from Node:
    const py = spawn("python", ["jarvis_core.py"], { cwd: __dirname });
    py.stdout.on("data", (chunk) => { ...parse JSON lines... });
    py.stdin.write(JSON.stringify({ type: "speak", text: "Hello." }) + "\n");
"""

from __future__ import annotations

from voice import main

if __name__ == "__main__":
    main()
