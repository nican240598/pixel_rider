// mobile-optimierung.js
document.addEventListener("DOMContentLoaded", function() {
    if (typeof window.updateNavbar !== 'undefined') {
        window.updateNavbar = function() {
            const navLinks = document.getElementById("navLinks");
            if(!navLinks) return;
            if (state.currentUser) {
                let roleColor = "text-warning";
                if (state.currentUser.isAdmin) roleColor = "text-danger";
                else if (state.currentUser.isModerator) roleColor = "text-info";
                let adminBellHtml = '';
                if (state.currentUser.isAdmin || state.currentUser.isModerator) {
                    adminBellHtml = `
                        <div class="nav-item-mobile" onclick="openPasswordResetsModal()" title="Admin Center">
                            <i class="bi bi-shield-shaded text-warning position-relative">
                                <span id="adminBellBadge" class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger d-none" style="font-size: 0.5rem; padding: 3px 5px;">0</span>
                            </i>
                            <span class="nav-text-mobile text-warning d-md-none">Admin</span>
                        </div>
                    `;
                }
                let userBellHtml = `
                    <div class="nav-item-mobile" onclick="openUserNotificationsModal()" title="Benachrichtigungen">
                        <i class="bi bi-bell-fill text-white position-relative">
                            <span id="userBellBadge" class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger d-none" style="font-size: 0.5rem; padding: 3px 5px;">0</span>
                        </i>
                        <span class="nav-text-mobile text-white d-md-none">News</span>
                    </div>
                `;
                let desktopCenterLinks = `
                    <div class="d-none d-lg-flex align-items-center gap-4 desktop-center-nav">
                        <span class="desktop-nav-link" onclick="switchView('dashboard')"><i class="bi bi-grid-1x2-fill"></i> Dashboard</span>
                        <span class="desktop-nav-link" onclick="switchView('garage')"><i class="bi bi-tools"></i> Garage</span>
                        <span class="desktop-nav-link" onclick="switchView('forum')"><i class="bi bi-chat-quote-fill"></i> Forum</span>
                        <span class="desktop-nav-link" onclick="switchView('events')"><i class="bi bi-calendar-event-fill"></i> Events</span>
                        <span class="desktop-nav-link" onclick="switchView('map')"><i class="bi bi-geo-alt-fill"></i> Map</span>
                    </div>
                `;
                navLinks.innerHTML = `
                    ${desktopCenterLinks}
                    <div class="right-side-nav">
                        ${adminBellHtml}
                        ${userBellHtml}
                        <div class="nav-item-mobile ${roleColor}" onclick="switchView('profile')" title="Profil">
                            <i class="bi bi-person-circle"></i>
                            <span class="nav-text-mobile d-md-none">Profil</span>
                            <span class="d-none d-md-inline fw-bold ms-2 me-1">${state.currentUser.username}</span>
                        </div>
                        <div class="nav-item-mobile text-light d-md-none" onclick="switchView('dashboard')">
                            <i class="bi bi-grid-1x2-fill"></i>
                            <span class="nav-text-mobile">Menü</span>
                        </div>
                        <div class="nav-item-mobile text-danger" onclick="logout()" title="Logout">
                            <i class="bi bi-box-arrow-right d-md-none"></i>
                            <span class="nav-text-mobile d-md-none">Logout</span>
                            <button class="d-none d-md-inline btn btn-outline-danger btn-sm rounded-pill px-3 ms-2 fw-bold"><i class="bi bi-box-arrow-right me-1"></i> Logout</button>
                        </div>
                    </div>
                `;
                if (state.currentUser.isAdmin || state.currentUser.isModerator) checkAdminNotifications();
                checkUserNotifications();
            } else {
                navLinks.innerHTML = `
                    <div class="nav-item-mobile text-white w-100 justify-content-center px-3" onclick="showModal('authModal')">
                        <i class="bi bi-box-arrow-in-right d-md-none fs-4"></i>
                        <span class="nav-text-mobile text-white d-md-none">Login</span>
                        <button class="d-none d-md-inline btn btn-warning rounded-pill px-4 fw-bold text-dark"><i class="bi bi-person-fill me-1"></i> Login / Registrieren</button>
                    </div>
                `;
            }
        };
        updateNavbar();
    }
    document.querySelectorAll('.modal-dialog').forEach(el => {
        if(!el.classList.contains('modal-fullscreen-md-down')) {
            el.classList.add('modal-fullscreen-md-down');
        }
    });
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                const usersTable = document.getElementById('usersTableBody');
                if (usersTable && usersTable.contains(mutation.target)) {
                    usersTable.querySelectorAll('tr').forEach(row => {
                        const cells = row.querySelectorAll('td');
                        if(cells[0]) cells[0].setAttribute('data-label', 'Username');
                        if(cells[1]) cells[1].setAttribute('data-label', 'Rolle');
                        if(cells[2]) cells[2].setAttribute('data-label', 'Invite');
                        if(cells[3]) cells[3].setAttribute('data-label', 'Status');
                        if(cells[4]) cells[4].setAttribute('data-label', 'Zuletzt eingeloggt');
                        if(cells[5]) cells[5].setAttribute('data-label', 'Aktion');
                    });
                }
                const invitesTable = document.getElementById('invitesTableBody');
                if (invitesTable && invitesTable.contains(mutation.target)) {
                    invitesTable.querySelectorAll('tr').forEach(row => {
                        const cells = row.querySelectorAll('td');
                        if(cells[0]) cells[0].setAttribute('data-label', 'Code');
                        if(cells[1]) cells[1].setAttribute('data-label', 'Erstellt von');
                        if(cells[2]) cells[2].setAttribute('data-label', 'Status');
                        if(cells[3]) cells[3].setAttribute('data-label', 'Aktion');
                    });
                }
                document.querySelectorAll('.modal-dialog:not(.modal-fullscreen-md-down)').forEach(el => {
                    el.classList.add('modal-fullscreen-md-down');
                });
            }
        });
    });
    observer.observe(document.body, { childList: true, subtree: true });
});
