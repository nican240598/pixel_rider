/* =========================================
   1. SUPABASE KONFIGURATION & INIT
   ========================================= */
const SUPABASE_URL = 'https://anxhzeovqgokcorvjttu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFueGh6ZW92cWdva2NvcnZqdHR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUxNTQ2MzQsImV4cCI6MjEwMDczMDYzNH0.cNXVM4y6_uCnHP6r53ZmqqSRQX2oLwk78fSPW9x0FJ4'; 
const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


/* =========================================
   2. STATE, HASHING, MODALS & UI NAVIGATION
   ========================================= */
const state = {
    currentUser: JSON.parse(localStorage.getItem("app_user")) || null,
    currentView: "landing"
};

let mapInstance = null;
let markersGroup = null;
let currentForumCat = "all";
let activeChatTopicId = null;
let userToDelete = null; 
let activeEditEventId = null; 
let userToReset = null; 
let currentPreviewRoute = null;
let activeEditGpxId = null; 
let activeEditTopicId = null; 
let allGarageBikes = []; 

function showModal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    let m = bootstrap.Modal.getInstance(el);
    if (!m) m = new bootstrap.Modal(el);
    m.show();
}

function hideModal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    let m = bootstrap.Modal.getInstance(el);
    if (m) m.hide();
}

function showCustomAlert(message, title = "Hinweis", type = "warning") {
    const titleEl = document.getElementById("customAlertTitle");
    const msgEl = document.getElementById("customAlertMessage");
    const iconEl = document.getElementById("customAlertIcon");
    const btn = document.getElementById("customAlertBtn");
    const contentBox = document.getElementById("customAlertContent");

    if(!titleEl) return alert(message); 

    titleEl.textContent = title;
    msgEl.innerHTML = message.replace(/\n/g, '<br>');
    contentBox.className = "modal-content text-white p-4 rounded-4 text-center border";
    
    if (type === "danger") {
        titleEl.className = "text-danger fw-bold text-uppercase mt-2";
        iconEl.className = "bi bi-exclamation-octagon-fill text-danger mb-2";
        iconEl.style.textShadow = "0 0 15px rgba(220,53,69,0.5)";
        btn.className = "btn btn-danger rounded-pill px-4 fw-bold shadow-lg w-100";
        contentBox.classList.add("border-danger");
    } else if (type === "success") {
        titleEl.className = "text-success fw-bold text-uppercase mt-2";
        iconEl.className = "bi bi-check-circle-fill text-success mb-2";
        iconEl.style.textShadow = "0 0 15px rgba(25,135,84,0.5)";
        btn.className = "btn btn-success rounded-pill px-4 fw-bold shadow-lg w-100";
        contentBox.classList.add("border-success");
    } else {
        titleEl.className = "text-warning fw-bold text-uppercase mt-2";
        iconEl.className = "bi bi-exclamation-triangle-fill text-warning mb-2";
        iconEl.style.textShadow = "0 0 15px rgba(255,193,7,0.5)";
        btn.className = "btn btn-warning rounded-pill px-4 fw-bold shadow-lg w-100 text-dark";
        contentBox.classList.add("border-warning");
    }
    showModal("customAlertModal");
}

function showCustomConfirm(message, title = "Bestätigen") {
    return new Promise((resolve) => {
        const titleEl = document.getElementById("customConfirmTitle");
        if(!titleEl) { resolve(confirm(message)); return; } 

        titleEl.textContent = title;
        document.getElementById("customConfirmMessage").innerHTML = message;
        
        const btnOk = document.getElementById("customConfirmOk");
        const btnCancel = document.getElementById("customConfirmCancel");
        const modalEl = document.getElementById("customConfirmModal");
        
        const handleOk = () => { cleanup(); hideModal("customConfirmModal"); resolve(true); };
        const handleCancel = () => { cleanup(); resolve(false); };
        
        const cleanup = () => {
            btnOk.removeEventListener("click", handleOk);
            btnCancel.removeEventListener("click", handleCancel);
            modalEl.removeEventListener("hidden.bs.modal", handleCancel);
        };
        
        btnOk.addEventListener("click", handleOk);
        btnCancel.addEventListener("click", handleCancel);
        modalEl.addEventListener("hidden.bs.modal", handleCancel);
        
        showModal("customConfirmModal");
    });
}

document.addEventListener("DOMContentLoaded", function() {
    if (state.currentUser) { 
        db.from('users').update({ last_login: new Date().toISOString() }).eq('username', state.currentUser.username).then();
        initPresence(); 
        switchView('dashboard'); 
    } else { 
        switchView('landing'); 
    }
    // Crew-Mitglieder auf der Landing Page laden
    if (typeof loadCrewMembers === 'function') loadCrewMembers();

    const resetsModal = document.getElementById('passwordResetsModal');
    if (resetsModal) {
        resetsModal.addEventListener('hidden.bs.modal', function () {
            if (state.currentView !== 'admin') {
                switchView('dashboard');
            }
        });
    }

    const chatTopicModal = document.getElementById('chatTopicModal');
    if (chatTopicModal) {
        chatTopicModal.addEventListener('hidden.bs.modal', function () {
            switchView('forum');
            renderForumTopics();
        });
    }

    const gpxPreviewModalEl = document.getElementById('gpxPreviewModal');
    if (gpxPreviewModalEl) {
        gpxPreviewModalEl.addEventListener('shown.bs.modal', function () {
            if (!currentPreviewRoute) return;
            let r = currentPreviewRoute;

            if (!window.gpxPreviewMapInstance) {
                window.gpxPreviewMapInstance = L.map('gpxPreviewMap').setView([r.start_lat || 51.1657, r.start_lng || 10.4515], 11);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(window.gpxPreviewMapInstance);
                window.gpxPreviewLayerGroup = L.layerGroup().addTo(window.gpxPreviewMapInstance);
            } else {
                window.gpxPreviewMapInstance.setView([r.start_lat || 51.1657, r.start_lng || 10.4515], 11);
                window.gpxPreviewMapInstance.invalidateSize();
                window.gpxPreviewLayerGroup.clearLayers();
            }

            if (r.start_lat && r.start_lng) {
                L.marker([r.start_lat, r.start_lng]).addTo(window.gpxPreviewLayerGroup)
                    .bindPopup(`<b class="text-uppercase text-primary">${r.title}</b><br>Startpunkt`).openPopup();
            }

            if (r.gpx_data) {
                try {
                    const parser = new DOMParser();
                    const xmlDoc = parser.parseFromString(r.gpx_data, "text/xml");
                    const trkpts = xmlDoc.getElementsByTagName("trkpt");
                    let latLngs = [];
                    for (let i = 0; i < trkpts.length; i++) {
                        let lat = parseFloat(trkpts[i].getAttribute("lat"));
                        let lon = parseFloat(trkpts[i].getAttribute("lon") || trkpts[i].getAttribute("lng"));
                        if (!isNaN(lat) && !isNaN(lon)) {
                            latLngs.push([lat, lon]);
                        }
                    }
                    if (latLngs.length > 0) {
                        const polyline = L.polyline(latLngs, { color: '#c5a01a', weight: 4 });
                        polyline.addTo(window.gpxPreviewLayerGroup);
                        window.gpxPreviewMapInstance.fitBounds(polyline.getBounds());
                    }
                } catch(err) {}
            }
        });
    }

    document.getElementById("confirmDeleteBtn")?.addEventListener("click", executeDeleteUser);
});

async function hashPassword(password) {
    const msgBuffer = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function getCoordsForLocation(locationText) {
    if (!locationText) return { lat: null, lng: null };
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationText)}`);
        const data = await response.json();
        if (data && data.length > 0) {
            return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        }
    } catch (e) {}
    return { lat: null, lng: null };
}

const viewBackgrounds = {
    landing: 'https://images.pexels.com/photos/2116475/pexels-photo-2116475.jpeg?auto=compress&cs=tinysrgb&w=1920',
    dashboard: 'https://images.pexels.com/photos/2626665/pexels-photo-2626665.jpeg?auto=compress&cs=tinysrgb&w=1920',
    events: 'https://images.pexels.com/photos/1413412/pexels-photo-1413412.jpeg?auto=compress&cs=tinysrgb&w=1920',
    forum: 'https://images.pexels.com/photos/1715193/pexels-photo-1715193.jpeg?auto=compress&cs=tinysrgb&w=1920',
    map: 'https://images.pexels.com/photos/104842/pexels-photo-104842.jpeg?auto=compress&cs=tinysrgb&w=1920',
    gpx: 'https://images.pexels.com/photos/1413412/pexels-photo-1413412.jpeg?auto=compress&cs=tinysrgb&w=1920',
    garage: 'https://images.pexels.com/photos/2116475/pexels-photo-2116475.jpeg?auto=compress&cs=tinysrgb&w=1920',
    admin: 'https://images.pexels.com/photos/2116475/pexels-photo-2116475.jpeg?auto=compress&cs=tinysrgb&w=1920'
};

function updateDynamicBackground(viewName) {
    const bg = document.getElementById("globalBg");
    if(bg) bg.style.backgroundImage = `url('${viewBackgrounds[viewName] || viewBackgrounds.dashboard}')`;
}

function switchView(viewName) {
    if (!state.currentUser && viewName !== 'landing' && viewName !== 'privacy' && viewName !== 'impressum') viewName = 'landing';
    
    // Safety check: if user is logged in, ensure presence/panels are active
    if (state.currentUser && (!presenceChannel || document.getElementById('onlineUsersSidebar')?.classList.contains('d-none'))) {
        initPresence();
    }
    
    document.querySelectorAll('.app-view').forEach(el => el.classList.remove('active-view'));
    updateDynamicBackground(viewName);

    if (viewName === 'map') { document.getElementById('view-map')?.classList.add('active-view'); initMap(); }
    else if (viewName === 'gpx') { document.getElementById('view-gpx')?.classList.add('active-view'); renderGpxRoutes(); }
    else if (viewName === 'events') { document.getElementById('view-events')?.classList.add('active-view'); renderEvents(); }
    else if (viewName === 'forum') { document.getElementById('view-forum')?.classList.add('active-view'); renderForumTopics(); }
    else if (viewName === 'garage') { document.getElementById('view-garage')?.classList.add('active-view'); renderGarage(); }
    else if (viewName === 'admin') { document.getElementById('view-admin')?.classList.add('active-view'); renderAdminPanel(); }
    else if (viewName === 'profile') { document.getElementById('view-profile')?.classList.add('active-view'); renderProfile(); }
    else if (viewName === 'crew_admin') { document.getElementById('view-crew_admin')?.classList.add('active-view'); if (typeof renderCrewAdmin === 'function') renderCrewAdmin(); }
    else { 
        const target = document.getElementById(`view-${viewName}`); 
        if (target) target.classList.add('active-view'); 
    }

    state.currentView = viewName;
    updateNavbar();
    renderDashboardCards();
}

function updateNavbar() {
    const navLinks = document.getElementById("navLinks");
    if(!navLinks) return;
    
    // Gibt dem Container die volle Breite, um die Elemente aufzuteilen
    navLinks.className = "d-flex align-items-center flex-grow-1 justify-content-end";
    
    if (state.currentUser) {
        let roleColor = "text-warning"; 
        if (state.currentUser.isAdmin) roleColor = "text-danger"; 
        else if (state.currentUser.isModerator) roleColor = "text-info"; 

        // Admin Glocke
        let adminBellHtml = '';
        if (state.currentUser.isAdmin || state.currentUser.isModerator) {
            adminBellHtml = `
                <div class="position-relative" style="cursor: pointer;" onclick="openPasswordResetsModal()" title="Admin-Benachrichtigungen">
                    <i class="bi bi-shield-shaded text-warning fs-5"></i>
                    <span id="adminBellBadge" class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger d-none" style="font-size: 0.6rem;">0</span>
                </div>
            `;
        }

        // User Glocke
        let userBellHtml = `
            <div class="position-relative" style="cursor: pointer;" onclick="openUserNotificationsModal()" title="Deine Benachrichtigungen">
                <i class="bi bi-bell-fill text-white fs-5"></i>
                <span id="userBellBadge" class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger d-none" style="font-size: 0.6rem;">0</span>
            </div>
        `;

        navLinks.innerHTML = `
            <!-- 1. Menü Links (Links bündig) -->
            <div class="d-none d-xl-flex align-items-center me-auto ms-4 gap-1">
                <button class="custom-nav-link border-0 bg-transparent ${state.currentView === 'dashboard' ? 'active' : ''}" onclick="switchView('dashboard')"><i class="bi bi-grid-fill me-1"></i>Dashboard</button>
                <button class="custom-nav-link border-0 bg-transparent ${state.currentView === 'garage' ? 'active' : ''}" onclick="switchView('garage')"><i class="bi bi-tools me-1"></i>Garage</button>
                <button class="custom-nav-link border-0 bg-transparent ${state.currentView === 'forum' ? 'active' : ''}" onclick="switchView('forum')"><i class="bi bi-chat-quote me-1"></i>Forum</button>
                <button class="custom-nav-link border-0 bg-transparent ${state.currentView === 'events' ? 'active' : ''}" onclick="switchView('events')"><i class="bi bi-calendar-event me-1"></i>Events</button>
                <button class="custom-nav-link border-0 bg-transparent ${state.currentView === 'map' ? 'active' : ''}" onclick="switchView('map')"><i class="bi bi-geo-alt me-1"></i>Map</button>
            </div>

            <!-- 2. Ticker & Online (Zentriert) -->
            <div class="d-none d-lg-flex align-items-center gap-3">
                
                <!-- Event Liveticker -->
                <div class="nav-event-ticker" onclick="switchView('events')">
                    <i class="bi bi-lightning-charge-fill text-warning me-2"></i>
                    <div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%;">
                        <span id="navEventTickerText" class="text-white fw-bold text-uppercase" style="font-size: 0.85rem; letter-spacing: 0.5px;">Lade Events...</span>
                    </div>
                </div>

                <!-- Online Counter & Dropdown -->
                <div class="nav-online-counter position-relative" onclick="document.getElementById('onlineDropdown').classList.toggle('show')">
                    <i class="bi bi-people-fill text-warning me-1"></i>
                    <span class="text-white fw-bold text-uppercase" style="font-size: 0.85rem;">Pixel Rider Online: <span id="navOnlineCount" class="text-success ms-1">0</span></span>
                    
                    <div id="onlineDropdown" class="nav-dropdown d-none text-start" onclick="event.stopPropagation();">
                        <div class="border-bottom border-secondary pb-2 mb-2">
                            <h6 class="text-warning mb-0 text-uppercase fw-bold"><i class="bi bi-broadcast me-2"></i>Crew Online</h6>
                        </div>
                        <div id="navOnlineUsersList" class="dropdown-list" style="max-height: 300px; overflow-y: auto;"></div>
                    </div>
                </div>

            </div>

            <!-- 3. Profil & Benachrichtigungen (Rechts bündig) -->
            <div class="d-flex align-items-center gap-3 ms-4">
                ${adminBellHtml}
                ${userBellHtml}
                <span class="${roleColor} fw-bold user-role-badge" style="cursor:pointer;" onclick="switchView('profile')" title="Profil bearbeiten"><i class="bi bi-person-circle me-1"></i>${state.currentUser.username}</span>
                <button class="btn-logout" onclick="logout()">Logout</button>
            </div>
        `;
        if (state.currentUser.isAdmin || state.currentUser.isModerator) checkAdminNotifications();
        checkUserNotifications();
    } else {
        navLinks.innerHTML = `<button class="custom-nav-link border-0 bg-transparent" onclick="showModal('authModal')">Login / Registrieren</button>`;
    }
}

// ---- ADMIN TAB-WECHSEL ----
function switchAdminNotifTab(tab) {
    const unreadPanel  = document.getElementById('adminPanelUnread');
    const archivePanel = document.getElementById('adminPanelArchive');
    const tabUnread    = document.getElementById('tabAdminUnread');
    const tabArchive   = document.getElementById('tabAdminArchive');
    if (!unreadPanel) return;

    if (tab === 'unread') {
        unreadPanel.classList.remove('d-none');
        archivePanel.classList.add('d-none');
        tabUnread.classList.add('active');
        tabArchive.classList.remove('active');
    } else {
        unreadPanel.classList.add('d-none');
        archivePanel.classList.remove('d-none');
        tabArchive.classList.add('active');
        tabUnread.classList.remove('active');
    }
}

// ---- ADMIN AKTION LOGGEN ----
async function logAdminAction(message, type = 'success') {
    await db.from('user_notifications').insert([{
        target_username: 'SYSTEM_ADMIN',
        message: message,
        reason: '',
        type: type,
        is_read: true, // Direkt ins Archiv
        created_by: state.currentUser.username
    }]);
}

async function openPasswordResetsModal() {
    if (!state.currentUser || (!state.currentUser.isAdmin && !state.currentUser.isModerator)) return;
    
    // Bereinigung für Admin-Archiv läuft über die User-Funktion, die auch target_username = SYSTEM_ADMIN mitlöscht.
    purgeOldNotifications();

    const panelUnread  = document.getElementById("adminPanelUnread");
    const panelArchive = document.getElementById("adminPanelArchive");
    const countUnread  = document.getElementById("adminUnreadCount");
    const countArchive = document.getElementById("adminArchiveCount");
    if(!panelUnread) return;
    
    panelUnread.innerHTML = '<p class="text-center text-muted py-3">Lade Anfragen...</p>';

    // Unread Queries
    let { data: resetUsers, error: err1 } = await db.from('users').select('*').eq('reset_requested', true);
    let { data: inviteUsers, error: err2 } = await db.from('users').select('*').eq('invite', 'PENDING');
    let { data: unreadNotifs, error: err3 } = await db.from('user_notifications')
        .select('*')
        .eq('target_username', 'SYSTEM_ADMIN')
        .eq('is_read', false)
        .order('created_at', { ascending: false });
    
    // Archive Query
    let { data: archiveNotifs } = await db.from('user_notifications')
        .select('*')
        .eq('target_username', 'SYSTEM_ADMIN')
        .eq('is_read', true)
        .order('created_at', { ascending: false });

    if (err1 || err2 || err3) {
        panelUnread.innerHTML = '<p class="text-center text-danger">Fehler beim Laden der Anfragen aus der Datenbank.</p>';
        return;
    }

    let allRequests = [];
    if (resetUsers) {
        resetUsers.forEach(u => {
            allRequests.push({
                type: 'Passwort-Reset', badgeClass: 'bg-danger', username: u.username, email: u.email,
                date: u.updated_at || u.created_at || new Date().toISOString(), 
                actionHtml: `<button class="btn btn-sm btn-danger fw-bold rounded-pill px-3 me-1" onclick="modalResetPassword('${u.username}', true)">Reset (1234)</button>
                             <button class="btn btn-sm btn-outline-secondary rounded-pill px-3" onclick="modalDismissReset('${u.username}')"><i class="bi bi-x-lg"></i></button>`
            });
        });
    }

    if (inviteUsers) {
        inviteUsers.forEach(u => {
            allRequests.push({
                type: 'Invite Anfrage', badgeClass: 'bg-warning text-dark', username: u.username, email: u.email,
                date: u.created_at || new Date().toISOString(),
                actionHtml: `<button class="btn btn-sm btn-success fw-bold rounded-pill px-3 me-1" onclick="approveInviteRequest('${u.username}')">Freigeben</button>
                             <button class="btn btn-sm btn-outline-danger rounded-pill px-3" onclick="dismissInviteRequest('${u.username}')"><i class="bi bi-trash"></i></button>`
            });
        });
    }

    if (unreadNotifs) {
        unreadNotifs.forEach(n => {
            if (n.reason === 'NamensäÄnderung beantragt') {
                const parts = n.message.split('auf: ');
                const newName = parts.length > 1 ? parts[1].trim() : '?';
                allRequests.push({
                    type: 'NamensäÄnderung', badgeClass: 'bg-info text-dark', username: n.created_by, email: `Wunschname: ${newName}`,
                    date: n.created_at || new Date().toISOString(),
                    actionHtml: `<button class="btn btn-sm btn-success fw-bold rounded-pill px-3 me-1" onclick="approveUsernameChange('${n.id}', '${n.created_by}', '${newName}')">Erlauben</button>
                                 <button class="btn btn-sm btn-outline-danger rounded-pill px-3" onclick="dismissUsernameChange('${n.id}', '${n.created_by}', '${newName}')"><i class="bi bi-trash"></i></button>`
                });
            } else {
                allRequests.push({
                    type: 'Benachrichtigung', badgeClass: 'bg-secondary', username: n.created_by || 'System', email: n.message,
                    date: n.created_at || new Date().toISOString(),
                    actionHtml: `<button class="btn btn-sm btn-outline-light rounded-pill px-3" onclick="markNotificationRead('${n.id}')">Gelesen</button>`
                });
            }
        });
    }
    
    // Zähler aktualisieren
    if (allRequests.length > 0) {
        countUnread.textContent = allRequests.length;
        countUnread.classList.remove('d-none');
    } else {
        countUnread.classList.add('d-none');
    }
    const archiveCount = archiveNotifs ? archiveNotifs.length : 0;
    countArchive.textContent = archiveCount;

    // UNREAD TAB RENDERN
    if (allRequests.length === 0) {
        panelUnread.innerHTML = `<div class="text-center py-5">
               <i class="bi bi-check-circle" style="font-size:3rem; color: rgba(197,160,26,0.35);"></i>
               <p class="text-warning mt-3 mb-0 fw-bold">Alles erledigt!</p>
               <p class="text-muted small mt-1">Es liegen keine offenen Anfragen vor.</p>
           </div>`;
    } else {
        allRequests.sort((a, b) => new Date(b.date) - new Date(a.date));
        panelUnread.innerHTML = allRequests.map(req => {
            let fd = 'Unbekannt';
            try {
                let d = new Date(req.date);
                fd = `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}, ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')} Uhr`;
            } catch(e) {}
            return `
            <div class="p-3 rounded-3 mb-3" style="background: rgba(10,10,12,0.95); border: 1px solid rgba(197,160,26,0.4);">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <span class="badge ${req.badgeClass} px-3 py-1 fw-bold">${req.type}</span>
                    <span class="text-light fw-bold small">${fd}</span>
                </div>
                <div class="d-flex justify-content-between align-items-center mt-2">
                    <div><h4 class="text-warning fw-bold mb-1">${req.username}</h4><p class="text-light small mb-0">${req.email}</p></div>
                    <div class="d-flex gap-2">${req.actionHtml}</div>
                </div>
            </div>`;
        }).join('');
    }
    
    // ARCHIVE TAB RENDERN
    if (archiveCount === 0) {
        panelArchive.innerHTML = `<div class="text-center py-5">
               <i class="bi bi-archive" style="font-size:3rem; color: rgba(255,255,255,0.1);"></i>
               <p class="text-muted mt-3 mb-0">Das Admin-Archiv ist leer.</p>
           </div>`;
    } else {
        panelArchive.innerHTML = `<p class="text-muted small mb-3"><i class="bi bi-info-circle me-1"></i>Archivierte Einträge werden nach <b>30 Tagen</b> automatisch gelöscht.</p>` 
            + archiveNotifs.map(n => {
            let fd = 'Unbekannt';
            try {
                const d = new Date(n.created_at);
                fd = `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}, ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')} Uhr`;
            } catch(e) {}
            
            const typeIcon = n.type === 'danger'
                ? '<i class="bi bi-trash-fill" style="color:#ef233c;"></i>'
                : n.type === 'success'
                ? '<i class="bi bi-check-circle-fill" style="color:#4ade80;"></i>'
                : '<i class="bi bi-shield-lock-fill" style="color:var(--brand-gold-glow);"></i>';

            return `
            <div class="notif-card notif-read" data-type="${n.type}">
                <div class="notif-header">
                    <div class="notif-title-row">
                        ${typeIcon}
                        <span class="notif-message">${n.message}</span>
                    </div>
                    <span class="notif-time">${fd}</span>
                </div>
                <div class="notif-footer mt-2 pt-2" style="border-top: 1px solid rgba(255,255,255,0.05);">
                    <span class="notif-from"><i class="bi bi-person-fill-check me-1" style="color:var(--brand-gold-glow);"></i>Erledigt von: <b>${n.created_by || 'Admin'}</b></span>
                    <span class="notif-done"><i class="bi bi-check2-all me-1"></i>Archiviert</span>
                </div>
            </div>`;
        }).join('');
    }

    switchAdminNotifTab('unread');
    showModal("passwordResetsModal");
}

async function refreshAdminNotifications() {
    if (!state.currentUser || (!state.currentUser.isAdmin && !state.currentUser.isModerator)) return;
    checkAdminNotifications(); 
    openPasswordResetsModal();
}

async function approveInviteRequest(username) {
    if (!state.currentUser || (!state.currentUser.isAdmin && !state.currentUser.isModerator)) return;
    const randomCode = 'RIDER-' + Math.random().toString(36).substring(2, 7).toUpperCase();
    await db.from('invite_codes').insert([{ code: randomCode, created_by: state.currentUser.username, is_used: true, used_by: username }]);
    await db.from('users').update({ invite: randomCode }).eq('username', username);
    await logAdminAction(`Invite-Anfrage für <b>${username}</b> freigegeben.`, 'success');
    refreshAdminNotifications();
    if (state.currentView === 'admin') renderAdminPanel();
}

async function dismissInviteRequest(username) {
    if (!state.currentUser || (!state.currentUser.isAdmin && !state.currentUser.isModerator)) return;
    await db.from('users').delete().eq('username', username);
    await logAdminAction(`Invite-Anfrage für <b>${username}</b> abgelehnt/gelöscht.`, 'danger');
    refreshAdminNotifications();
    if (state.currentView === 'admin') renderAdminPanel();
}

async function modalResetPassword(username, isFromRequest = false) {
    if (!state.currentUser || (!state.currentUser.isAdmin && !state.currentUser.isModerator)) return;
    if (!isFromRequest) {
        let { data: targetUser } = await db.from('users').select('role').eq('username', username).single();
        if (targetUser) {
            if (state.currentUser.isAdmin && targetUser.role === 'moderator') {
                showCustomAlert("Das direkte Zurücksetzen ist gesperrt. Dies ist nur über Anfrage des Moderators möglich!", "Sperre", "warning");
                return;
            }
            if (state.currentUser.isModerator && !state.currentUser.isAdmin && targetUser.role === 'admin') {
                showCustomAlert("Das direkte Zurücksetzen ist gesperrt. Dies ist nur über Anfrage des Admins möglich!", "Sperre", "warning");
                return;
            }
        }
    }
    userToReset = username;
    const crt = document.getElementById("confirmResetText");
    if(crt) crt.innerHTML = `Möchtest du das Passwort von <b class="text-warning">${username}</b> auf "1234" zurücksetzen?`;
    showModal("confirmResetModal");
}

async function executeResetPassword() {
    if (!state.currentUser || (!state.currentUser.isAdmin && !state.currentUser.isModerator) || !userToReset) return;
    const username = userToReset;
    const resetHash = await hashPassword("1234");
    await db.from('users').update({ password: resetHash, reset_requested: false }).eq('username', username);
    await logAdminAction(`Passwort-Reset für <b>${username}</b> durchgeführt.`, 'warning');
    hideModal("confirmResetModal");
    userToReset = null;
    const srat = document.getElementById("successResetAdminText");
    if(srat) srat.innerHTML = `Das Passwort für <b class="text-warning">${username}</b> wurde auf "1234" zurückgesetzt.`;
    showModal("successResetAdminModal");
    refreshAdminNotifications();  
    if (state.currentView === 'admin') renderAdminPanel(); 
}

async function modalDismissReset(username) {
    if (!state.currentUser || (!state.currentUser.isAdmin && !state.currentUser.isModerator)) return;
    await db.from('users').update({ reset_requested: false }).eq('username', username);
    await logAdminAction(`Passwort-Reset-Anfrage für <b>${username}</b> verworfen.`, 'danger');
    refreshAdminNotifications();
    if (state.currentView === 'admin') renderAdminPanel();
}

async function checkAdminNotifications() {
    if (!state.currentUser || (!state.currentUser.isAdmin && !state.currentUser.isModerator)) return;
    let { data: usersReset } = await db.from('users').select('*').eq('reset_requested', true);
    let { data: usersInvite } = await db.from('users').select('*').eq('invite', 'PENDING');
    let { data: adminNotifs } = await db.from('user_notifications').select('id').eq('target_username', 'SYSTEM_ADMIN').eq('is_read', false);
    
    let count = (usersReset ? usersReset.length : 0) + (usersInvite ? usersInvite.length : 0) + (adminNotifs ? adminNotifs.length : 0);
    let badge = document.getElementById("adminBellBadge");
    if (badge) {
        if (count > 0) { badge.innerText = count; badge.classList.remove('d-none'); } 
        else { badge.classList.add('d-none'); }
    }
}

function renderDashboardCards() {
    const grid = document.getElementById("dashboardGrid");
    const existingAdminCard = document.getElementById("dashboardAdminCardBlock");
    if(!grid) return;

    if (state.currentUser && (state.currentUser.isAdmin || state.currentUser.isModerator)) {
        if (!existingAdminCard) {
            const col = document.createElement("div");
            col.className = "col-12 mb-2";
            col.id = "dashboardAdminCardBlock";
            col.onclick = () => switchView('admin');
            col.innerHTML = `
                <div class="feature-card admin-card-large">
                    <i class="bi bi-shield-lock-fill feature-icon text-warning"></i>
                    <div class="feature-card-text">
                        <h3 class="text-warning text-uppercase fw-bold mb-2 display-6">Admin & Moderator Center</h3>
                        <p class="card-description fs-5 text-light">Verwalte Invite-Codes und User-Rechte über die Cloud.</p>
                    </div>
                </div>
            `;
            grid.prepend(col);
        }
        // Crew Verwaltungs-Card im Dashboard anzeigen
        const crewCard = document.getElementById('dashboardCrewAdminCard');
        if (crewCard) crewCard.classList.remove('d-none');
    } else if (existingAdminCard) {
        existingAdminCard.remove();
        // Crew Verwaltungs-Card verstecken
        const crewCard = document.getElementById('dashboardCrewAdminCard');
        if (crewCard) crewCard.classList.add('d-none');
    }
}

/* =========================================
   3. AUTHENTIFIZIERUNG & HILFE-BOX
   ========================================= */
async function toggleInviteHelp() {
    const helpBox = document.getElementById("inviteHelpText");
    if(!helpBox) return;
    if (helpBox.classList.contains("d-none")) {
        helpBox.classList.remove("d-none");
        helpBox.innerHTML = '<span class="spinner-border spinner-border-sm text-warning" role="status"></span> Lade Team-Liste...';
        try {
            let { data: staff, error } = await db.from('users').select('username, role').in('role', ['admin', 'moderator']);
            if (error) throw error;
            let text = "Invite-Code exklusiv von Admins oder Moderatoren.<br><br><b class='text-warning'>Team:</b><br>";
            if (staff && staff.length > 0) {
                const admins = staff.filter(s => s.role === 'admin').map(s => s.username).join(', ');
                const mods = staff.filter(s => s.role === 'moderator').map(s => s.username).join(', ');
                if (admins) text += `<span class="text-danger fw-bold">Admins:</span> ${admins}<br>`;
                if (mods) text += `<span class="text-info fw-bold">Mods:</span> ${mods}`;
            } else { text += "<i>Keine Teammitglieder gefunden.</i>"; }
            helpBox.innerHTML = text;
        } catch (err) { helpBox.innerHTML = "<span class='text-danger'>Fehler beim Laden.</span>"; }
    } else { helpBox.classList.add("d-none"); }
}

function showInviteInput() {
    const section = document.getElementById("inviteInputSection");
    const buttons = document.getElementById("inviteChoiceButtons");
    if (section && buttons) {
        buttons.classList.add("d-none");
        section.classList.remove("d-none");
        document.getElementById("modalRegInvite").required = true;
    }
}

function hideInviteInput() {
    const section = document.getElementById("inviteInputSection");
    const buttons = document.getElementById("inviteChoiceButtons");
    if (section && buttons) {
        section.classList.add("d-none");
        buttons.classList.remove("d-none");
        document.getElementById("modalRegInvite").required = false;
        document.getElementById("modalRegInvite").value = "";
    }
}

async function requestInviteWithoutCode() {
    const form = document.getElementById("modalRegisterForm");
    if (!form.checkValidity()) { form.reportValidity(); return; }
    const username = document.getElementById("modalRegUser").value.trim();
    const email = document.getElementById("modalRegEmail").value.trim();
    const password = document.getElementById("modalRegPass").value;
    const hashedPassword = await hashPassword(password);

    let { error } = await db.from('users').insert([{ 
        username, email, role: 'member', invite: 'PENDING', password: hashedPassword, is_deactivated: false, last_login: new Date().toISOString()
    }]);

    if (error) {
        showCustomAlert("Die E-Mail oder der Username ist vermutlich schon vergeben.", "Fehler", "danger");
        return;
    }
    hideModal("authModal");
    showModal("successRequestInviteModal");
}

document.getElementById("modalLoginForm")?.addEventListener("submit", async function(e) {
    e.preventDefault();
    const userInput = document.getElementById("modalLoginUser").value.trim();
    const passInput = document.getElementById("modalLoginPass").value;

    try {
        let { data: users, error } = await db.from('users').select('*').or(`username.eq.${userInput},email.eq.${userInput}`);
        if (error) { showCustomAlert("Datenbank-Fehler", "Fehler", "danger"); return; }
        if (!users || users.length === 0) { showCustomAlert("Benutzer nicht gefunden!", "Login fehlgeschlagen", "warning"); return; }

        let user = users[0];
        if (user.is_deactivated) { showCustomAlert("Dein Account wurde gesperrt.", "Gesperrt", "danger"); return; }
        if (user.invite === 'PENDING' || (!user.invite && user.role === 'member')) {
            showCustomAlert("Account wartet noch auf Freigabe.", "Warten", "warning"); return;
        }

        const hashedInput = await hashPassword(passInput);
        if (user.password !== hashedInput) { showCustomAlert("Falsches Passwort!", "Zugriff verweigert", "danger"); return; }

        state.currentUser = { 
            username: user.username, email: user.email, role: user.role, 
            isAdmin: (user.role === 'admin' || user.username.toLowerCase() === 'nican'),
            isModerator: (user.role === 'moderator')
        };
        localStorage.setItem("app_user", JSON.stringify(state.currentUser));
        db.from('users').update({ last_login: new Date().toISOString() }).eq('username', user.username).then();
        
        initPresence(); // <--- Zwingt das Laden des Panels
        hideModal("authModal");

        const resetHash = await hashPassword("1234");
        if (user.password === resetHash) { showModal("changePasswordModal"); } 
        else { switchView('dashboard'); }
    } catch (err) { showCustomAlert("Verbindungsfehler.", "Fehler", "danger"); }
});

document.getElementById("changePasswordForm")?.addEventListener("submit", async function(e) {
    e.preventDefault();
    const newPass = document.getElementById("newPassInput").value;
    if (newPass === "1234") { showCustomAlert("Wähle ein echtes Passwort!", "Sicherheit", "warning"); return; }
    const hashedNewPass = await hashPassword(newPass);
    await db.from('users').update({ password: hashedNewPass }).eq('username', state.currentUser.username);
    hideModal("changePasswordModal");
    switchView('dashboard');
});

document.getElementById("modalRegisterForm")?.addEventListener("submit", async function(e) {
    e.preventDefault();
    const inputSection = document.getElementById("inviteInputSection");
    if (inputSection && inputSection.classList.contains("d-none")) {
        showCustomAlert("Bitte wähle aus, ob du einen Code hast.", "Hinweis", "warning"); return;
    }
    const username = document.getElementById("modalRegUser").value.trim();
    const email = document.getElementById("modalRegEmail").value.trim();
    const password = document.getElementById("modalRegPass").value;
    const inviteCode = document.getElementById("modalRegInvite").value.trim().toUpperCase();

    if (!inviteCode) { showCustomAlert("Code fehlt.", "Fehler", "warning"); return; }

    let { data: invite } = await db.from('invite_codes').select('*').eq('code', inviteCode).single();
    if (!invite || invite.is_used) { showCustomAlert("Ungültiger Code!", "Fehler", "danger"); return; }

    const hashedPassword = await hashPassword(password);
    let { error } = await db.from('users').insert([{ username, email, role: 'member', invite: inviteCode, password: hashedPassword, last_login: new Date().toISOString() }]);
    
    if (error) { showCustomAlert("Name oder E-Mail bereits vergeben.", "Fehler", "danger"); return; }

    await db.from('invite_codes').update({ is_used: true, used_by: username }).eq('code', inviteCode);
    state.currentUser = { username, email, role: 'member', isAdmin: false, isModerator: false };
    localStorage.setItem("app_user", JSON.stringify(state.currentUser));
    hideModal("authModal");
    initPresence();
    switchView('dashboard');
});

document.getElementById("forgotPasswordForm")?.addEventListener("submit", async function(e) {
    e.preventDefault();
    const username = document.getElementById("forgotPassUser").value.trim();
    let { data: user, error: fetchErr } = await db.from('users').select('*').eq('username', username).single();
    if (!user || fetchErr) { showCustomAlert("Username existiert nicht!", "Fehler", "warning"); return; }
    
    let { error: updateErr } = await db.from('users').update({ reset_requested: true }).eq('username', username);
    if (updateErr) { showCustomAlert("Cloud-Fehler: " + updateErr.message, "Fehler", "danger"); return; }
    
    hideModal("forgotPasswordModal");
    showModal("successRequestUserModal");
});

function logout() {
    stopPresence(); state.currentUser = null; localStorage.removeItem("app_user"); switchView('landing'); }

/* =========================================
   4. ADMIN PANEL
   ========================================= */
async function renderAdminPanel() {
    const usersTabBtn = document.getElementById("admin-tab-users");
    if (usersTabBtn) usersTabBtn.style.display = (state.currentUser.isAdmin || state.currentUser.isModerator) ? 'block' : 'none';

    let { data: invites } = await db.from('invite_codes').select('*');
    const invBody = document.getElementById("invitesTableBody");
    if(invBody) {
        invBody.innerHTML = (invites || []).map(i => `
            <tr>
                <td class="fw-bold" style="color: var(--brand-gold-glow);">
                    ${i.code} <button class="btn btn-sm btn-outline-warning p-1 ms-2" onclick="copyInviteCode('${i.code}', this)"><i class="bi bi-clipboard"></i></button>
                </td>
                <td class="text-light">${i.created_by || 'Nican'}</td>
                <td>${i.is_used ? (i.used_by ? `<span class="badge bg-secondary">Benutzt von ${i.used_by}</span>` : `<span class="badge bg-danger">Deaktiviert</span>`) : `<span class="badge bg-success">Frei</span>`}</td>
                <td class="text-end">
                    ${!i.used_by ? `<button class="btn ${i.is_used ? 'btn-outline-success' : 'btn-outline-warning'} btn-sm rounded-pill px-3 me-1" onclick="toggleInviteStatus('${i.code}', ${i.is_used})">${i.is_used ? 'Aktivieren' : 'Deaktivieren'}</button>` : ''}
                    <button class="btn btn-outline-danger btn-sm rounded-pill px-3" onclick="deleteInvite('${i.code}')"><i class="bi bi-trash"></i> Löschen</button>
                </td>
            </tr>
        `).join('');
    }

    if (state.currentUser.isAdmin || state.currentUser.isModerator) {
        let { data: users } = await db.from('users').select('*');
        const usrBody = document.getElementById("usersTableBody");
        if(usrBody) {
            usrBody.innerHTML = (users || []).map(u => {
                let roleColor = 'var(--brand-purple)'; 
                if (u.role === 'admin') roleColor = '#ef233c'; 
                if (u.role === 'moderator') roleColor = '#f58231'; 

                let actionHtml = '';
                if (u.username.toLowerCase() === 'nican') actionHtml = '<span class="badge bg-dark text-muted border border-secondary">System-Admin</span>';
                else if (state.currentUser.isModerator && !state.currentUser.isAdmin && u.username === state.currentUser.username) actionHtml = '<span class="badge bg-dark text-muted">Dein Account</span>';
                else if (state.currentUser.isModerator && !state.currentUser.isAdmin && u.role === 'admin') actionHtml = '<span class="badge bg-dark text-muted">Keine Berechtigung</span>';
                else {
                    let delBtn = state.currentUser.isAdmin ? `<button class="btn btn-outline-danger btn-sm rounded-pill px-3" onclick="promptDeleteUser('${u.username}', '${u.invite}')"><i class="bi bi-trash"></i></button>` : '';
                    let resetBtn = (state.currentUser.isAdmin || (state.currentUser.isModerator && u.role !== 'admin' && u.role !== 'moderator')) ? 
                        `<button class="btn ${u.reset_requested ? 'btn-danger' : 'btn-outline-info'} btn-sm rounded-pill px-3" onclick="modalResetPassword('${u.username}', false)"><i class="bi bi-key"></i></button>` : '';
                    
                    actionHtml = `
                        <div class="d-flex justify-content-end gap-2 align-items-center">
                            <select class="form-select form-select-sm bg-dark text-white w-auto" onchange="changeUserRole('${u.username}', this.value)">
                                <option value="member" ${u.role === 'member' ? 'selected' : ''}>Member</option>
                                <option value="ehren pixel" ${u.role === 'ehren pixel' ? 'selected' : ''}>Ehren Pixel</option>
                                <option value="moderator" ${u.role === 'moderator' ? 'selected' : ''}>Moderator</option>
                                ${state.currentUser.isAdmin ? `<option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>` : ''}
                            </select>
                            ${resetBtn}
                            <button class="btn ${u.is_deactivated ? 'btn-outline-success' : 'btn-outline-warning'} btn-sm rounded-pill px-3" onclick="toggleUserStatus('${u.username}', ${u.is_deactivated})">
                                ${u.is_deactivated ? '<i class="bi bi-unlock-fill"></i>' : '<i class="bi bi-lock-fill"></i>'}
                            </button>
                            ${delBtn}
                        </div>`;
                }

                let lastLoginHtml = '<span class="badge bg-dark border border-secondary text-secondary">Unbekannt</span>';
                if (u.last_login) {
                    let d = new Date(u.last_login);
                    let day = String(d.getDate()).padStart(2, '0');
                    let month = String(d.getMonth() + 1).padStart(2, '0');
                    let year = d.getFullYear();
                    let hrs = String(d.getHours()).padStart(2, '0');
                    let mins = String(d.getMinutes()).padStart(2, '0');
                    lastLoginHtml = `<span class="text-white fw-bold small">${day}.${month}.${year}</span><br><span class="text-warning" style="font-size:0.85rem;">${hrs}:${mins} Uhr</span>`;
                }

                return `
                <tr>
                    <td class="text-white fs-5"><span class="fw-bold">${u.username}</span>${u.reset_requested ? '<br><span class="badge bg-danger mt-1" style="font-size:0.7rem;">Reset angefragt</span>' : ''}</td>
                    <td><span class="badge px-3 py-2 rounded-pill text-uppercase" style="background-color: ${roleColor};">${u.role}</span></td>
                    <td class="text-light">${u.invite || '-'}</td>
                    <td>${u.is_deactivated ? '<span class="badge bg-danger px-3 py-2 rounded-pill">Gesperrt</span>' : '<span class="badge bg-success px-3 py-2 rounded-pill">Aktiv</span>'}</td>
                    <td>${lastLoginHtml}</td>
                    <td class="text-end">${actionHtml}</td>
                </tr>`;
            }).join('');
        }
    }
}

async function promptDeleteUser(username, inviteCode) {
    if (!state.currentUser.isAdmin) return;
    userToDelete = { username, inviteCode };
    const textEl = document.getElementById("confirmDeleteText");
    if(textEl) textEl.innerHTML = `Möchtest du den Benutzer <b class="text-warning">${username}</b> wirklich löschen?`;
    showModal("confirmDeleteModal");
}

async function executeDeleteUser() {
    if (!state.currentUser.isAdmin || !userToDelete) return;
    const { username, inviteCode } = userToDelete;
    try {
        await db.from('users').delete().eq('username', username);
        await db.from('map_pins').delete().eq('username', username);
        if (inviteCode && inviteCode !== '-' && inviteCode !== 'FOUNDER' && inviteCode !== 'PENDING') {
            await db.from('invite_codes').delete().eq('code', inviteCode);
        }
        hideModal("confirmDeleteModal");
        userToDelete = null;
        showCustomAlert(`Der Benutzer wurde gelöscht.`, "Erfolg", "success");
        renderAdminPanel();
    } catch (error) { showCustomAlert("Fehler: " + error.message, "Fehler", "danger"); }
}

async function copyInviteCode(code, btn) {
    try {
        await navigator.clipboard.writeText(code);
        const icon = btn.querySelector('i');
        icon.className = 'bi bi-check-lg text-success fs-5';
        setTimeout(() => { icon.className = 'bi bi-clipboard'; }, 2000);
    } catch (err) { showCustomAlert('Fehler beim Kopieren.', "Fehler", "warning"); }
}

async function changeUserRole(username, newRole) {
    if (!state.currentUser.isAdmin && !state.currentUser.isModerator) return;
    await db.from('users').update({ role: newRole }).eq('username', username);
    renderAdminPanel();
}
async function generateNewInviteCode() {
    const randomCode = 'RIDER-' + Math.random().toString(36).substring(2, 7).toUpperCase();
    await db.from('invite_codes').insert([{ code: randomCode, created_by: state.currentUser.username, is_used: false }]);
    renderAdminPanel();
}
async function toggleInviteStatus(code, currentStatus) {
    await db.from('invite_codes').update({ is_used: !currentStatus }).eq('code', code);
    renderAdminPanel();
}
async function deleteInvite(code) {
    await db.from('invite_codes').delete().eq('code', code);
    renderAdminPanel();
}
async function toggleUserStatus(username, currentStatus) {
    if (!state.currentUser.isAdmin && !state.currentUser.isModerator) return;
    await db.from('users').update({ is_deactivated: !currentStatus }).eq('username', username);
    renderAdminPanel();
}

/* =========================================
   5. GPX MODUL
   ========================================= */
document.getElementById("gpxUploadForm")?.addEventListener("submit", async function(e) {
    e.preventDefault();
    const title = document.getElementById("gpxTitle").value.trim();
    const distance = document.getElementById("gpxDistance").value.trim();
    const fileInput = document.getElementById("gpxFileInput");

    if (fileInput.files.length === 0) { showCustomAlert("Bitte wähle eine Datei!", "Fehler", "warning"); return; }

    const reader = new FileReader();
    reader.readAsText(fileInput.files[0]);
    reader.onload = async function(event) {
        const gpxText = event.target.result;
        const trkpts = new DOMParser().parseFromString(gpxText, "text/xml").getElementsByTagName("trkpt");
        let startLat = null, startLng = null;
        if (trkpts.length > 0) {
            startLat = parseFloat(trkpts[0].getAttribute("lat"));
            startLng = parseFloat(trkpts[0].getAttribute("lon") || trkpts[0].getAttribute("lng"));
        }
        await db.from('gpx_routes').insert([{ title, distance, gpx_data: gpxText, start_lat: startLat, start_lng: startLng, created_by: state.currentUser.username }]);
        document.getElementById("gpxUploadForm").reset();
        hideModal("uploadGpxModal");
        renderGpxRoutes();
    };
});

function generateGpxSvgPreview(gpxText) {
    if (!gpxText) return '<div class="rounded-4 mb-3 w-100 d-flex align-items-center justify-content-center bg-dark" style="height: 180px;"><i class="bi bi-map fs-1"></i></div>';
    try {
        const trkpts = new DOMParser().parseFromString(gpxText, "text/xml").getElementsByTagName("trkpt");
        if (trkpts.length < 2) return '<div class="rounded-4 mb-3 w-100 d-flex align-items-center justify-content-center bg-dark" style="height: 180px;"><i class="bi bi-map fs-1"></i></div>';

        let points = [], minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity;
        for (let i = 0; i < trkpts.length; i++) {
            let lat = parseFloat(trkpts[i].getAttribute("lat")), lon = parseFloat(trkpts[i].getAttribute("lon") || trkpts[i].getAttribute("lng"));
            if (!isNaN(lat) && !isNaN(lon)) {
                points.push({lat, lon});
                if(lat<minLat) minLat=lat; if(lat>maxLat) maxLat=lat; if(lon<minLon) minLon=lon; if(lon>maxLon) maxLon=lon;
            }
        }
        if (points.length < 2) return '';
        let latRange = maxLat - minLat || 0.0001, lonRange = maxLon - minLon || 0.0001;
        let w = 300, h = 180, pad = 25;
        let pathString = "";
        points.forEach((p, index) => {
            let x = pad + ((p.lon - minLon) / lonRange) * (w - pad*2);
            let y = h - (pad + ((p.lat - minLat) / latRange) * (h - pad*2));
            pathString += (index === 0 ? `M ${x.toFixed(1)} ${y.toFixed(1)}` : ` L ${x.toFixed(1)} ${y.toFixed(1)}`);
        });

        return `
            <div class="rounded-4 mb-3 w-100 overflow-hidden position-relative" style="height: 180px; background: rgba(15,15,20,0.9); border: 1px solid rgba(157,78,221,0.4);">
                <svg viewBox="0 0 ${w} ${h}" class="w-100 h-100" preserveAspectRatio="xMidYMid meet"><path d="${pathString}" fill="none" stroke="#c5a01a" stroke-width="3"/></svg>
            </div>
        `;
    } catch(e) { return ''; }
}

async function renderGpxRoutes() {
    let { data: routes } = await db.from('gpx_routes').select('*');
    let { data: myPin } = await db.from('map_pins').select('*').eq('email', state.currentUser.email).single();
    const grid = document.getElementById("gpxGrid");
    if(!grid) return;

    grid.innerHTML = (routes || []).map(r => {
        let distText = "Pin erforderlich";
        if (myPin && r.start_lat && r.start_lng) {
            let km = (L.latLng(myPin.lat, myPin.lng).distanceTo(L.latLng(r.start_lat, r.start_lng)) / 1000).toFixed(1);
            distText = `Ca. ${km} km entfernt`;
        }
        let adminControls = (state.currentUser.isAdmin || state.currentUser.isModerator || r.created_by === state.currentUser.username) ? `
            <div class="d-flex gap-2 mt-3 border-top border-secondary pt-3">
                <button class="btn btn-sm btn-outline-warning w-100" onclick="openEditGpxModal('${r.id}')">Bearbeiten</button>
                <button class="btn btn-sm btn-outline-danger w-100" onclick="deleteGpxRoute('${r.id}')">Löschen</button>
            </div>` : '';
        return `
        <div class="col-md-4">
            <div class="gpx-card h-100 d-flex flex-column justify-content-between">
                <div>
                    ${generateGpxSvgPreview(r.gpx_data)}
                    <h4 class="text-warning fw-bold mb-2">${r.title}</h4>
                    <p class="small mb-1">Länge: <b>${r.distance} km</b></p>
                    <p class="text-purple-glow small mb-2">Ersteller: <b>${r.created_by}</b></p>
                    <p class="small mb-3 fw-bold"><i class="bi bi-geo"></i> ${distText}</p>
                </div>
                <div><button class="btn btn-custom-sub btn-sm w-100" onclick="openGpxPreview('${r.id}')">Anzeigen</button>${adminControls}</div>
            </div>
        </div>`;
    }).join('') || '<p class="text-center text-purple-glow w-100">Keine Routen.</p>';
}

async function openGpxPreview(routeId) {
    let { data: r } = await db.from('gpx_routes').select('*').eq('id', routeId).single();
    if (!r) return;
    currentPreviewRoute = r;
    document.getElementById("gpxModalTitle").textContent = r.title;
    document.getElementById("gpxModalCreator").textContent = r.created_by;
    document.getElementById("gpxModalDistance").textContent = r.distance;
    showModal("gpxPreviewModal");
}

function downloadCurrentGpx() {
    if (!currentPreviewRoute || !currentPreviewRoute.gpx_data) return;
    const blob = new Blob([currentPreviewRoute.gpx_data], { type: 'application/gpx+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${currentPreviewRoute.title}.gpx`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
}

async function deleteGpxRoute(routeId) {
    if (await showCustomConfirm("Route wirklich löschen?", "Löschen")) {
        await db.from('gpx_routes').delete().eq('id', routeId);
        renderGpxRoutes();
    }
}

async function openEditGpxModal(routeId) {
    let { data: r } = await db.from('gpx_routes').select('*').eq('id', routeId).single();
    if (!r) return;
    activeEditGpxId = routeId;
    document.getElementById("editGpxTitle").value = r.title;
    document.getElementById("editGpxDistance").value = r.distance;
    document.getElementById("editGpxFileInput").value = "";
    showModal("editGpxModal");
}

document.getElementById("editGpxForm")?.addEventListener("submit", async function(e) {
    e.preventDefault();
    if (!activeEditGpxId) return;
    const title = document.getElementById("editGpxTitle").value.trim();
    const distance = document.getElementById("editGpxDistance").value.trim();
    const fileInput = document.getElementById("editGpxFileInput");
    let updateData = { title, distance };

    if (fileInput.files.length > 0) {
        const reader = new FileReader();
        reader.readAsText(fileInput.files[0]);
        reader.onload = async function(event) {
            updateData.gpx_data = event.target.result;
            const trkpts = new DOMParser().parseFromString(updateData.gpx_data, "text/xml").getElementsByTagName("trkpt");
            if (trkpts.length > 0) {
                updateData.start_lat = parseFloat(trkpts[0].getAttribute("lat"));
                updateData.start_lng = parseFloat(trkpts[0].getAttribute("lon") || trkpts[0].getAttribute("lng"));
            }
            await db.from('gpx_routes').update(updateData).eq('id', activeEditGpxId);
            hideModal("editGpxModal"); renderGpxRoutes();
        };
    } else {
        await db.from('gpx_routes').update(updateData).eq('id', activeEditGpxId);
        hideModal("editGpxModal"); renderGpxRoutes();
    }
});

/* =========================================
   6. EVENTS MODUL & WETTER API (AKTUALISIERT)
   ========================================= */
async function getWeatherBadge(lat, lng, dateString) {
    if (!lat || !lng) return '';
    const eventDate = new Date(dateString);
    const today = new Date();
    today.setHours(0,0,0,0);
    const diffDays = Math.floor((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0 || diffDays > 14) return ''; 

    try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=weather_code,temperature_2m_max&timezone=Europe%2FBerlin`);
        const data = await res.json();
        
        const targetDateStr = eventDate.toISOString().split('T')[0];
        const dateIndex = data.daily.time.indexOf(targetDateStr);
        
        if (dateIndex !== -1) {
            const code = data.daily.weather_code[dateIndex];
            const temp = Math.round(data.daily.temperature_2m_max[dateIndex]);
            
            let icon = 'bi-cloud';
            let color = 'text-light';
            if (code <= 3) { icon = 'bi-sun-fill'; color = 'text-warning'; } 
            else if (code >= 51 && code <= 67) { icon = 'bi-cloud-rain-fill'; color = 'text-info'; } 
            else if (code >= 71 && code <= 77) { icon = 'bi-snow'; color = 'text-white'; } 
            else if (code >= 95) { icon = 'bi-lightning-fill'; color = 'text-danger'; } 

            return `<span class="badge bg-dark border border-secondary p-2 ms-auto fs-6 shadow-sm"><i class="bi ${icon} ${color}"></i> ${temp}°C</span>`;
        }
    } catch(e) {}
    return '';
}

document.getElementById("eventForm")?.addEventListener("submit", async function(e) {
    e.preventDefault();
    const title = document.getElementById("eventTitle").value.trim();
    const organizer = document.getElementById("eventOrganizer").value.trim();
    const date_time = document.getElementById("eventDateTime").value;
    const location = document.getElementById("eventLocation").value.trim() || null;
    const description = document.getElementById("eventDescription").value.trim() || "";
    const fileInput = document.getElementById("eventImage");

    let coords = await getCoordsForLocation(location);

    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        if (file.size > 1024 * 1024) { 
            showCustomAlert("Dein Bild ist zu groß! Bitte wähle ein Bild unter 1 MB aus.", "Bild zu groß", "warning");
            return;
        }
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
            await saveNewEvent(title, organizer, date_time, location, description, reader.result, coords.lat, coords.lng);
        };
    } else {
        await saveNewEvent(title, organizer, date_time, location, description, null, coords.lat, coords.lng);
    }
});

async function saveNewEvent(title, organizer, date_time, location, description, image_data, lat, lng) {
    await db.from('crew_events').insert([{ 
        title, organizer, date_time, location, image_data, lat, lng,
        participants: [], description: description || "Ausfahrt", created_by: state.currentUser.username 
    }]);
    
    document.getElementById("eventForm").reset();
    hideModal("createEventModal");
    renderEvents();
    renderUpcomingEventsSidebar();
}

async function renderEvents() {
    let { data: events } = await db.from('crew_events').select('*');
    let { data: myPin } = await db.from('map_pins').select('*').eq('email', state.currentUser.email).single();
    let { data: allUsers } = await db.from('users').select('username, email');
    
    let userEmailToName = {};
    (allUsers || []).forEach(u => { userEmailToName[u.email] = u.username; });

    let now = new Date();
    let upcomingEvents = (events || []).filter(e => new Date(e.date_time) > new Date(now.getTime() - 24 * 60 * 60 * 1000));
    upcomingEvents.sort((a, b) => new Date(a.date_time) - new Date(b.date_time));
    
    let weatherPromises = upcomingEvents.map(ev => getWeatherBadge(ev.lat, ev.lng, ev.date_time));
    let weatherBadges = await Promise.all(weatherPromises);

    let htmlBuilder = '';
    for (let index = 0; index < upcomingEvents.length; index++) {
        let ev = upcomingEvents[index];
        let parts = ev.participants || [];
        let isParticipating = parts.includes(state.currentUser.email);
        
        let isNextEvent = index === 0;
        let colClass = isNextEvent ? "col-md-12 col-xl-8" : "col-md-6 col-xl-4";
        
        let imgHtml = ev.image_data ? `<img src="${ev.image_data}" class="img-fluid rounded-4 mb-3 w-100" style="height: ${isNextEvent ? '350px' : '200px'}; object-fit: cover; border: 1px solid rgba(157, 78, 221, 0.4);">` : '';
        let locText = ev.location ? ev.location : '<i class="text-muted">Noch offen (wird besprochen)</i>';
        let highlightBadge = isNextEvent ? `<span class="badge bg-danger text-uppercase mb-3 px-3 py-2 fs-6 shadow"><i class="bi bi-star-fill text-warning"></i> Nächstes Event</span><br>` : '';
        let descHtml = ev.description ? `<p class="text-light ${isNextEvent ? 'fs-6' : 'small'} mt-2 mb-3 p-3 rounded-3" style="background: rgba(0,0,0,0.4); border-left: 3px solid var(--brand-purple);"><i class="bi bi-info-circle me-1 text-purple-glow"></i> ${ev.description}</p>` : '';
        let weatherBadge = weatherBadges[index] || '';

        let participantsHtml = '<span class="text-muted small">Noch keine Anmeldungen</span>';
        if (parts.length > 0) {
            participantsHtml = parts.map(email => {
                let name = userEmailToName[email] || email.split('@')[0];
                return `<span class="badge bg-secondary text-light me-1 mb-1 px-2 py-1">${name}</span>`;
            }).join('');
        }

        let distText = "Pin für Entfernung erforderlich";
        if (myPin && ev.lat && ev.lng) {
            let km = (L.latLng(myPin.lat, myPin.lng).distanceTo(L.latLng(ev.lat, ev.lng)) / 1000).toFixed(1);
            distText = `Ca. ${km} km von deinem Pin entfernt`;
        } else if (!ev.lat || !ev.lng) {
            distText = "Kein genauer Treffpunkt-Standort angegeben";
        }

        let adminControlsHtml = (state.currentUser.isAdmin || state.currentUser.isModerator || ev.created_by === state.currentUser.username) ? `
            <div class="d-flex gap-2 mt-3 pt-3 border-top border-secondary justify-content-end">
                <button class="btn btn-sm event-action-btn text-light" onclick="openEditEventModal('${ev.id}')" title="Bearbeiten"><i class="bi bi-pencil-fill text-warning"></i> Bearbeiten</button>
                <button class="btn btn-sm event-action-btn text-danger" onclick="deleteEvent('${ev.id}')" title="Löschen"><i class="bi bi-trash-fill"></i> Löschen</button>
            </div>
        ` : '';

        // Button mit Helm und angepasstem Text
        let participationBtnHtml = isParticipating 
            ? `<button class="btn flex-grow-1 fw-bold text-white shadow d-flex align-items-center justify-content-center gap-2" style="background-color: #198754; border: 1px solid #157347; border-radius: 12px; padding: 10px 16px;" onclick="toggleEventParticipation('${ev.id}')">
                   <i class="bi bi-shield-shaded fs-4 text-warning" style="filter: drop-shadow(0 0 8px #ffd700);"></i> 
                   <span>Du bist dabei <small class="fw-normal opacity-75">(Klicken zum Absagen)</small></span>
               </button>`
            : `<button class="btn flex-grow-1 fw-bold text-light shadow d-flex align-items-center justify-content-center gap-2" style="background-color: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.2); border-radius: 12px; padding: 10px 16px;" onclick="toggleEventParticipation('${ev.id}')">
                   <i class="bi bi-shield fs-4 text-secondary"></i> 
                   <span>Teilnehmen</span>
               </button>`;

        // Button für "Idealer Treffpunkt" (Dunkles Blau, abgerundet)
        let idealMeetingBtnHtml = `<button class="btn flex-grow-1 fw-bold text-light shadow d-flex align-items-center justify-content-center gap-2" style="background-color: #1e1b4b; border: 1px solid #312e81; border-radius: 12px; padding: 10px 16px;" onclick="calculateBestMeetingPoint('${ev.id}')" title="Fairste Mitte berechnen"><i class="bi bi-compass-fill text-info"></i> Idealer Treffpunkt</button>`;

        htmlBuilder += `
        <div class="${colClass}">
            <div id="event-card-${ev.id}" class="single-event-card ${isNextEvent ? 'border-warning shadow-lg' : ''}" style="${isNextEvent ? 'background: linear-gradient(135deg, rgba(197, 160, 26, 0.1) 0%, rgba(10, 10, 12, 0.8) 100%);' : ''}">
                <div>
                    ${imgHtml}
                    ${highlightBadge}
                    <h4 class="text-warning text-uppercase fw-bold ${isNextEvent ? 'display-6 mb-3' : 'mb-2'}">${ev.title}</h4>
                    
                    <div class="d-flex align-items-center justify-content-between mb-2 flex-wrap">
                        <p class="event-meta-gold ${isNextEvent ? 'fs-5' : ''} mb-0"><i class="bi bi-calendar-event me-2"></i> ${new Date(ev.date_time).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })} Uhr</p>
                        ${weatherBadge}
                    </div>

                    <p class="text-light ${isNextEvent ? 'fs-6' : 'small'} mb-1"><i class="bi bi-geo-alt"></i> Voraussichtlicher Treffpunkt: ${locText}</p>
                    <p class="text-purple-glow ${isNextEvent ? 'fs-6' : 'small'} mb-2 fw-bold"><i class="bi bi-geo"></i> ${distText}</p>
                    <p class="text-light ${isNextEvent ? 'fs-6' : 'small'} mb-2"><i class="bi bi-person-badge"></i> Orga: ${ev.organizer}</p>
                    ${descHtml}
                    
                    <div class="mt-3 p-2 rounded-3" style="background: rgba(0,0,0,0.3); border: 1px solid rgba(157,78,221,0.2);">
                        <p class="text-purple-glow small fw-bold mb-2"><i class="bi bi-people-fill me-1"></i> Angemeldete Fahrer (${parts.length}):</p>
                        <div class="d-flex flex-wrap">${participantsHtml}</div>
                    </div>
                </div>
                <div>
                    <div class="d-flex gap-2 mt-4 flex-wrap">
                        ${participationBtnHtml}
                        ${idealMeetingBtnHtml}
                    </div>
                    ${adminControlsHtml}
                </div>
            </div>
        </div>`;
    }
    const evtGrid = document.getElementById("eventsGrid");
    if(evtGrid) evtGrid.innerHTML = htmlBuilder || '<p class="text-center text-purple-glow w-100">Keine aktuellen Events geplant.</p>';
}

async function deleteEvent(eventId) {
    if (await showCustomConfirm("Möchtest du dieses Event wirklich löschen?", "Event Absagen")) {
        await db.from('crew_events').delete().eq('id', eventId);
        renderEvents();
        renderUpcomingEventsSidebar();
    }
}

async function openEditEventModal(eventId) {
    let { data: ev } = await db.from('crew_events').select('*').eq('id', eventId).single();
    if (!ev) return;
    
    activeEditEventId = eventId;
    document.getElementById('editEventTitle').value = ev.title;
    document.getElementById('editEventOrganizer').value = ev.organizer;
    document.getElementById('editEventLocation').value = ev.location || '';
    document.getElementById('editEventDescription').value = ev.description || '';
    document.getElementById('editEventImage').value = ''; 
    
    let dt = new Date(ev.date_time);
    document.getElementById('editEventDateTime').value = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    showModal('editEventModal');
}

document.getElementById("editEventForm")?.addEventListener("submit", async function(e) {
    e.preventDefault();
    if (!activeEditEventId) return;

    const title = document.getElementById("editEventTitle").value.trim();
    const organizer = document.getElementById("editEventOrganizer").value.trim();
    const date_time = document.getElementById("editEventDateTime").value;
    const location = document.getElementById("editEventLocation").value.trim() || null;
    const description = document.getElementById("editEventDescription").value.trim() || "";
    const fileInput = document.getElementById("editEventImage");

    let coords = await getCoordsForLocation(location);
    let updateData = { title, organizer, date_time, location, description, lat: coords.lat, lng: coords.lng };

    if (fileInput.files.length > 0) {
        if (fileInput.files[0].size > 1024 * 1024) { 
            showCustomAlert("Bild unter 1 MB aus.", "Fehler", "warning"); return;
        }
        const reader = new FileReader();
        reader.readAsDataURL(fileInput.files[0]);
        reader.onload = async () => {
            updateData.image_data = reader.result;
            await db.from('crew_events').update(updateData).eq('id', activeEditEventId);
            hideModal("editEventModal"); renderEvents(); renderUpcomingEventsSidebar();
        };
    } else {
        await db.from('crew_events').update(updateData).eq('id', activeEditEventId);
        hideModal("editEventModal"); renderEvents(); renderUpcomingEventsSidebar();
    }
});

async function toggleEventParticipation(eventId) {
    let { data: event } = await db.from('crew_events').select('participants').eq('id', eventId).single();
    let parts = event.participants || [];
    if (parts.includes(state.currentUser.email)) parts = parts.filter(email => email !== state.currentUser.email);
    else parts.push(state.currentUser.email);
    await db.from('crew_events').update({ participants: parts }).eq('id', eventId);
    renderEvents();
}

async function calculateBestMeetingPoint(eventId) {
    let { data: myPin } = await db.from('map_pins').select('*').eq('email', state.currentUser.email).single();
    if (!myPin) { showCustomAlert("Du musst zuerst deinen Pin eintragen!", "Fehler", "warning"); return; }

    let { data: event } = await db.from('crew_events').select('participants').eq('id', eventId).single();
    if (!event.participants || event.participants.length === 0) { showCustomAlert("Noch niemand eingetragen.", "Fehler", "warning"); return; }

    let { data: pins } = await db.from('map_pins').select('lat, lng').in('email', event.participants);
    if (!pins || pins.length === 0) { showCustomAlert("Keine Standorte markiert.", "Fehler", "warning"); return; }

    let avgLat = pins.reduce((sum, p) => sum + p.lat, 0) / pins.length;
    let avgLng = pins.reduce((sum, p) => sum + p.lng, 0) / pins.length;
    let townName = "Unbekannte Region";
    try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${avgLat}&lon=${avgLng}`);
        const data = await res.json();
        if (data && data.address) townName = data.address.city || data.address.town || data.address.village || townName;
    } catch(e) {}

    document.getElementById("meetingPointCityName").innerText = townName;
    showModal("bestMeetingPointModal");

    setTimeout(() => {
        if (!window.meetingMapInstance) {
            window.meetingMapInstance = L.map('meetingMap').setView([avgLat, avgLng], 10);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(window.meetingMapInstance);
            window.meetingMarkerGroup = L.layerGroup().addTo(window.meetingMapInstance);
        } else {
            window.meetingMapInstance.setView([avgLat, avgLng], 10);
            window.meetingMapInstance.invalidateSize(); 
            window.meetingMarkerGroup.clearLayers();
        }
        L.circle([avgLat, avgLng], { color: '#c5a01a', fillColor: '#7b2cbf', fillOpacity: 0.15, radius: 15000 }).addTo(window.meetingMarkerGroup);
        L.marker([avgLat, avgLng]).addTo(window.meetingMarkerGroup).bindPopup(`Mitte<br>ca. ${townName}`).openPopup();
    }, 350); 
}

/* =========================================
   7. FORUM & WISSENSAUSTAUSCH MODUL
   ========================================= */
document.getElementById("topicForm")?.addEventListener("submit", async function(e) {
    e.preventDefault();
    const category = document.getElementById("topicCat").value;
    const title = document.getElementById("topicTitle").value.trim();
    const content = document.getElementById("topicContent").value.trim();
    await db.from('forum_topics').insert([{ category, title, content, author: state.currentUser.username, replies: [] }]);
    document.getElementById("topicForm").reset(); hideModal("createTopicModal"); renderForumTopics();
});

async function renderForumTopics() {
    let query = db.from('forum_topics').select('*');
    if (currentForumCat !== 'all') query = query.eq('category', currentForumCat);
    let { data: topics } = await query;
    let { data: users } = await db.from('users').select('username, social_ig, social_tiktok, social_youtube');
    const userMap = {};
    (users || []).forEach(u => userMap[u.username] = u);
    const getSocials = (uName) => {
        const p = userMap[uName];
        if(!p) return '';
        let html = '<span class="ms-2">';
        if (p.social_ig) html += `<a href="https://instagram.com/${p.social_ig}" target="_blank" onclick="event.stopPropagation();" class="text-danger mx-1"><i class="bi bi-instagram"></i></a>`;
        if (p.social_tiktok) html += `<a href="https://tiktok.com/@${p.social_tiktok}" target="_blank" onclick="event.stopPropagation();" class="text-light mx-1"><i class="bi bi-tiktok"></i></a>`;
        if (p.social_youtube) html += `<a href="https://youtube.com/@${p.social_youtube}" target="_blank" onclick="event.stopPropagation();" class="text-danger mx-1"><i class="bi bi-youtube"></i></a>`;
        html += '</span>';
        return html === '<span class="ms-2"></span>' ? '' : html;
    };

    const grid = document.getElementById("forumGrid");
    if(grid) {
        grid.innerHTML = (topics || []).map(t => {
            let adminControlsHtml = (state.currentUser.isAdmin || state.currentUser.isModerator || t.author === state.currentUser.username) ? `
                <div class="d-flex gap-2 mt-3 pt-2 border-top border-secondary">
                    <button class="btn btn-sm btn-outline-warning" onclick="event.stopPropagation(); openEditForumModal('${t.id}')">Bearbeiten</button>
                    <button class="btn btn-sm btn-outline-danger" onclick="event.stopPropagation(); deleteForumTopic('${t.id}')">Löschen</button>
                </div>` : '';
            return `
            <div class="thread-card mb-3 p-3 rounded-4" style="background:rgba(10,10,12,0.75); border:1px solid rgba(157,78,221,0.3); cursor:pointer;" onclick="openChatTopic(${t.id}, '${t.title.replace(/'/g, "\\'")}')">
                <div class="d-flex justify-content-between align-items-center mb-1">
                    <span class="thread-badge">${t.category}</span>
                    <span class="small text-muted"><i class="bi bi-chat-dots"><b> ${(t.replies || []).length}</b></i></span>
                </div>
                <h5 class="thread-title text-warning mt-1">${t.title}</h5>
                <p class="text-light small mb-2">${t.content}</p>
                <div class="d-flex justify-content-between align-items-center"><span class="small text-purple-glow fw-bold">Von ${t.author}${getSocials(t.author)}</span></div>
                ${adminControlsHtml}
            </div>`;
        }).join('') || '<p class="text-center text-purple-glow">Keine Beiträge.</p>';
    }
}

function filterForumCat(cat, el) {
    currentForumCat = cat;
    document.querySelectorAll('.category-item').forEach(i => i.classList.remove('active'));
    el.classList.add('active'); renderForumTopics();
}

async function deleteForumTopic(topicId) {
    if (await showCustomConfirm("Dieses Thema wirklich löschen?", "Löschen")) {
        await db.from('forum_topics').delete().eq('id', topicId);
        renderForumTopics();
    }
}

async function openEditForumModal(topicId) {
    let { data: t } = await db.from('forum_topics').select('*').eq('id', topicId).single();
    if (!t) return;
    activeEditTopicId = topicId;
    document.getElementById("editTopicCat").value = t.category;
    document.getElementById("editTopicTitle").value = t.title;
    document.getElementById("editTopicContent").value = t.content;
    showModal("editTopicModal");
}

document.getElementById("editTopicForm")?.addEventListener("submit", async function(e) {
    e.preventDefault();
    if (!activeEditTopicId) return;
    await db.from('forum_topics').update({ 
        category: document.getElementById("editTopicCat").value, 
        title: document.getElementById("editTopicTitle").value.trim(), 
        content: document.getElementById("editTopicContent").value.trim() 
    }).eq('id', activeEditTopicId);
    hideModal("editTopicModal"); activeEditTopicId = null; renderForumTopics();
});

async function openChatTopic(id, title) {
    activeChatTopicId = id;
    document.getElementById("chatModalTitle").textContent = title;
    let { data: topic } = await db.from('forum_topics').select('*').eq('id', id).single();
    let { data: users } = await db.from('users').select('username, social_ig, social_tiktok, social_youtube');
    const userMap = {};
    (users || []).forEach(u => userMap[u.username] = u);
    const getSocials = (uName) => {
        const p = userMap[uName];
        if(!p) return '';
        let html = '<span class="ms-2">';
        if (p.social_ig) html += `<a href="https://instagram.com/${p.social_ig}" target="_blank" onclick="event.stopPropagation();" class="text-danger mx-1"><i class="bi bi-instagram"></i></a>`;
        if (p.social_tiktok) html += `<a href="https://tiktok.com/@${p.social_tiktok}" target="_blank" onclick="event.stopPropagation();" class="text-light mx-1"><i class="bi bi-tiktok"></i></a>`;
        if (p.social_youtube) html += `<a href="https://youtube.com/@${p.social_youtube}" target="_blank" onclick="event.stopPropagation();" class="text-danger mx-1"><i class="bi bi-youtube"></i></a>`;
        html += '</span>';
        return html === '<span class="ms-2"></span>' ? '' : html;
    };

    document.getElementById("chatMessageList").innerHTML = `
        <div class="chat-bubble chat-bubble-other"><div class="chat-author">${topic.author}${getSocials(topic.author)}</div><div>${topic.content}</div></div>
    ` + (topic.replies || []).map(r => `
        <div class="chat-bubble ${r.author === state.currentUser.username ? 'chat-bubble-own' : 'chat-bubble-other'}">
            <div class="chat-author">${r.author}${getSocials(r.author)}</div><div>${r.text}</div>
        </div>
    `).join('');
    showModal("chatTopicModal");
}

async function sendChatMessage() {
    const input = document.getElementById("chatInputText");
    if (!input.value.trim() || !activeChatTopicId) return;
    let { data: topic } = await db.from('forum_topics').select('replies').eq('id', activeChatTopicId).single();
    let replies = topic.replies || [];
    replies.push({ author: state.currentUser.username, text: input.value.trim(), time: new Date().toISOString() });
    await db.from('forum_topics').update({ replies }).eq('id', activeChatTopicId);
    input.value = ""; openChatTopic(activeChatTopicId, document.getElementById("chatModalTitle").textContent);
}

/* =========================================
   8. MAP MODUL & POIs
   ========================================= */
let allMapPins = []; 
let currentUserPin = null;
let bikeCount = 0;
let poiMarkersArray = [];

const customPOIs = [
    { type: 'treff', name: 'Glemseck (Leonberg)', lat: 48.7711, lng: 9.0371, image: 'https://images.pexels.com/photos/2116475/pexels-photo-2116475.jpeg?auto=compress&cs=tinysrgb&w=600' },
    { type: 'treff', name: 'Torfhaus (Harz)', lat: 51.8016, lng: 10.5369, image: 'https://images.pexels.com/photos/1413412/pexels-photo-1413412.jpeg?auto=compress&cs=tinysrgb&w=600' },
    { type: 'treff', name: 'Fährhaus Sylvenstein', lat: 47.5794, lng: 11.5478, image: 'https://images.pexels.com/photos/2626665/pexels-photo-2626665.jpeg?auto=compress&cs=tinysrgb&w=600' },
    { type: 'pass', name: 'Schwarzwaldhochstraße', lat: 48.6019, lng: 8.2016, image: 'https://images.pexels.com/photos/104842/pexels-photo-104842.jpeg?auto=compress&cs=tinysrgb&w=600' },
    { type: 'pass', name: 'Feldbergpass', lat: 47.8594, lng: 8.0353, image: 'https://images.pexels.com/photos/1715193/pexels-photo-1715193.jpeg?auto=compress&cs=tinysrgb&w=600' },
    { type: 'pass', name: 'Sudelfeld', lat: 47.675, lng: 12.036, image: 'https://images.pexels.com/photos/2116475/pexels-photo-2116475.jpeg?auto=compress&cs=tinysrgb&w=600' }
];

function initMap() {
    if (!mapInstance) {
        mapInstance = L.map('map').setView([51.1657, 10.4515], 6); 
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(mapInstance);
        markersGroup = L.layerGroup().addTo(mapInstance);
    }
    setTimeout(() => mapInstance.invalidateSize(), 300);
    loadMapPins();
}

function renderBikeInputs(bikesArray = [""]) {
    const container = document.getElementById("bikeInputsContainer");
    if(!container) return;
    container.innerHTML = '<label class="label-custom">Motorräder (max. 5)</label>';
    bikeCount = 0;
    if (bikesArray.length === 0) bikesArray = [""];
    bikesArray.forEach(bike => addBikeInput(bike));
}

function addBikeInput(val = "") {
    if (bikeCount >= 5) { if (!val) showCustomAlert("Du kannst maximal 5 Motorräder eintragen.", "Limit erreicht", "warning"); return; }
    bikeCount++;
    const container = document.getElementById("bikeInputsContainer");
    const input = document.createElement("input");
    input.type = "text"; input.className = "input-custom mb-2 bike-input";
    input.placeholder = `${bikeCount}. Motorrad ${bikeCount === 1 ? '(Pflicht)' : '(optional)'}`;
    input.value = val; if (bikeCount === 1) input.required = true;
    container.appendChild(input);
    document.getElementById("addBikeBtn").style.display = (bikeCount >= 5) ? 'none' : 'block';
}

document.getElementById("mapForm")?.addEventListener("submit", async function(e) {
    e.preventDefault();
    const zip = document.getElementById("mapZip").value.trim();
    const city = document.getElementById("mapCity").value.trim();
    const bikes = Array.from(document.querySelectorAll(".bike-input")).map(i => i.value.trim()).filter(v => v !== "").join(", ");
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(zip + " " + city)}`);
        const data = await response.json();
        if (data && data.length > 0) {
            await db.from('map_pins').upsert([{ email: state.currentUser.email, username: state.currentUser.username, city: `${zip} ${city}`, bike: bikes, lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }], { onConflict: 'email' });
            showCustomAlert("Dein Standort wurde aktualisiert!", "Erfolg", "success"); loadMapPins(); 
        } else { showCustomAlert("Stadt nicht gefunden.", "Fehler", "warning"); }
    } catch (err) { showCustomAlert("Verbindungsfehler.", "Fehler", "danger"); }
});

async function loadMapPins() {
    if (!mapInstance) return;
    let { data: pins } = await db.from('map_pins').select('*');
    allMapPins = pins || [];
    currentUserPin = allMapPins.find(p => p.email === state.currentUser.email);
    
    if (state.currentView === 'map') {
        if (!currentUserPin) {
            showModal("missingPinModal");
            document.getElementById("mapSubmitBtn").innerHTML = '<i class="bi bi-geo-alt-fill"></i> Pin Speichern';
            renderBikeInputs([""]); 
            document.getElementById("mapCity").value = ""; document.getElementById("mapZip").value = "";
        } else {
            let savedCity = currentUserPin.city || "", savedZip = "";
            if (/^\d+/.test(savedCity)) { let parts = savedCity.split(" "); savedZip = parts.shift(); savedCity = parts.join(" "); }
            document.getElementById("mapZip").value = savedZip; document.getElementById("mapCity").value = savedCity;
            document.getElementById("mapSubmitBtn").innerHTML = '<i class="bi bi-arrow-repeat"></i> Aktualisieren';
            renderBikeInputs(currentUserPin.bike.split(',').map(b => b.trim()));
        }
    }
    renderPins(allMapPins);
}

function renderPins(pinsToRender) {
    markersGroup.clearLayers();
    const redIcon = new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png', shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34] });
    pinsToRender.forEach(p => {
        const isMe = p.email === state.currentUser.email;
        L.marker([p.lat, p.lng], isMe ? { icon: redIcon } : {}).addTo(markersGroup).bindPopup(`<b class="text-uppercase ${isMe ? 'text-danger' : 'text-primary'}">${p.username} ${isMe ? '(Du)' : ''}</b><br><b>Stadt:</b> ${p.city}<br><b>Bikes:</b> ${p.bike}`);
    });
    if (currentUserPin && state.currentView === 'map' && !window.radiusCircle) mapInstance.setView([currentUserPin.lat, currentUserPin.lng], 9);
}

function filterMapByRadius() {
    if (!currentUserPin) { showCustomAlert("Du musst deinen eigenen Standort eintragen!", "Fehler", "warning"); return; }
    const rKm = parseInt(document.getElementById("radiusSlider").value);
    const uLatLng = L.latLng(currentUserPin.lat, currentUserPin.lng);
    renderPins(allMapPins.filter(p => p.email === state.currentUser.email || (uLatLng.distanceTo(L.latLng(p.lat, p.lng)) / 1000) <= rKm));
    if (window.radiusCircle) mapInstance.removeLayer(window.radiusCircle);
    window.radiusCircle = L.circle([currentUserPin.lat, currentUserPin.lng], { color: '#c5a01a', fillColor: '#7b2cbf', fillOpacity: 0.15, radius: rKm * 1000 }).addTo(mapInstance);
    mapInstance.fitBounds(window.radiusCircle.getBounds());
}

async function toggleMapPOIs() {
    if (!mapInstance) return;
    const showTreff = document.getElementById('poiTreff')?.checked;
    const showPass = document.getElementById('poiPass')?.checked;
    
    poiMarkersArray.forEach(m => mapInstance.removeLayer(m));
    poiMarkersArray = [];
    
    if (!showTreff && !showPass) return;

    let { data: dbPOIs } = await db.from('custom_pois').select('*');
    const allPOIs = [...customPOIs, ...(dbPOIs || [])];

    const greenIcon = new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png', shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34] });
    const goldIcon = new L.Icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png', shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34] });

    allPOIs.forEach(p => {
        if ((p.type === 'treff' && showTreff) || (p.type === 'pass' && showPass)) {
            let activeIcon = p.type === 'treff' ? greenIcon : goldIcon;
            let label = p.type === 'treff' ? 'Bikertreff / Café' : 'Traumstraße / Pass';
            
            let distHtml = "";
            if (currentUserPin && p.lat && p.lng) {
                let km = (L.latLng(currentUserPin.lat, currentUserPin.lng).distanceTo(L.latLng(p.lat, p.lng)) / 1000).toFixed(1);
                distHtml = `<br><i class="bi bi-geo-alt-fill text-danger"></i> <b>Ca. ${km} km</b> entfernt`;
            }
            let creatorHtml = p.created_by ? `<br><span class="small text-muted">Von: ${p.created_by}</span>` : '';
            let imgSrc = p.image_data || p.image;
            let imageHtml = imgSrc ? `<br><img src="${imgSrc}" class="img-fluid rounded mt-2" style="max-height: 120px; width: 100%; object-fit: cover;">` : '';

            let m = L.marker([p.lat, p.lng], { icon: activeIcon })
                     .bindPopup(`<div style="min-width: 160px;"><b class="text-uppercase text-dark">${p.name}</b><br><span class="badge bg-secondary">${label}</span>${distHtml}${creatorHtml}${imageHtml}</div>`);
            m.addTo(mapInstance);
            poiMarkersArray.push(m);
        }
    });
}

document.getElementById("poiForm")?.addEventListener("submit", async function(e) {
    e.preventDefault();
    const name = document.getElementById("poiName").value.trim();
    const category = document.getElementById("poiCategory").value;
    const locationText = document.getElementById("poiLocation").value.trim();
    const fileInput = document.getElementById("poiImage");

    let coords = await getCoordsForLocation(locationText);
    if (!coords.lat || !coords.lng) {
        showCustomAlert("Ort konnte nicht gefunden werden. Bitte genauere Adresse eingeben.", "Fehler", "warning");
        return;
    }

    const savePoiToDb = async (imgBase64 = null) => {
        let { error } = await db.from('custom_pois').insert([{
            name, category, location: locationText, lat: coords.lat, lng: coords.lng, created_by: state.currentUser.username, image_data: imgBase64
        }]);

        if (error) {
            showCustomAlert("Fehler beim Speichern: " + error.message, "Datenbankfehler", "danger");
        } else {
            document.getElementById("poiForm").reset();
            hideModal("createPoiModal");
            showCustomAlert("Dein POI wurde erfolgreich zur Karte hinzugefügt!", "Erfolg", "success");
            toggleMapPOIs(); 
        }
    };

    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        if (file.size > 1024 * 1024) {
            showCustomAlert("Das Bild ist zu groß! Bitte max. 1 MB.", "Fehler", "warning");
            return;
        }
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
            await savePoiToDb(reader.result);
        };
    } else {
        await savePoiToDb(null);
    }
});

/* =========================================
   9. PIXEL GARAGE MODUL – VOLLVERSION
      • bis zu 8 Bilder pro Eintrag
      • Lightbox-Galerie (Durchklicken)
      • Besitzer kann eigenen Beitrag bearbeiten
      • Admin/Mod: Bearbeiten/Löschen mit Pflicht-Begründung
      • User-Benachrichtigungen bei Moderation
   ========================================= */

let activeEditGarageId = null;
let garageNewImagesToAdd = [];
let garageExistingImages = [];
let pendingModerationAction = null; // { type: 'edit'|'delete', bikeId, ownerId }

// ---- HILFSFUNKTION: Bilder sicher parsen ----
function parseGarageImages(b) {
    // Neues Format: images als JSON-String
    if (b.images) {
        if (Array.isArray(b.images)) return b.images.filter(Boolean);
        try { const parsed = JSON.parse(b.images); if (Array.isArray(parsed)) return parsed.filter(Boolean); } catch(e) {}
        // Fallback: wenn es ein einzelner String ist (Base64)
        if (typeof b.images === 'string' && b.images.startsWith('data:')) return [b.images];
    }
    // Altes Format: image_data
    if (b.image_data) return [b.image_data];
    return [];
}

// ---- Fisher-Yates Shuffle ----
function shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// ---- UPLOAD ----
document.getElementById("bikeUploadForm")?.addEventListener("submit", async function(e) {
    e.preventDefault();
    const submitBtn = this.querySelector('[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Wird hochgeladen...';

    const model = document.getElementById("garageBikeModel").value.trim();
    const mods  = document.getElementById("garageBikeMods").value.trim();
    const fileInput = document.getElementById("garageBikeImage");

    if (fileInput.files.length === 0) {
        showCustomAlert("Bitte wähle mindestens ein Bild aus.", "Fehler", "warning");
        submitBtn.disabled = false; submitBtn.innerHTML = 'Ab in den Showroom'; return;
    }

    const files = Array.from(fileInput.files).slice(0, 8);
    const tooBig = files.find(f => f.size > 1.5 * 1024 * 1024);
    if (tooBig) {
        showCustomAlert(`"${tooBig.name}" ist zu groß! Bitte max. 1.5 MB pro Bild.`, "Fehler", "warning");
        submitBtn.disabled = false; submitBtn.innerHTML = 'Ab in den Showroom'; return;
    }

    let imageDataArray = [];
    try {
        for (const file of files) {
            const base64 = await new Promise((res, rej) => {
                const r = new FileReader();
                r.readAsDataURL(file);
                r.onload = () => res(r.result);
                r.onerror = rej;
            });
            imageDataArray.push(base64);
        }
    } catch (err) {
        showCustomAlert('Fehler beim Lesen der Bilder: ' + err.message, 'Fehler', 'danger');
        submitBtn.disabled = false; submitBtn.innerHTML = 'Ab in den Showroom'; return;
    }

    // Als JSON-String speichern (kompatibel mit text-Spalte in Supabase)
    const { error } = await db.from('pixel_garage').insert([{ 
        owner: state.currentUser.username, 
        model, 
        mods: mods || 'Keine Umbauten angegeben.', 
        images: JSON.stringify(imageDataArray)
    }]);

    submitBtn.disabled = false;
    submitBtn.innerHTML = 'Ab in den Showroom';

    if (error) {
        showCustomAlert('Hochladen fehlgeschlagen: ' + error.message, 'Datenbankfehler', 'danger');
    } else {
        document.getElementById("bikeUploadForm").reset();
        hideModal("createBikeModal");
        showCustomAlert('Dein Bike ist jetzt im Showroom! 🏍️', 'Erfolg', 'success');
        renderGarage();
    }
});

// ---- RENDER (mit Randomizer & neuem Design) ----
async function renderGarage() {
    const grid = document.getElementById("garageGrid");
    if(!grid) return;
    grid.innerHTML = '<div class="col-12 text-center py-5"><div class="spinner-border text-purple" role="status"></div></div>';

    let { data: bikes, error } = await db.from('pixel_garage').select('*');
    if (error) { grid.innerHTML = '<p class="text-center text-danger w-100">Fehler beim Laden der Garage.</p>'; return; }

    let { data: users } = await db.from('users').select('username, social_ig, social_tiktok, social_youtube');
    const userMap = {};
    (users || []).forEach(u => userMap[u.username] = u);
    const getSocials = (uName) => {
        const p = userMap[uName];
        if(!p) return '';
        let html = '<span class="ms-2" style="font-size:0.8rem;">';
        if (p.social_ig) html += `<a href="https://instagram.com/${p.social_ig}" target="_blank" onclick="event.stopPropagation();" class="text-danger mx-1"><i class="bi bi-instagram"></i></a>`;
        if (p.social_tiktok) html += `<a href="https://tiktok.com/@${p.social_tiktok}" target="_blank" onclick="event.stopPropagation();" class="text-light mx-1"><i class="bi bi-tiktok"></i></a>`;
        if (p.social_youtube) html += `<a href="https://youtube.com/@${p.social_youtube}" target="_blank" onclick="event.stopPropagation();" class="text-danger mx-1"><i class="bi bi-youtube"></i></a>`;
        html += '</span>';
        return html === '<span class="ms-2" style="font-size:0.8rem;"></span>' ? '' : html;
    };

    // Randomizer: bei jedem Laden zufällige Reihenfolge
    allGarageBikes = shuffleArray(bikes || []);

    if (allGarageBikes.length === 0) {
        grid.innerHTML = `
        <div class="col-12">
            <div class="text-center py-5" style="border: 2px dashed rgba(157,78,221,0.3); border-radius: 24px;">
                <i class="bi bi-bicycle" style="font-size:4rem; color: var(--brand-purple-glow); opacity:0.5;"></i>
                <p class="text-purple-glow mt-3 mb-1 fw-bold">Die Garage ist noch leer.</p>
                <p class="text-muted small">Sei der Erste und stell dein Bike in den Showroom!</p>
            </div>
        </div>`;
        return;
    }

    grid.innerHTML = allGarageBikes.map(b => {
        const imgs = parseGarageImages(b);
        const firstImg = imgs[0] || '';
        const imgCount = imgs.length;

        const isOwner = state.currentUser.username === b.owner;
        const isMod = state.currentUser.isAdmin || state.currentUser.isModerator;

        let controlsHtml = '';
        if (isOwner) {
            controlsHtml = `
                <div class="garage-card-actions">
                    <button class="garage-action-btn edit" onclick="event.stopPropagation(); openGarageEditModal('${b.id}', false)">
                        <i class="bi bi-pencil-fill"></i> Bearbeiten
                    </button>
                    <button class="garage-action-btn delete" onclick="event.stopPropagation(); garageOwnerDelete('${b.id}')">
                        <i class="bi bi-trash-fill"></i> Löschen
                    </button>
                </div>`;
        } else if (isMod) {
            controlsHtml = `
                <div class="garage-card-actions">
                    <button class="garage-action-btn mod-edit" onclick="event.stopPropagation(); openModerationModal('edit', '${b.id}', '${b.owner}')">
                        <i class="bi bi-shield-exclamation"></i> Bearbeiten
                    </button>
                    <button class="garage-action-btn mod-delete" onclick="event.stopPropagation(); openModerationModal('delete', '${b.id}', '${b.owner}')">
                        <i class="bi bi-shield-x"></i> Löschen
                    </button>
                </div>`;
        }

        const shortMods = b.mods && b.mods.length > 70 ? b.mods.substring(0, 70) + '...' : (b.mods || 'Keine Angaben');
        const modsDisplay = shortMods === 'Keine Umbauten angegeben.' || shortMods === 'Keine Angaben'
            ? '<span class="text-muted">Serienzustand</span>'
            : shortMods;

        return `
        <div class="col-sm-6 col-xl-4">
            <div class="garage-card-v2" onclick="openBikePreview('${b.id}')">
                <div class="garage-card-img-wrap">
                    ${firstImg ? `<img src="${firstImg}" class="garage-card-img" loading="lazy" alt="${b.model}">` : '<div class="garage-card-img garage-card-img-placeholder"><i class="bi bi-camera"></i></div>'}
                    <div class="garage-card-img-overlay"></div>
                    ${imgCount > 1 ? `<span class="garage-img-badge"><i class="bi bi-images"></i> ${imgCount}</span>` : ''}
                    <div class="garage-card-owner-chip"><i class="bi bi-person-fill me-1"></i>${b.owner}${getSocials(b.owner)}</div>
                </div>
                <div class="garage-card-body">
                    <h5 class="garage-card-title">${b.model}</h5>
                    <p class="garage-card-mods"><i class="bi bi-tools me-1"></i>${modsDisplay}</p>
                    <div class="garage-card-footer">
                        <span class="garage-card-click-hint"><i class="bi bi-zoom-in me-1"></i>Galerie öffnen</span>
                    </div>
                </div>
                ${controlsHtml}
            </div>
        </div>`;
    }).join('');
}

// ---- LIGHTBOX PREVIEW ----
function openBikePreview(bikeId) {
    let b = allGarageBikes.find(bike => String(bike.id) === String(bikeId));
    if(!b) return;
    const imgs = parseGarageImages(b);
    if (imgs.length === 0) { showCustomAlert('Dieses Bike hat noch keine Bilder.', 'Galerie', 'warning'); return; }

    // Modal befüllen
    const innerEl = document.getElementById("garageCarouselInner");
    const titleEl = document.getElementById("garageModalTitle");
    const ownerEl = document.getElementById("garageModalOwner");
    const modsEl  = document.getElementById("garageModalMods");
    const counterEl = document.getElementById("garageImgCounter");

    if(!innerEl) return;

    titleEl.textContent = b.model;
    ownerEl.textContent = b.owner;
    modsEl.textContent  = b.mods || 'Keine Umbauten angegeben.';

    innerEl.innerHTML = imgs.map((src, idx) => `
        <div class="carousel-item ${idx === 0 ? 'active' : ''}">
            <img src="${src}" class="d-block w-100" style="height: 60vh; object-fit: contain; background: #000;" alt="Bike Bild ${idx+1}">
        </div>
    `).join('');

    counterEl.textContent = `1 / ${imgs.length}`;

    // Counter bei Slide-Wechsel aktualisieren
    const carouselEl = document.getElementById("garageCarousel");
    carouselEl.removeEventListener('slid.bs.carousel', carouselEl._counterHandler || (() => {}));
    carouselEl._counterHandler = (e) => {
        counterEl.textContent = `${e.to + 1} / ${imgs.length}`;
    };
    carouselEl.addEventListener('slid.bs.carousel', carouselEl._counterHandler);

    showModal("garagePreviewModal");
}

// ---- BESITZER: BEARBEITEN ----
async function openGarageEditModal(bikeId, isModerationEdit) {
    let b = allGarageBikes.find(bike => String(bike.id) === String(bikeId));
    if(!b) return;
    activeEditGarageId = bikeId;
    garageExistingImages = parseGarageImages(b); // Korrekte JSON-Dekodierung
    garageNewImagesToAdd = [];

    document.getElementById("editGarageBikeModel").value = b.model;
    document.getElementById("editGarageBikeMods").value = b.mods || '';
    document.getElementById("editGarageBikeImage").value = '';
    renderEditGarageExistingImages();
    showModal("editBikeModal");
}

function renderEditGarageExistingImages() {
    const container = document.getElementById("editGarageExistingImgs");
    const countEl   = document.getElementById("editGarageImgCount");
    const total = garageExistingImages.length + garageNewImagesToAdd.length;
    if(!container) return;

    countEl.textContent = total;
    container.innerHTML = '';

    garageExistingImages.forEach((src, idx) => {
        const thumb = document.createElement('div');
        thumb.className = 'thumb-preview-item';
        thumb.innerHTML = `
            <img src="${src}" class="thumb-preview-img">
            <button type="button" class="thumb-del-btn" onclick="removeExistingGarageImg(${idx})" title="Bild entfernen"><i class="bi bi-x"></i></button>
        `;
        container.appendChild(thumb);
    });

    garageNewImagesToAdd.forEach((src, idx) => {
        const thumb = document.createElement('div');
        thumb.className = 'thumb-preview-item';
        thumb.style.border = '1px solid #198754';
        thumb.innerHTML = `
            <img src="${src}" class="thumb-preview-img">
            <button type="button" class="thumb-del-btn" style="background:rgba(25,135,84,0.9)" onclick="removeNewGarageImg(${idx})" title="Entfernen"><i class="bi bi-x"></i></button>
        `;
        container.appendChild(thumb);
    });

    if (total === 0) container.innerHTML = '<span class="text-muted small align-self-center mx-auto">Keine Bilder vorhanden</span>';
}

function removeExistingGarageImg(idx) {
    garageExistingImages.splice(idx, 1);
    renderEditGarageExistingImages();
}
function removeNewGarageImg(idx) {
    garageNewImagesToAdd.splice(idx, 1);
    renderEditGarageExistingImages();
}

document.getElementById("editGarageBikeImage")?.addEventListener('change', function() {
    const total = garageExistingImages.length + garageNewImagesToAdd.length;
    const remaining = 8 - total;
    if (remaining <= 0) { showCustomAlert('Maximal 8 Bilder erlaubt!', 'Limit', 'warning'); this.value = ''; return; }
    const files = Array.from(this.files).slice(0, remaining);
    Promise.all(files.map(f => new Promise(res => { const r = new FileReader(); r.readAsDataURL(f); r.onload = () => res(r.result); })))
        .then(results => { garageNewImagesToAdd.push(...results); renderEditGarageExistingImages(); this.value = ''; });
});

document.getElementById("editBikeForm")?.addEventListener("submit", async function(e) {
    e.preventDefault();
    if(!activeEditGarageId) return;
    const model = document.getElementById("editGarageBikeModel").value.trim();
    const mods  = document.getElementById("editGarageBikeMods").value.trim();
    const allImages = [...garageExistingImages, ...garageNewImagesToAdd];

    if (allImages.length === 0) { showCustomAlert('Mindestens ein Bild ist erforderlich!', 'Fehler', 'warning'); return; }

    await db.from('pixel_garage').update({ model, mods: mods || 'Keine Umbauten angegeben.', images: JSON.stringify(allImages) }).eq('id', activeEditGarageId);
    hideModal('editBikeModal');
    activeEditGarageId = null;
    renderGarage();
});

async function garageOwnerDelete(bikeId) {
    if (await showCustomConfirm('Möchtest du dieses Bike wirklich aus der Garage entfernen?', 'Bike löschen')) {
        await db.from('pixel_garage').delete().eq('id', bikeId);
        renderGarage();
    }
}

// ---- ADMIN / MOD: MODERATION MIT PFLICHT-BEGRÜNDUNG ----
function openModerationModal(actionType, bikeId, ownerUsername) {
    pendingModerationAction = { type: actionType, bikeId, ownerUsername };
    const titleEl = document.getElementById('moderationModalTitle');
    const descEl  = document.getElementById('moderationModalDesc');
    const submitBtn = document.getElementById('moderationSubmitBtn');
    const reasonInput = document.getElementById('moderationReasonInput');

    if (!titleEl) return;
    reasonInput.value = '';

    if (actionType === 'edit') {
        titleEl.innerHTML = '<i class="bi bi-pencil-fill me-2"></i>Beitrag Bearbeiten (Mod)';
        descEl.textContent = `Du bearbeitest den Garage-Eintrag von "${ownerUsername}" als Moderator. Bitte gib eine verbindliche Begründung an, die dem User mitgeteilt wird.`;
        submitBtn.textContent = 'Weiter zum Bearbeiten';
        submitBtn.className = 'btn btn-warning rounded-pill px-4 fw-bold shadow-lg flex-grow-1';
    } else {
        titleEl.innerHTML = '<i class="bi bi-trash-fill me-2"></i>Beitrag Löschen (Mod)';
        descEl.textContent = `Du löschst den Garage-Eintrag von "${ownerUsername}" als Moderator. Bitte gib eine verbindliche Begründung an, die dem User mitgeteilt wird.`;
        submitBtn.textContent = 'Löschen & Benachrichtigung senden';
        submitBtn.className = 'btn btn-danger rounded-pill px-4 fw-bold shadow-lg flex-grow-1';
    }

    showModal('moderationReasonModal');
}

document.getElementById('moderationReasonForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    if (!pendingModerationAction) return;

    const reason = document.getElementById('moderationReasonInput').value.trim();
    if (!reason) { showCustomAlert('Begründung ist Pflicht!', 'Fehler', 'warning'); return; }

    const { type, bikeId, ownerUsername } = pendingModerationAction;
    const b = allGarageBikes.find(bike => String(bike.id) === String(bikeId));
    const bikeModel = b ? b.model : 'Unbekanntes Modell';

    hideModal('moderationReasonModal');

    if (type === 'delete') {
        await db.from('pixel_garage').delete().eq('id', bikeId);
        // Benachrichtigung an User senden
        await sendUserNotification(
            ownerUsername,
            `<i class="bi bi-trash-fill text-danger me-1"></i> Dein Garage-Eintrag <b>"${bikeModel}"</b> wurde von einem Moderator entfernt.`,
            reason,
            'danger'
        );
        pendingModerationAction = null;
        renderGarage();
        showCustomAlert(`Eintrag gelöscht. ${ownerUsername} wurde benachrichtigt.`, 'Erledigt', 'success');
    } else if (type === 'edit') {
        // Begründung zwischenspeichern, dann Edit-Modal öffnen
        pendingModerationAction.reason = reason;
        // Benachrichtigung JETZT senden (Mod hat bearbeitet)
        // Eigentliches Speichern passiert im editBikeForm submit
        // Wir merken uns die Reason für nach dem Submit
        openGarageEditModal(bikeId, true);
    }
});

// Wenn Mod-Edit gespeichert wird, Benachrichtigung schicken
const _origEditBikeSubmit = document.getElementById('editBikeForm');
if (_origEditBikeSubmit) {
    _origEditBikeSubmit.addEventListener('submit', async function() {
        // Nur wenn es eine Moderation-Aktion ist und die Reason schon gesetzt wurde
        if (pendingModerationAction && pendingModerationAction.reason) {
            const { ownerUsername, reason } = pendingModerationAction;
            const b = allGarageBikes.find(bike => String(bike.id) === String(activeEditGarageId));
            const bikeModel = b ? b.model : 'Unbekanntes Modell';
            await sendUserNotification(
                ownerUsername,
                `<i class="bi bi-pencil-fill text-warning me-1"></i> Dein Garage-Eintrag <b>"${bikeModel}"</b> wurde von einem Moderator bearbeitet.`,
                reason,
                'warning'
            );
            pendingModerationAction = null;
        }
    });
}

// ---- USER BENACHRICHTIGUNGEN ----
async function sendUserNotification(toUsername, messageHtml, reason, type = 'warning') {
    await db.from('user_notifications').insert([{
        target_username: toUsername,
        message: messageHtml,
        reason: reason,
        type: type,
        is_read: false,
        created_by: state.currentUser.username
    }]);
}

async function checkUserNotifications() {
    if (!state.currentUser) return;
    

    let { data: notifs } = await db.from('user_notifications')
        .select('id')
        .eq('target_username', state.currentUser.username)
        .eq('is_read', false);
    const count = notifs ? notifs.length : 0;
    const badge = document.getElementById('userBellBadge');
    if (badge) {
        if (count > 0) { badge.textContent = count; badge.classList.remove('d-none'); }
        else { badge.classList.add('d-none'); }
    }
}

// ---- BENACHRICHTIGUNGEN: 30-Tage-Bereinigung ----
async function purgeOldNotifications() {
    // Löscht gelesene Benachrichtigungen die älter als 30 Tage sind
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    await db.from('user_notifications')
        .delete()
        .eq('is_read', true)
        .lt('created_at', cutoff.toISOString());
}

// ---- TAB-WECHSEL ----
function switchNotifTab(tab) {
    const unreadPanel  = document.getElementById('notifPanelUnread');
    const archivePanel = document.getElementById('notifPanelArchive');
    const tabUnread    = document.getElementById('tabUnread');
    const tabArchive   = document.getElementById('tabArchive');
    if (!unreadPanel) return;

    if (tab === 'unread') {
        unreadPanel.classList.remove('d-none');
        archivePanel.classList.add('d-none');
        tabUnread.classList.add('active');
        tabArchive.classList.remove('active');
    } else {
        unreadPanel.classList.add('d-none');
        archivePanel.classList.remove('d-none');
        tabArchive.classList.add('active');
        tabUnread.classList.remove('active');
    }
}

// ---- BENACHRICHTIGUNGEN ÖFFNEN (mit Tabs) ----
async function openUserNotificationsModal() {
    if (!state.currentUser) return;
    


    // Bereinigung im Hintergrund
    purgeOldNotifications();

    // Alle Benachrichtigungen laden
    let { data: notifs } = await db.from('user_notifications')
        .select('*')
        .eq('target_username', state.currentUser.username)
        .order('created_at', { ascending: false });

    const panelUnread  = document.getElementById('notifPanelUnread');
    const panelArchive = document.getElementById('notifPanelArchive');
    const countUnread  = document.getElementById('notifUnreadCount');
    const countArchive = document.getElementById('notifArchiveCount');
    if (!panelUnread) return;

    const unread  = (notifs || []).filter(n => !n.is_read);
    const archive = (notifs || []).filter(n =>  n.is_read);

    // Zähler aktualisieren
    if (unread.length > 0) {
        countUnread.textContent = unread.length;
        countUnread.classList.remove('d-none');
    } else {
        countUnread.classList.add('d-none');
    }
    countArchive.textContent = archive.length;

    // Hilfsfunktion: Eine Karte rendern
    function renderCard(n) {
        let fd = 'Unbekannt';
        try {
            const d = new Date(n.created_at);
            fd = `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}, ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')} Uhr`;
        } catch(e) {}

        const typeIcon = n.type === 'danger'
            ? '<i class="bi bi-trash-fill" style="color:#ef233c;"></i>'
            : n.type === 'success'
            ? '<i class="bi bi-check-circle-fill" style="color:#4ade80;"></i>'
            : '<i class="bi bi-pencil-fill" style="color:var(--brand-gold-glow);"></i>';

        return `
        <div class="notif-card ${n.is_read ? 'notif-read' : 'notif-unread'}" data-type="${n.type}">
            <div class="notif-header">
                <div class="notif-title-row">
                    ${typeIcon}
                    <span class="notif-message">${n.message}</span>
                    ${!n.is_read ? '<span class="notif-new-badge">NEU</span>' : ''}
                </div>
                <span class="notif-time">${fd}</span>
            </div>
            <div class="notif-reason-box">
                <span class="notif-reason-label"><i class="bi bi-chat-quote-fill me-1"></i>Begründung</span>
                <p class="notif-reason-text">${n.reason}</p>
            </div>
            <div class="notif-footer">
                <span class="notif-from"><i class="bi bi-shield-fill-check me-1" style="color:var(--brand-purple-glow);"></i>Von <b>${n.created_by || 'Team'}</b></span>
                ${!n.is_read
                    ? `<button class="notif-read-btn" onclick="markNotificationRead('${n.id}')"><i class="bi bi-check2 me-1"></i>Als gelesen markieren</button>`
                    : '<span class="notif-done"><i class="bi bi-check2-all me-1"></i>Gelesen</span>'
                }
            </div>
        </div>`;
    }

    // Tab: Ungelesen
    panelUnread.innerHTML = unread.length > 0
        ? unread.map(renderCard).join('')
        : `<div class="text-center py-5">
               <i class="bi bi-bell-slash" style="font-size:3rem; color: rgba(157,78,221,0.35);"></i>
               <p class="text-purple-glow mt-3 mb-0 fw-bold">Keine neuen Benachrichtigungen</p>
               <p class="text-muted small mt-1">Du bist auf dem neuesten Stand.</p>
           </div>`;

    // Tab: Archiv
    panelArchive.innerHTML = archive.length > 0
        ? `<p class="text-muted small mb-3"><i class="bi bi-info-circle me-1"></i>Gelesene Benachrichtigungen werden nach <b>30 Tagen</b> automatisch gelöscht.</p>`
          + archive.map(renderCard).join('')
        : `<div class="text-center py-5">
               <i class="bi bi-archive" style="font-size:3rem; color: rgba(255,255,255,0.1);"></i>
               <p class="text-muted mt-3 mb-0">Das Archiv ist leer.</p>
           </div>`;

    // Alle ungelesenen als gesehen markieren (Zähler in Navbar)
    if (unread.length > 0) {
        const ids = unread.map(n => n.id);
        await db.from('user_notifications').update({ is_read: true }).in('id', ids);
        const badge = document.getElementById('userBellBadge');
        if (badge) badge.classList.add('d-none');
    }

    // Standard: Ungelesen-Tab aktiv
    switchNotifTab('unread');
    showModal('userNotificationsModal');
}

async function markNotificationRead(notifId) {
    await db.from('user_notifications').update({ is_read: true }).eq('id', notifId);
    openUserNotificationsModal();
}

// ==========================================
// PROFILE FUNCTIONS
// ==========================================

async function renderProfile() {
    if (!state.currentUser) return;
    

    document.getElementById('profileCurrentUsername').innerText = state.currentUser.username;
    document.getElementById('profileEmail').value = state.currentUser.email || '';
    document.getElementById('profilePassword').value = '';
    
    // Fetch user details for socials
    let { data: user } = await db.from('users').select('*').eq('username', state.currentUser.username).single();
    if (user) {
        document.getElementById('profileIg').value = user.social_ig || '';
        document.getElementById('profileTt').value = user.social_tiktok || '';
        document.getElementById('profileYt').value = user.social_youtube || '';
    }
    
    // Fetch user's map pin bikes
    let { data: pin } = await db.from('map_pins').select('bike').eq('username', state.currentUser.username).maybeSingle();
    if (pin) {
        document.getElementById('profileMapBikes').value = pin.bike || '';
    } else {
        document.getElementById('profileMapBikes').value = '';
    }
    
    renderMyMarketItems();
    renderMyGarageItems();
}

async function renderMyMarketItems() {
    const container = document.getElementById("profile-market-container");
    if (!container) return;
    
    // Fetch user market items
    let { data: items } = await db.from("market_items").select("*").eq("author", state.currentUser.username);
    
    if (!items || items.length === 0) {
        container.innerHTML = "<p class=\"text-secondary text-center w-100 mt-4\">Du hast noch keine Inserate erstellt.</p>";
        return;
    }
    
    let html = "";
    items.forEach(item => {
        if(!allMarketItems.find(i => i.id === item.id)) allMarketItems.push(item);
        const cover = (item.images && item.images.length > 0) ? item.images[0] : "https://via.placeholder.com/300x200?text=Kein+Bild";
        html += `
        <div class="col-md-6 mb-3">
            <div class="card bg-dark text-white border-secondary h-100" style="cursor: pointer;" onclick="openMarketEditModal('${item.id}')">
                <div class="row g-0">
                    <div class="col-4">
                        <img src="${cover}" class="img-fluid rounded-start h-100 object-fit-cover" alt="Item">
                    </div>
                    <div class="col-8">
                        <div class="card-body py-2 pe-2 d-flex flex-column h-100 justify-content-center">
                            <h6 class="card-title text-warning fw-bold text-truncate mb-1">${item.title}</h6>
                            <p class="card-text mb-1 small text-truncate">${item.price}</p>
                            <div class="mt-auto text-end">
                                <button class="btn btn-sm btn-outline-danger" onclick="event.stopPropagation(); deleteMyMarketItem('${item.id}')"><i class="bi bi-trash"></i></button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
    });
    container.innerHTML = html;
}

async function deleteMyMarketItem(id) {
    if(confirm("Inserat wirklich löschen?")) {
        await db.from("market_items").delete().eq("id", id);
        renderMyMarketItems();
    }
}

async function renderMyGarageItems() {
    const container = document.getElementById("profile-garage-container");
    if (!container) return;
    
    // Fetch user garage items
    let { data: bikes } = await db.from("pixel_garage").select("*").eq("owner", state.currentUser.username);
    
    if (!bikes || bikes.length === 0) {
        container.innerHTML = "<p class=\"text-secondary text-center w-100 mt-4\">Du hast noch keine Bikes in der Garage.</p>";
        return;
    }
    
    let html = "";
    bikes.forEach(bike => {
        if(!allGarageBikes.find(b => b.id === bike.id)) allGarageBikes.push(bike);
        const imgs = parseGarageImages(bike);
        const cover = (imgs && imgs.length > 0) ? imgs[0] : "https://via.placeholder.com/300x200?text=Kein+Bild";
        html += `
        <div class="col-md-6 mb-3">
            <div class="card bg-dark text-white border-secondary h-100" style="min-height: 120px; cursor: pointer;" onclick="openGarageEditModal('${bike.id}', false)">
                <div class="row g-0 h-100">
                    <div class="col-5">
                        <img src="${cover}" class="img-fluid rounded-start h-100 w-100 object-fit-cover" alt="Bike">
                    </div>
                    <div class="col-7">
                        <div class="card-body py-2 pe-2 d-flex flex-column h-100 justify-content-center">
                            <h6 class="card-title text-purple-glow fw-bold text-truncate mb-1">${bike.model}</h6>
                            <p class="card-text mb-1 small text-truncate text-secondary">${bike.mods || 'Keine Umbauten'}</p>
                            <div class="mt-auto text-end">
                                <button class="btn btn-sm btn-outline-danger" onclick="event.stopPropagation(); deleteMyGarageItem('${bike.id}')"><i class="bi bi-trash"></i></button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
    });
    container.innerHTML = html;
}

async function deleteMyGarageItem(id) {
    if(confirm("Bike wirklich löschen?")) {
        await db.from("pixel_garage").delete().eq("id", id);
        renderMyGarageItems();
    }
}

async function saveProfile(e) {
    e.preventDefault();
    const btn = document.getElementById('btnSaveProfile');
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Speichert...';
    btn.disabled = true;

    const email = document.getElementById('profileEmail').value.trim();
    const password = document.getElementById('profilePassword').value.trim();
    const ig = document.getElementById('profileIg').value.trim();
    const tt = document.getElementById('profileTt').value.trim();
    const yt = document.getElementById('profileYt').value.trim();
    const mapBikes = document.getElementById('profileMapBikes').value.trim();

    const updates = { email, social_ig: ig, social_tiktok: tt, social_youtube: yt };

    if (password) {
        updates.password = await hashPassword(password);
    }

    const { error } = await db.from('users').update(updates).eq('username', state.currentUser.username);
    
    // Update map pin bikes if a pin exists
    let { data: existingPin } = await db.from('map_pins').select('id').eq('username', state.currentUser.username).maybeSingle();
    if (existingPin) {
        await db.from('map_pins').update({ bike: mapBikes }).eq('username', state.currentUser.username);
        loadMapPins(); // reload map markers in background
    }
    
    btn.innerHTML = '<i class="bi bi-save me-2"></i> Profil Speichern';
    btn.disabled = false;

    if (error) {
        showCustomAlert('Fehler', 'Profil konnte nicht gespeichert werden.', 'bi-x-circle-fill', 'text-danger');
    } else {
        // Update local state if email changed
        state.currentUser.email = email;
        localStorage.setItem('app_user', JSON.stringify(state.currentUser));
        showCustomAlert('Erfolg', 'Dein Profil wurde erfolgreich aktualisiert.', 'bi-check-circle-fill', 'text-success');
    }
}

function requestUsernameChange() {
    document.getElementById('newUsernameInput').value = '';
    showModal('usernameChangeModal');
}

async function submitUsernameChange() {
    const newName = document.getElementById('newUsernameInput').value.trim();
    if (!newName) return;

    if (newName.length < 3) {
        hideModal('usernameChangeModal');
        showCustomAlert('Fehler', 'Der Name muss mindestens 3 Zeichen lang sein.', 'bi-exclamation-triangle', 'text-warning');
        return;
    }

    if (newName.toLowerCase() === state.currentUser.username.toLowerCase()) {
        hideModal('usernameChangeModal');
        showCustomAlert('Hinweis', 'Das ist bereits dein aktueller Name.', 'bi-info-circle', 'text-info');
        return;
    }

    const message = `User ${state.currentUser.username} beantragt eine NamensäÄnderung auf: ${newName}`;
    await db.from('user_notifications').insert([{
        target_username: 'SYSTEM_ADMIN',
        message: message,
        reason: 'NamensäÄnderung beantragt',
        type: 'warning',
        created_by: state.currentUser.username
    }]);

    hideModal('usernameChangeModal');
    showCustomAlert('Anfrage gesendet', 'Dein ÄÄÄnderungswunsch wurde an die Admins weitergeleitet.', 'bi-send-check', 'text-success');
}

async function approveUsernameChange(notifId, oldName, newName) {
    if (!(await showCustomConfirm(`Möchtest du den Namen von "${oldName}" in "${newName}" wirklich ändern?`, "NamensäÄnderung"))) return;

    let { data: existing } = await db.from('users').select('id').eq('username', newName).single();
    if (existing) {
        showCustomAlert('Fehler', 'Der neue Name ist bereits vergeben!', 'bi-exclamation-triangle', 'text-danger');
        return;
    }

    try {
        await db.from('users').update({ username: newName }).eq('username', oldName);
        await db.from('map_pins').update({ username: newName }).eq('username', oldName);
        await db.from('pixel_garage').update({ owner: newName }).eq('owner', oldName);
        await db.from('gpx_routes').update({ created_by: newName }).eq('created_by', oldName);
        await db.from('events').update({ created_by: newName }).eq('created_by', oldName);
        await db.from('forum_topics').update({ author: newName }).eq('author', oldName);
        
        await db.from('user_notifications').update({ target_username: newName }).eq('target_username', oldName);
        await db.from('user_notifications').update({ created_by: newName }).eq('created_by', oldName);

        let { data: topicsWithReplies } = await db.from('forum_topics').select('*');
        if (topicsWithReplies) {
            for (let t of topicsWithReplies) {
                if (t.replies && t.replies.length > 0) {
                    let changed = false;
                    t.replies.forEach(r => {
                        if (r.author === oldName) { r.author = newName; changed = true; }
                    });
                    if (changed) await db.from('forum_topics').update({ replies: t.replies }).eq('id', t.id);
                }
            }
        }

        await db.from('user_notifications').update({ is_read: true }).eq('id', notifId);
        await sendUserNotification(newName, 'Deine NamensäÄnderung wurde genehmigt! Dein neuer Name ist jetzt: ' + newName, 'Admin Nachricht', 'success');
        
        showCustomAlert('Erfolg', 'Der Name wurde erfolgreich geändert.', 'bi-check-circle-fill', 'text-success');
        openPasswordResetsModal();
    } catch (err) {
        console.error(err);
        showCustomAlert('Fehler', 'Beim Ändern des Namens ist ein Fehler aufgetreten.', 'bi-exclamation-triangle', 'text-danger');
    }
}

async function dismissUsernameChange(notifId, oldName, newName) {
    if (!(await showCustomConfirm(`NamensäÄnderung für "${oldName}" wirklich ablehnen?`, "Ablehnen"))) return;
    await db.from('user_notifications').update({ is_read: true }).eq('id', notifId);
    await sendUserNotification(oldName, `Deine Anfrage auf NamensäÄnderung zu "${newName}" wurde leider abgelehnt.`, 'Admin Nachricht', 'danger');
    openPasswordResetsModal();
}



/* =========================================
   ONLINE PRESENCE LOGIC
   ========================================= */
let presenceChannel = null;
let currentPresenceState = {};

function initPresence() {
    initGlobalChatListener();
    renderUpcomingEventsSidebar();
    if (!state.currentUser) return;

    // Show the sidebar and toggle explicitly
    const sidebar = document.getElementById('onlineUsersSidebar');
    if (sidebar) sidebar.classList.remove('d-none');
    
    const toggleBtn = document.getElementById('onlineSidebarToggle');
    if (toggleBtn) {
        toggleBtn.classList.remove('d-none');
        toggleBtn.classList.add('d-md-none');
    }

    if (presenceChannel) {
        presenceChannel.unsubscribe();
    }

    if (presenceChannel) {
        presenceChannel.unsubscribe();
    }

    presenceChannel = db.channel('online-users', {
        config: {
            presence: {
                key: state.currentUser.username,
            },
        },
    });

    presenceChannel
        .on('presence', { event: 'sync' }, () => {
            currentPresenceState = presenceChannel.presenceState();
            renderOnlineUsers();
        })
        .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await presenceChannel.track({
                    online_at: new Date().toISOString(),
                    username: state.currentUser.username,
                });
            }
        });
}

function stopPresence() {
    stopGlobalChatListener();
    if (eventsCountdownInterval) clearInterval(eventsCountdownInterval);
    if (presenceChannel) {
        presenceChannel.unsubscribe();
        presenceChannel = null;
    }
    document.getElementById('onlineUsersSidebar')?.classList.add('d-none');
    document.getElementById('onlineSidebarToggle')?.classList.add('d-none');
}

function toggleOnlineSidebar() {
    const sidebar = document.getElementById('onlineUsersSidebar');
    if (sidebar) {
        sidebar.classList.toggle('show');
    }
}

function escapeHTML(str) {
    const div = document.createElement('div');
    div.innerText = str;
    return div.innerHTML;
}


/* =========================================
   PUBLIC PROFILE VIEW
   ========================================= */
async function showPublicProfile(username) {
    if (!username) return;
    document.getElementById('publicProfileUsername').textContent = username;
    
    // Clear previous data
    document.getElementById('publicProfileSocials').innerHTML = '<div class="spinner-border text-warning" role="status"></div>';
    document.getElementById('publicProfileGarage').innerHTML = '<div class="spinner-border text-warning spinner-border-sm" role="status"></div>';
    document.getElementById('publicProfileForum').innerHTML = '<div class="spinner-border text-warning spinner-border-sm" role="status"></div>';
    document.getElementById('publicProfileRoutes').innerHTML = '<div class="spinner-border text-warning spinner-border-sm" role="status"></div>';
    
    switchView('public-profile');

    // Fetch user details for socials
    let { data: user } = await db.from('users').select('*').eq('username', username).single();
    let socialsHtml = '';
    if (user) {
        if (user.social_ig) socialsHtml += '<a href="https://instagram.com/' + user.social_ig + '" target="_blank" class="btn btn-outline-danger rounded-circle"><i class="bi bi-instagram"></i></a>';
        if (user.social_tiktok) socialsHtml += '<a href="https://tiktok.com/@' + user.social_tiktok + '" target="_blank" class="btn btn-outline-light rounded-circle"><i class="bi bi-tiktok"></i></a>';
        if (user.social_youtube) socialsHtml += '<a href="https://youtube.com/@' + user.social_youtube + '" target="_blank" class="btn btn-outline-danger rounded-circle"><i class="bi bi-youtube"></i></a>';
    }
    document.getElementById('publicProfileSocials').innerHTML = socialsHtml || '<span class="text-secondary small">Keine Socials verlinkt</span>';

    // Fetch Garage Bikes
    let { data: bikes } = await db.from('pixel_garage').select('model').eq('owner', username);
    let garageHtml = '';
    if (bikes && bikes.length > 0) {
        garageHtml = bikes.map(b => '<div class="p-2 border border-secondary rounded bg-dark text-white" style="cursor:pointer;" onclick="switchView(\'garage\')"><i class="bi bi-bicycle me-2 text-warning"></i>' + escapeHTML(b.model) + '</div>').join('');
    } else {
        garageHtml = '<div class="text-secondary small">Keine Bikes in der Garage.</div>';
    }
    document.getElementById('publicProfileGarage').innerHTML = garageHtml;

    // Fetch Forum Posts
    let { data: topics } = await db.from('forum_topics').select('id, title, category').eq('author', username);
    let forumHtml = '';
    if (topics && topics.length > 0) {
        forumHtml = topics.map(t => '<div class="p-2 border border-secondary rounded bg-dark text-white text-truncate" style="cursor:pointer;" onclick="openChatTopic(' + t.id + ', \'' + escapeHTML(t.title).replace(/'/g, "\\'") + '\')"><span class="badge bg-secondary me-2">' + escapeHTML(t.category).toUpperCase() + '</span>' + escapeHTML(t.title) + '</div>').join('');
    } else {
        forumHtml = '<div class="text-secondary small">Keine Foren-Beiträge.</div>';
    }
    document.getElementById('publicProfileForum').innerHTML = forumHtml;

    // Fetch GPX Routes
    let { data: routes } = await db.from('gpx_routes').select('name').eq('author', username);
    let routesHtml = '';
    if (routes && routes.length > 0) {
        routesHtml = routes.map(r => '<div class="p-2 border border-secondary rounded bg-dark text-white text-truncate" style="cursor:pointer;" onclick="switchView(\'gpx\')"><i class="bi bi-signpost-split me-2 text-success"></i>' + escapeHTML(r.name) + '</div>').join('');
    } else {
        routesHtml = '<div class="text-secondary small">Keine Routen hochgeladen.</div>';
    }
    document.getElementById('publicProfileRoutes').innerHTML = routesHtml;
}

/* =========================================
   GLOBAL CHAT NOTIFICATIONS
   ========================================= */
let unreadDirectMessages = {}; 
let globalChatInterval = null;

async function initGlobalChatListener() {
    if (!state.currentUser) return;
    

    
    // Stop any existing intervals to avoid duplicates
    if (globalChatInterval) {
        clearInterval(globalChatInterval);
    }
    
    // Initial fetch
    await checkUnreadMessages();
    
    // Polling every 3 seconds
    globalChatInterval = setInterval(checkUnreadMessages, 3000);
}

function stopGlobalChatListener() {
    if (globalChatInterval) {
        clearInterval(globalChatInterval);
        globalChatInterval = null;
    }
    unreadDirectMessages = {};
}

async function checkUnreadMessages() {
    if (!state.currentUser) return;
    
    // Check if our username changed in the database (e.g. admin approved name change)
    let { data: me } = await db.from('users').select('username').eq('email', state.currentUser.email).single();
    if (me && me.username !== state.currentUser.username) {
        state.currentUser.username = me.username;
        localStorage.setItem("app_user", JSON.stringify(state.currentUser));
        initPresence(); // Reconnect presence with new name
        return; // Let the new presence init handle everything else
    }

    let { data: unread } = await db.from('direct_messages')
        .select('id, sender, is_read')
        .eq('receiver', state.currentUser.username)
        .eq('is_read', false);
        
    if (!unread) return;
    
    let newCounts = {};
    unread.forEach(msg => {
        newCounts[msg.sender] = (newCounts[msg.sender] || 0) + 1;
    });
    
    let playSound = false;
    
    for (let sender in newCounts) {
        // If we have a new sender or the count increased, it's a new message
        if (!unreadDirectMessages[sender] || newCounts[sender] > unreadDirectMessages[sender]) {
            playSound = true;
        }
    }
    
    unreadDirectMessages = newCounts;
    renderOnlineUsers(); // Re-render to show any badges
    
    if (playSound) {
        playNotificationSound();
    }
    
    // If the chat modal is open, we should also poll the actual messages
    if (activeDirectChatUser) {
        loadDirectMessages(); // This will refresh the chat window if open
    }
}

function playNotificationSound() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
    } catch (e) {
        console.error("Audio play error", e);
    }
}

/* =========================================
   DIRECT CHAT (1-on-1)
   ========================================= */
let activeDirectChatUser = null;
let directChatSubscription = null;

async function openDirectChat(targetUser) {
    if (!state.currentUser) return showCustomAlert("Bitte melde dich an.");
    if (targetUser === state.currentUser.username) return showCustomAlert("Du kannst nicht mit dir selbst chatten.");

    activeDirectChatUser = targetUser;
    document.getElementById("directChatTargetUser").textContent = targetUser;
    if (unreadDirectMessages[targetUser]) {
        delete unreadDirectMessages[targetUser];
        renderOnlineUsers();
        db.from('direct_messages').update({ is_read: true }).eq('sender', targetUser).eq('receiver', state.currentUser.username).then();
    }
    
    // Initial load
    await loadDirectMessages();
    
    // Subscribe to new messages realtime
    if (directChatSubscription) {
        db.removeChannel(directChatSubscription);
    }
    
    directChatSubscription = db.channel('custom-all-channel-direct')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages' }, payload => {
            const msg = payload.new;
            if ((msg.sender === state.currentUser.username && msg.receiver === activeDirectChatUser) ||
                (msg.sender === activeDirectChatUser && msg.receiver === state.currentUser.username)) {
                loadDirectMessages();
            }
        })
        .subscribe();
        
    showModal("directChatModal");
}

async function loadDirectMessages() {
    if (!activeDirectChatUser || !state.currentUser) return;
    
    let { data: messages, error } = await db.from('direct_messages')
        .select('*')
        .or('and(sender.eq.' + state.currentUser.username + ',receiver.eq.' + activeDirectChatUser + '),and(sender.eq.' + activeDirectChatUser + ',receiver.eq.' + state.currentUser.username + ')')
        .order('created_at', { ascending: true });
        
    if (error) {
        console.error("Chat Error:", error);
        document.getElementById("directChatMessageList").innerHTML = '<p class="text-center text-danger mt-4">Datenbank-Fehler: Tabelle existiert nicht. Bitte SQL ausfhren!</p>';
        return;
    }
        
    const listEl = document.getElementById("directChatMessageList");
    if (!messages || messages.length === 0) {
        listEl.innerHTML = '<p class="text-center text-secondary mt-4">Noch keine Nachrichten. Schreib die erste!</p>';
        return;
    }
    
    listEl.innerHTML = messages.map(m => '<div class="chat-bubble ' + (m.sender === state.currentUser.username ? 'chat-bubble-own' : 'chat-bubble-other') + '"><div class="chat-author">' + escapeHTML(m.sender) + '</div><div>' + escapeHTML(m.message) + '</div></div>').join('');
    
    setTimeout(() => { listEl.scrollTop = listEl.scrollHeight; }, 100);
}

async function sendDirectMessage() {
    const input = document.getElementById("directChatInputText");
    const text = input.value.trim();
    if (!text || !activeDirectChatUser || !state.currentUser) return;
    
    const oldText = input.value;
    input.value = "";
    let { error } = await db.from('direct_messages').insert([{
        sender: state.currentUser.username,
        receiver: activeDirectChatUser,
        message: text
    }]);
    
    if (error) {
        input.value = oldText; // Restore text
        showCustomAlert("Fehler beim Senden. Hast du die Tabelle in Supabase erstellt?", "Systemfehler", "danger");
        return;
    }
    
    loadDirectMessages();
}

document.addEventListener("DOMContentLoaded", function() {
    const dcm = document.getElementById('directChatModal');
    if (dcm) {
        dcm.addEventListener('hidden.bs.modal', function () {
            activeDirectChatUser = null;
            if (directChatSubscription) {
                db.removeChannel(directChatSubscription);
                directChatSubscription = null;
            }
        });
    }
});

/* =========================================
   EVENTS SIDEBAR & COUNTDOWN
   ========================================= */
let upcomingEventsCache = [];
let eventsCountdownInterval = null;

function toggleEventsSidebar() {
    const sidebar = document.getElementById('eventsSidebar');
    if (sidebar) sidebar.classList.toggle('show');
}

async function renderUpcomingEventsSidebar() {
    if (!state.currentUser) return;
    
    document.getElementById('eventsSidebar')?.classList.remove('d-none');
    document.getElementById('eventsSidebarToggle')?.classList.remove('d-none');

    let { data: events } = await db.from('crew_events').select('*');
    if (!events) events = [];
    
    let now = new Date();
    upcomingEventsCache = events.filter(e => new Date(e.date_time) > now);
    upcomingEventsCache.sort((a, b) => new Date(a.date_time) - new Date(b.date_time));
    
    updateEventsCountdownUI();
    
    if (eventsCountdownInterval) clearInterval(eventsCountdownInterval);
    eventsCountdownInterval = setInterval(updateEventsCountdownUI, 1000);
}

function goToEvent(eventId) {
    if (window.innerWidth < 768) {
        toggleEventsSidebar(); // Close on mobile
    }
    switchView('events');
    setTimeout(() => {
        const card = document.getElementById('event-card-' + eventId);
        if (card) {
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            card.classList.add('shadow-lg', 'border-warning');
            setTimeout(() => card.classList.remove('shadow-lg', 'border-warning'), 2500);
        }
    }, 500);
}

// Schließt das Dropdown, wenn man irgendwo anders hinklickt
document.addEventListener('click', function(event) {
    const counter = document.querySelector('.nav-online-counter');
    const dropdown = document.getElementById('onlineDropdown');
    if (dropdown && dropdown.classList.contains('show') && counter && !counter.contains(event.target)) {
        dropdown.classList.remove('show');
    }
});