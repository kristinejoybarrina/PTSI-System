// search.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDA_dVWeUjfgWTJHTIkIomj6ALtD_Lre6g",
  authDomain: "ptsi-project-48025.firebaseapp.com",
  projectId: "ptsi-project-48025",
  storageBucket: "ptsi-project-48025.appspot.com",
  messagingSenderId: "761002258561",
  appId: "1:761002258561:web:1fce70be6b73c1b628dd80"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

document.getElementById("searchBtn").addEventListener("click", async () => {
  const searchValue = document.getElementById("searchInput").value.trim().toLowerCase();
  const resultsList = document.getElementById("resultsList");
  resultsList.innerHTML = "";

  const snapshot = await getDocs(collection(db, "registrationForm"));
  snapshot.forEach((doc) => {
    const data = doc.data();
    if (data.firstname && data.firstname.toLowerCase().includes(searchValue)) {
      const li = document.createElement("li");
      li.textContent = `${data.firstname} ${data.lastname} (${data.suffix || ""})`;
      resultsList.appendChild(li);
    }
  });
});
