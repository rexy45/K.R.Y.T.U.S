"""
voice — KRYTUS local voice subsystem.

This package contains ONLY the audio I/O layer:
    * speech-to-text (Whisper)
    * text-to-speech (pyttsx3)
    * microphone handling / interruption

It never decides what to say. Every reply comes from KRYTUS (Node.js)
over the stdin/stdout JSON protocol defined in `protocol.py`.
"""

from .voice_core import VoiceCore, main

__all__ = ["VoiceCore", "main"]
