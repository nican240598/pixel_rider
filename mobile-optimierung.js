document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('mobileBottomNav')) return;

    // Erstelle die Taskleiste mit Integration der Panels
    const nav = document.createElement('div');
    nav.id = 'mobileBottomNav';
    nav.className = 'mobile-bottom-nav d-md-none';
    nav.innerHTML = `
        <div class="mobile-nav-item active" onclick="switchView('dashboard')">
            <i class="bi bi-house-door-fill"></i><span>Home</span>
        </div>
        <div class="mobile-nav-item" onclick="toggleMobileSidebar('onlineUsersSidebar')">
            <i class="bi bi-people-fill"></i><span>Crew</span>
        </div>
        <div class="mobile-nav-item" onclick="toggleMobileSidebar('eventsSidebar')">
            <i class="bi bi-calendar-event-fill"></i><span>Events</span>
        </div>
        <div class="mobile-nav-item" onclick="switchView('map')">
            <i class="bi bi-geo-alt-fill"></i><span>Map</span>
        </div>
        <div class="mobile-nav-item" onclick="switchView('profile')">
            <i class="bi bi-person-circle"></i><span>Profil</span>
        </div>
    `;
    document.body.appendChild(nav);

    // Klinkt sich in die View-Steuerung ein
    const origSwitchView = window.switchView;
    if (typeof origSwitchView === 'function') {
        window.switchView = function(viewName) {
            origSwitchView(viewName); 
            closeAllMobileSidebars(); // Schließt offene Panels beim Seitenwechsel
            
            if (window.innerWidth <= 768) {
                document.querySelectorAll('.mobile-nav-item').forEach(item => item.classList.remove('active'));
                const activeItem = document.querySelector(`.mobile-nav-item[onclick*="switchView('${viewName}')"]`);
                if(activeItem) activeItem.classList.add('active');
            }
        };
    }
});

// Steuert das Hochfahren der Panels aus der Taskleiste
window.toggleMobileSidebar = function(sidebarId) {
    const sidebar = document.getElementById(sidebarId);
    if (!sidebar) return;
    
    // Verhindert, dass beide Panels gleichzeitig offen sind
    document.querySelectorAll('.online-users-sidebar, .events-sidebar').forEach(el => {
        if (el.id !== sidebarId) el.classList.remove('show');
    });
    
    sidebar.classList.toggle('show');
    
    // Erzwingt ein UI-Update für den Event-Countdown
    if (sidebarId === 'eventsSidebar' && typeof updateEventsCountdownUI === 'function') {
        updateEventsCountdownUI();
    }
};

window.closeAllMobileSidebars = function() {
    document.querySelectorAll('.online-users-sidebar, .events-sidebar').forEach(el => el.classList.remove('show'));
};