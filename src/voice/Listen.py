import speech_recognition as sr
import subprocess
import tempfile
import os

# ----------------------------
# CONFIG
# ----------------------------

WHISPER = r"D:\krytus\AI\whisper\Release\whisper-cli.exe"
MODEL = r"D:\krytus\AI\whisper\ggml-small.en.bin"

TEMP_DIR = r"D:\krytus\AI\temp"

os.makedirs(TEMP_DIR, exist_ok=True)

recognizer = sr.Recognizer()

# ----------------------------
# KEEP MICROPHONE OPEN
# ----------------------------

with sr.Microphone() as source:

    recognizer.adjust_for_ambient_noise(source, duration=1)

    print("Microphone Ready", flush=True)

    while True:

        print("Listening...", flush=True)

        try:

            audio = recognizer.listen(
                source,
                timeout=None,
                phrase_time_limit=10
            )

        except Exception:
            continue

        # ----------------------------
        # SAVE TEMP AUDIO
        # ----------------------------

        tmp = tempfile.NamedTemporaryFile(
            dir=TEMP_DIR,
            delete=False,
            suffix=".wav"
        )

        tmp.close()

        with open(tmp.name, "wb") as f:
            f.write(audio.get_wav_data())

        # ----------------------------
        # RUN WHISPER
        # ----------------------------

        result = subprocess.run(
            [
                WHISPER,
                "-m",
                MODEL,
                "-f",
                tmp.name,
                "-l",
                "en"
            ],
            capture_output=True,
            text=True
        )

        os.unlink(tmp.name)

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

        transcript = transcript.strip()

        if transcript:
            print(f"You: {transcript}", flush=True)
