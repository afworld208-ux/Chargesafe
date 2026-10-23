import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// നിങ്ങളുടെ യഥാർത്ഥ ഫയർബേസ് കോൺഫിഗറേഷൻ
const firebaseConfig = {
  apiKey: "AIzaSyD9Pj8m4XswZodCU2E6sYh30OK6C_r639A",
  authDomain: "charging-point-e4b72.firebaseapp.com",
  projectId: "charging-point-e4b72",
  storageBucket: "charging-point-e4b72.firebasestorage.app",
  messagingSenderId: "545220585842",
  appId: "1:545220585842:web:dac90640ef238a30bc55eb",
  measurementId: "G-JWL39FJKC0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// നിങ്ങളുടെ അഡ്മിൻ Gmail ID ഇവിടെ നൽകുക (താഴെയുള്ള ഇമെയിലിന് പകരം നിങ്ങളുടെ ഇമെയിൽ നൽകാം)
export const SUPER_ADMIN_EMAIL = "afworld208@gmail.com";

export const isSuperAdminEmail = (email: string | null) => {
  if (!email) return false;
  return email === SUPER_ADMIN_EMAIL;
};
