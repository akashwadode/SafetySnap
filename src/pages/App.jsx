import { useState } from "react";
import viteLogo from "/vite.svg";
import Something from "./Somthing.jsx";
import "../styles/App.css";
import Navbar from "../components/Navbar.jsx";
import HomePage from "./HomePage.jsx";

function App() {
  const [count, setCount] = useState(0);

  return (
    <>
    <Navbar />
      <HomePage />
    </>
  );
}

export default App;
