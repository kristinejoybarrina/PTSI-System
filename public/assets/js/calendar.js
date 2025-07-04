// CALENDAR FUNCTIONALITY
const monthYear = document.getElementById('monthYear');
const calendarBody = document.getElementById('calendarBody');
const prevMonth = document.getElementById('prevMonth');
const nextMonth = document.getElementById('nextMonth');

let currentDate = new Date();

function renderCalendar(date) {
    const year = date.getFullYear();
    const month = date.getMonth();

    monthYear.textContent = date.toLocaleString('default', { month: 'long' }) + ' ' + year;
    calendarBody.innerHTML = '';

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    let row = document.createElement('tr');
    for (let i = 0; i < firstDay; i++) {
        row.innerHTML += '<td></td>';
    }

    for (let day = 1; day <= daysInMonth; day++) {
        if (row.children.length === 7) {
            calendarBody.appendChild(row);
            row = document.createElement('tr');
        }
        row.innerHTML += `<td>${day}</td>`;
    }

    calendarBody.appendChild(row);
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