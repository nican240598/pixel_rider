// mobile-optimierung.js
document.addEventListener("DOMContentLoaded", function() {

    // 1. Navbar Funktion überschreiben, um ECHTE Bottom-Nav Icons auf dem Handy zu haben!
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
                        <div class="nav-item-mobile" onclick="openPasswordResetsModal()" title="Admin-Benachrichtigungen">
                            <i class="bi bi-shield-shaded text-warning position-relative">
                                <span id="adminBellBadge" class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger d-none" style="font-size: 0.5rem; padding: 3px 5px;">0</span>
                            </i>
                            <span class="nav-text-mobile text-warning d-md-none">Admin</span>
                        </div>
                    `;
                }

                let userBellHtml = `
                    <div class="nav-item-mobile" onclick="openUserNotificationsModal()" title="Deine Benachrichtigungen">
                        <i class="bi bi-bell-fill text-white position-relative">
                            <span id="userBellBadge" class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger d-none" style="font-size: 0.5rem; padding: 3px 5px;">0</span>
                        </i>
                        <span class="nav-text-mobile text-white d-md-none">News</span>
                    </div>
                `;

                navLinks.innerHTML = `
                    ${adminBellHtml}
                    ${userBellHtml}
                    <div class="nav-item-mobile ${roleColor}" onclick="switchView('profile')" title="Profil bearbeiten">
                        <i class="bi bi-person-circle"></i>
                        <span class="nav-text-mobile d-md-none">Profil</span>
                        <span class="d-none d-md-inline fw-bold ms-1">${state.currentUser.username}</span>
                    </div>
                    <div class="nav-item-mobile text-light" onclick="switchView('dashboard')">
                        <i class="bi bi-grid-1x2-fill d-md-none"></i>
                        <span class="nav-text-mobile d-md-none">Menü</span>
                        <span class="d-none d-md-inline custom-nav-link border-0 bg-transparent px-2">Dashboard</span>
                    </div>
                    <div class="nav-item-mobile text-danger" onclick="logout()">
                        <i class="bi bi-box-arrow-right d-md-none"></i>
                        <span class="nav-text-mobile d-md-none">Logout</span>
                        <span class="d-none d-md-inline btn-logout ms-2">Logout</span>
                    </div>
                `;
                if (state.currentUser.isAdmin || state.currentUser.isModerator) checkAdminNotifications();
                checkUserNotifications();
            } else {
                navLinks.innerHTML = `
                    <div class="nav-item-mobile text-white w-auto px-3" onclick="showModal('authModal')">
                        <i class="bi bi-box-arrow-in-right d-md-none fs-4"></i>
                        <span class="nav-text-mobile text-white d-md-none">Login</span>
                        <span class="d-none d-md-inline custom-nav-link border-0 bg-transparent">Login / Registrieren</span>
                    </div>
                `;
            }
        };
        // Direkt initial triggern
        updateNavbar();
    }

    // 2. Allen Modals die Klasse für Vollbild auf Handys geben (Bootstrap 5 Feature)
    document.querySelectorAll('.modal-dialog').forEach(el => {
        if(!el.classList.contains('modal-fullscreen-md-down')) {
            el.classList.add('modal-fullscreen-md-down');
        }
    });

    // 3. Tabellen im Admin-Panel responsive machen (über MutationObserver, da sie via JS dynamisch geladen werden)
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {

                // User Tabelle patchen
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

                // Invite Tabelle patchen
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

                // Neu geladene Modals überprüfen
                document.querySelectorAll('.modal-dialog:not(.modal-fullscreen-md-down)').forEach(el => {
                    el.classList.add('modal-fullscreen-md-down');
                });
            }
        });
    });

    // Body überwachen, da Inhalte via switchView und innerHTML geändert werden
    observer.observe(document.body, { childList: true, subtree: true });
});
