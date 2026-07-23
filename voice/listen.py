import speech_recognition as sr

recognizer = sr.Recognizer()

# Better settings
recognizer.dynamic_energy_threshold = True
recognizer.pause_threshold = 1.2
recognizer.phrase_threshold = 0.3
recognizer.non_speaking_duration = 0.8

# Correct project names
CORRECTIONS = {
    "critics": "KRYTUS",
    "kritus": "KRYTUS",
    "kratos": "KRYTUS",
    "curious": "KYROSYS",
    "kairos": "KYROSYS"
}

with sr.Microphone() as source:
    print(" Listening...")
    recognizer.adjust_for_ambient_noise(source, duration=2)

    # THIS LINE CREATES THE AUDIO OBJECT
    audio = recognizer.listen(source)

try:
    text = recognizer.recognize_google(audio)

    # Apply corrections
    for wrong, right in CORRECTIONS.items():
        text = text.replace(wrong, right)

    print("You said:", text)

except sr.UnknownValueError:
    print("Sorry, I couldn't understand.")

except sr.RequestError as e:
    print("Speech Recognition Error:", e)
