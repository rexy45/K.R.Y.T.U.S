import subprocess
import os

BASE = r"D:\krytus\krytus"

while True:
    print("[LAUNCHER] Waiting for wake word...")

    subprocess.run(
        ["python", os.path.join(BASE, "src", "voice", "wake.py")]
    )

    print("[LAUNCHER] Wake detected!")

    subprocess.run(
        ["cmd", "/c", "npm run dev"],
        cwd=BASE
    )

    print("[LAUNCHER] KRYTUS closed. Returning to wake mode...")
