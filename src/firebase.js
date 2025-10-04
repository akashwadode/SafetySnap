// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAUXdpvbjuXhLs1GPPW5YsJ-1nlMfpPUJ4",
  authDomain: "the-guardian-eye.firebaseapp.com",
  projectId: "the-guardian-eye",
  storageBucket: "the-guardian-eye.firebasestorage.app",
  messagingSenderId: "583916618877",
  appId: "1:583916618877:web:40518deb23048818d6dd14",
  measurementId: "G-H4HVXB5RK4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);    