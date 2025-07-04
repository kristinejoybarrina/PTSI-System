
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

// Enhanced registration form validation
function validateRegistrationForm(event) {
    const firstname = document.getElementById('firstname').value;
    const lastname = document.getElementById('lastname').value;
    const email = document.getElementById('email').value;
    const address = document.getElementById('address').value;
    const regPassword = document.getElementById('regPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const phone = document.getElementById('phone').value;
    const age = document.getElementById('age').value;
    const postal = document.getElementById('postal').value;
    const emergencyNumber = document.getElementById('emergencyNumber').value;

    // Check if required fields are filled
    if (!firstname || !lastname || !email || !address || !regPassword || !confirmPassword || !phone || !age || !postal || !emergencyNumber) {
        alert('Please fill in all required fields');
        event.preventDefault();
        return false;
    }

    // Validate email format
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
        alert('Please enter a valid email address');
        event.preventDefault();
        return false;
    }

    // Check if passwords match
    if (regPassword !== confirmPassword) {
        alert('Passwords do not match!');
        event.preventDefault();
        return false;
    }

    // Check password strength (at least 8 characters, containing numbers and letters)
    const passwordPattern = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;
    if (!passwordPattern.test(regPassword)) {
        alert('Password must be at least 8 characters long and contain both letters and numbers');
        event.preventDefault();
        return false;
    }

    // Validate phone number
    if (!validatePhoneNumber(phone)) {
        alert('Please enter a valid Philippine phone number (e.g., 09123456789 or +639123456789)');
        event.preventDefault();
        return false;
    }

    // Validate emergency contact number
    if (!validatePhoneNumber(emergencyNumber)) {
        alert('Please enter a valid emergency contact number');
        event.preventDefault();
        return false;
    }

    // Validate age
    if (!validateAge(age)) {
        alert('Age must be between 18 and 100 years old');
        event.preventDefault();
        return false;
    }

    // Validate postal code
    if (!validatePostalCode(postal)) {
        alert('Please enter a valid 4-digit postal code');
        event.preventDefault();
        return false;
    }

    return true;
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


