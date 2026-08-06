document.addEventListener('DOMContentLoaded', () => {
    // Verhindert doppeltes Ausführen
    if (document.getElementById('mobileBottomNav')) return;

    // Erstelle die Bottom Navigation
    const nav = document.createElement('div');
    nav.id = 'mobileBottomNav';
    nav.className = 'mobile-bottom-nav d-md-none';
    nav.innerHTML = `
        <div class="mobile-nav-item active" onclick="switchView('dashboard')">
            <i class="bi bi-house-door-fill"></i><span>Home</span>
        </div>
        <div class="mobile-nav-item" onclick="switchView('map')">
            <i class="bi bi-geo-alt-fill"></i><span>Map</span>
        </div>
        <div class="mobile-nav-item" onclick="switchView('events')">
            <i class="bi bi-calendar-event-fill"></i><span>Events</span>
        </div>
        <div class="mobile-nav-item" onclick="switchView('forum')">
            <i class="bi bi-chat-quote-fill"></i><span>Forum</span>
        </div>
        <div class="mobile-nav-item" onclick="switchView('profile')">
            <i class="bi bi-person-circle"></i><span>Profil</span>
        </div>
    `;
    document.body.appendChild(nav);

    // Klinkt sich in die bestehende View-Steuerung ein, um das goldene Icon zu verschieben
    const origSwitchView = window.switchView;
    if (typeof origSwitchView === 'function') {
        window.switchView = function(viewName) {
            origSwitchView(viewName); // Führt dein normales app.js Skript aus
            
            if (window.innerWidth <= 768) {
                // Setze alle Icons auf grau
                document.querySelectorAll('.mobile-nav-item').forEach(item => {
                    item.classList.remove('active');
                });
                // Setze das aktive Icon auf Gold
                const activeItem = document.querySelector(`.mobile-nav-item[onclick*="'${viewName}'"]`);
                if(activeItem) activeItem.classList.add('active');
            }
        };
    }
});