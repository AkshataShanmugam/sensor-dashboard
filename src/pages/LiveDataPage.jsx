import React, { useEffect, useState } from "react";
import { ref, get, set } from "firebase/database";
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
    if (sensorData.length >= 5) {
      const last5Temps = sensorData.slice(-5).map(item => item.temperature);
      const last5Humidity = sensorData.slice(-5).map(item => item.humidity);
      const last5AirQuality = sensorData.slice(-5).map(item => item.air_quality);

      const tempAlert = last5Temps.every(val => (val > 30) || (val < 10));
      const humidityAlert = last5Humidity.every(val => val > 60);
      const airQualityAlert = last5AirQuality.every(val => val > 50);

      if (tempAlert || humidityAlert || airQualityAlert) {
        const message = tempAlert
          ? 'Temperature is currently in an uncomfortable stage!'
          : humidityAlert
          ? 'Humidity is currently in an uncomfortable stage!'
          : 'Air Quality is consistently poor!';
        
        toast.error(message);

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
    checkThresholds();
  }, [sensorData]);

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
