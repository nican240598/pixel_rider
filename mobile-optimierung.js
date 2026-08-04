// mobile-optimierung.js
document.addEventListener("DOMContentLoaded", function() {
    
    // 1. Navbar flex-wrap geben, damit auf kleinen Screens nichts überlappt
    const navLinks = document.getElementById('navLinks');
    if(navLinks) {
        navLinks.classList.add('flex-wrap', 'justify-content-end');
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
                        if(cells[4]) cells[4].setAttribute('data-label', 'Aktion');
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
