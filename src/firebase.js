// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
const firebaseConfig = {
  apiKey: "AIzaSyAUXdpvbjuXhLs1GPPW5YsJ-1nlMfpPUJ4",
  authDomain: "the-guardian-eye.firebaseapp.com",
  projectId: "the-guardian-eye",
  storageBucket: "the-guardian-eye.firebasestorage.app",
  messagingSenderId: "583916618877",
  appId: "1:583916618877:web:40518deb23048818d6dd14",
  measurementId: "G-H4HVXB5RK4",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
