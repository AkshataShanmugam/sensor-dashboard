import React, { useEffect, useState } from "react";
import { ref, get, set, push } from "firebase/database";
import { db } from "../firebase";
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import './LiveDataPage.css';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import emailjs from 'emailjs-com';
import LiveDataTable from "./LiveDataTable";
import { FaMicrophone, FaMoon, FaSun, FaEye, FaEyeSlash } from "react-icons/fa"; 


ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const LiveDataPage = () => {
  const [sensorData, setSensorData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);
  const [showTable, setShowTable] = useState(false);
  const [sleepMode, setSleepMode] = useState(false);
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    if ("Notification" in window) {
      Notification.requestPermission().then((permission) => {
        if (permission !== "granted") {
          console.warn("Notifications are disabled. Enable them for alerts.");
        }
      });
    }
  }, []);

  const startVoiceRecognition = () => {
    const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.start();
    setIsListening(true);

    recognition.onresult = (event) => {
      const command = event.results[0][0].transcript.toLowerCase();
      console.log("Voice command received:", command);

      if (command.includes("sleep mode")) {
        toggleSleepMode();
      } else if (command.includes("refresh data")) {
        fetchData();
      } else {
        toast.info("Unrecognized command: " + command);
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      toast.error("Error recognizing speech: " + event.error);
    };

    recognition.onend = () => {
      setIsListening(false);
    };
  };

  const sendEmail = (templateParams) => {
    emailjs.send('service_q0u4q5g', 'template_9381vwd', templateParams, '4ByVRS4fT3qS80hc0').then(
      (response) => {
        console.log('Email sent successfully', response);
      },
      (error) => {
        console.error('Error sending email', error);
      }
    );
  };

  const fetchData = () => {
    const sensorRef = ref(db, "sensor_data/");
    get(sensorRef)
      .then((snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          const formattedData = Object.values(data);
          setSensorData(formattedData);
        } else {
          setSensorData([]);
        }
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching data: ", error);
        setLoading(false);
      });
  };

  const checkThresholds = () => {
    const currentTime = Date.now();
    if (sensorData.length >= 5) {
      console.log("checking...")
      const last5Temps = sensorData.slice(-5).map(item => item.temperature);
      const last5Humidity = sensorData.slice(-5).map(item => item.humidity);
      const last5AirQuality = sensorData.slice(-5).map(item => item.air_quality);

      const avgTemp = last5Temps.reduce((a, b) => a + b, 0) / last5Temps.length;
      const avgHumidity = last5Humidity.reduce((a, b) => a + b, 0) / last5Humidity.length;
      const avgAirQuality = last5AirQuality.reduce((a, b) => a + b, 0) / last5AirQuality.length;

      const tempAlert = last5Temps.every(val => (val > 10) || (val < 10));
      const humidityAlert = last5Humidity.every(val => val > 60);
      const airQualityAlert = last5AirQuality.every(val => val > 50);

      if (tempAlert || humidityAlert || airQualityAlert) {
        const alertType = tempAlert
          ? 'Temperature Alert'
          : humidityAlert
          ? 'Humidity Alert'
          : 'Air Quality Alert';
        const message = tempAlert
          ? 'Temperature is currently in an uncomfortable stage!'
          : humidityAlert
          ? 'Humidity is currently in an uncomfortable stage!'
          : 'Air Quality is consistently poor!';
        
        toast.error(message);

        const readableTime = new Date(currentTime).toLocaleString();

        // Prepare the email template parameters
        const templateParams = {
          timestamp: readableTime,
          temperature: avgTemp.toFixed(1),
          humidity: avgHumidity.toFixed(1),
          air_quality: avgAirQuality.toFixed(1),
        };

        // Send email using EmailJS
        sendEmail(templateParams);

        // Prepare the alert data to log into Firebase
        const alertData = {
          type: alertType,
          issue: message,
          averageReadings: {
            temperature: avgTemp.toFixed(1),
            humidity: avgHumidity.toFixed(1),
            airQuality: avgAirQuality.toFixed(1),
          },
          timestamp: readableTime,
        };

        // Reference to "alerts" collection in Firebase and push the data
        const alertsRef = ref(db, "alerts");
        push(alertsRef, alertData)
          .then(() => {
            console.log("Alert logged successfully:", alertData);
          })
          .catch((error) => {
            console.error("Error logging alert to Firebase:", error);
          });
        
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("Alert!", { body: message });
        }
        try {
          const audio = new Audio("/simple-notification-152054.mp3");
          audio.play();
        } catch (error) {
          console.error("Error playing audio:", error);
        }
      }
    }
  };

  const toggleSleepMode = () => {
    setSleepMode(!sleepMode);
    set(ref(db, "user_data/sleep_mode"), !sleepMode);
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      fetchData();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      checkThresholds();
    }, 5 * 60000);
    return () => clearInterval(interval);
  }, []);

  const chartData = {
    labels: sensorData.slice(-15).map(item => item.timestamp),
    datasets: [
      {
        label: 'Temperature (°C)',
        data: sensorData.slice(-15).map(item => item.temperature),
        borderColor: '#FF5733',
        fill: false,
        tension: 0.1
      },
      {
        label: 'Humidity (%)',
        data: sensorData.slice(-15).map(item => item.humidity),
        borderColor: '#28B9B5',
        fill: false,
        tension: 0.1
      },
      {
        label: 'Air Quality ',
        data: sensorData.slice(-15).map(item => item.air_quality),
        borderColor: '#F1C40F',
        fill: false,
        tension: 0.1
      }
    ]
  };

  if (loading) {
    return <div>Loading data...</div>;
  }

  if (!sensorData.length) {
    return <div>No data available</div>;
  }

  const currentLightStatus = sensorData.slice(-2).every((item) => item.light_on === true) ? "ON" : "OFF";

  return (
    <div className="live-data-page">
      <ToastContainer />
      <h1 className="heading">Live Sensor Data</h1>

      <h3 className={`status-indicator ${currentLightStatus === "ON" ? "on" : "off"}`}>
        Light Status: {currentLightStatus}
      </h3>

      <div className="button-container">
        <button className="refresh-button" onClick={fetchData}>
          Refresh Data
        </button>
        
        <button className="toggle-sleep-mode" onClick={toggleSleepMode}>
          {sleepMode ? "Disable Sleep Mode  " : "Enable Sleep Mode "} 
          {sleepMode ? <FaSun size={16} /> : <FaMoon size={17} />}
        </button>

        <button className="toggle-button" onClick={() => setShowTable(!showTable)}>
          {showTable ? 'Hide Table ' : 'Show Table '}
          {showTable ? <FaEyeSlash size={18} /> : <FaEye size={18} />}
        </button>

        <button
          onClick={startVoiceRecognition}
          disabled={isListening}
          className="voice-control-button"
        >
          {isListening ? <FaMicrophone size={20} /> : "Start Voice Control"}
        </button>
      </div>

      {alert && <div style={{ color: 'red' }}><strong>{alert}</strong></div>}

      <div className="chart-container">
        <Line data={chartData} className="live-data-chart" />
      </div>

      {showTable && <LiveDataTable sensorData={sensorData} />}
    </div>
  );
};

export default LiveDataPage;
