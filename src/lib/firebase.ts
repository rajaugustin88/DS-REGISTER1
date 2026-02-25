import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDlhwB86ywKIu9msoNLszBHkMRvq15v4tQ",
  authDomain: "ds-register-ab989.firebaseapp.com",
  projectId: "ds-register-ab989",
  storageBucket: "ds-register-ab989.firebasestorage.app",
  messagingSenderId: "548436980115",
  appId: "1:548436980115:web:eca80b5d25b6244e5f7866"
};

// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { auth, googleProvider };
