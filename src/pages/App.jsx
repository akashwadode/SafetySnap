import { Routes, Route } from "react-router-dom";
import { Box } from "@mui/material";
import Navbar from "../components/Navbar";
import HomePage from "./HomePage";
import LoginPage from "./LoginPage";
import SignupPage from "./SignupPage";
import UploadPage from "./UploadPage";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../firebase";
function ProtectedRoute({ children }) {
  const [user, loading] = useAuthState(auth);
  if (loading) return <div>Loading...</div>;
  return user ? children : <Navigate to="/login" />;
}

function App() {
  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f5f5f5" }}>
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route
          path="/upload"
          element={
            <ProtectedRoute>
              <UploadPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Box>
  );
}

export default App;
