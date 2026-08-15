"""
listener.py — continuous microphone capture -> Whisper transcription.

The microphone is opened once and never closed for the lifetime of the
process (short of shutdown). "Sleeping" pauses dispatch of transcripts, not
the microphone itself, so wake-word style behaviour can be layered on later
without reopening audio devices.

This module NEVER decides what to say. It only ever produces transcripts
and, on demand, signals that speech should be interrupted.
"""

from __future__ import annotations

import os
import sys
import tempfile
import threading
from dataclasses import dataclass
from typing import Callable, Optional

import speech_recognition as sr

from .whisper_engine import WhisperEngine


@dataclass
class ListenerConfig:
    temp_dir: str = r"D:\krytus\AI\temp"
    phrase_time_limit: float = 10.0
    ambient_noise_duration: float = 1.0


class Listener:
    """Owns the microphone and the listen -> transcribe loop."""

    def __init__(
        self,
        whisper: WhisperEngine,
        on_transcript: Callable[[str], None],
        request_interrupt: Callable[[], bool],
        config: ListenerConfig | None = None,
    ) -> None:
        """
        Args:
            whisper: engine used to turn captured audio into text.
            on_transcript: called with each non-empty transcript.
            request_interrupt: called as soon as a phrase is captured (before
                transcription) so speech can be cut with the lowest possible
                latency. Should return True if speech was actually playing.
        """
        self._whisper = whisper
        self._on_transcript = on_transcript
        self._request_interrupt = request_interrupt
        self.config = config or ListenerConfig()

        os.makedirs(self.config.temp_dir, exist_ok=True)

        self._recognizer = sr.Recognizer()
        self._thread: Optional[threading.Thread] = None
        self._shutdown = threading.Event()
        self._sleeping = threading.Event()

    # -- lifecycle ------------------------------------------------------------

    def start(self) -> None:
        self._thread = threading.Thread(target=self._run, name="voice-listener", daemon=True)
        self._thread.start()

    def stop(self) -> None:
        self._shutdown.set()
        if self._thread is not None and self._thread.is_alive():
            self._thread.join(timeout=2.0)

    # -- sleep / wake -----------------------------------------------------------

    def sleep(self) -> None:
        """Pause dispatch of new transcripts. Microphone stays open."""
        self._sleeping.set()

    def wake(self) -> None:
        self._sleeping.clear()

    @property
    def is_sleeping(self) -> bool:
        return self._sleeping.is_set()

    # -- main loop --------------------------------------------------------------

    def _run(self) -> None:
        try:
            with sr.Microphone() as source:
                self._recognizer.adjust_for_ambient_noise(source, duration=self.config.ambient_noise_duration)
                print("[listener] microphone ready", file=sys.stderr, flush=True)

                while not self._shutdown.is_set():
                    try:
                        audio = self._recognizer.listen(
                            source,
                            timeout=None,
                            phrase_time_limit=self.config.phrase_time_limit,
                        )
                    except Exception as exc:
                        print(f"[listener] capture error: {exc}", file=sys.stderr, flush=True)
                        continue

                    if self._shutdown.is_set():
                        break

                    # Barge in immediately on captured audio — don't wait for
                    # transcription to finish before cutting current speech.
                    self._request_interrupt()

                    transcript = self._transcribe(audio)
                    if not transcript:
                        continue

                    if self._sleeping.is_set():
                        # Dropped while asleep — mic stays warm, nothing dispatched.
                        continue

                    self._on_transcript(transcript)
        except Exception as exc:
            print(f"[listener] fatal error, listener thread exiting: {exc}", file=sys.stderr, flush=True)

    def _transcribe(self, audio: "sr.AudioData") -> str:
        tmp = tempfile.NamedTemporaryFile(dir=self.config.temp_dir, delete=False, suffix=".wav")
        tmp.close()
        try:
            with open(tmp.name, "wb") as f:
                f.write(audio.get_wav_data())
            return self._whisper.transcribe(tmp.name)
        finally:
            try:
                os.unlink(tmp.name)
            except OSError:
                pass
