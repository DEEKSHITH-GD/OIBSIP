import React, { useEffect, useState } from 'react';
import WeatherIcon from 'react-icons-weather';
import io from 'socket.io-client';
import CryptoJS from 'crypto-js';
import Header from './Header';
import Footer from './Footer';
import BgImage from '../assets/background.jpg'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faWind } from '@fortawesome/free-solid-svg-icons';

const socket = io('http://localhost:5000');

function FrontEnd() {
    const [output, setOutput] = useState('')
    const [fieldValue, setFieldValue] = useState('')
    const [passwordValue, setPasswordValue] = useState('')
    const [showFormField, setShowFormField] = useState(false)
    const [showPasswordField, setShowPasswordField] = useState(false)
    const [showAttachmentForm, setShowAttachmentForm] = useState(false)
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [showLoginForm, setShowLoginForm] = useState(false)
    const [hasLoginFailed, setHasLoginFailed] = useState(false)
    const [showLoginSuccess, setShowLoginSuccess] = useState(false)
    const [messages, setMessages] = useState([])
    const [messageInput, setMessageInput] = useState('')
    const [allowMessaging, setAllowMessaging] = useState(false)
    const [location, setLocation] = useState('')
    const [fetchingWeather, setFetchingWeather] = useState(false)
    const [weatherData, setWeatherData] = useState(null)
    const [isWeatherLoaded, setIsWeatherLoaded] = useState(false)
    const [showLocationInput, setShowLocationInput] = useState(false)
    

    useEffect(() => {

        if ("geolocation" in navigator) {
            console.log("inside if")
            navigator.geolocation.getCurrentPosition((position) => {
                const { latitude, longitude } = position.coords
                fetchLocation(latitude, longitude)
            });
        } else {
            console.log("Geolocation is not supported by this browser.")
            setOutput(prevOutput => prevOutput + "\n Geolocation is not supported by this browser.")  
        }

        if (isWeatherLoaded) {
            document.body.style.backgroundImage = `url(${BgImage})`
        } else {
            document.body.style.backgroundImage = 'none'
        }

        socket.on('weather_data', (data) => {
            setWeatherData(data);
        });

        socket.on('weather_error', (error) => {
            console.error('Error fetching weather:', error);
            setOutput(prevOutput => prevOutput + '\n Error fetching weather:')
        });

        socket.on('voice_assistant_event', (data) => {
            setOutput(prevOutput => prevOutput + '\n' + data.statement)
            speak(data.statement)
        });

        socket.on('general_response_event', (data) => {
            setOutput(prevOutput => prevOutput + '\n' + data.statement)
        });

        socket.on('take_input_event', (data) => {
            setOutput(prevOutput => prevOutput + '\n' + data.statement)
            speak(data.statement)
            setShowFormField(true)
        });

        socket.on('take_password_event', (data) => {
            setOutput(prevOutput => prevOutput + '\n' + data.statement)
            speak(data.statement)
            setShowPasswordField(true)
        });

        socket.on('take_attachment_event', (data) => {
            setOutput(prevOutput => prevOutput + '\n' + data.statement)
            speak(data.statement)
            setShowAttachmentForm(true)
        });

        socket.on('message', (message) => {
            setMessages([...messages, message]);
        });

        socket.on('asked_for_weather', (data) => {
            setOutput(prevOutput => prevOutput + '\n' + data.statement)
            speak(data.statement)
            getWeather()
        });

        socket.on('chat_response', (data) => {
            setOutput(prevOutput => prevOutput + '\n' + data.statement)
            speak(data.statement)
        });
        
        return () => {
            document.body.style.backgroundImage = 'none';
            socket.off('voice_assistant_event')
            socket.off('general_response_event')
            socket.off('take_input_event')
            socket.off('take_password_event')
            socket.off('take_attachment_event')
            socket.off('message')
            socket.off('weather_data')
            socket.off('weather_error')
            socket.off('asked_for_weather')
            socket.off('chat_response')

        };
    }, [isWeatherLoaded,messages]);

    const fetchLocation = (latitude, longitude) => {
        fetch(`https://api.opencagedata.com/geocode/v1/json?q=${latitude}+${longitude}&key=d32588719faa4b678ce524370b00a404`)
            .then(response => response.json())
            .then(data => {
                console.log('Response from OpenCage API:', data)
                setLocation(data.results[0].components.suburb)
                console.log("Fetched Location:", data.results[0].components.suburb)
            })
            .catch(error => console.error('Error fetching location:', error))
    };

    const getWeather = () => {
        setOutput('')
        setShowLoginForm(false)
        setShowLoginSuccess(false)
        setHasLoginFailed(false)
        setAllowMessaging(false)
        setFetchingWeather(true)
        setIsWeatherLoaded(true)
        socket.emit('get_weather', { location })
        setLocation('')
        setShowLocationInput(true)    
    };

    const getTemperatureIcon = (temperature) => {
        if (temperature < 0) {
            return <span className="bi bi-thermometer-snow" title="Cold"></span>
        } else if (temperature >= 0 && temperature < 25) {
            return <span className="bi bi-thermometer-half" title="Moderate"></span>
        } else {
            return <span className="bi bi-thermometer-sun" title="Hot"></span>
        }
    };

    const executeVoiceAssistant = () => {
        setFetchingWeather(false)
        setIsWeatherLoaded(false)
        setWeatherData(null)
        setShowLoginForm(false)
        setAllowMessaging(false)
        setShowLocationInput(false)
        setAllowMessaging(false)
        setShowLoginSuccess(false)
        setHasLoginFailed(false)
        console.log("fieldValue:"+fieldValue)
        socket.emit('execute_voice_assistant')
    };

    const speak = (text) => {
        const voiceOutput = new SpeechSynthesisUtterance(text)
        window.speechSynthesis.speak(voiceOutput)
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (showFormField) {
            console.log(fieldValue)
            socket.emit('get_input_event', { input_value: fieldValue })
        }
        if (showPasswordField) {
            e.preventDefault();
            socket.emit('get_password_event', { password: passwordValue })
        }
        setOutput(prevOutput => prevOutput + (showFormField ? fieldValue : "Hidden"))
        setShowFormField(false)
        setShowPasswordField(false)
        setFieldValue('')
        setPasswordValue('')
    };

    const handleFileInputChange = (e) => {
        const file = e.target.files[0]
        socket.emit('send_attachment_file', { file })
    };

    const executeLoginToChatApp = () =>{
        setFetchingWeather(false)
        setIsWeatherLoaded(false)
        setOutput('')
        console.log(showLoginForm)
        setWeatherData(null)
        setShowLocationInput(false)
        setAllowMessaging(false)
        setShowLoginForm(true)
    }

    const handleLogin = () => {
        if (username === 'user' && password === '123') {
            console.log('Successful')
            setShowLoginForm(false)
            setUsername('')
            setPassword('')
            setShowLoginSuccess(true)
            setHasLoginFailed(false)
            setAllowMessaging(true)
        } else {
            console.log('Failed');
            setPassword('')
            setShowLoginForm(true)
            setHasLoginFailed(true);
            setShowLoginSuccess(false);
        }
    };

    const sendMessage = () => {
        if (messageInput.trim() !== '') {
            socket.emit('message', messageInput);
            setMessageInput('');
            }
    };

    return (
        <div className='frontEnd'>
            <Header />
            <div className='container'>
                <button className='btn btn-primary' onClick={executeVoiceAssistant}>
                    <i className="bi bi-mic"/> Task 1 - Voice Assistant
                </button>
                <button className='btn btn-success' onClick={getWeather}>
                    <i className="bi bi-cloud-sun"/><i className="bi-thermometer-sun"/> Task 2 - Weather App
                </button>
                <button className='btn btn-info' onClick={executeLoginToChatApp}>
                    <i className="bi bi-chat-left-text"/> Task 3 - Chat Application
                </button>
                <div className={`output-div shadow ${fetchingWeather ? 'glossyBg' : 'defaulltBg'}`}>
                    <pre>{output}</pre>
                    {showFormField && (
                        <form onSubmit={handleSubmit}>
                            <input
                                type="text"
                                placeholder="Enter your email"
                                value={fieldValue}
                                onChange={(e) => setFieldValue(e.target.value)}
                                required
                            />
                            <button className="btn btn-success" type="submit">Submit</button>
                        </form>
                    )}
                    {showPasswordField && (
                        <form onSubmit={handleSubmit}>
                            <input
                                type="password"
                                placeholder="Enter your password"
                                value={passwordValue}
                                onChange={(e) => setPasswordValue(e.target.value)}
                                required
                            />
                            <button className="btn btn-success" type="submit">Submit</button>
                        </form>
                    )}
                    {showAttachmentForm && (
                        <form>
                            <label htmlFor="fileInput">Add attachment:</label>
                            <input
                                type="file"
                                id="fileInput"
                                name="fileInput"
                                onChange={(e) => handleFileInputChange(e)}
                            />
                        </form>
                    )}
                    {showLoginForm && (
                        <form onSubmit={handleLogin}>
                            <label htmlFor="Username">Username:</label>
                            <input
                            type="text"
                            id="Username"
                            placeholder="Username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            /><br />
                            <label htmlFor="Password">Password:</label>
                            <input
                            type="password"
                            id = "Password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            /><br />
                            <button className="btn btn-success" type="submit">Login</button>
                        </form>
                    )}
                    {hasLoginFailed && (
                        <div className="alert alert-warning">Invalid Credentials</div>
                    )}
                    {showLoginSuccess && <div className="alert alert-success">Login Successful, You can chat now!</div>}
                    {allowMessaging && (
                        <div>
                            <div>
                                {messages.map((message, index) => (
                                    <div key={index}>{message}</div>
                                ))}
                            </div>
                            <input
                                type="text"
                                value={messageInput}
                                onChange={(e) => setMessageInput(e.target.value)}
                                style={{ width: "300px", height: "38px" }}
                            />
                            <button className="btn btn-success" onClick={sendMessage}>Send</button>
                        </div>
                    )}
                    {weatherData && weatherData.sys && (
                        <div className="weatherDiv">
                            <div className='weatherFor'>
                                <h1>Weather for {weatherData.name}, {weatherData.sys.country}</h1>
                            </div><br/>
                            <div className='weatherGrid'>
                                <div className='weatherContainers'>
                                    <p className='icons'>{getTemperatureIcon(weatherData.main.temp)}</p>
                                    <p>Temperature: {weatherData.main.temp}°C</p>
                                </div>
                                <div className='weatherContainers'>
                                    <p className='icons'><WeatherIcon name="owm" iconId={weatherData.cod.toString()} flip="horizontal" rotate="90" /></p>
                                    <p>Weather: {weatherData.weather[0].description}</p>
                                </div>
                                <div className='weatherContainers'>
                                    <p className='icons'><FontAwesomeIcon icon={faWind} style={{ transform: `rotate(${weatherData.wind.deg}deg)` }} /></p>
                                    <p>Wind Speed: {weatherData.wind.speed} m/s</p>
                                </div>
                            </div><br/> <br />
                        </div>
                    )}
                    {showLocationInput && (
                        <div className='weather_div'>
                            <input
                                type="text"
                                placeholder="Enter the location to know the weather"
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                style={{ width: "300px", height: "35px" }}
                            /><br />
                            <button className="btn" onClick={getWeather}>Get Weather</button>
                        </div>
                    )}
                </div>
            </div>
            <Footer />
        </div>
    );
}

export default FrontEnd;