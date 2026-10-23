import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyD9Pj8m4XswZodCU2E6sYh300K...", // ⚠️ നിങ്ങളുടെ ബോക്സിൽ നിന്നുള്ള മുഴുവൻ apiKey കോപ്പി ചെയ്ത് നൽകുക
  authDomain: "charging-point-e4b72.firebaseapp.com",
  projectId: "charging-point-e4b72",
  storageBucket: "charging-point-e4b72.firebasestorage.app",
  messagingSenderId: "545220585842",
  appId: "1:545220585842:web:dac90640ef238...", // ⚠️ നിങ്ങളുടെ ബോക്സിൽ നിന്നുള്ള മുഴുവൻ appId കോപ്പി ചെയ്ത് നൽകുക
  measurementId: "G-JWL39FJKC0"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// നിങ്ങളുടെ യഥാർത്ഥ Gmail ID ഇവിടെ നൽകുക
export const SUPER_ADMIN_EMAIL = "your-admin-email@gmail.com";

export const isSuperAdminEmail = (email: string | null) => {
  if (!email) return false;
  return email === SUPER_ADMIN_EMAIL;
};
