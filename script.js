// State-Management
let currentDate = new Date();
let selectedDateString = new Date().toISOString().split('T')[0];
let selectedEventId = null;
let isEditing = false;

// Standard-Beispieldaten mit den neuen Kategorien
const initialEvents = [];

let events = JSON.parse(localStorage.getItem('my_calendar_events')) || initialEvents;

// Mapping der Schlüssel zu den Anzeige-Namen
const categoryNames = {
  pferd: '🐎 Pferd',
  tage: '👸 Tage',
  uni: '🏫 Uni',
  arbeit: '💼 Arbeit',
  freizeit: '🎨 Freizeit',
  dobby: '🐶 Dobby'
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

// Tages-Agenda (Mobile) chronologisch sortiert rendern
function renderAgenda() {
  const agendaSection = document.getElementById('agendaSection');
  const activeCategories = getActiveCategories();
  
  // 1. Filtern und 2. Chronologisch nach Uhrzeit sortieren
  const dayEvents = events
    .filter(ev => ev.date === selectedDateString && activeCategories.includes(ev.category))
    .sort((a, b) => (a.time || '').localeCompare(b.time || ''));

  // Wenn keine Termine vorhanden sind -> Bereich komplett ausblenden
  if (dayEvents.length === 0) {
    agendaSection.style.display = 'none';
    agendaList.innerHTML = '';
    return;
  }

  // Wenn Termine vorhanden sind -> Einblenden und auflisten
  agendaSection.style.display = 'block';

  const [y, m, d] = selectedDateString.split('-');
  const formattedDate = new Date(y, m - 1, d).toLocaleDateString('de-DE', { 
    weekday: 'short', 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric' 
  });
  agendaDateTitle.textContent = `Termine am ${formattedDate}`;

  agendaList.innerHTML = '';
  dayEvents.forEach(ev => {
    const item = document.createElement('div');
    item.className = `agenda-item cat-${ev.category}`;
    item.innerHTML = `
      <div>
        <strong>${ev.title}</strong>
        <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 2px;">
          ${ev.time ? '⏰ ' + ev.time + ' · ' : ''}${categoryNames[ev.category] || ev.category}
        </div>
      </div>
      <span style="font-size: 1.2rem; color: var(--text-muted);">&rsaquo;</span>
    `;
    item.addEventListener('click', () => openDetailModal(ev.id));
    agendaList.appendChild(item);
  });
}

// Kalender-Monatsraster rendern (ebenfalls sortiert)
function renderCalendar() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthName = currentDate.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
  currentMonthYear.textContent = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  calendarDays.innerHTML = '';

  const firstDay = new Date(year, month, 1);
  let startingDay = firstDay.getDay() - 1; // Montag = 0
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

    // Termine filtern und chronologisch sortieren
    const dayEvents = events
      .filter(ev => ev.date === dateString && activeCategories.includes(ev.category))
      .sort((a, b) => (a.time || '').localeCompare(b.time || ''));

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

    // Klick auf Tag
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
  // 🔄 Nur löschen, wenn wir NICHT im Bearbeitungsmodus sind
  if (!isEditing) {
    selectedEventId = null;
  }
}

function openCreateModal(defaultDate) {
  isEditing = false;
  document.querySelector('#createModal h3').textContent = "Neuen Termin anlegen"; // Überschrift zurücksetzen
  createEventForm.reset();
  document.getElementById('eventDate').value = defaultDate || selectedDateString || new Date().toISOString().split('T')[0];
  createModal.classList.add('active');
}

function openEditModal() {
  const ev = events.find(e => e.id === selectedEventId);
  if (!ev) return;

  isEditing = true; // 👈 Das muss zuerst auf true gesetzt werden!
  
  document.querySelector('#createModal h3').textContent = "Termin bearbeiten";
  
  document.getElementById('eventTitle').value = ev.title;
  document.getElementById('eventDate').value = ev.date;
  document.getElementById('eventTime').value = ev.time || '';
  document.getElementById('eventCategory').value = ev.category;
  document.getElementById('eventNotes').value = ev.notes || '';

  // Jetzt schließt diese Funktion das Detail-Modal, behält die ID aber im Speicher, weil isEditing bereits true ist!
  closeDetailModal(); 
  createModal.classList.add('active');
}

// Navigation Event-Listener
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

// Filter-Checkboxen Event-Listener
document.querySelectorAll('.category-filter').forEach(label => {
  label.addEventListener('click', () => {
    const checkbox = label.querySelector('input');
    label.classList.toggle('inactive', !checkbox.checked);
    
    // Aktive Filter sammeln und im localStorage speichern
    const activeFilters = [];
    document.querySelectorAll('.filter-section input[type="checkbox"]').forEach(cb => {
      if (cb.checked) activeFilters.push(cb.value);
    });
    localStorage.setItem('my_calendar_filters', JSON.stringify(activeFilters));
    
    renderCalendar();
  });
});

// Erstellen & Löschen
document.getElementById('btnOpenCreateModal').addEventListener('click', () => openCreateModal());
document.getElementById('btnCancelCreate').addEventListener('click', () => createModal.classList.remove('active'));

createEventForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const title = document.getElementById('eventTitle').value.trim();
  const date = document.getElementById('eventDate').value;
  const time = document.getElementById('eventTime').value;
  const category = document.getElementById('eventCategory').value;
  const notes = document.getElementById('eventNotes').value.trim();

  if (isEditing) {
    // 🔄 Bestehenden Termin im Array suchen und mit neuen Werten überschreiben
    events = events.map(ev => {
      if (ev.id === selectedEventId) {
        return { ...ev, title, date, time, category, notes };
      }
      return ev;
    });
    selectedDateString = date; // Fokus auf das (evtl. neue) Datum setzen
  } else {
    // ➕ Einen komplett neuen Termin erstellen
    const newEvent = {
      id: Date.now().toString(),
      title,
      date,
      time,
      category,
      notes
    };
    events.push(newEvent);
    selectedDateString = newEvent.date;
  }

  // Daten im Browser-Speicher sichern
  localStorage.setItem('my_calendar_events', JSON.stringify(events));
  
  // Modal schließen, Status zurücksetzen und Kalender neu zeichnen
  createModal.classList.remove('active');
  isEditing = false;
  renderCalendar();
});

document.getElementById('btnDeleteEvent').addEventListener('click', () => {
  if (!selectedEventId) return;
  events = events.filter(e => e.id !== selectedEventId);
  localStorage.setItem('my_calendar_events', JSON.stringify(events));
  closeDetailModal();
  renderCalendar();
});

document.getElementById('btnEditEvent').addEventListener('click', openEditModal);

document.getElementById('btnCloseDetail').addEventListener('click', closeDetailModal);

const savedFilters = JSON.parse(localStorage.getItem('my_calendar_filters'));
if (savedFilters) {
  document.querySelectorAll('.filter-section input[type="checkbox"]').forEach(cb => {
    // Prüfen, ob diese Kategorie im Speicher als aktiv markiert war
    cb.checked = savedFilters.includes(cb.value);
    
    // Die visuelle Klasse "inactive" auf dem umgebenden Label anpassen
    const label = cb.closest('.category-filter');
    if (label) {
      label.classList.toggle('inactive', !cb.checked);
    }
  });
}

// Initialer Aufruf
renderCalendar();

