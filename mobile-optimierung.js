document.addEventListener('DOMContentLoaded', () => {
    initMobileOptimizations();
    
    // Optional: Bei Resize prüfen, ob wir zwischen Mobile/Desktop wechseln
    window.addEventListener('resize', () => {
        if (window.innerWidth <= 768) {
            initMobileOptimizations();
        } else {
            revertToDesktop();
        }
    });
});

function initMobileOptimizations() {
    if (window.innerWidth > 768) return;

    setupMobileNavigation();
    transformDashboardToList();
    applyBottomSheetModals();
}

/**
 * Ersetzt das Navbar-Verhalten für Mobile und generiert Header & Bottom Bar.
 * Bestehende updateNavbar() Aufrufe in app.js können diese Funktion triggern.
 */
function setupMobileNavigation() {
    // 1. Mobile Top Header injizieren (falls nicht vorhanden)
    if (!document.getElementById('mobileTopHeader')) {
        const topHeader = document.createElement('div');
        topHeader.id = 'mobileTopHeader';
        topHeader.className = 'mobile-top-header d-md-none';
        topHeader.innerHTML = `
            <h1 class="brand-title">PIXEL RIDER</h1>
            <div class="header-icons">
                <i class="bi bi-bell" onclick="switchView('view-events')"></i>
                <i class="bi bi-person-circle" onclick="switchView('view-profile')"></i>
            </div>
        `;
        document.body.prepend(topHeader);
    }

    // 2. Bottom Tab Bar generieren
    if (!document.getElementById('mobileBottomBar')) {
        const bottomBar = document.createElement('div');
        bottomBar.id = 'mobileBottomBar';
        bottomBar.className = 'mobile-bottom-bar d-md-none';
        
        // Tab-Definitionen inkl. exakter switchView Aufrufe
        const tabs = [
            { icon: 'bi-house-door', label: 'HOME', view: 'view-dashboard' },
            { icon: 'bi-calendar-event', label: 'EVENTS', view: 'view-events' },
            { icon: 'bi-map', label: 'MAP', view: 'view-map' },
            { icon: 'bi-chat-square-text', label: 'CREW', view: 'view-forum' },
            { icon: 'bi-person', label: 'PROFIL', view: 'view-profile' }
        ];

        let tabsHtml = '';
        tabs.forEach((tab, index) => {
            // Der erste Tab ist standardmäßig aktiv
            const activeClass = index === 0 ? 'active' : '';
            tabsHtml += `
                <div class="mobile-tab-item ${activeClass}" onclick="switchMobileTab(this, '${tab.view}')">
                    <i class="bi ${tab.icon}"></i>
                    <span>${tab.label}</span>
                </div>
            `;
        });
        bottomBar.innerHTML = tabsHtml;
        document.body.appendChild(bottomBar);
    }
}

/**
 * Hilfsfunktion, um Tabs aktiv zu schalten und die native switchView aufzurufen
 */
window.switchMobileTab = function(element, viewName) {
    document.querySelectorAll('.mobile-tab-item').forEach(el => el.classList.remove('active'));
    element.classList.add('active');
    
    // Ruft die bestehende Funktion in app.js auf
    if (typeof switchView === 'function') {
        switchView(viewName);
    }
};

/**
 * Wandelt das Desktop-Grid (#dashboardGrid) dynamisch in die Listen-Struktur um
 */
function transformDashboardToList() {
    const grid = document.getElementById('dashboardGrid');
    if (!grid || document.getElementById('mobileDashboardList')) return;

    // Grid verstecken, ohne es zu löschen (für Desktop Fallback)
    grid.classList.add('d-none', 'd-md-flex');

    // Neuen Listen-Container erstellen
    const listContainer = document.createElement('div');
    listContainer.id = 'mobileDashboardList';
    listContainer.className = 'mobile-dashboard-container d-md-none';

    // Alle Karten auslesen und umschreiben
    const cards = grid.querySelectorAll('.feature-card, [onclick^="switchView"]');
    
    cards.forEach(card => {
        // Bestehende Daten extrahieren
        const onClickAttr = card.getAttribute('onclick');
        const iconElement = card.querySelector('i.bi');
        const iconClass = iconElement ? iconElement.className : 'bi bi-grid';
        
        // Text-Extraktion (Fallback, falls Tags variieren)
        const titleEl = card.querySelector('h1, h2, h3, h4, h5, h6, .title, strong');
        const descEl = card.querySelector('p, span, .desc, .text-muted');
        
        const titleText = titleEl ? titleEl.innerText : 'Modul';
        const descText = descEl ? descEl.innerText : '';

        // Neue Zeile bauen
        const listItem = document.createElement('div');
        listItem.className = 'mobile-list-item';
        listItem.setAttribute('onclick', onClickAttr); // Erhält die exakte Weiterleitung
        
        listItem.innerHTML = `
            <div class="mobile-list-icon"><i class="${iconClass}"></i></div>
            <div class="mobile-list-text">
                <h4 class="mobile-list-title">${titleText}</h4>
                <p class="mobile-list-desc">${descText}</p>
            </div>
            <i class="bi bi-chevron-right mobile-list-chevron"></i>
        `;
        
        listContainer.appendChild(listItem);
    });

    // Direkt nach dem Grid in den DOM hängen
    grid.parentNode.insertBefore(listContainer, grid.nextSibling);
}

/**
 * Injiziert den Drag-Handle für die Modals für den Bottom-Sheet-Look
 */
function applyBottomSheetModals() {
    const modals = document.querySelectorAll('.modal-content');
    modals.forEach(content => {
        if (!content.querySelector('.modal-drag-handle')) {
            const handle = document.createElement('div');
            handle.className = 'modal-drag-handle d-md-none';
            content.prepend(handle);
        }
    });
}

/**
 * Setzt Ansicht für Desktop zurück (Responsive Fallback)
 */
function revertToDesktop() {
    const list = document.getElementById('mobileDashboardList');
    const grid = document.getElementById('dashboardGrid');
    
    if (list) list.remove();
    if (grid) grid.classList.remove('d-none');
}