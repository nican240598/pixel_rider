/**
 * Liest die bestehenden Desktop-Events aus und baut daraus das Mobile Card-Layout.
 * Das Desktop-Layout wird dabei nicht verändert, sondern nur visuell versteckt.
 */
function transformEventsToCards() {
    const eventsView = document.getElementById('view-events');
    // Abbrechen, wenn wir nicht im Events-Tab sind oder auf dem Desktop sind
    if (!eventsView || window.innerWidth > 768) return;

    // Verhindern, dass die Mobile-Ansicht doppelt generiert wird
    if (document.getElementById('mobileEventsContainer')) return;

    // 1. DESKTOP-ANSICHT VERSTECKEN (Der Schutz für dein bestehendes Design)
    // Wir suchen das Element, das deine Desktop-Ansicht hält (z.B. eine Tabelle oder row)
    const desktopContent = eventsView.querySelector('.table, .row, table');
    if (desktopContent) {
        // d-none = auf Mobile weg | d-md-flex / d-md-table = auf PC wieder da
        desktopContent.classList.add('d-none', 'd-md-block'); 
    }

    // 2. MOBILE-CONTAINER ERSTELLEN
    const mobileContainer = document.createElement('div');
    mobileContainer.id = 'mobileEventsContainer';
    mobileContainer.className = 'd-md-none mt-3 pb-5';

    // 3. FILTER-PILLS INJIZIEREN
    mobileContainer.innerHTML += `
        <div class="mobile-event-pills mb-3">
            <div class="event-pill active">Alle Touren</div>
            <div class="event-pill">Meine Zusagen</div>
            <div class="event-pill">Vergangene</div>
        </div>
    `;

    // 4. KARTEN AUS DESKTOP-DATEN GENERIEREN
    // Wir suchen alle Event-Einträge aus deiner bestehenden Desktop-Ansicht (Karten oder Tabellenzeilen)
    const desktopItems = eventsView.querySelectorAll('.card, tbody tr');
    const cardsWrapper = document.createElement('div');

    desktopItems.forEach(item => {
        // Bestehende Onclick-Aktion (für dein Modal) sicherstellen
        const onClickAttr = item.getAttribute('onclick') || '';
        
        // Texte auslesen (Fallback-Texte, falls die Struktur leicht abweicht)
        // Du kannst die Selektoren anpassen, je nachdem in welchen Tags deine Desktop-Texte liegen
        const title = item.querySelector('h1, h2, h3, h4, h5, .title, td:nth-child(1)')?.innerText || 'Community Tour';
        const date = item.querySelector('.date, td:nth-child(2)')?.innerText || 'Demnächst';
        const location = item.querySelector('.location, td:nth-child(3)')?.innerText || 'Treffpunkt in der App';

        const card = document.createElement('div');
        card.className = 'mobile-event-card';
        // Wenn man auf die Karte klickt, öffnet sich das bestehende Bottom-Sheet Modal
        card.setAttribute('onclick', onClickAttr); 
        
        card.innerHTML = `
            <div class="event-card-header d-flex justify-content-between">
                <strong><i class="bi bi-calendar-event me-2"></i>${date}</strong>
                <span><i class="bi bi-clock me-1"></i>TBA</span>
            </div>
            <div class="event-card-body">
                <h4>${title}</h4>
                <div class="event-card-info">
                    <i class="bi bi-geo-alt"></i> ${location}
                </div>
                <div class="event-card-info">
                    <i class="bi bi-signpost-split"></i> GPX Route verfügbar
                </div>
            </div>
            <div class="event-card-footer" onclick="event.stopPropagation(); /* Verhindert, dass Modal öffnet beim Klick auf Button */">
                <div class="small text-muted"><i class="bi bi-people-fill me-1"></i> 👤 Crew dabei</div>
                <button class="btn-event-join">DABEI</button>
            </div>
        `;
        cardsWrapper.appendChild(card);
    });

    mobileContainer.appendChild(cardsWrapper);

    // 5. SCHWEBENDEN PLUS-BUTTON (FAB) HINZUFÜGEN
    // Füge bei onclick einfach die ID deines bestehenden Modals zum Erstellen von Events ein
    mobileContainer.innerHTML += `
        <div class="mobile-fab" data-bs-toggle="modal" data-bs-target="#deinEventErstellenModalID">
            <i class="bi bi-plus-lg"></i>
        </div>
    `;

    // Den fertigen Mobile-Block in die View einhängen
    eventsView.appendChild(mobileContainer);
}