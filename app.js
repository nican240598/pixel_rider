/* =========================================
   1. SUPABASE KONFIGURATION & INIT
   ========================================= */
const SUPABASE_URL = 'https://anxhzeovqgokcorvjttu.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_F9C_e_QstTeAnI21JZ-pCQ_ZSwCCznr'; 
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

// HILFSFUNKTIONEN FÜR MODALS
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

document.addEventListener("DOMContentLoaded", function() {
    if (state.currentUser) { 
        switchView('dashboard'); 
    } else { 
        switchView('landing'); 
    }

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
                } catch(err) {
                    console.error("Fehler beim GPX-Linienzeichnen", err);
                }
            }
        });
    }
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
    } catch (e) {
        console.error("Geocoding Fehler", e);
    }
    return { lat: null, lng: null };
}

const viewBackgrounds = {
    landing: 'https://images.pexels.com/photos/2116475/pexels-photo-2116475.jpeg?auto=compress&cs=tinysrgb&w=1920',
    dashboard: 'https://images.pexels.com/photos/2626665/pexels-photo-2626665.jpeg?auto=compress&cs=tinysrgb&w=1920',
    events: 'https://images.pexels.com/photos/1413412/pexels-photo-1413412.jpeg?auto=compress&cs=tinysrgb&w=1920',
    forum: 'https://images.pexels.com/photos/1715193/pexels-photo-1715193.jpeg?auto=compress&cs=tinysrgb&w=1920',
    map: 'https://images.pexels.com/photos/104842/pexels-photo-104842.jpeg?auto=compress&cs=tinysrgb&w=1920',
    gpx: 'https://images.pexels.com/photos/1413412/pexels-photo-1413412.jpeg?auto=compress&cs=tinysrgb&w=1920',
    admin: 'https://images.pexels.com/photos/2116475/pexels-photo-2116475.jpeg?auto=compress&cs=tinysrgb&w=1920'
};

function updateDynamicBackground(viewName) {
    document.getElementById("globalBg").style.backgroundImage = `url('${viewBackgrounds[viewName] || viewBackgrounds.dashboard}')`;
}

function switchView(viewName) {
    if (!state.currentUser && viewName !== 'landing') viewName = 'landing';
    
    document.querySelectorAll('.app-view').forEach(el => el.classList.remove('active-view'));
    updateDynamicBackground(viewName);

    if (viewName === 'map') { document.getElementById('view-map').classList.add('active-view'); initMap(); }
    else if (viewName === 'gpx') { document.getElementById('view-gpx').classList.add('active-view'); renderGpxRoutes(); }
    else if (viewName === 'events') { document.getElementById('view-events').classList.add('active-view'); renderEvents(); }
    else if (viewName === 'forum') { document.getElementById('view-forum').classList.add('active-view'); renderForumTopics(); }
    else if (viewName === 'admin') { document.getElementById('view-admin').classList.add('active-view'); renderAdminPanel(); }
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
    if (state.currentUser) {
        let roleColor = "text-warning"; 
        if (state.currentUser.isAdmin) roleColor = "text-danger"; 
        else if (state.currentUser.isModerator) roleColor = "text-info"; 

        let bellHtml = '';
        if (state.currentUser.isAdmin || state.currentUser.isModerator) {
            bellHtml = `
                <div class="position-relative me-3" style="cursor: pointer;" onclick="openPasswordResetsModal()" title="Admin Benachrichtigungen">
                    <i class="bi bi-bell-fill text-white fs-5"></i>
                    <span id="adminBellBadge" class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger d-none" style="font-size: 0.6rem;">0</span>
                </div>
            `;
        }

        navLinks.innerHTML = `
            ${bellHtml}
            <span class="${roleColor} fw-bold me-3 user-role-badge"><i class="bi bi-shield-lock-fill me-1"></i>${state.currentUser.username}</span>
            <button class="custom-nav-link border-0 bg-transparent" onclick="switchView('dashboard')">Dashboard</button>
            <button class="btn-logout ms-2" onclick="logout()">Logout</button>
        `;

        if (state.currentUser.isAdmin || state.currentUser.isModerator) {
            checkAdminNotifications();
        }
    } else {
        navLinks.innerHTML = `<button class="custom-nav-link border-0 bg-transparent" onclick="showModal('authModal')">Login / Registrieren</button>`;
    }
}

// STRUKTURIERTE ADMIN BENACHRICHTIGUNGEN
async function openPasswordResetsModal() {
    if (!state.currentUser || (!state.currentUser.isAdmin && !state.currentUser.isModerator)) return;

    const listContainer = document.getElementById("passwordResetsList");
    listContainer.innerHTML = '<p class="text-center text-muted py-3">Lade Anfragen...</p>';

    let { data: resetUsers, error: err1 } = await db.from('users').select('*').eq('reset_requested', true);
    let { data: inviteUsers, error: err2 } = await db.from('users').select('*').eq('invite', 'PENDING');

    if (err1 || err2) {
        listContainer.innerHTML = '<p class="text-center text-danger">Fehler beim Laden der Anfragen aus der Datenbank.</p>';
        return;
    }

    let allRequests = [];

    if (resetUsers) {
        resetUsers.forEach(u => {
            allRequests.push({
                type: 'Passwort-Reset',
                badgeClass: 'bg-danger',
                username: u.username,
                email: u.email,
                date: u.updated_at || u.created_at || new Date().toISOString(), 
                actionHtml: `
                    <button class="btn btn-sm btn-danger fw-bold rounded-pill px-3" onclick="modalResetPassword('${u.username}', true)" title="Auf 1234 zurücksetzen">
                        <i class="bi bi-key-fill me-1"></i> Reset (1234)
                    </button>
                    <button class="btn btn-sm btn-outline-secondary rounded-pill px-3" onclick="modalDismissReset('${u.username}')" title="Anfrage ablehnen">
                        <i class="bi bi-x-lg"></i>
                    </button>
                `
            });
        });
    }

    if (inviteUsers) {
        inviteUsers.forEach(u => {
            allRequests.push({
                type: 'Invite-Code Anfrage',
                badgeClass: 'bg-warning text-dark',
                username: u.username,
                email: u.email,
                date: u.created_at || new Date().toISOString(),
                actionHtml: `
                    <button class="btn btn-sm btn-success fw-bold rounded-pill px-3" onclick="approveInviteRequest('${u.username}')" title="Code generieren & freigeben">
                        <i class="bi bi-check-lg me-1"></i> Freigeben
                    </button>
                    <button class="btn btn-sm btn-outline-danger rounded-pill px-3" onclick="dismissInviteRequest('${u.username}')" title="Anfrage ablehnen / löschen">
                        <i class="bi bi-trash"></i>
                    </button>
                `
            });
        });
    }

    if (allRequests.length === 0) {
        listContainer.innerHTML = '<p class="text-center text-purple-glow py-4 mb-0">Keine offenen Anfragen vorhanden.</p>';
    } else {
        allRequests.sort((a, b) => new Date(b.date) - new Date(a.date));

        listContainer.innerHTML = allRequests.map(req => {
            let formattedDate = 'Unbekannt';
            try {
                let d = new Date(req.date);
                let day = String(d.getDate()).padStart(2, '0');
                let month = String(d.getMonth() + 1).padStart(2, '0');
                let year = d.getFullYear();
                let hours = String(d.getHours()).padStart(2, '0');
                let minutes = String(d.getMinutes()).padStart(2, '0');
                formattedDate = `${day}.${month}.${year}, ${hours}:${minutes} Uhr`;
            } catch(e) {}

            return `
            <div class="p-3 rounded-3 mb-3" style="background: rgba(10,10,12,0.95); border: 1px solid rgba(197,160,26,0.4);">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <span class="badge ${req.badgeClass} px-3 py-1 text-uppercase fw-bold" style="font-size: 0.8rem;">
                        <i class="bi bi-tag-fill me-1"></i> ${req.type}
                    </span>
                    <span class="text-light fw-bold" style="font-size: 0.95rem; letter-spacing: 0.5px;">
                        <i class="bi bi-clock-fill text-warning me-1"></i> ${formattedDate}
                    </span>
                </div>
                <div class="d-flex justify-content-between align-items-center mt-2">
                    <div>
                        <h4 class="text-warning fw-bold mb-1">${req.username}</h4>
                        <p class="text-light small mb-0"><i class="bi bi-envelope me-1"></i> ${req.email}</p>
                    </div>
                    <div class="d-flex gap-2">
                        ${req.actionHtml}
                    </div>
                </div>
            </div>
            `;
        }).join('');
    }

    showModal("passwordResetsModal");
}

// LÄDT BENACHRICHTIGUNGEN NEU & SCHLIESST DAS FENSTER BEI 0 ANFRAGEN
async function refreshAdminNotifications() {
    if (!state.currentUser || (!state.currentUser.isAdmin && !state.currentUser.isModerator)) return;

    let { data: usersReset } = await db.from('users').select('*').eq('reset_requested', true);
    let { data: usersInvite } = await db.from('users').select('*').eq('invite', 'PENDING');
    
    let count = (usersReset ? usersReset.length : 0) + (usersInvite ? usersInvite.length : 0);
    
    checkAdminNotifications(); 

    if (count === 0) {
        hideModal("passwordResetsModal");
        switchView('dashboard');
    } else {
        openPasswordResetsModal(); 
    }
}

async function approveInviteRequest(username) {
    if (!state.currentUser || (!state.currentUser.isAdmin && !state.currentUser.isModerator)) return;
    
    const randomCode = 'RIDER-' + Math.random().toString(36).substring(2, 7).toUpperCase();
    
    await db.from('invite_codes').insert([{ 
        code: randomCode, 
        created_by: state.currentUser.username, 
        is_used: true, 
        used_by: username 
    }]);

    await db.from('users').update({ invite: randomCode }).eq('username', username);

    refreshAdminNotifications();
    if (state.currentView === 'admin') renderAdminPanel();
}

async function dismissInviteRequest(username) {
    if (!state.currentUser || (!state.currentUser.isAdmin && !state.currentUser.isModerator)) return;
    
    await db.from('users').delete().eq('username', username);

    refreshAdminNotifications();
    if (state.currentView === 'admin') renderAdminPanel();
}

// ZURÜCKSETZEN (Wenn isFromRequest = true, umgeht es die Rechte-Sperre)
async function modalResetPassword(username, isFromRequest = false) {
    if (!state.currentUser || (!state.currentUser.isAdmin && !state.currentUser.isModerator)) return;
    
    if (!isFromRequest) {
        let { data: targetUser } = await db.from('users').select('role').eq('username', username).single();
        if (targetUser) {
            if (state.currentUser.isAdmin && targetUser.role === 'moderator') {
                alert("Das direkte Zurücksetzen ist gesperrt. Dies ist nur über eine offizielle Anfrage des Moderators möglich!");
                return;
            }
            if (state.currentUser.isModerator && !state.currentUser.isAdmin && targetUser.role === 'admin') {
                alert("Das direkte Zurücksetzen ist gesperrt. Dies ist nur über eine offizielle Anfrage des Admins möglich!");
                return;
            }
        }
    }

    userToReset = username;
    document.getElementById("confirmResetText").innerHTML = `Möchtest du das Passwort von <b class="text-warning">${username}</b> wirklich auf "1234" zurücksetzen?`;
    showModal("confirmResetModal");
}

async function executeResetPassword() {
    if (!state.currentUser || (!state.currentUser.isAdmin && !state.currentUser.isModerator) || !userToReset) return;

    const username = userToReset;
    const resetHash = await hashPassword("1234");
    await db.from('users').update({ password: resetHash, reset_requested: false }).eq('username', username);
    
    hideModal("confirmResetModal");
    userToReset = null;

    document.getElementById("successResetAdminText").innerHTML = `Das Passwort für <b class="text-warning">${username}</b> wurde erfolgreich auf "1234" zurückgesetzt.`;
    showModal("successResetAdminModal");
    
    refreshAdminNotifications();  
    if (state.currentView === 'admin') renderAdminPanel(); 
}

async function modalDismissReset(username) {
    if (!state.currentUser || (!state.currentUser.isAdmin && !state.currentUser.isModerator)) return;
    
    await db.from('users').update({ reset_requested: false }).eq('username', username);
    refreshAdminNotifications();
    if (state.currentView === 'admin') renderAdminPanel();
}

async function checkAdminNotifications() {
    if (!state.currentUser || (!state.currentUser.isAdmin && !state.currentUser.isModerator)) return;

    let { data: usersReset } = await db.from('users').select('*').eq('reset_requested', true);
    let { data: usersInvite } = await db.from('users').select('*').eq('invite', 'PENDING');
    
    let count = (usersReset ? usersReset.length : 0) + (usersInvite ? usersInvite.length : 0);
    let badge = document.getElementById("adminBellBadge");
    
    if (badge) {
        if (count > 0) {
            badge.innerText = count;
            badge.classList.remove('d-none');
        } else {
            badge.classList.add('d-none');
        }
    }
}

function renderDashboardCards() {
    const grid = document.getElementById("dashboardGrid");
    const existingAdminCard = document.getElementById("dashboardAdminCardBlock");
    
    if (state.currentUser && (state.currentUser.isAdmin || state.currentUser.isModerator)) {
        if (!existingAdminCard) {
            const col = document.createElement("div");
            col.className = "col-12 mb-2";
            col.id = "dashboardAdminCardBlock";
            col.onclick = () => switchView('admin');
            col.innerHTML = `
                <div class="feature-card admin-card-large">
                    <i class="bi bi-shield-lock-fill feature-icon text-warning"></i>
                    <h3 class="text-warning text-uppercase fw-bold mb-2 display-6">Admin & Moderator Center</h3>
                    <p class="card-description fs-5 text-light">Verwalte Invite-Codes und User-Rechte über die Cloud.</p>
                </div>
            `;
            grid.prepend(col);
        }
    } else if (existingAdminCard) {
        existingAdminCard.remove();
    }
}

function openAuthModal() { showModal("authModal"); }

/* =========================================
   3. AUTHENTIFIZIERUNG & HILFE-BOX
   ========================================= */
async function toggleInviteHelp() {
    const helpBox = document.getElementById("inviteHelpText");
    
    if (helpBox.classList.contains("d-none")) {
        helpBox.classList.remove("d-none");
        helpBox.innerHTML = '<span class="spinner-border spinner-border-sm text-warning" role="status"></span> Lade Team-Liste...';
        
        try {
            let { data: staff, error } = await db.from('users').select('username, role').in('role', ['admin', 'moderator']);
            
            if (error) throw error;

            let text = "Du erhältst einen Invite-Code exklusiv von unseren Admins oder Moderatoren.<br><br><b class='text-warning'>Aktuelles Team:</b><br>";
            
            if (staff && staff.length > 0) {
                const admins = staff.filter(s => s.role === 'admin').map(s => s.username).join(', ');
                const mods = staff.filter(s => s.role === 'moderator').map(s => s.username).join(', ');
                
                if (admins) text += `<span class="text-danger fw-bold">Admins:</span> ${admins}<br>`;
                if (mods) text += `<span class="text-info fw-bold">Mods:</span> ${mods}`;
            } else {
                text += "<i>Aktuell keine Teammitglieder gefunden.</i>";
            }
            helpBox.innerHTML = text;
            
        } catch (err) {
            helpBox.innerHTML = "<span class='text-danger'>Fehler beim Laden der Team-Liste.</span>";
        }
    } else {
        helpBox.classList.add("d-none");
    }
}

// ZEIGT DAS CODE-EINGABEFELD IM REGISTRIERUNGS-TAB
function showInviteInput() {
    const section = document.getElementById("inviteInputSection");
    const buttons = document.getElementById("inviteChoiceButtons");
    if (section && buttons) {
        buttons.classList.add("d-none");
        section.classList.remove("d-none");
        document.getElementById("modalRegInvite").required = true;
    }
}

// VERSTECKT DAS EINGABEFELD WIEDER
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

// FORDERT EINEN CODE AN
async function requestInviteWithoutCode() {
    const form = document.getElementById("modalRegisterForm");
    
    // Prüft, ob Username, E-Mail und Passwort ausgefüllt sind
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const username = document.getElementById("modalRegUser").value.trim();
    const email = document.getElementById("modalRegEmail").value.trim();
    const password = document.getElementById("modalRegPass").value;

    const hashedPassword = await hashPassword(password);

    let { error } = await db.from('users').insert([{ 
        username, 
        email, 
        role: 'member', 
        invite: 'PENDING', 
        password: hashedPassword,
        is_deactivated: false
    }]);

    if (error) {
        alert("Fehler in der Datenbank. Die E-Mail oder der Username ist vermutlich schon vergeben.\n" + error.message);
        return;
    }

    hideModal("authModal");
    showModal("successRequestInviteModal");
}

document.getElementById("modalLoginForm").addEventListener("submit", async function(e) {
    e.preventDefault();
    const userInput = document.getElementById("modalLoginUser").value.trim();
    const passInput = document.getElementById("modalLoginPass").value;

    try {
        let { data: users, error } = await db.from('users').select('*').or(`username.eq.${userInput},email.eq.${userInput}`);
        
        if (error) { alert("Datenbank-Fehler: " + error.message); return; }
        if (!users || users.length === 0) { alert("Benutzer nicht in der Cloud gefunden!"); return; }

        let user = users[0];
        if (user.is_deactivated) { alert("Dein Account wurde gesperrt."); return; }
        
        if (user.invite === 'PENDING' || (!user.invite && user.role === 'member')) {
            alert("Dein Account wartet noch auf die Freigabe / Zuweisung eines Invite-Codes durch einen Administrator.");
            return;
        }

        const hashedInput = await hashPassword(passInput);
        if (user.password !== hashedInput) { alert("Falsches Passwort!"); return; }

        state.currentUser = { 
            username: user.username, 
            email: user.email, 
            role: user.role, 
            isAdmin: (user.role === 'admin' || user.username.toLowerCase() === 'nican'),
            isModerator: (user.role === 'moderator')
        };
        localStorage.setItem("app_user", JSON.stringify(state.currentUser));
        
        hideModal("authModal");

        const resetHash = await hashPassword("1234");
        if (user.password === resetHash) {
            showModal("changePasswordModal");
        } else {
            switchView('dashboard');
        }
    } catch (err) { 
        alert("Verbindungsfehler zur Cloud."); 
    }
});

document.getElementById("changePasswordForm").addEventListener("submit", async function(e) {
    e.preventDefault();
    const newPass = document.getElementById("newPassInput").value;
    if (newPass === "1234") { alert("Wähle ein echtes Passwort!"); return; }
    
    const hashedNewPass = await hashPassword(newPass);
    await db.from('users').update({ password: hashedNewPass }).eq('username', state.currentUser.username);
    
    hideModal("changePasswordModal");
    switchView('dashboard');
});

document.getElementById("modalRegisterForm").addEventListener("submit", async function(e) {
    e.preventDefault();
    
    const inputSection = document.getElementById("inviteInputSection");
    if (inputSection && inputSection.classList.contains("d-none")) {
        alert("Bitte wähle aus, ob du einen Code eingeben oder anfordern möchtest.");
        return;
    }

    const username = document.getElementById("modalRegUser").value.trim();
    const email = document.getElementById("modalRegEmail").value.trim();
    const password = document.getElementById("modalRegPass").value;
    const inviteCode = document.getElementById("modalRegInvite").value.trim().toUpperCase();

    if (!inviteCode) {
        alert("Bitte gib einen Invite-Code ein.");
        return;
    }

    let { data: invite } = await db.from('invite_codes').select('*').eq('code', inviteCode).single();
    
    if (!invite || invite.is_used) { 
        alert("Ungültiger oder bereits benutzter Invite-Code!"); 
        return; 
    }

    const hashedPassword = await hashPassword(password);
    let { error } = await db.from('users').insert([{ username, email, role: 'member', invite: inviteCode, password: hashedPassword }]);
    
    if (error) { 
        alert("Datenbankfehler. Vermutlich existiert dieser Name oder die E-Mail bereits.\n" + error.message); 
        return; 
    }

    await db.from('invite_codes').update({ is_used: true, used_by: username }).eq('code', inviteCode);
    state.currentUser = { username, email, role: 'member', isAdmin: false, isModerator: false };
    localStorage.setItem("app_user", JSON.stringify(state.currentUser));
    hideModal("authModal");
    switchView('dashboard');
});

document.getElementById("forgotPasswordForm").addEventListener("submit", async function(e) {
    e.preventDefault();
    const username = document.getElementById("forgotPassUser").value.trim();
    
    let { data: user, error: fetchErr } = await db.from('users').select('*').eq('username', username).single();
    if (!user || fetchErr) {
        alert("Dieser Username existiert nicht!");
        return;
    }
    
    let { error: updateErr } = await db.from('users').update({ 
        reset_requested: true 
    }).eq('username', username);

    if (updateErr) {
        alert("Cloud-Fehler: " + updateErr.message);
        return;
    }
    
    hideModal("forgotPasswordModal");
    showModal("successRequestUserModal");
});

function logout() { state.currentUser = null; localStorage.removeItem("app_user"); switchView('landing'); }

/* =========================================
   4. ADMIN PANEL (CLOUD)
   ========================================= */
async function renderAdminPanel() {
    const usersTabBtn = document.getElementById("admin-tab-users");
    if (usersTabBtn) {
        usersTabBtn.style.display = (state.currentUser.isAdmin || state.currentUser.isModerator) ? 'block' : 'none';
    }

    let { data: invites } = await db.from('invite_codes').select('*');

    document.getElementById("invitesTableBody").innerHTML = (invites || []).map(i => `
        <tr>
            <td class="fw-bold" style="color: var(--brand-gold-glow); font-size: 1.1rem;">
                <div class="d-flex align-items-center gap-2">
                    ${i.code}
                    <button class="btn btn-sm btn-outline-warning border-0 p-1 d-flex align-items-center justify-content-center" 
                            style="width: 28px; height: 28px;" 
                            onclick="copyInviteCode('${i.code}', this)" 
                            title="Code kopieren">
                        <i class="bi bi-clipboard"></i>
                    </button>
                </div>
            </td>
            <td class="text-light">${i.created_by || 'Nican'}</td>
            <td>
                ${i.is_used 
                    ? (i.used_by ? `<span class="badge bg-secondary text-light px-3 py-2 rounded-pill">Benutzt von ${i.used_by}</span>` : `<span class="badge bg-danger text-light px-3 py-2 rounded-pill">Deaktiviert</span>`) 
                    : `<span class="badge bg-success px-3 py-2 rounded-pill">Frei</span>`}
            </td>
            <td class="text-end">
                ${!i.used_by ? `<button class="btn ${i.is_used ? 'btn-outline-success' : 'btn-outline-warning'} btn-sm rounded-pill px-3 me-1" onclick="toggleInviteStatus('${i.code}', ${i.is_used})">
                    ${i.is_used ? '<i class="bi bi-check-circle"></i> Aktivieren' : '<i class="bi bi-ban"></i> Deaktivieren'}
                </button>` : ''}
                <button class="btn btn-outline-danger btn-sm rounded-pill px-3" onclick="deleteInvite('${i.code}')">
                    <i class="bi bi-trash"></i> Löschen
                </button>
            </td>
        </tr>
    `).join('');

    if (state.currentUser.isAdmin || state.currentUser.isModerator) {
        let { data: users } = await db.from('users').select('*');
        
        document.getElementById("usersTableBody").innerHTML = (users || []).map(u => {
            let roleColor = 'var(--brand-purple)'; 
            if (u.role === 'admin') roleColor = '#ef233c'; 
            if (u.role === 'moderator') roleColor = '#f58231'; 
            if (u.role === 'ehren pixel') roleColor = '#c5a01a'; 

            let actionHtml = '';
            let inviteBadge = u.invite || '-';
            if (u.invite === 'PENDING') {
                inviteBadge = '<span class="badge bg-warning text-dark fw-bold"><i class="bi bi-clock-history"></i> Ausstehend</span>';
            }

            if (u.username.toLowerCase() === 'nican') {
                actionHtml = '<span class="badge bg-dark text-muted border border-secondary">System-Admin</span>';
            } else if (state.currentUser.isModerator && !state.currentUser.isAdmin && u.username === state.currentUser.username) {
                actionHtml = '<span class="badge bg-dark text-muted border border-secondary">Dein Account</span>';
            } else if (state.currentUser.isModerator && !state.currentUser.isAdmin && u.role === 'admin') {
                actionHtml = '<span class="badge bg-dark text-muted border border-secondary">Keine Berechtigung</span>';
            } else {
                let deleteBtnHtml = state.currentUser.isAdmin 
                    ? `<button class="btn btn-outline-danger btn-sm rounded-pill px-3" onclick="promptDeleteUser('${u.username}', '${u.invite}')" title="User unwiderruflich löschen"><i class="bi bi-trash"></i></button>`
                    : '';
                    
                let dismissBtnHtml = u.reset_requested 
                    ? `<button class="btn btn-outline-secondary btn-sm rounded-pill px-3" onclick="dismissResetRequest('${u.username}')" title="Anfrage ablehnen"><i class="bi bi-x-lg"></i></button>`
                    : '';

                let canDirectReset = true;
                if (state.currentUser.isAdmin && u.role === 'moderator') canDirectReset = false;
                if (state.currentUser.isModerator && !state.currentUser.isAdmin && u.role === 'admin') canDirectReset = false;

                let directResetBtnHtml = canDirectReset ? `
                    <button class="btn ${u.reset_requested ? 'btn-danger shadow' : 'btn-outline-info'} btn-sm rounded-pill px-3" onclick="modalResetPassword('${u.username}', false)" title="Passwort auf 1234 zurücksetzen">
                        <i class="bi bi-key"></i>
                    </button>
                ` : '<span class="text-muted small" title="Nur per Anfrage möglich"><i class="bi bi-shield-lock"></i></span>';

                actionHtml = `
                    <div class="d-flex justify-content-end gap-2 align-items-center">
                        <select class="form-select form-select-sm bg-dark text-white border-secondary w-auto" onchange="changeUserRole('${u.username}', this.value)" style="min-width: 120px;">
                            <option value="member" ${u.role === 'member' ? 'selected' : ''}>Member</option>
                            <option value="ehren pixel" ${u.role === 'ehren pixel' ? 'selected' : ''}>Ehren Pixel</option>
                            <option value="moderator" ${u.role === 'moderator' ? 'selected' : ''}>Moderator</option>
                            ${state.currentUser.isAdmin ? `<option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>` : ''}
                        </select>
                        ${directResetBtnHtml}
                        ${dismissBtnHtml}
                        <button class="btn ${u.is_deactivated ? 'btn-outline-success' : 'btn-outline-warning'} btn-sm rounded-pill px-3" onclick="toggleUserStatus('${u.username}', ${u.is_deactivated})" title="${u.is_deactivated ? 'Entsperren' : 'Sperren'}">
                            ${u.is_deactivated ? '<i class="bi bi-unlock-fill"></i>' : '<i class="bi bi-lock-fill"></i>'}
                        </button>
                        ${deleteBtnHtml}
                    </div>`;
            }

            return `
            <tr>
                <td class="text-white fs-5">
                    <span class="fw-bold">${u.username}</span>
                    ${u.reset_requested ? '<br><span class="badge bg-danger mt-1" style="font-size:0.7rem;"><i class="bi bi-exclamation-triangle-fill"></i> Reset angefragt</span>' : ''}
                </td>
                <td>
                    <span class="badge px-3 py-2 rounded-pill text-uppercase" style="background-color: ${roleColor};">
                        ${u.role}
                    </span>
                </td>
                <td class="text-light">${inviteBadge}</td>
                <td>
                    ${u.is_deactivated 
                        ? '<span class="badge bg-danger px-3 py-2 rounded-pill">Gesperrt</span>' 
                        : '<span class="badge bg-success px-3 py-2 rounded-pill">Aktiv</span>'}
                </td>
                <td class="text-end">
                    ${actionHtml}
                </td>
            </tr>
            `;
        }).join('');
    }
}

async function promptDeleteUser(username, inviteCode) {
    if (!state.currentUser.isAdmin) return;
    
    userToDelete = { username, inviteCode };
    document.getElementById("confirmDeleteText").innerHTML = `Möchtest du den Benutzer <b class="text-warning">${username}</b> und seinen Invite-Code wirklich unwiderruflich löschen?`;
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

        alert(`Der Benutzer "${username}" wurde erfolgreich gelöscht.`);
        renderAdminPanel();
    } catch (error) {
        alert("Fehler beim Löschen des Benutzers: " + error.message);
    }
}

async function copyInviteCode(code, btn) {
    try {
        await navigator.clipboard.writeText(code);
        const icon = btn.querySelector('i');
        icon.className = 'bi bi-check-lg text-success fs-5';
        setTimeout(() => {
            icon.className = 'bi bi-clipboard';
        }, 2000);
    } catch (err) {
        alert('Fehler beim Kopieren des Codes. Bitte manuell kopieren.');
    }
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
document.getElementById("gpxUploadForm").addEventListener("submit", async function(e) {
    e.preventDefault();
    const title = document.getElementById("gpxTitle").value.trim();
    const distance = document.getElementById("gpxDistance").value.trim();
    const fileInput = document.getElementById("gpxFileInput");

    if (fileInput.files.length === 0) {
        alert("Bitte wähle eine GPX-Datei aus!");
        return;
    }

    const gpxFile = fileInput.files[0];
    const reader = new FileReader();

    reader.readAsText(gpxFile);
    reader.onload = async function(event) {
        const gpxText = event.target.result;
        
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(gpxText, "text/xml");
        const trkpts = xmlDoc.getElementsByTagName("trkpt");
        
        let startLat = null;
        let startLng = null;
        
        if (trkpts.length > 0) {
            startLat = parseFloat(trkpts[0].getAttribute("lat"));
            startLng = parseFloat(trkpts[0].getAttribute("lon") || trkpts[0].getAttribute("lng"));
        }

        await db.from('gpx_routes').insert([{
            title,
            distance,
            gpx_data: gpxText,
            start_lat: startLat,
            start_lng: startLng,
            created_by: state.currentUser.username
        }]);

        document.getElementById("gpxUploadForm").reset();
        hideModal("uploadGpxModal");
        renderGpxRoutes();
    };
});

function generateGpxSvgPreview(gpxText) {
    if (!gpxText) return '<div class="rounded-4 mb-3 w-100 d-flex align-items-center justify-content-center bg-dark text-muted" style="height: 180px; border: 1px dashed rgba(157,78,221,0.3);"><i class="bi bi-map fs-1"></i></div>';
    
    try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(gpxText, "text/xml");
        const trkpts = xmlDoc.getElementsByTagName("trkpt");
        if (trkpts.length < 2) return '<div class="rounded-4 mb-3 w-100 d-flex align-items-center justify-content-center bg-dark text-muted" style="height: 180px; border: 1px dashed rgba(157,78,221,0.3);"><i class="bi bi-map fs-1"></i></div>';

        let points = [];
        let minLat = Infinity, maxLat = -Infinity;
        let minLon = Infinity, maxLon = -Infinity;

        for (let i = 0; i < trkpts.length; i++) {
            let lat = parseFloat(trkpts[i].getAttribute("lat"));
            let lon = parseFloat(trkpts[i].getAttribute("lon") || trkpts[i].getAttribute("lng"));
            if (!isNaN(lat) && !isNaN(lon)) {
                points.push({lat, lon});
                if (lat < minLat) minLat = lat;
                if (lat > maxLat) maxLat = lat;
                if (lon < minLon) minLon = lon;
                if (lon > maxLon) maxLon = lon;
            }
        }

        if (points.length < 2) return '<div class="rounded-4 mb-3 w-100 d-flex align-items-center justify-content-center bg-dark text-muted" style="height: 180px; border: 1px dashed rgba(157,78,221,0.3);"><i class="bi bi-map fs-1"></i></div>';

        let latRange = maxLat - minLat || 0.0001;
        let lonRange = maxLon - minLon || 0.0001;

        let width = 300, height = 180;
        let pad = 25;
        let usableW = width - (pad * 2);
        let usableH = height - (pad * 2);

        let pathString = "";
        points.forEach((p, index) => {
            let x = pad + ((p.lon - minLon) / lonRange) * usableW;
            let y = height - (pad + ((p.lat - minLat) / latRange) * usableH);
            pathString += (index === 0 ? `M ${x.toFixed(1)} ${y.toFixed(1)}` : ` L ${x.toFixed(1)} ${y.toFixed(1)}`);
        });

        return `
            <div class="rounded-4 mb-3 w-100 overflow-hidden position-relative" style="height: 180px; background: rgba(15, 15, 20, 0.9); border: 1px solid rgba(157, 78, 221, 0.4);">
                <svg viewBox="0 0 ${width} ${height}" class="w-100 h-100" preserveAspectRatio="xMidYMid meet">
                    <path d="${pathString}" fill="none" stroke="#c5a01a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                <span class="position-absolute bottom-0 start-0 m-2 badge bg-dark text-warning border border-secondary" style="font-size: 0.65rem;"><i class="bi bi-route"></i> Routen-Vorschau</span>
            </div>
        `;
    } catch(e) {
        return '<div class="rounded-4 mb-3 w-100 d-flex align-items-center justify-content-center bg-dark text-muted" style="height: 180px; border: 1px dashed rgba(157,78,221,0.3);"><i class="bi bi-map fs-1"></i></div>';
    }
}

async function renderGpxRoutes() {
    let { data: routes } = await db.from('gpx_routes').select('*');
    let { data: myPin } = await db.from('map_pins').select('*').eq('email', state.currentUser.email).single();

    document.getElementById("gpxGrid").innerHTML = (routes || []).map(r => {
        let svgPreview = generateGpxSvgPreview(r.gpx_data);
        
        let distText = "Pin für Entfernung erforderlich";
        if (myPin && r.start_lat && r.start_lng) {
            let userLatLng = L.latLng(myPin.lat, myPin.lng);
            let routeLatLng = L.latLng(r.start_lat, r.start_lng);
            let km = (userLatLng.distanceTo(routeLatLng) / 1000).toFixed(1);
            distText = `Ca. ${km} km von deinem Pin entfernt`;
        }

        let isCreatorOrAdmin = state.currentUser.isAdmin || state.currentUser.isModerator || r.created_by === state.currentUser.username;
        let adminControlsHtml = isCreatorOrAdmin ? `
            <div class="d-flex gap-2 mt-3 pt-3 border-top border-secondary">
                <button class="btn btn-sm btn-outline-warning flex-grow-1" onclick="openEditGpxModal('${r.id}')"><i class="bi bi-pencil"></i> Bearbeiten</button>
                <button class="btn btn-sm btn-outline-danger flex-grow-1" onclick="deleteGpxRoute('${r.id}')"><i class="bi bi-trash"></i> Löschen</button>
            </div>
        ` : '';

        return `
        <div class="col-md-4">
            <div class="gpx-card h-100 d-flex flex-column justify-content-between">
                <div>
                    ${svgPreview}
                    <h4 class="text-warning text-uppercase fw-bold mb-2">${r.title}</h4>
                    <p class="text-light small mb-1"><i class="bi bi-signpost-split"></i> Streckenlänge: <b>${r.distance} km</b></p>
                    <p class="text-purple-glow small mb-2"><i class="bi bi-person-badge"></i> Ersteller: <b>${r.created_by}</b></p>
                    <p class="text-purple-glow small mb-3 fw-bold"><i class="bi bi-geo-alt"></i> ${distText}</p>
                </div>
                <div>
                    <button class="btn btn-custom-sub btn-sm w-100" onclick="openGpxPreview('${r.id}')"><i class="bi bi-eye-fill me-1"></i> Tour anzeigen</button>
                    ${adminControlsHtml}
                </div>
            </div>
        </div>
        `;
    }).join('') || '<p class="text-center text-purple-glow w-100">Keine GPX-Routen vorhanden.</p>';
}

async function openGpxPreview(routeId) {
    let { data: r } = await db.from('gpx_routes').select('*').eq('id', routeId).single();
    if (!r) return;
    
    currentPreviewRoute = r;

    document.getElementById("gpxModalTitle").textContent = r.title;
    document.getElementById("gpxModalCreator").textContent = r.created_by;
    document.getElementById("gpxModalDistance").textContent = r.distance;

    let { data: myPin } = await db.from('map_pins').select('*').eq('email', state.currentUser.email).single();
    let distText = "Trage zuerst deinen Pin auf der PixelMap ein.";
    if (myPin && r.start_lat && r.start_lng) {
        let userLatLng = L.latLng(myPin.lat, myPin.lng);
        let routeLatLng = L.latLng(r.start_lat, r.start_lng);
        let km = (userLatLng.distanceTo(routeLatLng) / 1000).toFixed(1);
        distText = `Ca. ${km} km von deinem Standort`;
    }
    document.getElementById("gpxModalUserDistance").textContent = distText;

    showModal("gpxPreviewModal");
}

function downloadCurrentGpx() {
    if (!currentPreviewRoute || !currentPreviewRoute.gpx_data) {
        alert("Keine GPX-Daten vorhanden.");
        return;
    }
    const blob = new Blob([currentPreviewRoute.gpx_data], { type: 'application/gpx+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentPreviewRoute.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.gpx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

async function deleteGpxRoute(routeId) {
    if (confirm("Möchtest du diese GPX-Tour wirklich löschen?")) {
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

document.getElementById("editGpxForm").addEventListener("submit", async function(e) {
    e.preventDefault();
    if (!activeEditGpxId) return;

    const title = document.getElementById("editGpxTitle").value.trim();
    const distance = document.getElementById("editGpxDistance").value.trim();
    const fileInput = document.getElementById("editGpxFileInput");

    let updateData = { title, distance };

    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        const reader = new FileReader();
        reader.readAsText(file);
        reader.onload = async function(event) {
            const gpxText = event.target.result;
            updateData.gpx_data = gpxText;

            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(gpxText, "text/xml");
            const trkpts = xmlDoc.getElementsByTagName("trkpt");
            if (trkpts.length > 0) {
                updateData.start_lat = parseFloat(trkpts[0].getAttribute("lat"));
                updateData.start_lng = parseFloat(trkpts[0].getAttribute("lon") || trkpts[0].getAttribute("lng"));
            }

            await executeUpdateGpx(updateData);
        };
    } else {
        await executeUpdateGpx(updateData);
    }
});

async function executeUpdateGpx(data) {
    await db.from('gpx_routes').update(data).eq('id', activeEditGpxId);
    hideModal("editGpxModal");
    activeEditGpxId = null;
    renderGpxRoutes();
}

/* =========================================
   6. EVENTS MODUL
   ========================================= */
document.getElementById("eventForm").addEventListener("submit", async function(e) {
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
            alert("Dein Bild ist zu groß! Bitte wähle ein Bild unter 1 MB aus.");
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
        title, 
        organizer, 
        date_time, 
        location, 
        image_data, 
        lat,
        lng,
        participants: [], 
        description: description || "Ausfahrt", 
        created_by: state.currentUser.username 
    }]);
    
    document.getElementById("eventForm").reset();
    hideModal("createEventModal");
    renderEvents();
}

async function renderEvents() {
    let { data: events } = await db.from('crew_events').select('*');
    let { data: myPin } = await db.from('map_pins').select('*').eq('email', state.currentUser.email).single();
    
    let now = new Date();
    let upcomingEvents = (events || []).filter(e => new Date(e.date_time) > new Date(now.getTime() - 24 * 60 * 60 * 1000));
    
    upcomingEvents.sort((a, b) => new Date(a.date_time) - new Date(b.date_time));
    
    document.getElementById("eventsGrid").innerHTML = upcomingEvents.map((ev, index) => {
        let parts = ev.participants || [];
        let isParticipating = parts.includes(state.currentUser.email);
        
        let isNextEvent = index === 0;
        let colClass = isNextEvent ? "col-md-12 col-xl-8" : "col-md-6 col-xl-4";
        
        let imgHtml = ev.image_data ? `<img src="${ev.image_data}" class="img-fluid rounded-4 mb-3 w-100" style="height: ${isNextEvent ? '350px' : '200px'}; object-fit: cover; border: 1px solid rgba(157, 78, 221, 0.4);">` : '';
        let locText = ev.location ? ev.location : '<i class="text-muted">Wird noch bekanntgegeben</i>';
        let highlightBadge = isNextEvent ? `<span class="badge bg-danger text-uppercase mb-3 px-3 py-2 fs-6 shadow"><i class="bi bi-star-fill text-warning"></i> Nächstes Event</span><br>` : '';

        let descHtml = ev.description ? `<p class="text-light ${isNextEvent ? 'fs-6' : 'small'} mt-2 mb-3 p-3 rounded-3" style="background: rgba(0,0,0,0.4); border-left: 3px solid var(--brand-purple);"><i class="bi bi-info-circle me-1 text-purple-glow"></i> ${ev.description}</p>` : '';

        let distText = "Pin für Entfernung erforderlich";
        if (myPin && ev.lat && ev.lng) {
            let userLatLng = L.latLng(myPin.lat, myPin.lng);
            let eventLatLng = L.latLng(ev.lat, ev.lng);
            let km = (userLatLng.distanceTo(eventLatLng) / 1000).toFixed(1);
            distText = `Ca. ${km} km von deinem Pin entfernt`;
        } else if (!ev.lat || !ev.lng) {
            distText = "Kein genauer Treffpunkt-Standort angegeben";
        }

        let isCreatorOrAdmin = state.currentUser.isAdmin || state.currentUser.isModerator || ev.created_by === state.currentUser.username;
        let adminControlsHtml = isCreatorOrAdmin ? `
            <div class="d-flex gap-2 mt-3 pt-3 border-top border-secondary">
                <button class="btn btn-sm btn-outline-warning flex-grow-1" onclick="openEditEventModal('${ev.id}')"><i class="bi bi-pencil"></i> Bearbeiten</button>
                <button class="btn btn-sm btn-outline-danger flex-grow-1" onclick="deleteEvent('${ev.id}')"><i class="bi bi-trash"></i> Löschen</button>
            </div>
        ` : '';

        return `
        <div class="${colClass}">
            <div class="single-event-card ${isNextEvent ? 'border-warning shadow-lg' : ''}" style="${isNextEvent ? 'background: linear-gradient(135deg, rgba(197, 160, 26, 0.1) 0%, rgba(10, 10, 12, 0.8) 100%);' : ''}">
                <div>
                    ${imgHtml}
                    ${highlightBadge}
                    <h4 class="text-warning text-uppercase fw-bold ${isNextEvent ? 'display-6 mb-3' : 'mb-2'}">${ev.title}</h4>
                    <p class="event-meta-gold ${isNextEvent ? 'fs-5 mb-3' : 'mb-2'}"><i class="bi bi-calendar-event"></i> ${new Date(ev.date_time).toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' })} Uhr</p>
                    <p class="text-light ${isNextEvent ? 'fs-6' : 'small'} mb-1"><i class="bi bi-geo-alt"></i> Treffpunkt: ${locText}</p>
                    <p class="text-purple-glow ${isNextEvent ? 'fs-6' : 'small'} mb-2 fw-bold"><i class="bi bi-geo"></i> ${distText}</p>
                    <p class="text-light ${isNextEvent ? 'fs-6' : 'small'} mb-2"><i class="bi bi-person-badge"></i> Orga: ${ev.organizer}</p>
                    ${descHtml}
                    <p class="text-purple-glow ${isNextEvent ? 'fs-6' : 'small'} fw-bold mb-0"><i class="bi bi-people-fill"></i> Angemeldete Fahrer: ${parts.length}</p>
                </div>
                <div>
                    <div class="d-flex gap-2 mt-4">
                        ${isParticipating 
                            ? `<button class="btn btn-outline-danger flex-grow-1 fw-bold ${isNextEvent ? 'py-2 fs-5' : ''}" onclick="toggleEventParticipation('${ev.id}')" title="Teilnahme zurückziehen"><i class="bi bi-x-circle"></i> Absagen</button>`
                            : `<button class="btn btn-event-participate flex-grow-1 ${isNextEvent ? 'py-2 fs-5' : ''}" onclick="toggleEventParticipation('${ev.id}')">Teilnehmen</button>`}
                        
                        <button class="btn btn-outline-warning ${isNextEvent ? 'py-2 fs-5 px-4' : ''}" onclick="calculateBestMeetingPoint('${ev.id}')" title="Berechne den fairsten Treffpunkt"><i class="bi bi-geo-fill"></i> Mitte</button>
                    </div>
                    ${adminControlsHtml}
                </div>
            </div>
        </div>`;
    }).join('') || '<p class="text-center text-purple-glow w-100">Keine aktuellen Events geplant.</p>';
}

async function deleteEvent(eventId) {
    if (confirm("Möchtest du dieses Event wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.")) {
        await db.from('crew_events').delete().eq('id', eventId);
        renderEvents();
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
    let localStr = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    document.getElementById('editEventDateTime').value = localStr;
    
    showModal('editEventModal');
}

document.getElementById("editEventForm").addEventListener("submit", async function(e) {
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
        const file = fileInput.files[0];
        if (file.size > 1024 * 1024) { 
            alert("Dein Bild ist zu groß! Bitte wähle ein Bild unter 1 MB aus.");
            return;
        }
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
            updateData.image_data = reader.result;
            await executeUpdateEvent(updateData);
        };
    } else {
        await executeUpdateEvent(updateData);
    }
});

async function executeUpdateEvent(data) {
    await db.from('crew_events').update(data).eq('id', activeEditEventId);
    hideModal("editEventModal");
    activeEditEventId = null;
    renderEvents();
}

async function toggleEventParticipation(eventId) {
    let { data: event } = await db.from('crew_events').select('participants').eq('id', eventId).single();
    let parts = event.participants || [];
    
    if (parts.includes(state.currentUser.email)) {
        parts = parts.filter(email => email !== state.currentUser.email);
    } else {
        parts.push(state.currentUser.email);
    }
    
    await db.from('crew_events').update({ participants: parts }).eq('id', eventId);
    renderEvents();
}

async function calculateBestMeetingPoint(eventId) {
    let { data: myPin } = await db.from('map_pins').select('*').eq('email', state.currentUser.email).single();
    if (!myPin) {
        alert("Du musst zuerst deinen eigenen Standort auf der PixelMap eintragen, bevor du diesen Button nutzen kannst!");
        return;
    }

    let { data: event } = await db.from('crew_events').select('participants').eq('id', eventId).single();
    let parts = event.participants || [];
    
    if (parts.length === 0) {
        alert("Es hat sich noch niemand für dieses Event eingetragen.");
        return;
    }

    let { data: pins } = await db.from('map_pins').select('lat, lng').in('email', parts);
    if (!pins || pins.length === 0) {
        alert("Keiner der Teilnehmer hat bisher seinen Standort auf der Karte markiert.");
        return;
    }

    let avgLat = pins.reduce((sum, p) => sum + p.lat, 0) / pins.length;
    let avgLng = pins.reduce((sum, p) => sum + p.lng, 0) / pins.length;

    let townName = "Unbekannte Region";
    try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${avgLat}&lon=${avgLng}`);
        const data = await res.json();
        if (data && data.address) {
            townName = data.address.city || data.address.town || data.address.village || data.address.county || townName;
        }
    } catch(e) {
        console.error("Geocoding fehlgeschlagen", e);
    }

    document.getElementById("meetingPointCityName").innerText = townName;
    showModal("bestMeetingPointModal");

    setTimeout(() => {
        if (!window.meetingMapInstance) {
            window.meetingMapInstance = L.map('meetingMap').setView([avgLat, avgLng], 10);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(window.meetingMapInstance);
            window.meetingMarkerGroup = L.layerGroup().addTo(window.meetingMapInstance);
        } else {
            window.meetingMapInstance.setView([avgLat, avgLng], 10);
            window.meetingMapInstance.invalidateSize(); 
            window.meetingMarkerGroup.clearLayers();
        }

        L.circle([avgLat, avgLng], {
            color: '#c5a01a',
            fillColor: '#7b2cbf',
            fillOpacity: 0.15,
            radius: 15000 
        }).addTo(window.meetingMarkerGroup);

        L.marker([avgLat, avgLng]).addTo(window.meetingMarkerGroup)
            .bindPopup(`<b class="text-uppercase text-primary">Errechnete Mitte</b><br>ca. ${townName}`).openPopup();

    }, 350); 
}

/* =========================================
   7. FORUM & WISSENSAUSTAUSCH MODUL
   ========================================= */
document.getElementById("topicForm").addEventListener("submit", async function(e) {
    e.preventDefault();
    const category = document.getElementById("topicCat").value;
    const title = document.getElementById("topicTitle").value.trim();
    const content = document.getElementById("topicContent").value.trim();
    
    await db.from('forum_topics').insert([{ category, title, content, author: state.currentUser.username, replies: [] }]);
    
    document.getElementById("topicForm").reset();
    hideModal("createTopicModal");
    renderForumTopics();
});

async function renderForumTopics() {
    let query = db.from('forum_topics').select('*');
    if (currentForumCat !== 'all') query = query.eq('category', currentForumCat);
    let { data: topics } = await query;

    document.getElementById("forumGrid").innerHTML = (topics || []).map(t => {
        let repliesCount = (t.replies || []).length;
        
        let isCreatorOrAdmin = state.currentUser.isAdmin || state.currentUser.isModerator || t.author === state.currentUser.username;
        let adminControlsHtml = isCreatorOrAdmin ? `
            <div class="d-flex gap-2 mt-3 pt-2 border-top border-secondary">
                <button class="btn btn-sm btn-outline-warning" onclick="event.stopPropagation(); openEditForumModal('${t.id}')"><i class="bi bi-pencil"></i> Bearbeiten</button>
                <button class="btn btn-sm btn-outline-danger" onclick="event.stopPropagation(); deleteForumTopic('${t.id}')"><i class="bi bi-trash"></i> Löschen</button>
            </div>
        ` : '';

        return `
        <div class="thread-card mb-3 p-3 rounded-4" style="background:rgba(10,10,12,0.75); border:1px solid rgba(157,78,221,0.3); cursor:pointer;" onclick="openChatTopic(${t.id}, '${t.title.replace(/'/g, "\\'")}')">
            <div class="d-flex justify-content-between align-items-center mb-1">
                <span class="thread-badge">${t.category}</span>
                <span class="small text-muted"><i class="bi bi-chat-dots"><b> ${repliesCount}</b></i></span>
            </div>
            <h5 class="thread-title text-warning mt-1">${t.title}</h5>
            <p class="text-light small mb-2">${t.content}</p>
            <div class="d-flex justify-content-between align-items-center">
                <span class="small text-purple-glow fw-bold">Von ${t.author}</span>
            </div>
            ${adminControlsHtml}
        </div>
        `;
    }).join('') || '<p class="text-center text-purple-glow">Keine Beiträge in dieser Kategorie.</p>';
}

function filterForumCat(cat, el) {
    currentForumCat = cat;
    document.querySelectorAll('.category-item').forEach(i => i.classList.remove('active'));
    el.classList.add('active');
    renderForumTopics();
}

async function deleteForumTopic(topicId) {
    if (confirm("Möchtest du dieses Thema wirklich löschen?")) {
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

document.getElementById("editTopicForm").addEventListener("submit", async function(e) {
    e.preventDefault();
    if (!activeEditTopicId) return;

    const category = document.getElementById("editTopicCat").value;
    const title = document.getElementById("editTopicTitle").value.trim();
    const content = document.getElementById("editTopicContent").value.trim();

    await db.from('forum_topics').update({ category, title, content }).eq('id', activeEditTopicId);
    
    hideModal("editTopicModal");
    activeEditTopicId = null;
    renderForumTopics();
});

async function openChatTopic(id, title) {
    activeChatTopicId = id;
    document.getElementById("chatModalTitle").textContent = title;
    let { data: topic } = await db.from('forum_topics').select('*').eq('id', id).single();
    
    const list = document.getElementById("chatMessageList");
    let replies = topic.replies || [];
    
    list.innerHTML = `
        <div class="chat-bubble chat-bubble-other">
            <div class="chat-author">${topic.author}</div>
            <div>${topic.content}</div>
        </div>
    ` + replies.map(r => `
        <div class="chat-bubble ${r.author === state.currentUser.username ? 'chat-bubble-own' : 'chat-bubble-other'}">
            <div class="chat-author">${r.author}</div>
            <div>${r.text}</div>
        </div>
    `).join('');

    showModal("chatTopicModal");
}

async function sendChatMessage() {
    const input = document.getElementById("chatInputText");
    const text = input.value.trim();
    if (!text || !activeChatTopicId) return;

    let { data: topic } = await db.from('forum_topics').select('replies').eq('id', activeChatTopicId).single();
    let replies = topic.replies || [];
    replies.push({ author: state.currentUser.username, text, time: new Date().toISOString() });

    await db.from('forum_topics').update({ replies }).eq('id', activeChatTopicId);
    input.value = "";
    openChatTopic(activeChatTopicId, document.getElementById("chatModalTitle").textContent);
}

/* =========================================
   8. MAP MODUL
   ========================================= */
let allMapPins = []; 
let currentUserPin = null;
let bikeCount = 0;

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
    container.innerHTML = '<label class="label-custom">Motorräder (max. 5)</label>';
    bikeCount = 0;
    
    if (bikesArray.length === 0) bikesArray = [""];
    bikesArray.forEach(bike => addBikeInput(bike));
}

function addBikeInput(val = "") {
    if (bikeCount >= 5) {
        if (!val) alert("Du kannst maximal 5 Motorräder eintragen.");
        return;
    }
    bikeCount++;
    const container = document.getElementById("bikeInputsContainer");
    const input = document.createElement("input");
    input.type = "text";
    input.className = "input-custom mb-2 bike-input";
    input.placeholder = `${bikeCount}. Motorrad ${bikeCount === 1 ? '(Pflicht)' : '(optional)'}`;
    input.value = val;
    if (bikeCount === 1) input.required = true;
    container.appendChild(input);
    
    document.getElementById("addBikeBtn").style.display = (bikeCount >= 5) ? 'none' : 'block';
}

document.getElementById("mapForm").addEventListener("submit", async function(e) {
    e.preventDefault();
    const city = document.getElementById("mapCity").value.trim();
    
    const bikeInputs = document.querySelectorAll(".bike-input");
    const bikes = Array.from(bikeInputs).map(i => i.value.trim()).filter(v => v !== "").join(", ");
    
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city)}`);
        const data = await response.json();
        
        if (data && data.length > 0) {
            const lat = parseFloat(data[0].lat);
            const lng = parseFloat(data[0].lon);

            await db.from('map_pins').upsert([
                { email: state.currentUser.email, username: state.currentUser.username, city, bike: bikes, lat, lng }
            ], { onConflict: 'email' });

            alert("Dein Standort wurde auf der PixelMap erfolgreich aktualisiert!");
            loadMapPins(); 
        } else {
            alert("Stadt nicht gefunden. Bitte überprüfe die Schreibweise.");
        }
    } catch (err) {
        alert("Fehler bei der Ortssuche. Bitte später erneut versuchen.");
    }
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
            document.getElementById("mapCity").value = "";
        } else {
            document.getElementById("mapCity").value = currentUserPin.city;
            document.getElementById("mapSubmitBtn").innerHTML = '<i class="bi bi-arrow-repeat"></i> Pin Aktualisieren';
            
            const existingBikes = currentUserPin.bike.split(',').map(b => b.trim());
            renderBikeInputs(existingBikes);
        }
    }

    renderPins(allMapPins);
}

function renderPins(pinsToRender) {
    markersGroup.clearLayers();
    
    const redIcon = new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });

    pinsToRender.forEach(p => {
        const isMe = p.email === state.currentUser.email;
        const markerOptions = isMe ? { icon: redIcon } : {};
        
        L.marker([p.lat, p.lng], markerOptions).addTo(markersGroup)
            .bindPopup(`
                <b class="text-uppercase ${isMe ? 'text-danger' : 'text-primary'}">${p.username} ${isMe ? '(Du)' : ''}</b><br>
                <b>Stadt:</b> ${p.city}<br>
                <b>Bikes:</b> ${p.bike}
            `);
    });
    
    if (currentUserPin && state.currentView === 'map' && !window.radiusCircle) {
        mapInstance.setView([currentUserPin.lat, currentUserPin.lng], 9);
    }
}

function filterMapByRadius() {
    if (!currentUserPin) {
        alert("Du musst zuerst deinen eigenen Standort eintragen, um im Umkreis suchen zu können!");
        return;
    }
    
    const radiusKm = parseInt(document.getElementById("radiusSlider").value);
    const userLatLng = L.latLng(currentUserPin.lat, currentUserPin.lng);
    
    const filteredPins = allMapPins.filter(p => {
        if (p.email === state.currentUser.email) return true; 
        const pinLatLng = L.latLng(p.lat, p.lng);
        const distanceMeters = userLatLng.distanceTo(pinLatLng);
        return (distanceMeters / 1000) <= radiusKm;
    });
    
    renderPins(filteredPins);
    
    if (window.radiusCircle) mapInstance.removeLayer(window.radiusCircle);
    
    window.radiusCircle = L.circle([currentUserPin.lat, currentUserPin.lng], {
        color: '#c5a01a',
        fillColor: '#7b2cbf',
        fillOpacity: 0.15,
        radius: radiusKm * 1000
    }).addTo(mapInstance);
    
    mapInstance.fitBounds(window.radiusCircle.getBounds());
}