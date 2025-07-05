// CALENDAR FUNCTIONALITY
const monthYear = document.getElementById('monthYear');
const calendarBody = document.getElementById('calendarBody');
const prevMonth = document.getElementById('prevMonth');
const nextMonth = document.getElementById('nextMonth');

let currentDate = new Date();

// Toggle this to true to show appointment dots, false for date only
const SHOW_APPOINTMENTS = true;

let appointmentsByDate = {};

function renderCalendar(date) {
    const year = date.getFullYear();
    const month = date.getMonth();

    monthYear.textContent = date.toLocaleString('default', { month: 'long' }) + ' ' + year;
    calendarBody.innerHTML = '';

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    let day = 1;
    for (let week = 0; week < 6; week++) { // Always 6 rows
        let row = document.createElement('tr');
        for (let d = 0; d < 7; d++) {
            if (week === 0 && d < firstDay) {
                row.innerHTML += '<td></td>';
            } else if (day > daysInMonth) {
                row.innerHTML += '<td></td>';
            } else {
                let cellContent = day;
                if (SHOW_APPOINTMENTS) {
                    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    if (appointmentsByDate[dateStr]) {
                        cellContent += '<div class="dot" title="' + appointmentsByDate[dateStr].length + ' appointment(s)"></div>';
                    }
                }
                row.innerHTML += `<td>${cellContent}</td>`;
                day++;
            }
        }
        calendarBody.appendChild(row);
    }
}

// Add some CSS for the dot if not present
if (!document.getElementById('calendar-dot-style')) {
    const style = document.createElement('style');
    style.id = 'calendar-dot-style';
    style.innerHTML = `.dot { margin: 2px auto 0 auto; width: 7px; height: 7px; background: #2196F3; border-radius: 50%; }`;
    document.head.appendChild(style);
}

prevMonth.addEventListener('click', () => { 
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar(currentDate);
});

nextMonth.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar(currentDate);
});

renderCalendar(currentDate);