
// Import security utilities
import { validatePasswordStrength, hashPassword } from './js/security.js';

// Add CSRF token to the registration form
document.addEventListener('DOMContentLoaded', function() {
    const csrfToken = auth.sessionManager.getCSRFToken();
    const csrfInput = document.createElement('input');
    csrfInput.type = 'hidden';
    csrfInput.name = 'csrf_token';
    csrfInput.value = csrfToken;
    
    const registrationForm = document.querySelector('#signupContainer form');
    if (registrationForm) {
        registrationForm.appendChild(csrfInput);
        
        // Add password strength meter
        const passwordInput = document.getElementById('regPassword');
        if (passwordInput) {
            const strengthMeter = document.createElement('div');
            strengthMeter.id = 'password-strength-meter';
            strengthMeter.style.marginTop = '5px';
            strengthMeter.style.height = '5px';
            strengthMeter.style.borderRadius = '3px';
            passwordInput.insertAdjacentElement('afterend', strengthMeter);
            
            const strengthText = document.createElement('div');
            strengthText.id = 'password-strength-text';
            strengthText.style.fontSize = '0.8em';
            strengthText.style.marginTop = '5px';
            strengthMeter.insertAdjacentElement('afterend', strengthText);
            
            passwordInput.addEventListener('input', updatePasswordStrengthMeter);
        }
    }
});

// Update password strength meter
function updatePasswordStrengthMeter() {
    const password = this.value;
    const strengthMeter = document.getElementById('password-strength-meter');
    const strengthText = document.getElementById('password-strength-text');
    
    if (!password) {
        strengthMeter.style.width = '0%';
        strengthMeter.style.backgroundColor = 'transparent';
        strengthText.textContent = '';
        return;
    }
    
    const result = validatePasswordStrength(password);
    const width = (result.score / 5) * 100;
    
    let color, text;
    if (result.score <= 1) {
        color = '#ff4444'; // Red
        text = 'Very Weak';
    } else if (result.score <= 2) {
        color = '#ffbb33'; // Orange
        text = 'Weak';
    } else if (result.score <= 3) {
        color = '#00C851'; // Green
        text = 'Good';
    } else if (result.score <= 4) {
        color = '#5cb85c'; // Darker Green
        text = 'Strong';
    } else {
        color = '#5bc0de'; // Blue
        text = 'Very Strong';
    }
    
    strengthMeter.style.width = `${width}%`;
    strengthMeter.style.backgroundColor = color;
    strengthText.textContent = `Password Strength: ${text}`;
    strengthText.style.color = color;
}

// Name registration
document.querySelectorAll('input[name="firstname"], input[name="lastname"], input[name="middlename"], input[name="emergencyName"], input[name="relationship"]').forEach(input => {
    input.addEventListener('input', function () {
        this.value = this.value.replace(/[^a-zA-Z\s]/g, '');
    });
});

// Restrict phone/contact fields to numbers only
document.querySelectorAll('input[name="phone"], input[name="emergencyNumber"]').forEach(input => {
input.addEventListener('input', function () {
    this.value = this.value.replace(/[^\d]/g, '');
});
});

// Function to validate phone number format (Philippine format)
function validatePhoneNumber(phone) {
    const phoneRegex = /^(09|\+639)\d{9}$/;
    return phoneRegex.test(phone);
}

// Function to validate age (18 years or older)
function validateAge(age) {
    const ageNum = parseInt(age);
    return ageNum >= 18 && ageNum <= 100;
}

// Function to validate postal code (4 digits)
function validatePostalCode(postal) {
    return /^\d{4}$/.test(postal);
}

/**
 * Enhanced registration form validation with security improvements
 * @param {Event} event - The form submission event
 * @returns {Promise<boolean>} True if validation passes
 */
async function validateRegistrationForm(event) {
    // Prevent default form submission
    event.preventDefault();
    
    // Get form elements
    const form = event.target;
    const formData = new FormData(form);
    const csrfToken = formData.get('csrf_token');
    
    // Validate CSRF token
    if (!auth.sessionManager.validateCSRFToken(csrfToken)) {
        showError('Invalid request. Please refresh the page and try again.');
        return false;
    }
    
    // Get form values
    const firstname = formData.get('firstname').trim();
    const lastname = formData.get('lastname').trim();
    const email = formData.get('email').trim().toLowerCase();
    const address = formData.get('address').trim();
    const regPassword = formData.get('regPassword');
    const confirmPassword = formData.get('confirmPassword');
    const phone = formData.get('phone').trim();
    const age = formData.get('age');
    const postal = formData.get('postal').trim();
    const emergencyNumber = formData.get('emergencyNumber').trim();
    
    // Validate required fields
    const requiredFields = {
        'First Name': firstname,
        'Last Name': lastname,
        'Email': email,
        'Address': address,
        'Password': regPassword,
        'Confirm Password': confirmPassword,
        'Phone': phone,
        'Age': age,
        'Postal Code': postal,
        'Emergency Number': emergencyNumber
    };
    
    for (const [field, value] of Object.entries(requiredFields)) {
        if (!value) {
            showError(`Please fill in the ${field} field`);
            return false;
        }
    }
    
    // Validate email format
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
        showError('Please enter a valid email address');
        return false;
    }
    
    // Check if passwords match
    if (regPassword !== confirmPassword) {
        showError('Passwords do not match!');
        return false;
    }
    
    // Check password strength
    const passwordStrength = validatePasswordStrength(regPassword);
    if (!passwordStrength.isValid) {
        showError('Password is not strong enough. Please use a combination of uppercase, lowercase, numbers, and special characters.');
        return false;
    }
    
    // Validate phone number
    if (!validatePhoneNumber(phone)) {
        showError('Please enter a valid Philippine phone number (e.g., 09123456789 or +639123456789)');
        return false;
    }
    
    // Validate emergency contact number
    if (!validatePhoneNumber(emergencyNumber)) {
        showError('Please enter a valid emergency contact number');
        return false;
    }
    
    // Validate age
    if (!validateAge(age)) {
        showError('Age must be between 18 and 100 years old');
        return false;
    }
    
    // Validate postal code
    if (!validatePostalCode(postal)) {
        showError('Please enter a valid 4-digit postal code');
        return false;
    }
    
    try {
        // Hash the password before submission
        const hashedPassword = await hashPassword(regPassword);
        formData.set('regPassword', hashedPassword);
        formData.delete('confirmPassword'); // Remove confirm password before submission
        
        // Submit the form data via fetch API
        const response = await fetch(form.action || window.location.href, {
            method: 'POST',
            body: formData,
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            showSuccess('Registration successful! Redirecting to login...');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
        } else {
            showError(result.message || 'Registration failed. Please try again.');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showError('An error occurred during registration. Please try again.');
    }
    
    return false;
}

/**
 * Display an error message to the user
 * @param {string} message - The error message to display
 */
function showError(message) {
    const errorDiv = document.getElementById('error-message') || createMessageElement('error-message', 'error');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    
    // Scroll to the error message
    errorDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

/**
 * Display a success message to the user
 * @param {string} message - The success message to display
 */
function showSuccess(message) {
    const successDiv = document.getElementById('success-message') || createMessageElement('success-message', 'success');
    successDiv.textContent = message;
    successDiv.style.display = 'block';
}

/**
 * Create a message element if it doesn't exist
 * @param {string} id - The ID for the element
 * @param {string} type - The type of message (error/success)
 * @returns {HTMLElement} The created message element
 */
function createMessageElement(id, type) {
    const form = document.querySelector('form');
    const existing = document.getElementById(id);
    if (existing) return existing;
    
    const div = document.createElement('div');
    div.id = id;
    div.className = `alert alert-${type}`;
    div.style.padding = '10px';
    div.style.marginBottom = '15px';
    div.style.borderRadius = '4px';
    
    if (type === 'error') {
        div.style.backgroundColor = '#f8d7da';
        div.style.color = '#721c24';
        div.style.border = '1px solid #f5c6cb';
    } else {
        div.style.backgroundColor = '#d4edda';
        div.style.color = '#155724';
        div.style.border = '1px solid #c3e6cb';
    }
    
    form.prepend(div);
    return div;
}

// Add event listeners when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Get form elements
    const loginForm = document.querySelector('#loginContainer form');
    const registrationForm = document.querySelector('#signupContainer form');

    // Add submit event listeners to forms
    if (loginForm) {
        loginForm.addEventListener('submit', validateLoginForm);
    }
    if (registrationForm) {
        registrationForm.addEventListener('submit', validateRegistrationForm);
    }

    // Show login form by default
    const loginContainer = document.getElementById('loginContainer');
    if (loginContainer) {
        loginContainer.style.display = 'block';
    }

    // Real-time phone number validation
    const phoneInput = document.getElementById('phone');
    if (phoneInput) {
        phoneInput.addEventListener('input', function() {
            if (!validatePhoneNumber(this.value) && this.value.length > 0) {
                this.setCustomValidity('Please enter a valid Philippine phone number');
            } else {
                this.setCustomValidity('');
            }
        });
    }

    // Real-time emergency number validation
    const emergencyNumberInput = document.getElementById('emergencyNumber');
    if (emergencyNumberInput) {
        emergencyNumberInput.addEventListener('input', function() {
            if (!validatePhoneNumber(this.value) && this.value.length > 0) {
                this.setCustomValidity('Please enter a valid phone number');
            } else {
                this.setCustomValidity('');
            }
        });
    }

    // Real-time age validation
    const ageInput = document.getElementById('age');
    if (ageInput) {
        ageInput.addEventListener('input', function() {
            if (!validateAge(this.value) && this.value.length > 0) {
                this.setCustomValidity('Age must be between 18 and 100');
            } else {
                this.setCustomValidity('');
            }
        });
    }

    // Real-time postal code validation
    const postalInput = document.getElementById('postal');
    if (postalInput) {
        postalInput.addEventListener('input', function() {
            if (!validatePostalCode(this.value) && this.value.length > 0) {
                this.setCustomValidity('Please enter a valid 4-digit postal code');
            } else {
                this.setCustomValidity('');
            }
        });
    }

    // Prevent form submission if any field is invalid
    const form = document.querySelector('form');
    if (form) {
        form.addEventListener('submit', function(event) {
            if (!this.checkValidity()) {
                event.preventDefault();
                // Show validation messages
                const invalidInputs = this.querySelectorAll(':invalid');
                if (invalidInputs.length > 0) {
                    invalidInputs[0].focus();
                }
            }
        });
    }

    // Load address data
    loadAddressData();

    // Password validation
    const passwordInput = document.getElementById('regPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const passwordRequirements = {
        length: false,
        letter: false,
        number: false,
        match: false
    };

    function validatePassword() {
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;
        
        // Check length
        passwordRequirements.length = password.length >= 8;
        
        // Check for letters
        passwordRequirements.letter = /[A-Za-z]/.test(password);
        
        // Check for numbers
        passwordRequirements.number = /\d/.test(password);
        
        // Check if passwords match
        passwordRequirements.match = password === confirmPassword && password !== '';

        // Update visual feedback
        updatePasswordFeedback();
    }

    function updatePasswordFeedback() {
        // Only show errors if fields have been touched
        const showErrors = passwordInput.classList.contains('touched') || 
                          confirmPasswordInput.classList.contains('touched');

        // Update error messages
        let errorMessage = '';
        if (showErrors) {
            if (!passwordRequirements.length) {
                errorMessage += 'Password must be at least 8 characters long\n';
            }
            if (!passwordRequirements.letter) {
                errorMessage += 'Password must contain at least one letter\n';
            }
            if (!passwordRequirements.number) {
                errorMessage += 'Password must contain at least one number\n';
            }
            if (!passwordRequirements.match && confirmPasswordInput.value !== '') {
                errorMessage += 'Passwords do not match\n';
            }

            // Style borders only if fields have been touched
            passwordInput.style.border = (passwordRequirements.length && 
                                        passwordRequirements.letter && 
                                        passwordRequirements.number)
                                        ? '1px solid #4CAF50'
                                        : '2px solid #ff3333';

            confirmPasswordInput.style.border = passwordRequirements.match
                                              ? '1px solid #4CAF50'
                                              : '2px solid #ff3333';
        }

        // Display error message
        let errorDiv = document.getElementById('password-error');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.id = 'password-error';
            passwordInput.parentNode.appendChild(errorDiv);
        }

        errorDiv.innerHTML = errorMessage.replace(/\n/g, '<br>');
        errorDiv.className = showErrors && errorMessage ? 'visible' : '';

        // Set custom validity
        passwordInput.setCustomValidity(errorMessage);
        confirmPasswordInput.setCustomValidity(passwordRequirements.match ? '' : 'Passwords do not match');
    }


    // Add blur event listeners to mark fields as touched
    if (passwordInput) {
        passwordInput.addEventListener('blur', function() {
            this.classList.add('touched');
            validatePassword();
        });
    }
    
    if (confirmPasswordInput) {
        confirmPasswordInput.addEventListener('blur', function() {
            this.classList.add('touched');
            validatePassword();
        });
    }

    // Add focus event listener to show requirements
    if (passwordInput) {
        passwordInput.addEventListener('focus', function() {
            const errorDiv = document.getElementById('password-error');
            if (errorDiv) errorDiv.classList.add('visible');
        });
    }
});

 //Profile Upload Script
    const fileInput = document.getElementById('fileInput');
    const profileImage = document.getElementById('profileImage');
    const updateBtn = document.getElementById('updateBtn');
    const removeBtn = document.getElementById('removeBtn');
    const defaultImage = 'asset/img/noprofil.jpg';
  
    document.addEventListener('DOMContentLoaded', () => {
        // Handle login form submission
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', handleLogin);
        } else {
            console.error('Element with ID "loginForm" not found.');
        }
    
        // Handle update button and file input logic
        const updateBtn = document.getElementById('updateBtn'); // Ensure the element exists
        const fileInput = document.getElementById('fileInput'); // Ensure fileInput exists
    
        if (updateBtn && fileInput) {
            updateBtn.addEventListener('click', function () {
                fileInput.click(); // Trigger file input when update button is clicked
            });
        } else {
            console.error('Element with ID "updateBtn" or "fileInput" not found.');
        }
    });
    
    
    // Reset to default image
    removeBtn.addEventListener('click', function () {
      fileInput.value = '';
      profileImage.src = defaultImage;
    });

async function loadAddressData() {
    try {
        // Load regions
        const regionResponse = await fetch('json/refregion.json');
        const regionData = await regionResponse.json();
        
        // Load provinces
        const provinceResponse = await fetch('json/refprovince.json');
        const provinceData = await provinceResponse.json();
        
        // Load cities/municipalities
        const cityResponse = await fetch('json/refcitymun.json');
        const cityData = await cityResponse.json();
        
        // Load barangays
        const brgyResponse = await fetch('json/refbrgy.json');
        const brgyData = await brgyResponse.json();

        // Store data globally
        window.addressData = {
            regions: regionData.RECORDS,
            provinces: provinceData.RECORDS,
            cities: cityData.RECORDS,
            barangays: brgyData.RECORDS
        };

        // Initialize dropdowns
        populateRegions();
        setupAddressEventListeners();
    } catch (error) {
        console.error('Error loading address data:', error);
    }
}

function populateRegions() {
    const regionSelect = document.getElementById('region');
    if (!regionSelect) return;
    
    regionSelect.innerHTML = '<option value="">-- Select Region --</option>';
    
    window.addressData.regions.forEach(region => {
        regionSelect.innerHTML += `<option value="${region.regCode}">${region.regDesc}</option>`;
    });
}

function populateProvinces(regionCode) {
    const provinceSelect = document.getElementById('province');
    if (!provinceSelect) return;
    
    provinceSelect.innerHTML = '<option value="">-- Select Province --</option>';
    
    // Filter provinces by region code
    const provinces = window.addressData.provinces.filter(province => province.regCode === regionCode);
    
    provinces.forEach(province => {
        provinceSelect.innerHTML += `<option value="${province.provCode}">${province.provDesc}</option>`;
    });
}

function populateCities(provinceCode) {
    const citySelect = document.getElementById('city');
    if (!citySelect) return;
    
    citySelect.innerHTML = '<option value="">-- Select City/Municipality --</option>';
    
    const cities = window.addressData.cities.filter(city => city.provCode === provinceCode);
    
    cities.forEach(city => {
        citySelect.innerHTML += `<option value="${city.citymunCode}">${city.citymunDesc}</option>`;
    });
}

function populateBarangays(cityCode) {
    const barangaySelect = document.getElementById('barangay');
    if (!barangaySelect) return;
    
    barangaySelect.innerHTML = '<option value="">-- Select Barangay --</option>';
    
    const barangays = window.addressData.barangays.filter(brgy => brgy.citymunCode === cityCode);
    
    barangays.forEach(brgy => {
        barangaySelect.innerHTML += `<option value="${brgy.brgyCode}">${brgy.brgyDesc}</option>`;
    });
}

function setupAddressEventListeners() {
    const regionSelect = document.getElementById('region');
    const provinceSelect = document.getElementById('province');
    const citySelect = document.getElementById('city');

    if (regionSelect) {
        regionSelect.addEventListener('change', function() {
            const selectedRegion = this.value;
            populateProvinces(selectedRegion);
            clearSelect(document.getElementById('city'));
            clearSelect(document.getElementById('barangay'));
        });
    }

    if (provinceSelect) {
        provinceSelect.addEventListener('change', function() {
            const selectedProvince = this.value;
            populateCities(selectedProvince);
            clearSelect(document.getElementById('barangay'));
        });
    }

    if (citySelect) {
        citySelect.addEventListener('change', function() {
            const selectedCity = this.value;
            populateBarangays(selectedCity);
        });
    }
}

function clearSelect(selectElement) {
    if (selectElement) {
        selectElement.innerHTML = '<option value="">-- Select --</option>';
    }
}

function checkUserError() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('error') === 'user_exists') {
        alert("User already exists!");
    }
}

document.addEventListener('DOMContentLoaded', function() {
    checkUserError();
});


    document.addEventListener("DOMContentLoaded", () => {
        document.getElementById("registrationForm").addEventListener("submit", async function (e) {
        e.preventDefault();
    
        const form = e.target;
        const lastname = document.getElementById("lastname")?.value || "";
        const firstname = document.getElementById("firstname")?.value || "";
        const imageFile = document.getElementById("fileInput")?.files[0];
    
        try {
            const docRef = doc(collection(db, "registrationForm"));
            const userData = {
            id: docRef.id,
            lastname,
            firstname
            };
    
            if (imageFile) {
            const imageRef = ref(storage, `profileImages/${docRef.id}_${imageFile.name}`);
            await uploadBytes(imageRef, imageFile);
            const downloadURL = await getDownloadURL(imageRef);
            userData.imageUrl = downloadURL;
            }
    
            await setDoc(docRef, userData);
    
            alert("✅ Registration successful!");
            form.reset(); // safer than this.reset()
            const profileImage = document.getElementById("profileImage");
            if (profileImage) profileImage.src = "assets/img/noprofil.jpg";
        } catch (err) {
            console.error("❌ Registration error:", err);
            alert("Something went wrong. Please try again.");
          }
        });
    });
    

  document.getElementById('fileInput').addEventListener('change', function () {
    const file = this.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function (e) {
        document.getElementById('profileImage').src = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  });

  document.getElementById('fileInput').addEventListener('change', function(event) {
    const file = event.target.files[0];
    const preview = document.getElementById('profileImage'); // ✅ Correct ID

    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.src = e.target.result;
        }
        reader.readAsDataURL(file);
    } else {
        preview.src = 'img/noprofil.jpg'; // fallback
    }
});


