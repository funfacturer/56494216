// 1. Supabase-Verbindung herstellen
const SUPABASE_URL = "https://ntoibzgbrxcyftokdknw.supabase.co"; // 👈 Hier deine URL eintragen
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50b2liemdicnhjeWZ0b2tka253Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1OTQxOTksImV4cCI6MjEwNjE3MDE5OX0.p2P65dVsWiAp2gfjkZr_dUJZVH-IqgJo9hAGc8nkROw"; // 👈 Hier deinen Anon-Key eintragen
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// State-Management
let currentDate = new Date();
let selectedDateString = new Date().toISOString().split('T')[0];
let selectedEventId = null;
let isEditing = false; 

// Aktuell angemeldeter Benutzer
let currentUser = null;

// Die Termine starten jetzt als leeres Array und werden live aus der Cloud geladen
let events = [];

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

// Auth DOM-Elemente
const authContainer = document.getElementById('authContainer');
const authForm = document.getElementById('authForm');
const authEmail = document.getElementById('authEmail');
const authPassword = document.getElementById('authPassword');
const authTitle = document.getElementById('authTitle');
const btnAuthSubmit = document.getElementById('btnAuthSubmit');
const btnAuthToggle = document.getElementById('btnAuthToggle');
const btnLogout = document.getElementById('btnLogout');

let isSignUpMode = false; // Schalter für Anmelden vs. Registrieren

// Aktive Kategorien ermitteln
function getActiveCategories() {
  const active = [];
  document.querySelectorAll('.filter-section input[type="checkbox"]').forEach(cb => {
    if (cb.checked) active.push(cb.value);
  });
  return active;
}

// 🔐 USER LOGIN / REGISTRIERUNG LOGIK
authForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = authEmail.value.trim();
  const password = authPassword.value;

  btnAuthSubmit.disabled = true;
  btnAuthSubmit.textContent = isSignUpMode ? "Registriere..." : "Melde an...";

  try {
    if (isSignUpMode) {
      // REGISTRIEREN
      const { data, error } = await supabaseClient.auth.signUp({ email, password });
      if (error) throw error;
      alert("Registrierung erfolgreich! Du wirst nun automatisch eingeloggt.");
    } else {
      // ANMELDEN
      const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
      if (error) throw error;
    }
  } catch (err) {
    alert("Fehler: " + err.message);
    btnAuthSubmit.disabled = false;
    btnAuthSubmit.textContent = isSignUpMode ? "Registrieren" : "Einloggen";
  }
});

// Umschalten zwischen Login und Registrierung
btnAuthToggle.addEventListener('click', () => {
  isSignUpMode = !isSignUpMode;
  if (isSignUpMode) {
    authTitle.textContent = "Konto erstellen";
    btnAuthSubmit.textContent = "Registrieren";
    btnAuthToggle.textContent = "Bereits ein Konto? Jetzt einloggen";
  } else {
    authTitle.textContent = "Anmelden";
    btnAuthSubmit.textContent = "Einloggen";
    btnAuthToggle.textContent = "Noch kein Konto? Jetzt registrieren";
  }
});

// Abmelden (Logout)
btnLogout.addEventListener('click', async () => {
  const confirmLogout = confirm("Möchtest du dich wirklich abmelden?");
  if (confirmLogout) {
    await supabaseClient.auth.signOut();
  }
});

// 🔄 AUTOMATISCHER LOGIN-CHECK (Dauerhaft angemeldet bleiben)
supabaseClient.auth.onAuthStateChange(async (event, session) => {
  if (session && session.user) {
    // Benutzer ist angemeldet!
    currentUser = session.user;
    authContainer.style.display = 'none'; // Login-Maske ausblenden
    
    // Daten live aus der Cloud laden (inklusive automatischem Umzug von lokalen Daten)
    await loadEventsFromCloud();
  } else {
    // Benutzer ist abgemeldet!
    currentUser = null;
    events = [];
    renderCalendar();
    authContainer.style.display = 'flex'; // Login-Maske wieder einblenden
    authEmail.value = '';
    authPassword.value = '';
    btnAuthSubmit.disabled = false;
    btnAuthSubmit.textContent = isSignUpMode ? "Registrieren" : "Einloggen";
  }
});

// Termine live aus der Supabase-Datenbank laden
async function loadEventsFromCloud() {
  if (!currentUser) return;

  try {
    const { data, error } = await supabaseClient
      .from('events')
      .select('*');

    if (error) throw error;
    events = data || [];

    // 🚚 AUTOMATISCHER UMZUG: Altes Handy-Backup in dieses Benutzerkonto importieren
    const localEvents = JSON.parse(localStorage.getItem('my_calendar_events'));
    if (localEvents && localEvents.length > 0) {
      console.log("Übertrage lokale Termine in deine Cloud...");
      
      for (const localEv of localEvents) {
        const exists = events.some(cloudEv => cloudEv.id === localEv.id);
        if (!exists) {
          const newCloudEvent = {
            ...localEv,
            user_id: currentUser.id // Termin fest mit diesem Benutzer verknüpfen
          };
          
          const { error: insertError } = await supabaseClient
            .from('events')
            .insert([newCloudEvent]);
            
          if (!insertError) {
            events.push(newCloudEvent);
          }
        }
      }
      // Lokalen Speicher leeren, damit es nur einmal passiert
      localStorage.removeItem('my_calendar_events');
    }

    renderCalendar();
  } catch (err) {
    console.error("Fehler beim Laden der Termine:", err.message);
  }
}

// Tages-Agenda (Mobile) chronologisch sortiert rendern
function renderAgenda() {
  const agendaSection = document.getElementById('agendaSection');
  const activeCategories = getActiveCategories();
  
  const dayEvents = events
    .filter(ev => ev.date === selectedDateString && activeCategories.includes(ev.category))
    .sort((a, b) => (a.time || '').localeCompare(b.time || ''));

  if (dayEvents.length === 0) {
    agendaSection.style.display = 'none';
    agendaList.innerHTML = '';
    return;
  }

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

// Kalender-Monatsraster rendern
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

  for (let i = startingDay; i > 0; i--) {
    const dayCell = document.createElement('div');
    dayCell.className = 'day-cell other-month';
    dayCell.innerHTML = `<span class="day-number">${prevMonthLastDay - i + 1}</span>`;
    calendarDays.appendChild(dayCell);
  }

  const activeCategories = getActiveCategories();
  const today = new Date();

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

    const dayEvents = events
      .filter(ev => ev.date === dateString && activeCategories.includes(ev.category))
      .sort((a, b) => (a.time || '').localeCompare(b.time || ''));

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

    dayCell.addEventListener('click', () => {
      selectedDateString = dateString;
      document.querySelectorAll('.day-cell').forEach(c => c.classList.remove('selected-day'));
      dayCell.classList.add('selected-day');
      renderAgenda();
    });

    calendarDays.appendChild(dayCell);
  }

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
  if (!isEditing) {
    selectedEventId = null;
  }
}

function openCreateModal(defaultDate) {
  isEditing = false;
  document.querySelector('#createModal h3').textContent = "Neuen Termin anlegen";
  createEventForm.reset();
  document.getElementById('eventDate').value = defaultDate || selectedDateString || new Date().toISOString().split('T')[0];
  createModal.classList.add('active');
}

function openEditModal() {
  const ev = events.find(e => e.id === selectedEventId);
  if (!ev) return;

  isEditing = true;
  document.querySelector('#createModal h3').textContent = "Termin bearbeiten";
  
  document.getElementById('eventTitle').value = ev.title;
  document.getElementById('eventDate').value = ev.date;
  document.getElementById('eventTime').value = ev.time || '';
  document.getElementById('eventCategory').value = ev.category;
  document.getElementById('eventNotes').value = ev.notes || '';

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

// Filter-Checkboxen Event-Listener (Doppel-Klick-Sicher)
document.querySelectorAll('.category-filter').forEach(label => {
  label.addEventListener('click', (e) => {
    if (e.target.tagName === 'LABEL') return;

    const checkbox = label.querySelector('input');
    label.classList.toggle('inactive', !checkbox.checked);
    
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
document.getElementById('btnCancelCreate').addEventListener('click', () => {
  createModal.classList.remove('active');
  isEditing = false;
});

// Formular absenden (In Supabase Cloud speichern/aktualisieren)
createEventForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!currentUser) return;

  const title = document.getElementById('eventTitle').value.trim();
  const date = document.getElementById('eventDate').value;
  const time = document.getElementById('eventTime').value;
  const category = document.getElementById('eventCategory').value;
  const notes = document.getElementById('eventNotes').value.trim();

  // Die user_id muss zwingend beim Erstellen und Aktualisieren mitgeschickt werden!
  const eventData = { 
    title, 
    date, 
    time, 
    category, 
    notes,
    user_id: currentUser.id 
  };

  try {
    if (isEditing) {
      // 🔄 In Supabase Cloud aktualisieren
      const { error } = await supabaseClient
        .from('events')
        .update(eventData)
        .eq('id', selectedEventId);

      if (error) throw error;
    } else {
      // ➕ Neuen Termin in Supabase Cloud erstellen
      const newEvent = {
        id: Date.now().toString(),
        ...eventData
      };
      
      const { error } = await supabaseClient
        .from('events')
        .insert([newEvent]);

      if (error) throw error;
    }

    createModal.classList.remove('active');
    isEditing = false;
    
    // Daten live aus der Cloud neu laden, damit die Anzeige sofort stimmt
    await loadEventsFromCloud();
    
  } catch (err) {
    alert("Fehler beim Speichern in der Cloud: " + err.message);
  }
});

// Termin aus Supabase Cloud löschen
document.getElementById('btnDeleteEvent').addEventListener('click', async () => {
  if (!selectedEventId) return;

  try {
    const { error } = await supabaseClient
      .from('events')
      .delete()
      .eq('id', selectedEventId);

    if (error) throw error;

    closeDetailModal();
    await loadEventsFromCloud();
  } catch (err) {
    alert("Fehler beim Löschen aus der Cloud: " + err.message);
  }
});

document.getElementById('btnEditEvent').addEventListener('click', openEditModal);
document.getElementById('btnCloseDetail').addEventListener('click', closeDetailModal);

// Gespeicherte Filter beim Start laden
const savedFilters = JSON.parse(localStorage.getItem('my_calendar_filters'));
if (savedFilters) {
  document.querySelectorAll('.filter-section input[type="checkbox"]').forEach(cb => {
    cb.checked = savedFilters.includes(cb.value);
    const label = cb.closest('.category-filter');
    if (label) {
      label.classList.toggle('inactive', !cb.checked);
    }
  });
}