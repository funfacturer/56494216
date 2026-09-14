// State-Management
let currentDate = new Date();
let selectedDateString = new Date().toISOString().split('T')[0];
let selectedEventId = null;

// Standard-Beispieldaten (falls localStorage leer ist)
const initialEvents = [
  { id: '1', title: 'Fußball Match vs. TSV', date: '2026-09-15', time: '18:30', category: 'fussball', notes: 'Heimspiel, Kunstrasen' },
  { id: '2', title: 'Mathe Klassenarbeit', date: '2026-09-15', time: '08:00', category: 'schule', notes: 'Zimmer 204' },
  { id: '3', title: 'Team-Meeting', date: '2026-09-18', time: '10:00', category: 'arbeit', notes: 'Sprint Review' }
];

let events = JSON.parse(localStorage.getItem('my_calendar_events')) || initialEvents;

const categoryNames = {
  fussball: '⚽ Fußball',
  schule: '🏫 Schule',
  arbeit: '💼 Arbeit',
  privat: '🎉 Freizeit / Privat'
};

// DOM-Elemente
const calendarDays = document.getElementById('calendarDays');
const currentMonthYear = document.getElementById('currentMonthYear');
const createModal = document.getElementById('createModal');
const detailModal = document.getElementById('detailModal');
const createEventForm = document.getElementById('createEventForm');
const agendaList = document.getElementById('agendaList');
const agendaDateTitle = document.getElementById('agendaDateTitle');

// Aktive Kategorien ermitteln
function getActiveCategories() {
  const active = [];
  document.querySelectorAll('.filter-section input[type="checkbox"]').forEach(cb => {
    if (cb.checked) active.push(cb.value);
  });
  return active;
}

// Tages-Agenda für Mobile rendern
function renderAgenda() {
  const activeCategories = getActiveCategories();
  const dayEvents = events.filter(ev => ev.date === selectedDateString && activeCategories.includes(ev.category));

  const [y, m, d] = selectedDateString.split('-');
  const formattedDate = new Date(y, m - 1, d).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
  agendaDateTitle.textContent = `Termine am ${formattedDate}`;

  agendaList.innerHTML = '';

  if (dayEvents.length === 0) {
    agendaList.innerHTML = '<div class="agenda-empty">Keine Termine für diesen Tag oder aktive Filterung vorhanden.</div>';
    return;
  }

  dayEvents.forEach(ev => {
    const item = document.createElement('div');
    item.className = `agenda-item cat-${ev.category}`;
    item.innerHTML = `
      <div>
        <strong>${ev.title}</strong>
        <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 2px;">
          ${ev.time ? '⏰ ' + ev.time + ' · ' : ''}${categoryNames[ev.category]}
        </div>
      </div>
      <span style="font-size: 1.2rem; color: var(--text-muted);">&rsaquo;</span>
    `;
    item.addEventListener('click', () => openDetailModal(ev.id));
    agendaList.appendChild(item);
  });
}

// Kalender-Monatsraster rendern
function renderCalendar() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthName = currentDate.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
  currentMonthYear.textContent = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  calendarDays.innerHTML = '';

  const firstDay = new Date(year, month, 1);
  let startingDay = firstDay.getDay() - 1; // Montag = Index 0
  if (startingDay === -1) startingDay = 6;

  const lastDay = new Date(year, month + 1, 0);
  const totalDays = lastDay.getDate();
  const prevMonthLastDay = new Date(year, month, 0).getDate();

  // Tage des Vormonats
  for (let i = startingDay; i > 0; i--) {
    const dayCell = document.createElement('div');
    dayCell.className = 'day-cell other-month';
    dayCell.innerHTML = `<span class="day-number">${prevMonthLastDay - i + 1}</span>`;
    calendarDays.appendChild(dayCell);
  }

  const activeCategories = getActiveCategories();
  const today = new Date();

  // Tage des aktuellen Monats
  for (let day = 1; day <= totalDays; day++) {
    const dayCell = document.createElement('div');
    dayCell.className = 'day-cell';

    const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    if (day === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
      dayCell.classList.add('today');
    }

    if (dateString === selectedDateString) {
      dayCell.classList.add('selected-day');
    }

    dayCell.innerHTML = `<span class="day-number">${day}</span>`;

    const dayEvents = events.filter(ev => ev.date === dateString && activeCategories.includes(ev.category));

    // Desktop: Text-Badges
    dayEvents.forEach(ev => {
      const badge = document.createElement('div');
      badge.className = `event-badge cat-${ev.category}`;
      badge.textContent = (ev.time ? ev.time + ' ' : '') + ev.title;
      badge.title = ev.title;
      badge.addEventListener('click', (e) => {
        e.stopPropagation();
        openDetailModal(ev.id);
      });
      dayCell.appendChild(badge);
    });

    // Mobile: Farbpunkte (Dots)
    if (dayEvents.length > 0) {
      const dotsContainer = document.createElement('div');
      dotsContainer.className = 'event-dots-container';
      dayEvents.slice(0, 4).forEach(ev => {
        const dot = document.createElement('div');
        dot.className = `event-dot bg-cat-${ev.category}`;
        dotsContainer.appendChild(dot);
      });
      dayCell.appendChild(dotsContainer);
    }

    // Tag auswählen
    dayCell.addEventListener('click', () => {
      selectedDateString = dateString;
      document.querySelectorAll('.day-cell').forEach(c => c.classList.remove('selected-day'));
      dayCell.classList.add('selected-day');
      renderAgenda();
    });

    calendarDays.appendChild(dayCell);
  }

  // Raster auffüllen
  const totalRendered = startingDay + totalDays;
  const remainingDays = 42 - totalRendered;
  if (remainingDays < 7) {
    for (let i = 1; i <= remainingDays; i++) {
      const dayCell = document.createElement('div');
      dayCell.className = 'day-cell other-month';
      dayCell.innerHTML = `<span class="day-number">${i}</span>`;
      calendarDays.appendChild(dayCell);
    }
  }

  renderAgenda();
}

// Modal-Logik
function openDetailModal(id) {
  selectedEventId = id;
  const ev = events.find(e => e.id === id);
  if (!ev) return;

  document.getElementById('detailTitle').textContent = ev.title;
  document.getElementById('detailDate').textContent = ev.date;
  document.getElementById('detailTime').textContent = ev.time || 'Keine Angabe';
  document.getElementById('detailCategory').textContent = categoryNames[ev.category] || ev.category;
  document.getElementById('detailNotes').textContent = ev.notes || 'Keine Notiz vorhanden';

  detailModal.classList.add('active');
}

function closeDetailModal() {
  detailModal.classList.remove('active');
  selectedEventId = null;
}

function openCreateModal(defaultDate) {
  createEventForm.reset();
  document.getElementById('eventDate').value = defaultDate || selectedDateString || new Date().toISOString().split('T')[0];
  createModal.classList.add('active');
}

// Event-Listener
document.getElementById('btnPrev').addEventListener('click', () => {
  currentDate.setMonth(currentDate.getMonth() - 1);
  renderCalendar();
});

document.getElementById('btnNext').addEventListener('click', () => {
  currentDate.setMonth(currentDate.getMonth() + 1);
  renderCalendar();
});

document.getElementById('btnToday').addEventListener('click', () => {
  currentDate = new Date();
  selectedDateString = new Date().toISOString().split('T')[0];
  renderCalendar();
});

// Filter-Checkboxen
document.querySelectorAll('.category-filter').forEach(label => {
  label.addEventListener('click', () => {
    const checkbox = label.querySelector('input');
    label.classList.toggle('inactive', !checkbox.checked);
    renderCalendar();
  });
});

// Erstellen & Löschen
document.getElementById('btnOpenCreateModal').addEventListener('click', () => openCreateModal());
document.getElementById('btnAgendaAdd').addEventListener('click', () => openCreateModal(selectedDateString));
document.getElementById('btnCancelCreate').addEventListener('click', () => createModal.classList.remove('active'));

createEventForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const newEvent = {
    id: Date.now().toString(),
    title: document.getElementById('eventTitle').value.trim(),
    date: document.getElementById('eventDate').value,
    time: document.getElementById('eventTime').value,
    category: document.getElementById('eventCategory').value,
    notes: document.getElementById('eventNotes').value.trim()
  };

  events.push(newEvent);
  localStorage.setItem('my_calendar_events', JSON.stringify(events));
  selectedDateString = newEvent.date;
  createModal.classList.remove('active');
  renderCalendar();
});

document.getElementById('btnDeleteEvent').addEventListener('click', () => {
  if (!selectedEventId) return;
  events = events.filter(e => e.id !== selectedEventId);
  localStorage.setItem('my_calendar_events', JSON.stringify(events));
  closeDetailModal();
  renderCalendar();
});

document.getElementById('btnCloseDetail').addEventListener('click', closeDetailModal);

// Start
renderCalendar();
