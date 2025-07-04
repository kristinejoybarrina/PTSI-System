// functions/index.js
const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

exports.getAllUsers = functions.https.onRequest(async (req, res) => {
  try {
    const snapshot = await db.collection("registrationForm").get();
    const users = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        firstname: data.firstname || '',
        lastname: data.lastname || '',
        email: data.email || '',
        dateRegistered: data.dateRegistered || ''
      };
    });

    res.status(200).json({ success: true, users });
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});
