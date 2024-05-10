import speech_recognition as sr
from flask_socketio import emit
import threading
import sys

recognizer = sr.Recognizer()
speech_detected = False
audioInput = ""
timeout=10

# Function to capture audio input with a custom timeout
def captureAudio(timeout=timeout):
    print("Inside capture audio")
    emit('voice_assistant_event', {'statement': "Listening"})
    global audioInput, speech_detected
    speech_detected = False
    # Function to continuously listen for audio input
    def listen_audio():
        global speech_detected, audioInput
        print("Inside listen_audio")
        with sr.Microphone() as source:
            print("Listening...")
            while True:
                audioInput = ""
                try:
                    recognizer.adjust_for_ambient_noise(source)
                    audioInput = recognizer.listen(source, timeout=timeout)
                    text = recognizer.recognize_google(audioInput)
                    if audioInput != "":
                        print(text)
                        print("true in line 27")
                        speech_detected = True
                        break  # Stop listening if keyword is detected
                    else:
                        emitUnknown()
                        
                except sr.WaitTimeoutError:
                    audioInput = ""
                    print("Wait Timeout Error")
                    emitErrorTimeout()
                    break
                except sr.UnknownValueError:
                    audioInput = ""
                    print("Wait UnknownValueError in listen_audio")
                    print("Sorry, I couldn't understand what you said.")
                    emitUnknown()
                    break  # Stop listening

    # Start the background thread to listen for audio
    audio_thread = threading.Thread(target=listen_audio)
    audio_thread.start()
    print("thread start")

    # Wait for the specified timeout
    audio_thread.join(timeout)  # Remove 'engine' argument from here
    print("thread join")

def audioForMain():
    global audioInput
    # Process the captured audio
    if audioInput != "":
        print("audio input true")
        print("Processing...")
        emit('general_response_event', {'statement': "Processing..."})
        query = recognizer.recognize_google(audioInput)
        print("You said:", query)
        emit('voice_assistant_event', {'statement': "You said:"+ query})
        return query.lower()
    else:
        print("audio_input false")
        if not speech_detected:
            print("Timeout: No speech detected for {} seconds.".format(timeout))
            emit('general_response_event', {'statement': "No speech detected for {} seconds.".format(timeout)})
            sys.exit(0)
        
def audioForSendEmail():
    global audioInput
    # Process the captured audio
    if audioInput != "":
        print("audio input true")
        print("Processing...")
        emit('general_response_event', {'statement': "Processing..."})
        query = recognizer.recognize_google(audioInput)
        print("You said:", query)
        emit('voice_assistant_event', {'statement': "You said:"+ query})
        return query.lower()
    else:
        print("audio_input false")
        print(speech_detected)
        if not speech_detected:
            print("Timeout: No speech detected for {} seconds.".format(timeout))
            emit('general_response_event', {'statement': "No speech detected for {} seconds.".format(timeout)})
            return ""

def emitErrorTimeout():
    emit('general_response_event', {'statement': "Wait Timeout!"})
    
def emitUnknown():
    emit('voice_assistant_event', {'statement': "Sorry, I couldn't understand what you said."})