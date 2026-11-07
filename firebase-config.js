// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCyESVoP5IDjjXdfAks7J99L5mVTX1DKOA",
  authDomain: "nursing-hub-d0cca.firebaseapp.com",
  projectId: "nursing-hub-d0cca",
  storageBucket: "nursing-hub-d0cca.firebasestorage.app",
  messagingSenderId: "726797835301",
  appId: "1:726797835301:web:16cc83d678ec9b3a44b3cc",
  measurementId: "G-W70JNRF6FR"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);