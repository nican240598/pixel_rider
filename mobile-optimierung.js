document.addEventListener('DOMContentLoaded', () => {
    initMobileOptimizations();
    
    // Observer, um die Glocken aus der Desktop-Nav in die Mobile-Nav zu spiegeln
    const navLinksObserver = new MutationObserver(syncMobileBells);
    const navLinks = document.getElementById('navLinks');
    if(navLinks) navLinksObserver.observe(navLinks, { childList: true, subtree: true });
});

function initMobileOptimizations() {
    if (window.innerWidth > 768) return;

    setupMobileHeaderAndNav();
    setupMobileFABs();
    transformSidebarsToSheets();
    optimizeMapLayout();
}

/**
 * Erstellt den fixierten Mobile-Header und die Bottom Tab-Bar.
 */
function setupMobileHeaderAndNav() {
    // 1. Mobile Header injizieren
    if (!document.getElementById('mobileTopHeader')) {
        const topHeader = document.createElement('div');
        topHeader.id = 'mobileTopHeader';
        topHeader.className = 'mobile-top-header d-md-none';
        topHeader.innerHTML = `
            <div class="mobile-brand" onclick="switchView('dashboard')">
                <img src="image_0.png" alt="Logo" onerror="this.style.display='none'">
                PIXEL<span>RIDER</span>
            </div>
            <div class="mobile-header-actions" id="mobileHeaderBells">
                <!-- Glocken werden via syncMobileBells() injiziert -->
            </div>
        `;
        document.body.prepend(topHeader);
    }

    // 2. Bottom Navigation generieren
    if (!document.getElementById('mobileBottomNav')) {
        const bottomNav = document.createElement('div');
        bottomNav.id = 'mobileBottomNav';
        bottomNav.className = 'mobile-bottom-nav d-md-none';
        
        const tabs = [
            { id: 'dashboard', icon: 'bi-house-door-fill', label: 'Home' },
            { id: 'map', icon: 'bi-geo-alt-fill', label: 'Map' },
            { id: 'events', icon: 'bi-calendar-event-fill', label: 'Events' },
            { id: 'forum', icon: 'bi-chat-quote-fill', label: 'Forum' },
            { id: 'profile', icon: 'bi-person-circle', label: 'Profil' }
        ];

        bottomNav.innerHTML = tabs.map(t => `
            <div class="mobile-nav-item ${t.id === 'dashboard' ? 'active' : ''}" data-target="${t.id}" onclick="handleMobileTabClick('${t.id}')">
                <i class="bi ${t.icon}"></i>
                <span>${t.label}</span>
            </div>
        `).join('');
        document.body.appendChild(bottomNav);
    }
}

/**
 * Spiegelt die User/Admin-Glocken aus app.js in den mobilen Header
 */
function syncMobileBells() {
    if (window.innerWidth > 768) return;
    const desktopNav = document.getElementById('navLinks');
    const mobileBells = document.getElementById('mobileHeaderBells');
    if (!desktopNav || !mobileBells) return;

    mobileBells.innerHTML = '';
    // Suche nach den Elementen, die openUserNotificationsModal oder openPasswordResetsModal triggern
    const bells = desktopNav.querySelectorAll('[onclick*="Modal"]');
    bells.forEach(bell => {
        const clonedBell = bell.cloneNode(true);
        clonedBell.classList.remove('me-3', 'me-1'); // Entferne Desktop-Margins
        mobileBells.appendChild(clonedBell);
    });
}

/**
 * Schaltet den aktiven Tab um und triggert die native switchView Funktion aus app.js
 */
window.handleMobileTabClick = function(viewId) {
    document.querySelectorAll('.mobile-nav-item').forEach(el => el.classList.remove('active'));
    const targetEl = document.querySelector(`.mobile-nav-item[data-target="${viewId}"]`);
    if(targetEl) targetEl.classList.add('active');
    
    if (typeof switchView === 'function') switchView(viewId);
    setupMobileFABs(); // FABs basierend auf der aktuellen View aktualisieren
};

/**
 * FABs dynamisch je nach geöffneter View einblenden (z.B. GPX-Upload)
 */
function setupMobileFABs() {
    let fabContainer = document.getElementById('mobileFabContainer');
    if (!fabContainer) {
        fabContainer = document.createElement('div');
        fabContainer.id = 'mobileFabContainer';
        fabContainer.className = 'fab-container d-md-none';
        document.body.appendChild(fabContainer);
    }
    
    fabContainer.innerHTML = ''; // Reset
    const currentView = document.querySelector('.app-view.active-view')?.id || 'view-landing';

    // Globale FABs (Online-User & Events Sidebars) -> Nur wenn eingeloggt
    if (state && state.currentUser) {
        fabContainer.innerHTML += `
            <div class="fab-btn" onclick="toggleBottomSheet('sheet-online-users')"><i class="bi bi-people-fill"></i></div>
            <div class="fab-btn gold" onclick="toggleBottomSheet('sheet-events-countdown')"><i class="bi bi-calendar-event-fill text-dark"></i></div>
        `;
    }

    // View-spezifische FABs (Ersetzen die Desktop-Buttons)
    if (currentView === 'view-gpx') {
        fabContainer.innerHTML += `<div class="fab-btn" data-bs-toggle="modal" data-bs-target="#uploadGpxModal"><i class="bi bi-cloud-upload-fill"></i></div>`;
    } else if (currentView === 'view-events') {
        fabContainer.innerHTML += `<div class="fab-btn gold" data-bs-toggle="modal" data-bs-target="#createEventModal"><i class="bi bi-plus-lg text-dark"></i></div>`;
    } else if (currentView === 'view-forum') {
        fabContainer.innerHTML += `<div class="fab-btn" data-bs-toggle="modal" data-bs-target="#createTopicModal"><i class="bi bi-chat-dots-fill"></i></div>`;
    } else if (currentView === 'view-map') {
        fabContainer.innerHTML += `<div class="fab-btn gold" onclick="toggleBottomSheet('sheet-map-controls')"><i class="bi bi-sliders text-dark"></i></div>`;
    }
}

/**
 * Wandelt Desktop-Sidebars in native Mobile Bottom Sheets um
 */
function transformSidebarsToSheets() {
    // 1. Online Users Sidebar
    createBottomSheet('sheet-online-users', 'Crew Online', document.getElementById('onlineUsersList'));
    
    // 2. Events Sidebar
    createBottomSheet('sheet-events-countdown', 'Anstehende Events', document.getElementById('eventsSidebarList'));

    // Desktop Sidebars restlos verstecken
    const dsOnline = document.getElementById('onlineUsersSidebar');
    const dsEvents = document.getElementById('eventsSidebar');
    if(dsOnline) dsOnline.style.display = 'none';
    if(dsEvents) dsEvents.style.display = 'none';
}

function createBottomSheet(id, title, contentElement) {
    if (document.getElementById(id) || !contentElement) return;
    
    const sheet = document.createElement('div');
    sheet.id = id;
    sheet.className = 'mobile-bottom-sheet d-md-none';
    
    sheet.innerHTML = `
        <div class="sheet-drag-handle" onclick="toggleBottomSheet('${id}')"></div>
        <h5 class="text-warning fw-bold text-uppercase mb-3">${title}</h5>
        <div id="${id}-content"></div>
    `;
    document.body.appendChild(sheet);
    
    // Verschiebe das DOM-Element in das Sheet (Erhält bestehende JavaScript Bindings aus app.js)
    document.getElementById(`${id}-content`).appendChild(contentElement);
}

window.toggleBottomSheet = function(id) {
    // Alle anderen schließen
    document.querySelectorAll('.mobile-bottom-sheet').forEach(sheet => {
        if(sheet.id !== id) sheet.classList.remove('show');
    });
    const sheet = document.getElementById(id);
    if(sheet) sheet.classList.toggle('show');
};

/**
 * Zieht die Map-Steuerung (Formular & Radius) in ein Sheet, damit die Karte Fullscreen wird.
 */
function optimizeMapLayout() {
    const mapSidebar = document.querySelector('.map-sidebar');
    if (mapSidebar && !document.getElementById('sheet-map-controls')) {
        createBottomSheet('sheet-map-controls', 'Karteneinstellungen', mapSidebar);
    }
}

// Hook in die bestehende switchView-Funktion von app.js einhängen, um FABs upzudaten
const originalSwitchView = window.switchView;
window.switchView = function(viewName) {
    if (originalSwitchView) originalSwitchView(viewName);
    
    // Bottom Sheet schließen bei View-Wechsel
    document.querySelectorAll('.mobile-bottom-sheet').forEach(s => s.classList.remove('show'));
    
    // Update active state in Mobile Nav
    if (window.innerWidth <= 768) {
        document.querySelectorAll('.mobile-nav-item').forEach(el => el.classList.remove('active'));
        const targetEl = document.querySelector(`.mobile-nav-item[data-target="${viewName}"]`);
        if(targetEl) targetEl.classList.add('active');
        setupMobileFABs();
    }
};