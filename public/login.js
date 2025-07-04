// login.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDA_dVWeUjfgWTJHTIkIomj6ALtD_Lre6g",
  authDomain: "ptsi-project-48025.firebaseapp.com",
  projectId: "ptsi-project-48025",
  storageBucket: "ptsi-project-48025.appspot.com",
  messagingSenderId: "761002258561",
  appId: "1:761002258561:web:1fce70be6b73c1b628dd80"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

document.addEventListener("DOMContentLoaded", () => {
  const loginForm = document.getElementById("loginForm");

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;

    try {
      const snapshot = await getDocs(collection(db, "registrationForm"));
      let found = false;

      snapshot.forEach((doc) => {
        const user = doc.data();
        if (user.username === username && user.password === password) {
          found = true;
        }
      });

      if (found) {
        alert("✅ Login successful!");
        window.location.href = "dashboard.html";
      } else {
        alert("❌ Invalid username or password.");
      }
    } catch (error) {
      console.error("Login Error:", error);
      alert("Something went wrong. Please try again later.");
    }
  });
});
