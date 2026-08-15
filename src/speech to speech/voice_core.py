"""
voice_core.py — ties listener, speaker, and the Node protocol together.

Node is the brain. This module's only job is:
    * transcript in  -> send it to Node
    * "speak" from Node -> speak it
    * everything else -> housekeeping (stop / sleep / wake / volume / status / shutdown)

No reply is ever generated in Python.
"""

from __future__ import annotations

import sys
import threading
import time
from typing import Any, Callable, Dict, Optional

from . import protocol
from .listener import Listener, ListenerConfig
from .protocol import Incoming
from .speaker import Speaker, SpeakerConfig
from .whisper_engine import WhisperEngine, WhisperConfig

HEARTBEAT_INTERVAL_SECONDS = 15.0


class VoiceCore:
    """Boots and coordinates the whole voice subsystem for one KRYTUS session."""

    def __init__(
        self,
        whisper_config: Optional[WhisperConfig] = None,
        speaker_config: Optional[SpeakerConfig] = None,
        listener_config: Optional[ListenerConfig] = None,
        heartbeat_interval: float = HEARTBEAT_INTERVAL_SECONDS,
    ) -> None:
        self._shutdown_event = threading.Event()
        self._heartbeat_interval = heartbeat_interval

        self._speaker = Speaker(
            config=speaker_config,
            on_started=self._on_speaking_started,
            on_done=self._on_speaking_done,
        )
        self._whisper = WhisperEngine(config=whisper_config)
        self._listener = Listener(
            whisper=self._whisper,
            on_transcript=self._on_transcript,
            request_interrupt=self._request_interrupt,
            config=listener_config,
        )

        self._heartbeat_thread: Optional[threading.Thread] = None

        # Registry: incoming packet type -> handler. Add a new command by
        # adding one entry here and one method below.
        self._dispatch: Dict[str, Callable[[Dict[str, Any]], None]] = {
            Incoming.SPEAK: self._handle_speak,
            Incoming.STOP: self._handle_stop,
            Incoming.SHUTDOWN: self._handle_shutdown,
            Incoming.SLEEP: self._handle_sleep,
            Incoming.WAKE: self._handle_wake,
            Incoming.VOLUME: self._handle_volume,
            Incoming.STATUS: self._handle_status,
        }

    # ==========================================================================
    # LIFECYCLE
    # ==========================================================================

    def run(self) -> None:
        """Start every subsystem, announce readiness, and block until shutdown."""
        self._listener.start()
        self._start_heartbeat()

        protocol.send_ready()
        print("[core] ready", file=sys.stderr, flush=True)

        stdin_thread = threading.Thread(
            target=protocol.stdin_reader_loop,
            args=(self._on_packet, self._shutdown_event),
            name="voice-stdin-reader",
            daemon=True,
        )
        stdin_thread.start()

        # Main thread just waits for a shutdown signal (from Node, from
        # stdin closing, or from Ctrl+C).
        try:
            while not self._shutdown_event.is_set():
                time.sleep(0.1)
        except KeyboardInterrupt:
            pass

        self._teardown()

    def _teardown(self) -> None:
        print("[core] shutting down...", file=sys.stderr, flush=True)
        self._listener.stop()
        self._speaker.shutdown()
        protocol.send_shutdown_complete()

    # ==========================================================================
    # LISTENER / SPEAKER CALLBACKS
    # ==========================================================================

    def _on_transcript(self, text: str) -> None:
        """A finished user utterance — hand it to Node, make no decisions."""
        protocol.send_transcript(text)

    def _request_interrupt(self) -> bool:
        """
        Called by the listener the instant audio is captured, before it is
        even transcribed, so KRYTUS can be barged-in on with minimal latency.
        """
        if self._speaker.is_speaking:
            self._speaker.stop()
            protocol.send_interrupted()
            return True
        return False

    def _on_speaking_started(self, text: str) -> None:
        protocol.send_speaking_started(text)

    def _on_speaking_done(self, interrupted: bool) -> None:
        protocol.send_speaking_done(interrupted=interrupted)

    # ==========================================================================
    # INCOMING PACKET DISPATCH
    # ==========================================================================

    def _on_packet(self, packet: Dict[str, Any]) -> None:
        packet_type = packet.get("type")
        handler = self._dispatch.get(packet_type)
        if handler is None:
            protocol.send_error(f"unknown packet type: {packet_type!r}")
            return
        try:
            handler(packet)
        except Exception as exc:
            protocol.send_error(f"handler for {packet_type!r} failed: {exc}")

    def _handle_speak(self, packet: Dict[str, Any]) -> None:
        text = packet.get("text", "")
        self._speaker.speak(text)

    def _handle_stop(self, _packet: Dict[str, Any]) -> None:
        self._speaker.stop()

    def _handle_shutdown(self, _packet: Dict[str, Any]) -> None:
        self._shutdown_event.set()

    def _handle_sleep(self, _packet: Dict[str, Any]) -> None:
        self._speaker.stop()
        self._listener.sleep()
        protocol.send_status(state="sleeping")

    def _handle_wake(self, _packet: Dict[str, Any]) -> None:
        self._listener.wake()
        protocol.send_status(state="awake")

    def _handle_volume(self, packet: Dict[str, Any]) -> None:
        value = packet.get("value")
        if not isinstance(value, (int, float)):
            protocol.send_error("volume packet requires numeric 'value' (0-100)")
            return
        self._speaker.set_volume(float(value))
        protocol.send_status(volume=value)

    def _handle_status(self, _packet: Dict[str, Any]) -> None:
        protocol.send_status(
            speaking=self._speaker.is_speaking,
            sleeping=self._listener.is_sleeping,
        )

    # ==========================================================================
    # HEARTBEAT
    # ==========================================================================

    def _start_heartbeat(self) -> None:
        if self._heartbeat_interval <= 0:
            return

        def _loop() -> None:
            while not self._shutdown_event.wait(self._heartbeat_interval):
                protocol.send_heartbeat()

        self._heartbeat_thread = threading.Thread(target=_loop, name="voice-heartbeat", daemon=True)
        self._heartbeat_thread.start()


def main() -> None:
    core = VoiceCore()
    core.run()


if __name__ == "__main__":
    main()
