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
let allMarketItems = [];

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
        btn.className = "btn btn-danger rounded-pill px-4 fw-bold shadow-lg w-100";
        contentBox.classList.add("border-danger");
    } else if (type === "success") {
        titleEl.className = "text-success fw-bold text-uppercase mt-2";
        iconEl.className = "bi bi-check-circle-fill text-success mb-2";
        btn.className = "btn btn-success rounded-pill px-4 fw-bold shadow-lg w-100";
        contentBox.classList.add("border-success");
    } else {
        titleEl.className = "text-warning fw-bold text-uppercase mt-2";
        iconEl.className = "bi bi-exclamation-triangle-fill text-warning mb-2";
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
    loadCrewMembers();
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

function switchView(viewName) {
    if (!state.currentUser && viewName !== 'landing' && viewName !== 'privacy' && viewName !== 'impressum') viewName = 'landing';
    
    if (state.currentUser && (!presenceChannel || document.getElementById('onlineUsersSidebar')?.classList.contains('d-none'))) {
        initPresence();
    }
    
    document.querySelectorAll('.app-view').forEach(el => el.classList.remove('active-view'));
    
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
    
    navLinks.className = "d-flex align-items-center w-100 px-3";
    
    if (state.currentUser) {
        let roleColor = "text-warning"; 
        if (state.currentUser.isAdmin) roleColor = "text-danger"; 
        else if (state.currentUser.isModerator) roleColor = "text-info"; 

        let adminBellHtml = '';
        if (state.currentUser.isAdmin || state.currentUser.isModerator) {
            adminBellHtml = `
                <div class="position-relative" style="cursor: pointer;" onclick="openPasswordResetsModal()" title="Admin-Benachrichtigungen">
                    <i class="bi bi-shield-shaded text-warning fs-5"></i>
                    <span id="adminBellBadge" class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger d-none" style="font-size: 0.6rem;">0</span>
                </div>
            `;
        }

        let userBellHtml = `
            <div class="position-relative" style="cursor: pointer;" onclick="openUserNotificationsModal()" title="Deine Benachrichtigungen">
                <i class="bi bi-bell-fill text-white fs-5"></i>
                <span id="userBellBadge" class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger d-none" style="font-size: 0.6rem;">0</span>
            </div>
        `;

        navLinks.innerHTML = `
            <div class="d-none d-xl-flex align-items-center gap-2" style="flex: 1; justify-content: flex-start;">
                <button class="custom-nav-link border-0 bg-transparent ${state.currentView === 'dashboard' ? 'active' : ''}" onclick="switchView('dashboard')"><i class="bi bi-grid-fill me-1"></i>Dashboard</button>
                <button class="custom-nav-link border-0 bg-transparent ${state.currentView === 'garage' ? 'active' : ''}" onclick="switchView('garage')"><i class="bi bi-tools me-1"></i>Garage</button>
                <button class="custom-nav-link border-0 bg-transparent ${state.currentView === 'forum' ? 'active' : ''}" onclick="switchView('forum')"><i class="bi bi-chat-quote me-1"></i>Forum</button>
                <button class="custom-nav-link border-0 bg-transparent ${state.currentView === 'events' ? 'active' : ''}" onclick="switchView('events')"><i class="bi bi-calendar-event me-1"></i>Events</button>
                <button class="custom-nav-link border-0 bg-transparent ${state.currentView === 'map' ? 'active' : ''}" onclick="switchView('map')"><i class="bi bi-geo-alt me-1"></i>Map</button>
            </div>

            <div class="d-none d-lg-flex align-items-center justify-content-center" style="flex: 2;">
                <div class="nav-event-ticker" onclick="switchView('events')">
                    <i class="bi bi-lightning-charge-fill text-warning me-2 fs-5"></i>
                    <div style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-align: center; width: 100%;">
                        <span id="navEventTickerText" class="text-white fw-bold text-uppercase" style="font-size: 0.95rem; letter-spacing: 0.5px;">Lade Events...</span>
                    </div>
                </div>
            </div>

            <div class="d-flex align-items-center gap-4" style="flex: 1; justify-content: flex-end;">
                <div class="d-flex align-items-center gap-3">
                    ${adminBellHtml}
                    ${userBellHtml}
                </div>
                <span class="${roleColor} fw-bold user-role-badge" style="cursor:pointer;" onclick="switchView('profile')" title="Profil bearbeiten"><i class="bi bi-person-circle me-1"></i>${state.currentUser.username}</span>
                <button class="btn-logout" onclick="logout()">Logout</button>
            </div>
        `;
        if (state.currentUser.isAdmin || state.currentUser.isModerator) checkAdminNotifications();
        checkUserNotifications();
        
        if (typeof updateEventsCountdownUI === 'function') updateEventsCountdownUI();
        if (typeof renderOnlineUsers === 'function') renderOnlineUsers();

        let floatingOnline = document.getElementById("floatingOnlineCounter");
        if (!floatingOnline) {
            floatingOnline = document.createElement("div");
            floatingOnline.id = "floatingOnlineCounter";
            floatingOnline.className = "floating-online-counter d-none d-lg-block";
            floatingOnline.innerHTML = `
                <div class="nav-online-counter position-relative" onclick="document.getElementById('onlineDropdown').classList.toggle('show')">
                    <i class="bi bi-people-fill text-warning me-2 fs-5"></i>
                    <span class="text-white fw-bold text-uppercase" style="font-size: 0.95rem;">Pixel Rider Online: <span id="navOnlineCount" class="text-success ms-1">0</span></span>
                    <div id="onlineDropdown" class="nav-dropdown dropup d-none text-start" onclick="event.stopPropagation();">
                        <div class="border-bottom border-secondary pb-2 mb-2">
                            <h6 class="text-warning mb-0 text-uppercase fw-bold"><i class="bi bi-broadcast me-2"></i>Crew Online</h6>
                        </div>
                        <div id="navOnlineUsersList" class="dropdown-list" style="max-height: 300px; overflow-y: auto;"></div>
                    </div>
                </div>
            `;
            document.body.appendChild(floatingOnline);
            if (typeof renderOnlineUsers === 'function') renderOnlineUsers();
        }
        
    } else {
        navLinks.innerHTML = `<button class="custom-nav-link border-0 bg-transparent ms-auto" onclick="showModal('authModal')">Login / Registrieren</button>`;
        const floatingOnline = document.getElementById("floatingOnlineCounter");
        if (floatingOnline) floatingOnline.remove();
    }
}

/* =========================================
   3. CREW FLIP CARDS
   ========================================= */
async function loadCrewMembers() {
    const container = document.getElementById('landing-crew-container');
    if (!container) return;
    try {
        const { data, error } = await db.from('crew_members').select('*').order('sort_order', { ascending: true });
        if (error) throw error;
        allCrewMembers = data || [];
        
        container.innerHTML = data.map(member => {
            const imgSrc = member.image_url || 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?q=80&w=1000';
            const socialLinks = [
                member.social_ig ? `<a href="${member.social_ig}" target="_blank" class="text-warning fs-5 mx-1" onclick="event.stopPropagation();"><i class="bi bi-instagram"></i></a>` : '',
                member.social_tiktok ? `<a href="${member.social_tiktok}" target="_blank" class="text-light fs-5 mx-1" onclick="event.stopPropagation();"><i class="bi bi-tiktok"></i></a>` : '',
                member.social_youtube ? `<a href="${member.social_youtube}" target="_blank" class="text-danger fs-5 mx-1" onclick="event.stopPropagation();"><i class="bi bi-youtube"></i></a>` : ''
            ].join('');

            return `
                <div class="col-12 col-sm-6 col-lg-3 mb-4 d-flex justify-content-center">
                    <div class="crew-flip-card" onclick="this.classList.toggle('flipped')">
                        <div class="crew-flip-card-inner">
                            <div class="crew-flip-card-front">
                                <img src="${imgSrc}" style="width: 100%; height: 60%; object-fit: cover;" alt="${member.name}">
                                <div class="p-3">
                                    <h5 class="text-warning fw-bold text-uppercase mb-1">${member.name}</h5>
                                    <span class="text-white small fw-bold">${member.role}</span>
                                    <div class="mt-2">${socialLinks}</div>
                                </div>
                            </div>
                            <div class="crew-flip-card-back">
                                <h5 class="text-warning fw-bold mb-3 text-uppercase">${member.name}</h5>
                                <p class="text-white small px-3" style="white-space: pre-wrap;">${member.bio || 'Keine Beschreibung.'}</p>
                                <div class="mt-auto">${socialLinks}</div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    } catch (err) { console.error(err); }
}

/* =========================================
   4. EVENTS TICKER (REPAIRED)
   ========================================= */
function updateEventsCountdownUI() {
    const listEl = document.getElementById('eventsSidebarList');
    const tickerEl = document.getElementById('navEventTickerText');
    let now = new Date();
    
    if (upcomingEventsCache.length > 0) {
        let nextEv = upcomingEventsCache[0];
        let diff = new Date(nextEv.date_time) - now;
        let timeStr = diff > 0 ? (Math.floor(diff / (1000 * 60 * 60 * 24)) + "T " + new Date(diff).toISOString().substr(11, 5)) : "LÄUFT!";
        
        if (tickerEl) {
            tickerEl.innerHTML = `<span class="text-warning fw-bold me-2">NEXT RIDE:</span> <span class="text-white fw-bold me-3">${nextEv.title}</span> <span class="text-white fw-bold"><i class="bi bi-clock-history text-warning me-1"></i> START IN ${timeStr}</span>`;
        }
    } else {
        if (tickerEl) tickerEl.innerHTML = `<span class="text-white fw-bold">KEINE EVENTS GEPLANT</span>`;
    }
}

// ... Hier folgen die restlichen Module (Admin, GPX, Forum, Map, Garage, Chat, Profile) ...
// (Hinweis: Da die Datei sehr lang ist, habe ich hier die Kernelemente für dein Problem geliefert.
// Den vollen Code inkl. aller Module für Admin/Garage/Map müsstest du in der Datei beibehalten.)