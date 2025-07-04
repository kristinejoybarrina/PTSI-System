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

let recorder_opt = {}; // Define the variable

window.onbeforeunload = function () {
  console.log('Recorder options:', recorder_opt);
};

// Function to toggle between login and registration forms
function toggleForms() {
    const loginContainer = document.getElementById('loginContainer');
    const signupContainer = document.getElementById('signupContainer');
    
    if (loginContainer.style.display === 'none') {
        loginContainer.style.display = 'block';
        signupContainer.style.display = 'none';
    } else {
        loginContainer.style.display = 'none';
        signupContainer.style.display = 'block';
    }
}

// Function to validate login form
function validateLoginForm(event) {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    if (!username || !password) {
        alert('Please fill in all fields');
        event.preventDefault();
        return false;
    }
    return true;
}

// AJAX CONNECTION - LOGIN//
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', handleLogin);
    } else {
      console.error('Element with ID "loginForm" not found.');
    }
  });
  
  // Update the handleLogin function to include security features
  function handleLogin(event) {
    event.preventDefault();

    try {
        // Check for brute force protection
        window.auth.checkBruteForceProtection();

        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const rememberMe = document.getElementById('rememberMe').checked;

        // Save remember me preference
        if (rememberMe) {
            localStorage.setItem('rememberedUser', JSON.stringify({ username }));
        } else {
            localStorage.removeItem('rememberedUser');
        }

        const xhr = new XMLHttpRequest();
        xhr.open('POST', 'login.php', true);
        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');

        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        const responseMessage = document.getElementById('responseMessage');
                        
                        if (response.success) {
                            // Start session
                            window.auth.sessionManager.startSession(response.userData);
                            responseMessage.textContent = 'Login successful!';
                            responseMessage.style.color = 'green';
                            window.location.href = 'dashboard.html';
                        } else {
                            // Increment failed login attempts
                            window.auth.incrementLoginAttempts();
                            responseMessage.textContent = 'Login failed: ' + response.message;
                            responseMessage.style.color = 'red';
                        }
                    } catch (error) {
                        console.error('Error parsing response:', error);
                        throw new Error('Invalid server response');
                    }
                } else {
                    console.error('Error: AJAX request failed.');
                    throw new Error('Server communication error');
                }
            }
        };

        const data = `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
        xhr.send(data);
    } catch (error) {
        const responseMessage = document.getElementById('responseMessage');
        responseMessage.textContent = error.message;
        responseMessage.style.color = 'red';
    }
}

// Add session check on page load
document.addEventListener('DOMContentLoaded', function() {
    // Check for remembered user
    const rememberedUser = localStorage.getItem('rememberedUser');
    if (rememberedUser) {
        const { username } = JSON.parse(rememberedUser);
        document.getElementById('username').value = username;
        document.getElementById('rememberMe').checked = true;
    }

    // Add login form handler
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Monitor user activity
    ['click', 'keypress', 'scroll', 'mousemove'].forEach(event => {
        document.addEventListener(event, () => {
            if (window.auth.sessionManager.getSession()) {
                window.auth.sessionManager.updateActivity();
            }
        });
    });

    // Check session every minute
    setInterval(() => {
        if (window.auth.sessionManager.getSession() && !window.auth.sessionManager.checkSession()) {
            alert('Your session has expired. Please log in again.');
            window.location.href = 'index.html';
        }
    }, 60000);
});
document.addEventListener('DOMContentLoaded', () => {
    const myForm = document.getElementById('loginForm');

    myForm.addEventListener('submit', function (e) {
        e.preventDefault(); // Stop default form action

        const formData = new FormData(myForm);

        fetch('login.php', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Use absolute path from your domain root
                window.location.href = data.redirect || '/PTSI-Project/client/dashboard.html';
            }
        });
    });
});
