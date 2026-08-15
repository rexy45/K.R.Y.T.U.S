"""
protocol.py — JSON line protocol between Python (voice) and Node (KRYTUS brain).

Every message, in both directions, is a single line of JSON written to
stdout (Python -> Node) or read from stdin (Node -> Python). No plain text
is ever printed to stdout once the voice core is running — logging goes to
stderr instead so it never corrupts the protocol stream.

Adding a new packet type is a two-step process:
    1. Add a `TYPE_*` constant below.
    2. Add a handler for it in `voice_core.VoiceCore._DISPATCH`.
"""

from __future__ import annotations

import json
import sys
import threading
from typing import Any, Callable, Dict, Optional

# ============================================================================
# PACKET TYPES
# ============================================================================


class Incoming:
    """Packet types Python receives from Node."""

    SPEAK = "speak"
    STOP = "stop"
    SHUTDOWN = "shutdown"
    SLEEP = "sleep"
    WAKE = "wake"
    VOLUME = "volume"
    STATUS = "status"


class Outgoing:
    """Packet types Python sends to Node."""

    TRANSCRIPT = "transcript"
    READY = "ready"
    SPEAKING_STARTED = "speaking_started"
    SPEAKING_DONE = "speaking_done"
    INTERRUPTED = "interrupted"
    STATUS = "status"
    ERROR = "error"
    HEARTBEAT = "heartbeat"
    SHUTDOWN_COMPLETE = "shutdown_complete"


# A single lock guards stdout so packets from multiple threads (listener,
# heartbeat, main) never interleave into a broken line of JSON.
_stdout_lock = threading.Lock()


# ============================================================================
# OUTGOING (Python -> Node)
# ============================================================================


def send(packet: Dict[str, Any]) -> None:
    """Serialize `packet` as one line of JSON and write it to stdout."""
    try:
        line = json.dumps(packet, ensure_ascii=False)
    except (TypeError, ValueError) as exc:
        line = json.dumps({"type": Outgoing.ERROR, "message": f"encode failure: {exc}"})

    with _stdout_lock:
        sys.stdout.write(line + "\n")
        sys.stdout.flush()


def send_ready() -> None:
    send({"type": Outgoing.READY})


def send_transcript(text: str) -> None:
    send({"type": Outgoing.TRANSCRIPT, "text": text})


def send_error(message: str, *, context: Optional[str] = None) -> None:
    packet: Dict[str, Any] = {"type": Outgoing.ERROR, "message": message}
    if context:
        packet["context"] = context
    send(packet)


def send_status(**fields: Any) -> None:
    send({"type": Outgoing.STATUS, **fields})


def send_heartbeat() -> None:
    send({"type": Outgoing.HEARTBEAT})


def send_speaking_started(text: str) -> None:
    send({"type": Outgoing.SPEAKING_STARTED, "text": text})


def send_speaking_done(*, interrupted: bool = False) -> None:
    send({"type": Outgoing.SPEAKING_DONE, "interrupted": interrupted})


def send_interrupted() -> None:
    send({"type": Outgoing.INTERRUPTED})


def send_shutdown_complete() -> None:
    send({"type": Outgoing.SHUTDOWN_COMPLETE})


# ============================================================================
# INCOMING (Node -> Python)
# ============================================================================


def parse_line(line: str) -> Optional[Dict[str, Any]]:
    """
    Parse one line of input from Node.

    Returns None (and emits an `error` packet) if the line is blank or is
    not valid JSON, so a malformed line never crashes the reader thread.
    """
    line = line.strip()
    if not line:
        return None

    try:
        packet = json.loads(line)
    except json.JSONDecodeError as exc:
        send_error(f"invalid JSON from Node: {exc}", context=line[:200])
        return None

    if not isinstance(packet, dict) or "type" not in packet:
        send_error("packet missing required 'type' field", context=line[:200])
        return None

    return packet


def stdin_reader_loop(on_packet: Callable[[Dict[str, Any]], None], stop_event: threading.Event) -> None:
    """
    Block on stdin, dispatching every valid packet to `on_packet`.

    Intended to run on its own daemon thread. Exits when stdin closes
    (Node terminated) or when `stop_event` is set.
    """
    for line in sys.stdin:
        if stop_event.is_set():
            break
        packet = parse_line(line)
        if packet is not None:
            on_packet(packet)
    # stdin closed (Node process died / pipe broken) — treat as a shutdown signal
    stop_event.set()
