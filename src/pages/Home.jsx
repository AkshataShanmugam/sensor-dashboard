import React from "react";
import { Link } from "react-router-dom";
import "./HomePage.css";

const HomePage = () => (
  <div className="home-page">
    <h1>Welcome to the Sensor Dashboard</h1>
    <p>Monitor and analyze real-time data from your sensors.</p>
    <div className="links">
      <Link to="/live-data">View Live Data</Link>
    </div>
  </div>
);

export default HomePage;
