import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, collection, doc, setDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

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

// 📌 Convert image to base64
function readAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result); // result is base64 string
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("registrationForm");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const imageFile = document.getElementById("fileInput")?.files[0];
    const profileImage = document.getElementById("profileImage");

    try {
      const docRef = doc(collection(db, "registrationForm"));

      const userData = {
        id: docRef.id,
        lastname: form.lastname.value,
        firstname: form.firstname.value,
        middlename: form.middlename.value,
        suffix: form.suffix.value,
        email: form.email.value,
        age: form.age.value,
        gender: form.gender.value,
        phone: form.phone.value,
        street: form.street.value,
        region: form.region.value,
        province: form.province.value,
        city: form.city.value,
        barangay: form.barangay.value,
        emergencyName: form.emergencyName.value,
        relationship: form.relationship.value,
        emergencyNumber: form.emergencyNumber.value,
        username: form.username.value,
        password: form.password.value,
        confirmPassword: form.confirmPassword.value
      };

      if (imageFile) {
        const base64 = await readAsBase64(imageFile);
        userData.imageBase64 = base64;
      }

      await setDoc(docRef, userData);

      alert("✅ Registration successful!");
      form.reset();
      if (profileImage) profileImage.src = "assets/img/noprofil.jpg";
    } catch (err) {
      console.error("❌ Registration error:", err);
      alert("Something went wrong. Please try again.");
    }
  });

  // 🖼 Preview Image
  document.getElementById("fileInput")?.addEventListener("change", function (e) {
    const file = e.target.files[0];
    const preview = document.getElementById("profileImage");
    if (file && preview) {
      const reader = new FileReader();
      reader.onload = (event) => {
        preview.src = event.target.result;
      };
      reader.readAsDataURL(file);
    } else {
      if (preview) preview.src = "assets/img/noprofil.jpg";
    }
  });
});
