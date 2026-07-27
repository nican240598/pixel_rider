<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pixel Rider - Community Web-App</title>
    <!-- Bootstrap 5 CSS & Icons -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
    <!-- Google Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700;800&display=swap" rel="stylesheet">
    <!-- Leaflet.js CSS (Karte) -->
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    
    <!-- Deine eigene CSS Datei -->
    <link rel="stylesheet" href="style.css">
    
    <!-- Supabase Client JS (Echte Cloud Datenbank) -->
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
</head>
<body>

    <!-- DYNAMISCHER HINTERGRUND -->
    <div class="global-bg" id="globalBg"></div>
    <div class="bg-overlay"></div>

    <!-- Header Navigation -->
    <nav class="header-nav">
        <div class="nav-container">
            <a class="nav-brand" onclick="switchView(state.currentUser ? 'dashboard' : 'landing')">PIXEL<span>RIDER</span></a>
            <div id="navLinks" class="d-flex gap-2 align-items-center"></div>
        </div>
    </nav>

    <main class="container">
        <!-- VIEW 1: LANDINGPAGE -->
        <section id="view-landing" class="app-view py-5 text-center">
            <h1 class="display-3 fw-bold text-uppercase mb-3">Pixel Rider</h1>
            <p class="fs-4 text-warning mb-5">„Alleine nur ein unbedeutender Pixel, zusammen eine einzigartige Community“</p>

            <div class="row g-4 justify-content-center mb-5 text-start">
                <div class="col-md-4">
                    <div class="feature-card h-100">
                        <i class="bi bi-people-fill feature-icon"></i>
                        <h4 class="text-white text-uppercase fw-bold">Die Gemeinschaft</h4>
                        <p class="text-light fs-6">Pixel Rider ist eine eingeschworene Crew aus leidenschaftlichen Motorradfahrern.</p>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="feature-card h-100">
                        <i class="bi bi-signpost-2-fill feature-icon"></i>
                        <h4 class="text-white text-uppercase fw-bold">Unsere Ausfahrten</h4>
                        <p class="text-light fs-6">Gemeinsame Tagestouren und Wochenend-Trips.</p>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="feature-card h-100">
                        <i class="bi bi-shield-check feature-icon"></i>
                        <h4 class="text-white text-uppercase fw-bold">Exklusiver Kreis</h4>
                        <p class="text-light fs-6">Der Beitritt erfolgt exklusiv über persönliche Invite-Codes.</p>
                    </div>
                </div>
            </div>
        </section>

        <!-- VIEW 2: MEMBER DASHBOARD -->
        <section id="view-dashboard" class="app-view">
            <h2 class="text-center text-uppercase fw-bold mb-5">Crew-<span>Mitgliederbereich</span></h2>
            
            <div class="row g-4 justify-content-center" id="dashboardGrid">
                <div class="col-md-6 col-lg-3" onclick="switchView('gpx')">
                    <div class="feature-card">
                        <i class="bi bi-map-fill feature-icon"></i>
                        <h4 class="text-white text-uppercase fw-bold">GPX-Ausfahrten</h4>
                        <p class="card-description">Routen entdecken und Tagestouren mit der Crew teilen.</p>
                    </div>
                </div>
                <div class="col-md-6 col-lg-3" onclick="switchView('forum')">
                    <div class="feature-card">
                        <i class="bi bi-chat-quote-fill feature-icon"></i>
                        <h4 class="text-white text-uppercase fw-bold">Wissensaustausch</h4>
                        <p class="card-description">Technische Fragen, Schrauber-Hilfe und Tourentipps im Forum.</p>
                    </div>
                </div>
                <div class="col-md-6 col-lg-3" onclick="switchView('events')">
                    <div class="feature-card">
                        <i class="bi bi-calendar-event-fill feature-icon"></i>
                        <h4 class="text-white text-uppercase fw-bold">Exklusive Events</h4>
                        <p class="card-description">Plane Ausfahrten und trage dich in Teilnehmerlisten ein.</p>
                    </div>
                </div>
                <div class="col-md-6 col-lg-3" onclick="switchView('map')">
                    <div class="feature-card">
                        <i class="bi bi-geo-alt-fill feature-icon"></i>
                        <h4 class="text-white text-uppercase fw-bold">PixelMap</h4>
                        <p class="card-description">Finde andere Pixel Rider in deiner Region.</p>
                    </div>
                </div>
            </div>
        </section>

        <!-- VIEW 3: GPX-AUSFAHRTEN -->
        <section id="view-gpx" class="app-view">
            <div class="content-card">
                <h2 class="text-center text-uppercase fw-bold mb-4 text-warning"><i class="bi bi-map-fill me-2"></i>GPX-Ausfahrten & Routen</h2>
                <div class="text-center mb-4">
                    <button class="btn btn-custom-sub" data-bs-toggle="modal" data-bs-target="#uploadGpxModal"><i class="bi bi-cloud-upload-fill me-1"></i> GPX Tour hochladen</button>
                </div>
                <div class="row g-4 text-start" id="gpxGrid"></div>
                <div class="text-center mt-5"><button class="btn btn-outline-light rounded-pill px-4" onclick="switchView('dashboard')">Zurück zum Dashboard</button></div>
            </div>
        </section>

        <!-- VIEW 4: ADMIN & MODERATOR CENTER -->
        <section id="view-admin" class="app-view">
            <div class="content-card">
                <h2 class="text-center text-uppercase fw-bold mb-2 text-warning"><i class="bi bi-shield-lock-fill me-2"></i>Admin & Moderator Center</h2>
                <ul class="nav nav-tabs admin-nav-tabs justify-content-center mb-4 border-secondary" role="tablist">
                    <li class="nav-item"><button class="nav-link active" data-bs-toggle="tab" data-bs-target="#tab-invites" type="button"><i class="bi bi-key-fill me-1"></i> Invites</button></li>
                    <li class="nav-item" id="admin-tab-users"><button class="nav-link" data-bs-toggle="tab" data-bs-target="#tab-users" type="button"><i class="bi bi-people-fill me-1"></i> User & Rechte</button></li>
                </ul>
                <div class="tab-content text-start">
                    <div class="tab-pane fade show active" id="tab-invites">
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <h4 class="text-uppercase text-warning fw-bold mb-0">Aktive Invite-Codes</h4>
                            <button class="btn btn-custom-sub" onclick="generateNewInviteCode()"><i class="bi bi-plus-circle-fill me-1"></i> Code Generieren</button>
                        </div>
                        <div class="table-responsive"><table class="table table-custom-glass align-middle"><thead><tr class="text-uppercase small"><th>Code</th><th>Erstellt von</th><th>Status / Benutzt von</th><th class="text-end">Aktion</th></tr></thead><tbody id="invitesTableBody"></tbody></table></div>
                    </div>
                    <div class="tab-pane fade" id="tab-users">
                        <h4 class="text-uppercase text-warning fw-bold mb-3">Mitglieder-Übersicht</h4>
                        <div class="table-responsive"><table class="table table-custom-glass align-middle"><thead><tr class="text-uppercase small"><th>Username</th><th>Rolle</th><th>Invite</th><th>Status</th><th class="text-end">Aktion / Rolle ändern</th></tr></thead><tbody id="usersTableBody"></tbody></table></div>
                    </div>
                </div>
                <div class="text-center mt-5"><button class="btn btn-outline-light rounded-pill px-4" onclick="switchView('dashboard')">Zurück zum Dashboard</button></div>
            </div>
        </section>

        <!-- VIEW 5: EVENTS -->
        <section id="view-events" class="app-view">
            <div class="content-card">
                <h2 class="text-center text-uppercase fw-bold mb-4 text-warning">Exklusive Crew-Events</h2>
                <div class="text-center mb-4">
                    <button class="btn btn-custom-sub" data-bs-toggle="modal" data-bs-target="#createEventModal"><i class="bi bi-calendar-plus me-1"></i> Event planen</button>
                </div>
                <div class="row g-4 text-start" id="eventsGrid"></div>
                <div class="text-center mt-5"><button class="btn btn-outline-light rounded-pill px-4" onclick="switchView('dashboard')">Zurück zum Dashboard</button></div>
            </div>
        </section>

        <!-- VIEW 6: FORUM -->
        <section id="view-forum" class="app-view">
            <div class="content-card">
                <h2 class="text-center text-uppercase fw-bold mb-4 text-warning">Wissensaustausch & Forum</h2>
                <div class="row g-4">
                    <div class="col-lg-3">
                        <div class="category-sidebar">
                            <button class="btn btn-custom-sub w-100 mb-4" data-bs-toggle="modal" data-bs-target="#createTopicModal"><i class="bi bi-chat-dots-fill me-1"></i> Neues Thema</button>
                            <div class="category-title">Kategorien</div>
                            <ul class="category-list">
                                <li class="category-item active" onclick="filterForumCat('all', this)">Alle Beiträge</li>
                                <li class="category-item" onclick="filterForumCat('Schrauber-Ecke', this)">Schrauber-Ecke</li>
                                <li class="category-item" onclick="filterForumCat('Fahrtechnik', this)">Fahrtechnik</li>
                                <li class="category-item" onclick="filterForumCat('Allgemeines', this)">Allgemeines</li>
                            </ul>
                        </div>
                    </div>
                    <div class="col-lg-9 text-start">
                        <div id="forumGrid"></div>
                    </div>
                </div>
                <div class="text-center mt-5"><button class="btn btn-outline-light rounded-pill px-4" onclick="switchView('dashboard')">Zurück zum Dashboard</button></div>
            </div>
        </section>

        <!-- VIEW 7: MAP -->
        <section id="view-map" class="app-view">
            <div class="content-card">
                <h2 class="text-center text-uppercase fw-bold mb-4 text-warning">PixelMap</h2>
                <div class="row g-4">
                    <div class="col-lg-4">
                        <div class="map-sidebar text-start">
                            <h5 class="text-uppercase text-warning fw-bold mb-3">Mein Standort</h5>
                            <form id="mapForm">
                                <div class="mb-3">
                                    <label class="label-custom">Wohnort / Stadt *</label>
                                    <input type="text" class="input-custom" id="mapCity" required placeholder="z. B. Karlsruhe">
                                </div>
                                <div class="mb-3" id="bikeInputsContainer">
                                    <!-- Inputs werden dynamisch durch JS geladen -->
                                </div>
                                <button type="button" class="btn btn-outline-secondary btn-sm w-100 mb-3 text-white" id="addBikeBtn" onclick="addBikeInput()">+ Weiteres Bike hinzufügen</button>
                                <button type="submit" class="btn-custom-sub w-100" id="mapSubmitBtn"><i class="bi bi-geo-alt-fill"></i> Pin Speichern</button>
                            </form>

                            <hr class="border-secondary my-4">

                            <h5 class="text-uppercase text-warning fw-bold mb-3">Rider im Umkreis</h5>
                            <div class="mb-3">
                                <label class="label-custom">Radius: <span id="radiusValue" class="text-white">50</span> km</label>
                                <input type="range" class="form-range" id="radiusSlider" min="10" max="100" step="10" value="50" oninput="document.getElementById('radiusValue').innerText = this.value">
                            </div>
                            <button class="btn btn-outline-warning w-100 rounded-pill fw-bold" onclick="filterMapByRadius()"><i class="bi bi-search"></i> Suchen</button>
                        </div>
                    </div>
                    <div class="col-lg-8">
                        <div id="map"></div>
                    </div>
                </div>
                <div class="text-center mt-5"><button class="btn btn-outline-light rounded-pill px-4" onclick="switchView('dashboard')">Zurück zum Dashboard</button></div>
            </div>
        </section>
    </main>

    <!-- MODAL: LOGIN / REGISTRIEREN -->
    <div class="modal fade" id="authModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content bg-dark text-white border border-purple rounded-4" style="background: rgba(9, 9, 11, 0.98) !important;">
                <div class="modal-header border-bottom border-secondary">
                    <h5 class="modal-title text-warning fw-bold text-uppercase">Crew Login & Registrieren</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body text-start p-4">
                    <ul class="nav nav-tabs landing-nav-tabs justify-content-center mb-4 border-secondary" role="tablist">
                        <li class="nav-item"><button class="nav-link active" data-bs-toggle="tab" data-bs-target="#modal-login" type="button">Login</button></li>
                        <li class="nav-item"><button class="nav-link" data-bs-toggle="tab" data-bs-target="#modal-register" type="button">Registrieren</button></li>
                    </ul>
                    <div class="tab-content">
                        <!-- LOGIN -->
                        <div class="tab-pane fade show active" id="modal-login">
                            <form id="modalLoginForm">
                                <div class="mb-3"><label class="label-custom">Username / E-Mail</label><input type="text" id="modalLoginUser" class="input-custom" required></div>
                                <div class="mb-2"><label class="label-custom">Passwort</label><input type="password" id="modalLoginPass" class="input-custom" required></div>
                                <div class="text-end mb-3 mt-1">
                                    <a href="#" class="text-purple-glow small text-decoration-none fw-bold" data-bs-dismiss="modal" data-bs-toggle="modal" data-bs-target="#forgotPasswordModal">Passwort vergessen?</a>
                                </div>
                                <button type="submit" class="btn btn-custom-sub w-100 py-2">Einloggen</button>
                            </form>
                        </div>
                        <!-- REGISTER -->
                        <div class="tab-pane fade" id="modal-register">
                            <form id="modalRegisterForm">
                                <div class="mb-3"><label class="label-custom">Username</label><input type="text" id="modalRegUser" class="input-custom" required></div>
                                <div class="mb-3"><label class="label-custom">E-Mail</label><input type="email" id="modalRegEmail" class="input-custom" required></div>
                                <div class="mb-3"><label class="label-custom">Passwort</label><input type="password" id="modalRegPass" class="input-custom" required minlength="6"></div>
                                <div class="mb-4">
                                    <label class="label-custom d-flex align-items-center">
                                        Invite-Code
                                        <i class="bi bi-question-circle-fill text-warning ms-2" style="cursor: pointer;" onclick="toggleInviteHelp()" title="Woher bekomme ich einen Code?"></i>
                                    </label>
                                    <input type="text" id="modalRegInvite" class="input-custom text-uppercase" required placeholder="Hier Invite Code eintragen">
                                    <div id="inviteHelpText" class="small text-light mt-2 d-none p-3 rounded border border-secondary" style="background: rgba(10, 10, 12, 0.8);"></div>
                                </div>
                                <button type="submit" class="btn btn-custom-sub w-100 py-2">Konto Erstellen</button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- MODAL: PASSWORT VERGESSEN ANFRAGE -->
    <div class="modal fade" id="forgotPasswordModal" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content bg-dark text-white border border-purple rounded-4 p-4" style="background: rgba(9, 9, 11, 0.98) !important;">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h5 class="text-warning fw-bold text-uppercase mb-0">Passwort zurücksetzen</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <p class="text-light small mb-4">Gib deinen Usernamen ein. Ein Admin wird benachrichtigt und setzt dein Passwort in Kürze auf "1234" zurück.</p>
                <form id="forgotPasswordForm">
                    <div class="mb-4"><label class="label-custom">Username</label><input type="text" id="forgotPassUser" class="input-custom" required></div>
                    <button type="submit" class="btn btn-custom-sub w-100">Reset anfordern</button>
                </form>
                <div class="text-center mt-4">
                    <button class="btn btn-sm btn-outline-light rounded-pill" data-bs-dismiss="modal" data-bs-toggle="modal" data-bs-target="#authModal"><i class="bi bi-arrow-left"></i> Zurück zum Login</button>
                </div>
            </div>
        </div>
    </div>

    <!-- MODAL: ERFOLGREICHE RESET ANFRAGE (USER) -->
    <div class="modal fade" id="successRequestUserModal" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content bg-dark text-white p-4 border border-success rounded-4 text-center">
                <i class="bi bi-check-circle-fill text-success mb-2" style="font-size: 3.5rem; text-shadow: 0 0 15px rgba(25, 135, 84, 0.5);"></i>
                <h4 class="text-success fw-bold text-uppercase mt-2">Anfrage gesendet!</h4>
                <p class="mb-4 mt-3">Ein Admin wurde benachrichtigt. Dein Passwort wird in Kürze zurückgesetzt. Versuche dich später mit dem Passwort <b class="text-warning">1234</b> einzuloggen.</p>
                <button type="button" class="btn btn-success rounded-pill px-4 fw-bold shadow-lg w-100" data-bs-dismiss="modal">Verstanden</button>
            </div>
        </div>
    </div>

    <!-- MODAL: PASSWORT RESET ANFRAGEN (FÜR ADMINS) -->
    <div class="modal fade" id="passwordResetsModal" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content bg-dark text-white p-4 border border-warning rounded-4">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h5 class="text-warning fw-bold text-uppercase mb-0"><i class="bi bi-bell-fill me-2 text-danger"></i>Passwort Reset Anfragen</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <p class="text-light small mb-3">Hier siehst du alle Mitglieder, die ein neues Passwort angefordert haben:</p>
                <div id="passwordResetsList" class="vstack gap-3 text-start">
                    <!-- Wird dynamisch gefüllt -->
                </div>
                <div class="text-center mt-4">
                    <button class="btn btn-outline-light rounded-pill px-4" data-bs-dismiss="modal">Schließen & zum Dashboard</button>
                </div>
            </div>
        </div>
    </div>

    <!-- MODAL: RESET BESTÄTIGEN (ADMIN SICHERHEITSABFRAGE) -->
    <div class="modal fade" id="confirmResetModal" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content bg-dark text-white p-4 border border-warning rounded-4 text-center">
                <i class="bi bi-key-fill text-warning mb-2" style="font-size: 3.5rem; text-shadow: 0 0 15px rgba(255, 193, 7, 0.5);"></i>
                <h4 class="text-warning fw-bold text-uppercase mt-2">Passwort zurücksetzen?</h4>
                <p class="mb-4 mt-3" id="confirmResetText"></p>
                <div class="d-flex gap-3 justify-content-center">
                    <button type="button" class="btn btn-outline-light rounded-pill px-4" data-bs-dismiss="modal">Abbrechen</button>
                    <button type="button" class="btn btn-warning rounded-pill px-4 fw-bold shadow-lg" onclick="executeResetPassword()">Ja, zurücksetzen</button>
                </div>
            </div>
        </div>
    </div>

    <!-- MODAL: ERFOLGREICH ZURÜCKGESETZT (ADMIN) -->
    <div class="modal fade" id="successResetAdminModal" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content bg-dark text-white p-4 border border-success rounded-4 text-center">
                <i class="bi bi-check-circle-fill text-success mb-2" style="font-size: 3.5rem; text-shadow: 0 0 15px rgba(25, 135, 84, 0.5);"></i>
                <h4 class="text-success fw-bold text-uppercase mt-2">Passwort zurückgesetzt</h4>
                <p class="mb-4 mt-3" id="successResetAdminText"></p>
                <button type="button" class="btn btn-success rounded-pill px-4 fw-bold shadow-lg w-100" data-bs-dismiss="modal">Okay</button>
            </div>
        </div>
    </div>

    <!-- MODAL: GPX TOUR HOCHLADEN -->
    <div class="modal fade" id="uploadGpxModal" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content bg-dark text-white p-4 border border-purple rounded-4">
                <form id="gpxUploadForm">
                    <h5 class="text-warning fw-bold mb-3">GPX-Ausfahrt Hochladen</h5>
                    <div class="mb-3"><input type="text" class="input-custom" id="gpxTitle" placeholder="Titel der Tour *" required></div>
                    <div class="mb-3"><input type="number" step="0.1" class="input-custom" id="gpxDistance" placeholder="Ungefähre Streckenlänge in km *" required></div>
                    <div class="mb-4">
                        <label class="label-custom">GPX-Datei (*.gpx) *</label>
                        <input type="file" class="input-custom" id="gpxFileInput" accept=".gpx" required>
                    </div>
                    <button type="submit" class="btn btn-custom-sub w-100">Tour Veröffentlichen</button>
                </form>
            </div>
        </div>
    </div>

    <!-- MODAL: GPX TOUR BEARBEITEN -->
    <div class="modal fade" id="editGpxModal" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content bg-dark text-white p-4 border border-warning rounded-4">
                <form id="editGpxForm">
                    <h5 class="text-warning fw-bold mb-3">GPX-Tour bearbeiten</h5>
                    <div class="mb-3"><input type="text" class="input-custom" id="editGpxTitle" placeholder="Titel der Tour *" required></div>
                    <div class="mb-3"><input type="number" step="0.1" class="input-custom" id="editGpxDistance" placeholder="Streckenlänge in km *" required></div>
                    <div class="mb-4">
                        <label class="label-custom">Neue GPX-Datei (Optional - lässt alte Route bestehen falls leer)</label>
                        <input type="file" class="input-custom" id="editGpxFileInput" accept=".gpx">
                    </div>
                    <button type="submit" class="btn btn-warning w-100 fw-bold">Änderungen Speichern</button>
                </form>
            </div>
        </div>
    </div>

    <!-- MODAL: GPX TOUR VORSCHAU -->
    <div class="modal fade" id="gpxPreviewModal" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered modal-lg">
            <div class="modal-content bg-dark text-white p-4 border border-warning rounded-4">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h5 class="text-warning fw-bold text-uppercase mb-0" id="gpxModalTitle">Tour Vorschau</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <div class="row g-2 mb-3">
                    <div class="col-md-4"><p class="text-light mb-0"><b>Ersteller:</b> <span id="gpxModalCreator" class="text-warning"></span></p></div>
                    <div class="col-md-4"><p class="text-light mb-0"><b>Streckenlänge:</b> <span id="gpxModalDistance" class="text-warning"></span> km</p></div>
                    <div class="col-md-4"><p class="text-light mb-0"><i class="bi bi-geo-alt-fill text-danger"></i> <span id="gpxModalUserDistance" class="text-purple-glow fw-bold">Berechne Entfernung...</span></p></div>
                </div>
                <div id="gpxPreviewMap" style="height: 320px; width: 100%; border-radius: 14px; border: 2px solid var(--brand-purple);" class="mb-3"></div>
                <div class="text-center">
                    <button class="btn btn-custom-sub px-4" onclick="downloadCurrentGpx()"><i class="bi bi-download me-2"></i> GPX-Datei herunterladen</button>
                </div>
            </div>
        </div>
    </div>

    <!-- MODAL: NEUES THEMA (Forum) -->
    <div class="modal fade" id="createTopicModal" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content bg-dark text-white p-4 border border-purple rounded-4">
                <form id="topicForm">
                    <h5 class="text-warning fw-bold mb-3">Neues Thema</h5>
                    <div class="mb-3">
                        <select class="input-custom bg-dark text-white" id="topicCat">
                            <option value="Schrauber-Ecke">Schrauber-Ecke</option>
                            <option value="Fahrtechnik">Fahrtechnik</option>
                            <option value="Allgemeines">Allgemeines</option>
                        </select>
                    </div>
                    <div class="mb-3"><input type="text" class="input-custom" id="topicTitle" placeholder="Titel / Frage" required></div>
                    <div class="mb-3"><textarea class="input-custom" id="topicContent" rows="3" placeholder="Beitrag..." required></textarea></div>
                    <button type="submit" class="btn btn-custom-sub w-100">Veröffentlichen</button>
                </form>
            </div>
        </div>
    </div>

    <!-- MODAL: THEMA BEARBEITEN (NEU) -->
    <div class="modal fade" id="editTopicModal" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content bg-dark text-white p-4 border border-warning rounded-4">
                <form id="editTopicForm">
                    <h5 class="text-warning fw-bold mb-3">Beitrag bearbeiten</h5>
                    <div class="mb-3">
                        <select class="input-custom bg-dark text-white" id="editTopicCat">
                            <option value="Schrauber-Ecke">Schrauber-Ecke</option>
                            <option value="Fahrtechnik">Fahrtechnik</option>
                            <option value="Allgemeines">Allgemeines</option>
                        </select>
                    </div>
                    <div class="mb-3"><input type="text" class="input-custom" id="editTopicTitle" placeholder="Titel / Frage" required></div>
                    <div class="mb-3"><textarea class="input-custom" id="editTopicContent" rows="3" placeholder="Beitrag..." required></textarea></div>
                    <button type="submit" class="btn btn-warning w-100 fw-bold">Änderungen Speichern</button>
                </form>
            </div>
        </div>
    </div>

    <!-- MODAL: CHAT (Forum Antworten) -->
    <div class="modal fade" id="chatTopicModal" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered modal-lg">
            <div class="modal-content chat-modal-content text-white p-3">
                <div class="modal-header border-bottom border-secondary">
                    <h5 id="chatModalTitle" class="modal-title text-warning fw-bold"></h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <div class="chat-body-container" id="chatMessageList"></div>
                    <div class="mt-3 d-flex gap-2">
                        <input type="text" class="input-custom" id="chatInputText" placeholder="Nachricht schreiben..." onkeypress="if(event.key==='Enter') sendChatMessage()">
                        <button class="btn btn-custom-sub px-4" onclick="sendChatMessage()"><i class="bi bi-send-fill"></i></button>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- MODAL: PASSWORT ÄNDERN -->
    <div class="modal fade" id="changePasswordModal" data-bs-backdrop="static" data-bs-keyboard="false" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content bg-dark text-white border border-warning rounded-4 p-4" style="background: rgba(9, 9, 11, 0.99) !important;">
                <h5 class="text-warning fw-bold text-uppercase mb-3">Sicherheits-Update</h5>
                <p class="text-purple-glow small mb-3">Bitte ändere jetzt dein Standard-Passwort.</p>
                <form id="changePasswordForm">
                    <div class="mb-3"><label class="label-custom">Neues Passwort *</label><input type="password" id="newPassInput" class="input-custom" required minlength="6"></div>
                    <button type="submit" class="btn btn-custom-sub w-100">Passwort Speichern</button>
                </form>
            </div>
        </div>
    </div>

    <!-- MODAL: PIN FEHLT -->
    <div class="modal fade" id="missingPinModal" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content bg-dark text-white p-4 border border-warning rounded-4 text-center">
                <i class="bi bi-geo-alt-fill text-warning mb-2" style="font-size: 3.5rem;"></i>
                <h4 class="text-warning fw-bold text-uppercase mt-2">Dein Pin fehlt!</h4>
                <p class="mb-4 mt-3">Du hast dich noch nicht auf der PixelMap eingetragen. Setze jetzt deinen Standort und dein(e) Bike(s), um von anderen Ridern aus der Crew gefunden zu werden!</p>
                <button type="button" class="btn btn-custom-sub w-100" data-bs-dismiss="modal">Jetzt eintragen</button>
            </div>
        </div>
    </div>
    
    <!-- MODAL: LÖSCHEN BESTÄTIGEN -->
    <div class="modal fade" id="confirmDeleteModal" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content bg-dark text-white p-4 border border-danger rounded-4 text-center">
                <i class="bi bi-exclamation-octagon-fill text-danger mb-2" style="font-size: 3.5rem; text-shadow: 0 0 15px rgba(220,53,69,0.5);"></i>
                <h4 class="text-danger fw-bold text-uppercase mt-2">Account löschen?</h4>
                <p class="mb-4 mt-3" id="confirmDeleteText"></p>
                <div class="d-flex gap-3 justify-content-center">
                    <button type="button" class="btn btn-outline-light rounded-pill px-4" data-bs-dismiss="modal">Abbrechen</button>
                    <button type="button" class="btn btn-danger rounded-pill px-4 fw-bold shadow-lg" onclick="executeDeleteUser()">Ja, endgültig löschen</button>
                </div>
            </div>
        </div>
    </div>

    <!-- MODAL: EVENT PLANEN -->
    <div class="modal fade" id="createEventModal" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content bg-dark text-white p-4 border border-purple rounded-4">
                <form id="eventForm">
                    <h5 class="text-warning fw-bold mb-3">Event planen</h5>
                    <div class="mb-3"><input type="text" class="input-custom" id="eventTitle" placeholder="Event Titel" required></div>
                    <div class="mb-3"><input type="text" class="input-custom" id="eventOrganizer" placeholder="Organisator (Orga)" required></div>
                    <div class="mb-3"><input type="datetime-local" class="input-custom" id="eventDateTime" required></div>
                    <div class="mb-3"><input type="text" class="input-custom" id="eventLocation" placeholder="Treffpunkt (Optional)"></div>
                    <div class="mb-4">
                        <label class="label-custom">Event Bild (Optional, max. 1 MB)</label>
                        <input type="file" class="input-custom" id="eventImage" accept="image/*">
                    </div>
                    <button type="submit" class="btn btn-custom-sub w-100">Event Erstellen</button>
                </form>
            </div>
        </div>
    </div>

    <!-- MODAL: EVENT BEARBEITEN -->
    <div class="modal fade" id="editEventModal" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content bg-dark text-white p-4 border border-warning rounded-4">
                <form id="editEventForm">
                    <h5 class="text-warning fw-bold mb-3">Event bearbeiten</h5>
                    <div class="mb-3"><input type="text" class="input-custom" id="editEventTitle" placeholder="Event Titel" required></div>
                    <div class="mb-3"><input type="text" class="input-custom" id="editEventOrganizer" placeholder="Organisator (Orga)" required></div>
                    <div class="mb-3"><input type="datetime-local" class="input-custom" id="editEventDateTime" required></div>
                    <div class="mb-3"><input type="text" class="input-custom" id="editEventLocation" placeholder="Treffpunkt (Optional)"></div>
                    <div class="mb-4">
                        <label class="label-custom">Neues Bild (Optional, max. 1 MB - Lässt altes Bild bestehen falls leer)</label>
                        <input type="file" class="input-custom" id="editEventImage" accept="image/*">
                    </div>
                    <button type="submit" class="btn btn-warning w-100 fw-bold">Änderungen Speichern</button>
                </form>
            </div>
        </div>
    </div>

    <!-- MODAL: BESTER TREFFPUNKT KARTE -->
    <div class="modal fade" id="bestMeetingPointModal" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered modal-lg">
            <div class="modal-content bg-dark text-white p-4 border border-warning rounded-4">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h5 class="text-warning fw-bold text-uppercase mb-0"><i class="bi bi-geo-alt-fill"></i> Bester Treffpunkt</h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                </div>
                <p class="text-light mb-2">Die berechnete geographische Mitte aller angemeldeten Teilnehmer liegt ungefähr in:</p>
                <h3 class="text-purple-glow text-uppercase mb-3" id="meetingPointCityName">Wird berechnet...</h3>
                <div id="meetingMap" style="height: 350px; width: 100%; border-radius: 18px; border: 2px solid var(--brand-purple);"></div>
                <p class="small text-muted mt-3 mb-0">* Der markierte Bereich zeigt eine Toleranz von +- 15km an. Einigt euch im Forum auf einen genauen Treffpunkt innerhalb dieser Region.</p>
            </div>
        </div>
    </div>

    <footer><p class="text-purple-glow mb-0 small">&copy; 2026 Pixel Rider. Web-App Version 2.0</p></footer>

    <!-- Bootstrap & Leaflet JS -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    
    <!-- Deine eigene JavaScript Datei -->
    <script src="app.js"></script>
</body>
</html>
