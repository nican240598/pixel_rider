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
    
    if (state.currentUser) {
        let roleColor = "text-warning"; 
        if (state.currentUser.isAdmin) roleColor = "text-danger"; 
        else if (state.currentUser.isModerator) roleColor = "text-info"; 

        // Admin/Mod Bell (für Passwort-Resets & Invite-Anfragen)
        let adminBellHtml = '';
        if (state.currentUser.isAdmin || state.currentUser.isModerator) {
            adminBellHtml = `
                <div class="position-relative me-1" style="cursor: pointer;" onclick="openPasswordResetsModal()" title="Admin-Benachrichtigungen">
                    <i class="bi bi-shield-shaded text-warning fs-5"></i>
                    <span id="adminBellBadge" class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger d-none" style="font-size: 0.6rem;">0</span>
                </div>
            `;
        }

        // User Bell (für ALLE User - Benachrichtigungen z.B. von Mod-Aktionen)
        let userBellHtml = `
            <div class="position-relative me-3" style="cursor: pointer;" onclick="openUserNotificationsModal()" title="Deine Benachrichtigungen">
                <i class="bi bi-bell-fill text-white fs-5"></i>
                <span id="userBellBadge" class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger d-none" style="font-size: 0.6rem;">0</span>
            </div>
        `;

        navLinks.innerHTML = `
            ${adminBellHtml}
            ${userBellHtml}
            <span class="${roleColor} fw-bold me-3 user-role-badge" style="cursor:pointer;" onclick="switchView('profile')" title="Profil bearbeiten"><i class="bi bi-person-circle me-1"></i>${state.currentUser.username}</span>
            <button class="custom-nav-link border-0 bg-transparent" onclick="switchView('dashboard')">Dashboard</button>
            <button class="btn-logout ms-2" onclick="logout()">Logout</button>
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
                    <h3 class="text-warning text-uppercase fw-bold mb-2 display-6">Admin & Moderator Center</h3>
                    <p class="card-description fs-5 text-light">Verwalte Invite-Codes und User-Rechte über die Cloud.</p>
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

                let lastLoginHtml = '<span class="text-muted small">Unbekannt</span>';
                if (u.last_login) {
                    let d = new Date(u.last_login);
                    let day = String(d.getDate()).padStart(2, '0');
                    let month = String(d.getMonth() + 1).padStart(2, '0');
                    let year = d.getFullYear();
                    let hrs = String(d.getHours()).padStart(2, '0');
                    let mins = String(d.getMinutes()).padStart(2, '0');
                    lastLoginHtml = `<span class="text-light small">${day}.${month}.${year}</span><br><span class="text-muted" style="font-size:0.75rem;">${hrs}:${mins} Uhr</span>`;
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
