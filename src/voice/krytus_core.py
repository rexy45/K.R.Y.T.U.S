"""
jarvis_core.py — Unified, interruptible JARVIS-style voice core.

Architecture
------------
• Listener thread  : keeps the microphone open, runs Whisper, never blocks speech.
• Speech thread    : owns pyttsx3; can be killed mid-utterance via stop_speaking().
• Main / handler   : when a new transcript arrives while Jarvis is talking, speech
                     is cut instantly so the new command can take over.

No cloud STT/TTS — local Whisper CLI + local pyttsx3 only.
"""

from __future__ import annotations

import os
import queue
import subprocess
import sys
import tempfile
import threading
import time
from typing import Optional

import pyttsx3
import speech_recognition as sr

# ============================================================================
# CONFIG  (preserved from listen.py / speak.py)
# ============================================================================

WHISPER = r"D:\krytus\AI\whisper\Release\whisper-cli.exe"
MODEL = r"D:\krytus\AI\whisper\ggml-small.en.bin"
TEMP_DIR = r"D:\krytus\AI\temp"

os.makedirs(TEMP_DIR, exist_ok=True)

# Speech properties (preserved from speak.py)
SPEECH_RATE = 165
SPEECH_VOLUME = 1.0

# How long a single listened phrase may be (seconds)
PHRASE_TIME_LIMIT = 10

# ============================================================================
# GLOBAL STATE
# ============================================================================

# True while pyttsx3 is actively producing audio
is_speaking: bool = False

# Thread-safe stop signal for the active speech worker
_stop_speech = threading.Event()

# Reference to the live engine (so stop_speaking can call engine.stop())
_engine_lock = threading.Lock()
_active_engine: Optional[pyttsx3.Engine] = None
_speech_thread: Optional[threading.Thread] = None

# Transcripts produced by the listener thread are pushed here
transcript_queue: queue.Queue[str] = queue.Queue()

# Set to True to shut the whole process down cleanly
_shutdown = threading.Event()

# ============================================================================
# SPEECH ENGINE
# ============================================================================


def _build_engine() -> pyttsx3.Engine:
    """Create and configure a fresh pyttsx3 engine (rate / volume / male voice)."""
    engine = pyttsx3.init()
    engine.setProperty("rate", SPEECH_RATE)
    engine.setProperty("volume", SPEECH_VOLUME)

    # Prefer a deeper male voice (David / Mark / any "male" SAPI voice)
    voices = engine.getProperty("voices")
    for voice in voices:
        name = (voice.name or "").lower()
        if "david" in name or "mark" in name or "male" in name:
            engine.setProperty("voice", voice.id)
            break

    return engine


def _speech_worker(text: str) -> None:
    """
    Background worker: speak `text` until finished or stop_speaking() is called.

    Uses startLoop(False) + iterate() so we can poll the stop flag between
    engine ticks and cut audio almost immediately.
    """
    global is_speaking, _active_engine

    engine = None
    try:
        engine = _build_engine()
        with _engine_lock:
            _active_engine = engine

        is_speaking = True
        _stop_speech.clear()

        engine.say(text)
        # Non-blocking loop so we can interrupt mid-sentence
        engine.startLoop(False)

        while engine.isBusy():
            if _stop_speech.is_set():
                try:
                    engine.stop()
                except Exception:
                    pass
                break
            engine.iterate()
            # Tiny yield so the stop flag is checked often without spinning the CPU
            time.sleep(0.01)

        try:
            engine.endLoop()
        except Exception:
            pass

    except Exception as exc:
        print(f"[SPEECH] Error: {exc}", flush=True)
    finally:
        with _engine_lock:
            if _active_engine is engine:
                _active_engine = None
        is_speaking = False
        # Drop the engine so SAPI releases the audio device cleanly
        try:
            if engine is not None:
                del engine
        except Exception:
            pass


def speak(text: str, wait: bool = False) -> None:
    """
    Speak `text` on a dedicated background thread.

    Any speech already in progress is stopped first so only one utterance
    plays at a time.  Set wait=True to block until finished (or interrupted).
    """
    global _speech_thread

    text = (text or "").strip()
    if not text:
        return

    # Cut any current utterance before starting a new one
    stop_speaking()

    t = threading.Thread(
        target=_speech_worker,
        args=(text,),
        name="jarvis-speech",
        daemon=True,
    )
    _speech_thread = t
    t.start()

    if wait:
        t.join()


def stop_speaking() -> None:
    """
    Instantly halt any in-progress speech.

    Safe to call from any thread (including the listener).  Sets the stop
    flag, calls engine.stop() on the live engine, and joins the speech
    worker briefly so the audio device is free before the next utterance.
    """
    global is_speaking, _speech_thread

    _stop_speech.set()

    with _engine_lock:
        engine = _active_engine

    if engine is not None:
        try:
            engine.stop()
        except Exception:
            pass

    # Wait briefly for the worker to exit so the next speak() starts clean
    t = _speech_thread
    if t is not None and t.is_alive() and t is not threading.current_thread():
        t.join(timeout=0.5)

    is_speaking = False


# ============================================================================
# WHISPER TRANSCRIPTION  (preserved logic from listen.py)
# ============================================================================


def transcribe_wav(wav_path: str) -> str:
    """Run the local Whisper CLI on a WAV file and return the transcript."""
    result = subprocess.run(
        [
            WHISPER,
            "-m",
            MODEL,
            "-f",
            wav_path,
            "-l",
            "en",
        ],
        capture_output=True,
        text=True,
    )

    transcript = ""
    for line in result.stdout.splitlines():
        line = line.strip()
        if line.startswith("["):
            try:
                spoken = line.split("]")[-1].strip()
                if spoken:
                    transcript += spoken + " "
            except Exception:
                pass

    return transcript.strip()


# ============================================================================
# LISTENER THREAD  — never stops, even while Jarvis is talking
# ============================================================================


def listen_loop() -> None:
    """
    Continuous microphone capture + Whisper transcription.

    Runs forever on its own thread.  Every non-empty transcript is:
      1. Printed
      2. Used to barge-in (stop speech) if Jarvis is currently talking
      3. Pushed onto transcript_queue for the command handler
    """
    recognizer = sr.Recognizer()

    with sr.Microphone() as source:
        recognizer.adjust_for_ambient_noise(source, duration=1)
        print("Microphone Ready", flush=True)

        while not _shutdown.is_set():
            print("Listening...", flush=True)

            try:
                audio = recognizer.listen(
                    source,
                    timeout=None,
                    phrase_time_limit=PHRASE_TIME_LIMIT,
                )
            except Exception:
                continue

            if _shutdown.is_set():
                break

            # ---- save temp WAV ----
            tmp = tempfile.NamedTemporaryFile(
                dir=TEMP_DIR,
                delete=False,
                suffix=".wav",
            )
            tmp.close()

            try:
                with open(tmp.name, "wb") as f:
                    f.write(audio.get_wav_data())

                transcript = transcribe_wav(tmp.name)
            finally:
                try:
                    os.unlink(tmp.name)
                except OSError:
                    pass

            if not transcript:
                continue

            print(f"You: {transcript}", flush=True)

            # ----------------------------------------------------------
            # INTERRUPTION LOGIC
            # As soon as a real transcript lands, if Jarvis is mid-sentence
            # cut the audio instantly so we can pivot to the new topic.
            # ----------------------------------------------------------
            if is_speaking:
                print("[INTERRUPT] Stopping speech...", flush=True)
                stop_speaking()

            transcript_queue.put(transcript)


# ============================================================================
# COMMAND HANDLER  (hook your LLM / brain here)
# ============================================================================


def handle_command(transcript: str) -> None:
    """
    Process a user utterance.

    Replace the body of this function with your real JARVIS brain
    (local LLM, rule engine, tool router, etc.).  For now it echoes
    so you can verify barge-in / interrupt behaviour end-to-end.
    """
    # Example placeholder response — swap for real reasoning later
    reply = f"I heard you say: {transcript}"
    print(f"Jarvis: {reply}", flush=True)
    speak(reply)


def command_loop() -> None:
    """Drain the transcript queue and dispatch each command."""
    while not _shutdown.is_set():
        try:
            transcript = transcript_queue.get(timeout=0.25)
        except queue.Empty:
            continue

        try:
            handle_command(transcript)
        except Exception as exc:
            print(f"[HANDLER] Error: {exc}", flush=True)


# ============================================================================
# PUBLIC HELPERS  (optional — useful when embedding this module)
# ============================================================================


def start(blocking: bool = True) -> Optional[threading.Thread]:
    """
    Boot the voice core.

    • Listener always starts on a daemon thread.
    • If blocking=True (default), the command loop runs on the calling
      thread until KeyboardInterrupt / shutdown().
    • If blocking=False, the command loop also runs on a daemon thread
      and this function returns that thread handle immediately.
    """
    listener = threading.Thread(
        target=listen_loop,
        name="jarvis-listener",
        daemon=True,
    )
    listener.start()
    print("[CORE] Listener thread started.", flush=True)

    if blocking:
        try:
            command_loop()
        except KeyboardInterrupt:
            print("\n[CORE] Shutting down...", flush=True)
            shutdown()
        return None

    handler = threading.Thread(
        target=command_loop,
        name="jarvis-handler",
        daemon=True,
    )
    handler.start()
    print("[CORE] Command handler thread started.", flush=True)
    return handler


def shutdown() -> None:
    """Signal all loops to exit and silence any active speech."""
    _shutdown.set()
    stop_speaking()


# ============================================================================
# ENTRY POINT
# ============================================================================

if __name__ == "__main__":
    print("=" * 50, flush=True)
    print("  JARVIS CORE  — interruptible local voice loop", flush=True)
    print("  Speak anytime; talking over Jarvis cuts him off.", flush=True)
    print("  Ctrl+C to exit.", flush=True)
    print("=" * 50, flush=True)

    # Optional boot line so you can confirm TTS + interrupt works immediately
    speak("Jarvis online. I am listening.", wait=False)

    start(blocking=True)
    sys.exit(0)
