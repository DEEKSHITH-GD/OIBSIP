from flask import Flask, render_template
from flask_socketio import SocketIO, emit
from email.message import EmailMessage
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from threading import Semaphore
from Crypto.Cipher import AES
from transformers import pipeline
import base64
import smtplib
import os
import language_tool_python
import requests
import tensorflow

import Audio_input 

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', os.urandom(24))
socketio = SocketIO(app, cors_allowed_origins="http://localhost:3000")

text_generator = pipeline("text-generation")

API_KEY = "e732a2daae4fc9ea273cc8fad3f51ef7"

input_semaphore = Semaphore(0)
input = ""
decryptedPassword = ""
attachment = None

#sockets######################################################################

@app.route('/')
def index():
    return render_template('index.html')

@socketio.on('execute_voice_assistant')
def execute_voice_assistant():
    main()

@socketio.on('get_input_event')
def get_input_event(data):
    global input
    input = data['input_value']
    print("Data received: ", input)
    input_semaphore.release()

@socketio.on('get_password_event')
def get_password_event(data):
    global decryptedPassword
    decryptedPassword = data['password']
    print("decryptedPassword received: ", decryptedPassword)
    input_semaphore.release()
    
@socketio.on('send_attachment_file')
def send_attachment_file(data):
    global attachment
    attachment = data['file']
    print("attachment received:")
    input_semaphore.release()
    
@socketio.on('get_weather')
def get_weather(data):
    location = data['location']
    if location:
        # Call OpenWeatherMap API
        url = f"http://api.openweathermap.org/data/2.5/weather?q={location}&appid={API_KEY}&units=metric"
        response = requests.get(url)
        weather_data = response.json()
        print(weather_data)

        # Emit weather data to the client
        emit('weather_data', weather_data)
    else:
        emit('weather_error', {'error': 'Location not provided'})

@socketio.on('message')
def handle_message(message):
    print('Received message:', message)
    emit('message', message, broadcast=True)

################################################################################
#functions##########################################################
def send_email(sender_email, password, receiver_email, subject, body, attachment_file=None):
    message = MIMEMultipart()
    message["From"] = sender_email
    message["To"] = receiver_email
    message["Subject"] = subject

    message.attach(MIMEText(body, "plain"))
        
    if attachment_file:
        attachment_filename = attachment_file.name
        attachment_content = attachment_file.read()

        part = MIMEBase("application", "octet-stream")
        part.set_payload(attachment_content)
        encoders.encode_base64(part)
        part.add_header(
            "Content-Disposition",
            f"attachment; filename= {attachment_filename}",
        )
        message.attach(part)

    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
        server.login(sender_email, password)
        server.sendmail(sender_email, receiver_email, message.as_string())
    print("Email sent successfully!")
    emit('voice_assistant_event', {'statement': "Email was sent successfully to {}.".format(receiver_email)})

#################################################################################
def correct_grammar(input):
    tool = language_tool_python.LanguageTool('en-US')
    correctedText = tool.correct(input)
    return correctedText
##########################
def sendEmail():
    global input, attachment
    print("Please provide your email address:")
    emit('take_input_event', {'statement': "Please provide your email address:"})
    input_semaphore.acquire()
    sender_email = input
    print("sender email: ", sender_email)

    print("Please enter your email password:")
    emit('take_password_event', {'statement': "Please enter your email password:"})
    input_semaphore.acquire()
    password = decryptedPassword
    print("password: ", password)

    print("Please provide the recipient's email address:")
    emit('take_input_event', {'statement': "Please provide the recipient's email address:"})
    input_semaphore.acquire()
    receiver_email = input

    print("Please provide the subject of the email:")
    emit('general_response_event', {'statement': "Please provide the subject of the email (you can speak or type):"})
    Audio_input.captureAudio()
    subjectFromAudioInput = Audio_input.audioForSendEmail()
    subject = correct_grammar(subjectFromAudioInput)
    if not subject:
        emit('take_input_event', {'statement': "Please type the subject of the email:"})
        input_semaphore.acquire()
        subject = correct_grammar(input)

    print("Please provide the body of the email (you can speak or type):")
    emit('general_response_event', {'statement': "Please provide the body of the email (you can speak or type):"})
    Audio_input.captureAudio()
    bodyFromAudioInput = Audio_input.audioForSendEmail()  # Capture audio for body (optional)
    body = correct_grammar(bodyFromAudioInput)
    if not body:
        print("Please type the body of the email:")
        emit('take_input_event', {'statement': "Please type the body of the email:"})
        input_semaphore.acquire()
        body = correct_grammar(input)

    print("Would you like to attach a file? (yes/no)")
    emit('general_response_event', {'statement': "Would you like to attach a file? Yes or No"})
    Audio_input.captureAudio()
    attach_option = Audio_input.audioForSendEmail().lower()
    if not attach_option:
        emit('take_input_event', {'statement': "Type Yes or no"})
        input_semaphore.acquire()
        attach_option = input.lower()
    if attach_option == "yes":
        print("Please provide the path to the file:")
        emit('take_attachment_event', {'statement': "Please provide the path to the file:"})
        input_semaphore.acquire()
        attachment_file = attachment
    else:
        attachment_file = None

    print("\nPreview of the email:")
    emit('voice_assistant_event', {'statement': "Here's the preview of the email:"})
    print("From:", sender_email)
    print("To:", receiver_email)
    print("Subject:", subject)
    print("Body:", body)
    emit('general_response_event', {'statement': "From: {}".format(sender_email)})
    emit('general_response_event', {'statement': "To: {}".format(receiver_email)})
    emit('general_response_event', {'statement': "Subject: {}".format(subject)})
    emit('general_response_event', {'statement': "Body: \n {}".format(body)})
    if attachment_file:
        #print("Attachment:", attachment_file)
        emit('general_response_event', {'statement': "Attachment: {}".format(attachment_file)})
    print("\nDo you want to send this email? (yes/no)")
    emit('general_response_event', {'statement': "Do you want to send this email?(yes/no)"})
    Audio_input.captureAudio()
    confirm_option = Audio_input.audioForSendEmail().lower()
    print(confirm_option)
    if not confirm_option:
        emit('take_input_event', {'statement': "Type Yes or no: "})
        input_semaphore.acquire()
        confirm_option = input.lower()
        print(confirm_option)
    if confirm_option == "yes":
        try:
            print("inside")
            send_email(sender_email, password, receiver_email, subject, body, attachment_file)
        except Exception as e:
            print("inside except")
            print(e)
    else:
        print("Email not sent. You can make changes and try again.")
        emit('voice_assistant_event', {'statement': "Email not sent. You can make changes and try again."})


###########################################################################
def main():
    while True:
        Audio_input.captureAudio()
        user_input = Audio_input.audioForMain()
        print("done with capture")
        print("user input: ", user_input)
        if Audio_input.speech_detected:
            print(Audio_input.speech_detected)
            Audio_input.speech_detected = False
            words = user_input.lower().split()
            print(words)
            if any(any(keyword in word for keyword in ["mail", "email"]) for word in words):
                sendEmail()
            elif any(any(keyword in word for keyword in ["weather"]) for word in words):
                emit('asked_for_weather', {'statement': "Weather is being fetched"})
            elif user_input == "":
                print("Nothing to do. Please try again.")
            else:
                print("In")
                response = text_generator(user_input, max_length=50, do_sample=True, temperature=0.7)[0]['generated_text']
                emit('chat_response', {'statement': response})
                print("chat_response: ",response)
           
'''
if __name__ == "__main__":
    main()'''

if __name__ == '__main__':
    socketio.run(app, allow_unsafe_werkzeug=True)