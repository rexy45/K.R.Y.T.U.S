"""
speaker.py — interruptible text-to-speech using pyttsx3.

Preserves the original jarvis_core.py behaviour: speech runs on its own
thread using engine.startLoop(False) + iterate() so it can be cut almost
instantly from any other thread via stop().
"""

from __future__ import annotations

import sys
import threading
import time
from dataclasses import dataclass
from typing import Callable, Optional

import pyttsx3


@dataclass
class SpeakerConfig:
    rate: int = 165
    volume: float = 1.0
    # Substrings (lowercased) to prefer when picking a voice, in priority order.
    preferred_voice_hints: tuple[str, ...] = ("david", "mark", "male")
    # How often (seconds) the speech loop polls the stop flag / advances audio.
    poll_interval: float = 0.01
    # Max time to wait for a previous utterance to fully stop before starting a new one.
    stop_join_timeout: float = 0.5


class Speaker:
    """Thread-safe, interruptible pyttsx3 wrapper. One utterance at a time."""

    def __init__(
        self,
        config: SpeakerConfig | None = None,
        on_started: Optional[Callable[[str], None]] = None,
        on_done: Optional[Callable[[bool], None]] = None,
    ) -> None:
        self.config = config or SpeakerConfig()
        self._on_started = on_started
        self._on_done = on_done

        self._stop_flag = threading.Event()
        self._engine_lock = threading.Lock()
        self._active_engine: Optional[pyttsx3.Engine] = None
        self._speech_thread: Optional[threading.Thread] = None
        self._speaking = threading.Event()

        # Runtime-adjustable volume (0-100 as sent by Node; converted to 0.0-1.0)
        self._volume = self.config.volume

    # -- public state -------------------------------------------------------

    @property
    def is_speaking(self) -> bool:
        return self._speaking.is_set()

    def set_volume(self, percent: float) -> None:
        """Set volume as a 0-100 percentage; applied to the next utterance."""
        self._volume = max(0.0, min(1.0, percent / 100.0))

    # -- engine construction --------------------------------------------------

    def _build_engine(self) -> pyttsx3.Engine:
        engine = pyttsx3.init()
        engine.setProperty("rate", self.config.rate)
        engine.setProperty("volume", self._volume)

        voices = engine.getProperty("voices")
        for hint in self.config.preferred_voice_hints:
            for voice in voices:
                name = (voice.name or "").lower()
                if hint in name:
                    engine.setProperty("voice", voice.id)
                    return engine
        return engine

    # -- speaking -------------------------------------------------------------

    def speak(self, text: str, *, wait: bool = False) -> None:
        """Speak `text` on a background thread, interrupting any current speech first."""
        text = (text or "").strip()
        if not text:
            return

        self.stop()

        thread = threading.Thread(
            target=self._speech_worker,
            args=(text,),
            name="voice-speech",
            daemon=True,
        )
        self._speech_thread = thread
        thread.start()

        if wait:
            thread.join()

    def _speech_worker(self, text: str) -> None:
        engine: Optional[pyttsx3.Engine] = None
        interrupted = False
        try:
            engine = self._build_engine()
            with self._engine_lock:
                self._active_engine = engine

            self._speaking.set()
            self._stop_flag.clear()
            if self._on_started:
                self._on_started(text)

            engine.say(text)
            engine.startLoop(False)

            while engine.isBusy():
                if self._stop_flag.is_set():
                    interrupted = True
                    try:
                        engine.stop()
                    except Exception:
                        pass
                    break
                engine.iterate()
                time.sleep(self.config.poll_interval)

            try:
                engine.endLoop()
            except Exception:
                pass

        except Exception as exc:
            print(f"[speaker] error: {exc}", file=sys.stderr, flush=True)
        finally:
            with self._engine_lock:
                if self._active_engine is engine:
                    self._active_engine = None
            self._speaking.clear()
            if self._on_done:
                self._on_done(interrupted)
            # Explicitly drop the reference so SAPI releases the audio device.
            del engine

    def stop(self) -> None:
        """Instantly halt any in-progress speech. Safe to call from any thread."""
        self._stop_flag.set()

        with self._engine_lock:
            engine = self._active_engine

        if engine is not None:
            try:
                engine.stop()
            except Exception:
                pass

        thread = self._speech_thread
        if thread is not None and thread.is_alive() and thread is not threading.current_thread():
            thread.join(timeout=self.config.stop_join_timeout)

        self._speaking.clear()

    def shutdown(self) -> None:
        """Stop any speech and release resources. Call once, at process exit."""
        self.stop()
