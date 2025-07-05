// MENU BUTTONS CLICKED
document.addEventListener('DOMContentLoaded', () => {
    const menuItems = document.querySelectorAll('.menu li');

    // Restore active from localStorage
    const activeId = localStorage.getItem('activeMenuId');
    if (activeId) {
        document.getElementById(activeId)?.classList.add('active');
    }

    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            const menuId = item.id;

            menuItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');

            localStorage.setItem('activeMenuId', menuId);

            // Admin-side navigation
            if (window.location.pathname.includes('/admin-side/')) {
                if (menuId === 'dashboard') {
                    window.location.href = 'dashboard_admin.html';
                } else if (menuId === 'user-account') {
                    window.location.href = 'user_admin.html';
                } else if (menuId === 'lab-result') {
                    window.location.href = 'lab_result_admin.html';
                } else if (menuId === 'appointment') {
                    window.location.href = 'appointment_admin.html';
                }
            } else {
                // Client-side navigation
                if (menuId === 'dashboard') {
                    window.location.href = 'dashboard.html';
                } else if (menuId === 'lab-result') {
                    window.location.href = 'labresult-login.html';
                } else if (menuId === 'appointment') {
                    window.location.href = 'appointment.html';
                }
            }
        });
    });

    //Logout
    const logoutBtn = document.getElementById('logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            // Clear any stored login data
            localStorage.removeItem('activeMenuId');
            localStorage.removeItem('user'); 

            // Redirect to login page
            window.location.href = '../index.html'; 
        });
    }
});

// NOTIFICATION///////////
document.addEventListener('DOMContentLoaded', function () {
    const notifications = [
        { id: 1, type: 'success', message: 'Appointment Confirmed', time: '1 hour ago' },
        { id: 2, type: 'info', message: 'New Lab Results Available', time: '3 hours ago' },
        { id: 3, type: 'warning', message: 'Reminder: Follow-up Checkup Tomorrow', time: 'Yesterday' }
    ];

    function getNotificationIcon(type) {
        switch (type) {
            case 'success':
                return `
                    <svg class="text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                `;
            case 'info':
                return `
                    <svg class="text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                `;
            case 'warning':
                return `
                    <svg class="text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                    </svg>
                `;
            default:
                return '';
        }
    }

    const notificationBell = document.getElementById('notificationBell');
    const notificationDropdown = document.getElementById('notificationDropdown');
    const notificationItemsContainer = document.getElementById('notificationItems');

    if (notificationBell && notificationDropdown && notificationItemsContainer) {
        notificationBell.addEventListener('click', function (event) {
            event.stopPropagation();
            notificationDropdown.classList.toggle('active');
        });

        notificationItemsContainer.innerHTML = '';
        notifications.forEach(notification => {
            const notificationItem = document.createElement('div');
            notificationItem.classList.add('notification-item');
            notificationItem.innerHTML = `
                ${getNotificationIcon(notification.type)}
                <div>
                    <p class="title">${notification.message}</p>
                    <p class="time">${notification.time}</p>
                </div>
            `;
            notificationItemsContainer.appendChild(notificationItem);
        });

        window.addEventListener('click', function (event) {
            if (!notificationBell.contains(event.target) && !notificationDropdown.contains(event.target)) {
                if (notificationDropdown.classList.contains('active')) {
                    notificationDropdown.classList.remove('active');
                }
            }
        });
    }
});

async function loadAddressData() {
    try {
        // Load regions
        const regionResponse = await fetch('../json/refregion.json');
        const regionData = await regionResponse.json();
        
        // Load provinces
        const provinceResponse = await fetch('../json/refprovince.json');
        const provinceData = await provinceResponse.json();
        
        // Load cities/municipalities
        const cityResponse = await fetch('../json/refcitymun.json');
        const cityData = await cityResponse.json();
        
        // Load barangays
        const brgyResponse = await fetch('../json/refbrgy.json');
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

//SIDEBAR HIDE
document.addEventListener("DOMContentLoaded", function () {
    const hamburger = document.getElementById('hamburger');
    const toggleBtn = document.getElementById('toggleSidebar');
    const sidebar = document.getElementById('sidebar');

    // Function to collapse sidebar if on mobile
    function handleResponsiveSidebar() {
        if (window.innerWidth <= 640) {
            sidebar.classList.remove('active'); // ensure hidden on small screen
            sidebar.classList.add('collapsed');
            if (hamburger) hamburger.style.display = '';
        } else {
            sidebar.classList.remove('collapsed'); // ensure shown on large screen
            sidebar.classList.add('active');
            if (hamburger) hamburger.style.display = 'none';
        }
    }

    // Initial check
    handleResponsiveSidebar();

    // Re-check on window resize
    window.addEventListener('resize', handleResponsiveSidebar);

    // Hamburger shows sidebar (for mobile)
    if (hamburger && sidebar) {
        hamburger.addEventListener('click', () => {
            console.log("✅ Hamburger clicked");    
            sidebar.classList.add('active');
            sidebar.classList.remove('collapsed');
            if (hamburger) hamburger.style.display = 'none';
        });
    }

    // Arrow button toggles sidebar
    if (toggleBtn && sidebar) {
        toggleBtn.addEventListener('click', () => {
            console.log("➡️ Sidebar toggle clicked");
            const isMobile = window.innerWidth <= 640;
            if (isMobile) {
                sidebar.classList.remove('active'); // hide it completely
                if (hamburger) hamburger.style.display = '';
            } else {
                sidebar.classList.toggle('collapsed'); // just collapse it
                if (sidebar.classList.contains('collapsed')) {
                    if (hamburger) hamburger.style.display = '';
                } else {
                    if (hamburger) hamburger.style.display = 'none';
                }
            }
        });
    }
});

// APPOINTMENT FORM SUBMISSION

/* document.addEventListener('DOMContentLoaded', () => {
    const schedForm = document.getElementById('appointment-form');
    const appointForm = document.getElementById('details');

    if (schedForm) {
        schedForm.addEventListener('submit', function (e) {
            e.preventDefault(); // Stop default form action

            const schedData = new FormData(schedForm); 

            fetch('http://localhost:3000/step1-appointment.js', {
                method: "POST",
                body: schedData
            })
            .then(response => response.json())
            .then(data => { 
                if (data.success) {
                    window.location.href = data.redirect || '/client/step2-appointment.html';
                } else {
                    alert("Error storing session data.");
                }
            })
            .catch(error => { // Added error handling
                console.error('Error:', error);
                alert("An error occurred while processing your request.");
            });
        });
    }

    if (appointForm) {
        appointForm.addEventListener('submit', function (e) {
            e.preventDefault(); // Stop default form action

            const appointData = new FormData(appointForm); 

            fetch('http://localhost:3000/step2-appointment.js', {
                method: "POST",
                body: appointData
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert("Appointment booked successfully!");
                    window.location.href = data.redirect || '/client/dashboard.html';
                } else {
                    alert("Unsuccessful booking");
                }
            })
            .catch(error => { // Added error handling
                console.error('Error:', error);
                alert("An error occurred while processing your request.");
            });
        });
    }
}); */

// Display username in dashboarddocument.addEventListener("DOMContentLoaded", () => {
    fetch('../php/username_display.php')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                document.getElementById('username').textContent = data.username;
            } else {
                document.getElementById('username').textContent = 'Guest';
            }
        })
        .catch(error => {
            console.error('Error fetching username:', error);
        });


