// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyD2PufovslwYKNT3YvOvH8_KQcRkGscre0",
  authDomain: "singing-contest-2025-dee66.firebaseapp.com",
  databaseURL: "https://singing-contest-2025-dee66-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "singing-contest-2025-dee66",
  storageBucket: "singing-contest-2025-dee66.firebasestorage.app",
  messagingSenderId: "1061704958178",
  appId: "1:1061704958178:web:b6d0e4605d2bd72bb2debb",
  measurementId: "G-T1Q002JDQJ"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const stateRef = ref(db, 'contestState');