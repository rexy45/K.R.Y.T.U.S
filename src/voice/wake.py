import speech_recognition as sr

recognizer = sr.Recognizer()

WAKE_WORDS = [
    "arise",
    "a rise",
    "aris"
]

def main():

    with sr.Microphone() as source:

        recognizer.adjust_for_ambient_noise(source, duration=1)

        print("[WAKE] Ready", flush=True)

        while True:

            try:

                audio = recognizer.listen(
                    source,
                    timeout=None,
                    phrase_time_limit=3
                )

                text = recognizer.recognize_google(audio).lower().strip()

                print(f"[HEARD] {text}", flush=True)

                if any(word in text for word in WAKE_WORDS):
                    print("WAKE", flush=True)
                    return

            except sr.UnknownValueError:
                continue

            except sr.RequestError:
                continue

            except Exception:
                continue


if __name__ == "__main__":
    main()
