import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HomePage from "./pages/Home.jsx";
import LiveDataPage from "./pages/LiveDataPage.jsx";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/live-data" element={<LiveDataPage />} />
      </Routes>
    </Router>
  );
}

export default App;
