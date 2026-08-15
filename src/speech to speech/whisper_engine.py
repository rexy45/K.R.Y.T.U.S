"""
whisper_engine.py — thin, robust wrapper around the whisper.cpp CLI.

Only responsibility: turn a WAV file into text. No decision making.
"""

from __future__ import annotations

import subprocess
import sys
from dataclasses import dataclass


@dataclass(frozen=True)
class WhisperConfig:
    """Paths / options for the whisper.cpp binary. Adjust for your machine."""

    binary_path: str = r"D:\krytus\AI\whisper\Release\whisper-cli.exe"
    model_path: str = r"D:\krytus\AI\whisper\ggml-small.en.bin"
    language: str = "en"
    # Extra safety timeout so a hung whisper-cli process can never wedge the
    # listener thread forever.
    timeout_seconds: float = 30.0


class WhisperEngine:
    """Runs the local whisper.cpp CLI against WAV files and parses the output."""

    def __init__(self, config: WhisperConfig | None = None) -> None:
        self.config = config or WhisperConfig()

    def transcribe(self, wav_path: str) -> str:
        """
        Transcribe `wav_path` and return the plain-text result.

        Returns an empty string on any failure (missing binary, timeout,
        non-zero exit, no speech detected) — callers should simply treat an
        empty string as "nothing to send".
        """
        try:
            result = subprocess.run(
                [
                    self.config.binary_path,
                    "-m",
                    self.config.model_path,
                    "-f",
                    wav_path,
                    "-l",
                    self.config.language,
                ],
                capture_output=True,
                text=True,
                timeout=self.config.timeout_seconds,
            )
        except subprocess.TimeoutExpired:
            print("[whisper] transcription timed out", file=sys.stderr, flush=True)
            return ""
        except OSError as exc:
            print(f"[whisper] failed to launch whisper-cli: {exc}", file=sys.stderr, flush=True)
            return ""

        if result.returncode != 0:
            print(f"[whisper] non-zero exit ({result.returncode}): {result.stderr.strip()}", file=sys.stderr, flush=True)

        return self._parse_output(result.stdout)

    @staticmethod
    def _parse_output(stdout: str) -> str:
        """whisper.cpp prints lines like `[00:00:00.000 --> 00:00:02.000]  text`."""
        pieces: list[str] = []
        for line in stdout.splitlines():
            line = line.strip()
            if not line.startswith("["):
                continue
            try:
                spoken = line.split("]", 1)[-1].strip()
            except IndexError:
                continue
            if spoken:
                pieces.append(spoken)
        return " ".join(pieces).strip()
