import sys
import pyttsx3

engine = pyttsx3.init()

# Configure voice
engine.setProperty("rate", 165)      # Speaking speed
engine.setProperty("volume", 1.0)    # Max volume

# Try to select a deeper male voice
voices = engine.getProperty("voices")

for voice in voices:
    name = voice.name.lower()
    if "david" in name or "mark" in name or "male" in name:
        engine.setProperty("voice", voice.id)
        break

text = " ".join(sys.argv[1:])

if text.strip():
    engine.say(text)
    engine.runAndWait()
