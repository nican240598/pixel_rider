/* =========================================
   10. FLOHMARKT (MARKETPLACE) MODUL
   ========================================= */

let currentMarketCat = 'all';
let allMarketItems = [];
let activeEditMarketId = null;
let marketNewImagesToAdd = [];
let marketExistingImages = [];
let pendingMarketModerationAction = null; // { type: 'edit'|'delete', itemId, author }

function toggleMarketLinks(category, formPrefix) {
    const mobileWrap = document.getElementById(formPrefix + 'MarketMobileWrap');
    if (mobileWrap) {
        if (category === 'Fahrzeug') {
            mobileWrap.style.display = 'block';
        } else {
            mobileWrap.style.display = 'none';
            document.getElementById(formPrefix + 'MarketMobile').value = '';
        }
    }
}

function parseMarketImages(imgStr) {
    if (!imgStr) return [];
    try {
        const parsed = JSON.parse(imgStr);
        if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch(e) {}
    return [];
}

// UPLOAD INSERAT
document.getElementById('createMarketForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    const btn = this.querySelector('[type="submit"]');
    btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Lade hoch...';

    const title = document.getElementById('marketTitle').value.trim();
    const price = document.getElementById('marketPrice').value;
    const cat = document.getElementById('marketCategory').value;
    const desc = document.getElementById('marketDesc').value.trim();
    
    const lEbay = document.getElementById('marketEbay').value.trim() || null;
    const lKlein = document.getElementById('marketKleinanzeigen').value.trim() || null;
    const lFb = document.getElementById('marketFb').value.trim() || null;
    const lMob = document.getElementById('marketMobile').value.trim() || null;

    const fileInput = document.getElementById('marketImages');
    if (fileInput.files.length < 5) {
        showCustomAlert('Du musst mindestens 5 Bilder hochladen!', 'Bilder fehlen', 'warning');
        btn.disabled = false; btn.innerHTML = 'Inserat veröffentlichen';
        return;
    }

    const files = Array.from(fileInput.files).slice(0, 10);
    const tooBig = files.find(f => f.size > 2 * 1024 * 1024);
    if (tooBig) {
        showCustomAlert(`"` + tooBig.name + `" ist zu groß! Bitte max. 2 MB pro Bild.`, "Fehler", "warning");
        btn.disabled = false; btn.innerHTML = 'Inserat veröffentlichen';
        return;
    }

    let imgDataArray = [];
    try {
        for (const file of files) {
            const base64 = await new Promise((res, rej) => {
                const r = new FileReader(); r.readAsDataURL(file);
                r.onload = () => res(r.result); r.onerror = rej;
            });
            imgDataArray.push(base64);
        }
    } catch(err) {
        showCustomAlert('Fehler beim Bilder lesen.', 'Fehler', 'danger');
        btn.disabled = false; btn.innerHTML = 'Inserat veröffentlichen';
        return;
    }

    const { error } = await db.from('market_items').insert([{
        author: state.currentUser.username,
        item_name: title,
        price: parseFloat(price),
        category: cat,
        description: desc,
        images: JSON.stringify(imgDataArray),
        link_ebay: lEbay,
        link_kleinanzeigen: lKlein,
        link_facebook: lFb,
        link_mobile: lMob
    }]);

    btn.disabled = false; btn.innerHTML = 'Inserat veröffentlichen';

    if (error) {
        showCustomAlert('Fehler beim Speichern.', 'Fehler', 'danger');
    } else {
        this.reset();
        hideModal('createMarketModal');
        showCustomAlert('Dein Inserat ist online!', 'Erfolg', 'success');
        renderMarket();
    }
});

// RENDER MARKET
async function renderMarket() {
    const grid = document.getElementById('marketGrid');
    if (!grid) return;
    grid.innerHTML = '<div class="col-12 text-center py-5"><div class="spinner-border text-warning"></div></div>';

    let query = db.from('market_items').select('*').eq('is_deleted', false);
    if (currentMarketCat !== 'all') {
        query = query.eq('category', currentMarketCat);
    }
    
    let { data: items, error } = await query;
    if (error) { grid.innerHTML = '<p class="text-danger">Fehler beim Laden.</p>'; return; }

    allMarketItems = items || [];
    
    if (allMarketItems.length === 0) {
        grid.innerHTML = '<div class="col-12 text-center py-5 text-muted">Keine Inserate in dieser Kategorie.</div>';
        return;
    }

    let { data: users } = await db.from('users').select('username, social_ig, social_tiktok, social_youtube');
    const userMap = {};
    (users || []).forEach(u => userMap[u.username] = u);
    const getSocials = (uName) => {
        const p = userMap[uName];
        if(!p) return '';
        let html = '<span class="ms-2" style="font-size:0.8rem;">';
        if (p.social_ig) html += `<a href="https://instagram.com/`+p.social_ig+`" target="_blank" onclick="event.stopPropagation();" class="text-danger mx-1"><i class="bi bi-instagram"></i></a>`;
        if (p.social_tiktok) html += `<a href="https://tiktok.com/@`+p.social_tiktok+`" target="_blank" onclick="event.stopPropagation();" class="text-light mx-1"><i class="bi bi-tiktok"></i></a>`;
        if (p.social_youtube) html += `<a href="https://youtube.com/@`+p.social_youtube+`" target="_blank" onclick="event.stopPropagation();" class="text-danger mx-1"><i class="bi bi-youtube"></i></a>`;
        html += `</span>`;
        return html;
    };

    grid.innerHTML = allMarketItems.map(item => {
        const imgs = parseMarketImages(item.images);
        const cover = imgs[0] || '';
        const isOwner = state.currentUser.username === item.author;
        const isMod = state.currentUser.isAdmin || state.currentUser.isModerator;

        let controlsHtml = '';
        if (isOwner) {
            controlsHtml = `
                <div class="garage-card-actions">
                    <button class="garage-action-btn edit" onclick="event.stopPropagation(); openMarketEditModal('`+item.id+`')"><i class="bi bi-pencil-fill"></i> Bearbeiten</button>
                    <button class="garage-action-btn delete" onclick="event.stopPropagation(); deleteMarketItem('`+item.id+`')"><i class="bi bi-trash-fill"></i> Löschen</button>
                </div>`;
        } else if (isMod) {
            controlsHtml = `
                <div class="garage-card-actions">
                    <button class="garage-action-btn mod-edit" onclick="event.stopPropagation(); promptMarketMod('edit', '`+item.id+`', '`+item.author+`')"><i class="bi bi-shield-exclamation"></i> Mod Bearbeiten</button>
                    <button class="garage-action-btn mod-delete" onclick="event.stopPropagation(); promptMarketMod('delete', '`+item.id+`', '`+item.author+`')"><i class="bi bi-shield-x"></i> Mod Löschen</button>
                </div>`;
        }

        return `
        <div class="col-sm-6 col-xl-4">
            <div class="market-card" onclick="openMarketPreview('`+item.id+`')">
                <div class="market-card-img-wrap">
                    ` + (cover ? `<img src="`+cover+`" class="market-card-img">` : `<div class="market-card-img text-center pt-5 bg-dark"><i class="bi bi-camera"></i></div>`) + `
                    <span class="market-cat-badge">`+item.category+`</span>
                    <span class="market-price-badge">`+item.price.toFixed(2).replace('.', ',')+` €</span>
                </div>
                <div class="market-card-body">
                    <h5 class="market-card-title">`+escapeHTML(item.item_name)+`</h5>
                    <div class="text-purple-glow small mb-1"><i class="bi bi-person-fill"></i> `+escapeHTML(item.author)+getSocials(item.author)+`</div>
                    <p class="market-card-desc">`+escapeHTML(item.description)+`</p>
                </div>
                `+controlsHtml+`
            </div>
        </div>`;
    }).join('');
}

function filterMarketCat(cat, el) {
    currentMarketCat = cat;
    const parent = el.closest('.category-list');
    parent.querySelectorAll('.category-item').forEach(i => i.classList.remove('active'));
    el.classList.add('active');
    renderMarket();
}

// LIGHTBOX PREVIEW
function openMarketPreview(id) {
    const item = allMarketItems.find(i => String(i.id) === String(id));
    if (!item) return;

    const imgs = parseMarketImages(item.images);
    document.getElementById('marketModalTitle').textContent = item.item_name;
    document.getElementById('marketModalOwner').textContent = item.author;
    document.getElementById('marketModalPrice').textContent = item.price.toFixed(2).replace('.', ',') + ' €';
    document.getElementById('marketModalDesc').textContent = item.description;

    const inner = document.getElementById('marketCarouselInner');
    inner.innerHTML = imgs.map((src, idx) => `
        <div class="carousel-item `+(idx===0?'active':'')+`">
            <img src="`+src+`" class="d-block w-100" style="height: 60vh; object-fit: contain; background: #000;">
        </div>
    `).join('');

    const counter = document.getElementById('marketImgCounter');
    counter.textContent = `1 / ` + imgs.length;

    const carouselEl = document.getElementById('marketCarousel');
    carouselEl.removeEventListener('slid.bs.carousel', carouselEl._counterHandler || (() => {}));
    carouselEl._counterHandler = (e) => { counter.textContent = (e.to+1) + ` / ` + imgs.length; };
    carouselEl.addEventListener('slid.bs.carousel', carouselEl._counterHandler);

    let linksHtml = '';
    if (item.link_ebay) linksHtml += `<a href="`+item.link_ebay+`" target="_blank" class="btn btn-sm btn-outline-light"><i class="bi bi-ebay"></i> eBay</a>`;
    if (item.link_kleinanzeigen) linksHtml += `<a href="`+item.link_kleinanzeigen+`" target="_blank" class="btn btn-sm btn-outline-success">Kleinanzeigen</a>`;
    if (item.link_facebook) linksHtml += `<a href="`+item.link_facebook+`" target="_blank" class="btn btn-sm btn-outline-primary"><i class="bi bi-facebook"></i> Facebook</a>`;
    if (item.link_mobile) linksHtml += `<a href="`+item.link_mobile+`" target="_blank" class="btn btn-sm btn-outline-warning text-dark fw-bold">mobile.de</a>`;

    document.getElementById('marketModalLinks').innerHTML = linksHtml;

    showModal('marketPreviewModal');
}

// DELETE (OWNER)
async function deleteMarketItem(id) {
    if (await showCustomConfirm("Möchtest du dieses Inserat wirklich löschen?", "Inserat löschen")) {
        await db.from('market_items').delete().eq('id', id);
        renderMarket();
    }
}

// EDIT (OWNER OR MODERATOR)
function openMarketEditModal(id) {
    const item = allMarketItems.find(i => String(i.id) === String(id));
    if (!item) return;

    activeEditMarketId = id;
    document.getElementById('editMarketTitle').value = item.item_name;
    document.getElementById('editMarketPrice').value = item.price;
    document.getElementById('editMarketCategory').value = item.category;
    document.getElementById('editMarketDesc').value = item.description;
    
    document.getElementById('editMarketEbay').value = item.link_ebay || '';
    document.getElementById('editMarketKleinanzeigen').value = item.link_kleinanzeigen || '';
    document.getElementById('editMarketFb').value = item.link_facebook || '';
    document.getElementById('editMarketMobile').value = item.link_mobile || '';
    
    toggleMarketLinks(item.category, 'edit');

    marketExistingImages = parseMarketImages(item.images);
    marketNewImagesToAdd = [];
    document.getElementById('editMarketNewImages').value = '';
    renderEditMarketImages();

    showModal('editMarketModal');
}

function renderEditMarketImages() {
    const container = document.getElementById('editMarketExistingImgs');
    const total = marketExistingImages.length + marketNewImagesToAdd.length;
    document.getElementById('editMarketImgCount').textContent = total;
    container.innerHTML = '';

    marketExistingImages.forEach((src, idx) => {
        container.innerHTML += `<div class="thumb-preview-item"><img src="`+src+`" class="thumb-preview-img"><button type="button" class="thumb-del-btn" onclick="removeExistingMarketImg(`+idx+`)"><i class="bi bi-x"></i></button></div>`;
    });
    marketNewImagesToAdd.forEach((src, idx) => {
        container.innerHTML += `<div class="thumb-preview-item" style="border-color:#198754"><img src="`+src+`" class="thumb-preview-img"><button type="button" class="thumb-del-btn bg-success" onclick="removeNewMarketImg(`+idx+`)"><i class="bi bi-x"></i></button></div>`;
    });
}

function removeExistingMarketImg(idx) { marketExistingImages.splice(idx,1); renderEditMarketImages(); }
function removeNewMarketImg(idx) { marketNewImagesToAdd.splice(idx,1); renderEditMarketImages(); }

document.getElementById('editMarketNewImages')?.addEventListener('change', function() {
    const total = marketExistingImages.length + marketNewImagesToAdd.length;
    const remaining = 10 - total;
    if (remaining <= 0) { showCustomAlert("Maximal 10 Bilder!"); this.value=''; return; }
    const files = Array.from(this.files).slice(0, remaining);
    Promise.all(files.map(f => new Promise(res => { const r = new FileReader(); r.readAsDataURL(f); r.onload = () => res(r.result); })))
        .then(results => { marketNewImagesToAdd.push(...results); renderEditMarketImages(); this.value=''; });
});

document.getElementById('editMarketForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    if (!activeEditMarketId) return;

    const allImages = [...marketExistingImages, ...marketNewImagesToAdd];
    if (allImages.length < 5) {
        showCustomAlert("Es müssen mindestens 5 Bilder vorhanden sein!", "Fehler", "warning");
        return;
    }

    const title = document.getElementById('editMarketTitle').value.trim();
    const price = document.getElementById('editMarketPrice').value;
    const cat = document.getElementById('editMarketCategory').value;
    const desc = document.getElementById('editMarketDesc').value.trim();
    const lEbay = document.getElementById('editMarketEbay').value.trim() || null;
    const lKlein = document.getElementById('editMarketKleinanzeigen').value.trim() || null;
    const lFb = document.getElementById('editMarketFb').value.trim() || null;
    const lMob = document.getElementById('editMarketMobile').value.trim() || null;

    const updates = {
        item_name: title, price: parseFloat(price), category: cat, description: desc,
        images: JSON.stringify(allImages), link_ebay: lEbay, link_kleinanzeigen: lKlein, link_facebook: lFb, link_mobile: lMob
    };

    // MODERATION LOGIC
    if (pendingMarketModerationAction && pendingMarketModerationAction.type === 'edit') {
        const item = allMarketItems.find(i => String(i.id) === String(activeEditMarketId));
        // Save appeal state first
        await db.from('market_appeals').insert([{
            item_id: item.id,
            author: item.author,
            appeal_reason: '', // Not appealed yet
            status: 'none',
            action_type: 'edit',
            original_state: item // Save full object
        }]);

        // Notify user
        await sendUserNotification(
            item.author,
            `<i class="bi bi-pencil-fill text-warning me-1"></i> Dein Inserat <b>"`+item.item_name+`"</b> wurde von einem Moderator geändert. <br><br><button class="btn btn-sm btn-outline-warning mt-2" onclick="openAppealModal('`+item.id+`')">Einspruch einlegen</button>`,
            pendingMarketModerationAction.reason,
            'warning'
        );
        pendingMarketModerationAction = null;
    }

    await db.from('market_items').update(updates).eq('id', activeEditMarketId);
    hideModal('editMarketModal');
    renderMarket();
});

// MODERATION ACTION (DELETE OR PREPARE EDIT)
function promptMarketMod(type, itemId, author) {
    pendingMarketModerationAction = { type, itemId, author };
    document.getElementById('moderationModalTitle').innerHTML = '<i class="bi bi-shield-exclamation me-2"></i> Flohmarkt Moderation';
    document.getElementById('moderationModalDesc').textContent = `Du greifst als Moderator in das Inserat von "`+author+`" ein. Begründung ist Pflicht!`;
    const btn = document.getElementById('moderationSubmitBtn');
    btn.textContent = type === 'delete' ? 'Löschen & Verwarnen' : 'Weiter zum Bearbeiten';
    btn.className = type === 'delete' ? 'btn btn-danger rounded-pill px-4 fw-bold' : 'btn btn-warning rounded-pill px-4 fw-bold text-dark';
    document.getElementById('moderationReasonInput').value = '';
    showModal('moderationReasonModal');
}

// Hook into existing moderationReasonForm submit
document.getElementById('moderationReasonForm')?.addEventListener('submit', async function(e) {
    // If pending is market mod
    if (pendingMarketModerationAction) {
        e.preventDefault();
        e.stopImmediatePropagation();
        const reason = document.getElementById('moderationReasonInput').value.trim();
        if (!reason) return showCustomAlert("Begründung ist Pflicht!");
        
        const { type, itemId, author } = pendingMarketModerationAction;
        const item = allMarketItems.find(i => String(i.id) === String(itemId));
        hideModal('moderationReasonModal');

        if (type === 'delete') {
            // Soft delete
            await db.from('market_items').update({ is_deleted: true }).eq('id', itemId);
            // Save appeal state
            await db.from('market_appeals').insert([{
                item_id: itemId, author: author, appeal_reason: '', status: 'none', action_type: 'delete', original_state: item
            }]);
            // Notify
            await sendUserNotification(
                author,
                `<i class="bi bi-trash-fill text-danger me-1"></i> Dein Inserat <b>"`+item.item_name+`"</b> wurde gelöscht. <br><br><button class="btn btn-sm btn-outline-warning mt-2" onclick="openAppealModal('`+itemId+`')">Einspruch einlegen</button>`,
                reason,
                'danger'
            );
            pendingMarketModerationAction = null;
            showCustomAlert('Inserat gelöscht und User benachrichtigt.', 'Erfolg', 'success');
            renderMarket();
        } else if (type === 'edit') {
            pendingMarketModerationAction.reason = reason;
            openMarketEditModal(itemId); // The save is handled in editMarketForm submit
        }
    }
});

// APPEALS LOGIC
let activeAppealItemId = null;
function openAppealModal(itemId) {
    activeAppealItemId = itemId;
    document.getElementById('appealReasonInput').value = '';
    hideModal('userNotificationsModal');
    showModal('appealReasonModal');
}

document.getElementById('appealReasonForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();
    if (!activeAppealItemId) return;
    const reason = document.getElementById('appealReasonInput').value.trim();
    
    // Find the pending appeal record and update it
    let { data: appeal } = await db.from('market_appeals').select('id').eq('item_id', activeAppealItemId).eq('status', 'none').order('created_at', {ascending:false}).limit(1).single();
    
    if (appeal) {
        await db.from('market_appeals').update({ appeal_reason: reason, status: 'pending' }).eq('id', appeal.id);
        showCustomAlert('Dein Einspruch wurde zur Überprüfung an die Admins gesendet!', 'Einspruch eingelegt', 'success');
    } else {
        // Fallback
        await db.from('market_appeals').insert([{ item_id: activeAppealItemId, author: state.currentUser.username, appeal_reason: reason, status: 'pending', action_type: 'unknown' }]);
        showCustomAlert('Einspruch gesendet!', 'Erfolg', 'success');
    }
    hideModal('appealReasonModal');
});

// ADMIN APPEALS CENTER
async function loadAdminAppeals() {
    const listEl = document.getElementById('adminAppealsList');
    listEl.innerHTML = '<div class="text-center py-4"><div class="spinner-border text-warning"></div></div>';
    
    let { data: appeals } = await db.from('market_appeals').select('*, market_items(*)').eq('status', 'pending');
    if (!appeals || appeals.length === 0) {
        listEl.innerHTML = '<div class="text-muted text-center py-4">Keine offenen Einsprüche.</div>';
        return;
    }

    listEl.innerHTML = appeals.map(app => `
        <div class="p-3 mb-3 border border-warning rounded" style="background: rgba(10,10,12,0.8);">
            <div class="d-flex justify-content-between mb-2">
                <span class="badge bg-warning text-dark">Mod-Aktion: `+(app.action_type === 'delete' ? 'Löschung' : 'Bearbeitung')+`</span>
                <span class="text-light small">User: <b>`+app.author+`</b></span>
            </div>
            <h6 class="text-white">Einspruch-Begründung:</h6>
            <p class="text-light small bg-dark p-2 rounded border border-secondary">`+escapeHTML(app.appeal_reason)+`</p>
            <div class="d-flex gap-2 justify-content-end mt-3">
                <button class="btn btn-sm btn-success" onclick="resolveAppeal('`+app.id+`', 'accept')">Einspruch Stattgeben (Rückgängig)</button>
                <button class="btn btn-sm btn-danger" onclick="resolveAppeal('`+app.id+`', 'reject')">Einspruch Ablehnen (Bleibt)</button>
            </div>
        </div>
    `).join('');
}

async function resolveAppeal(appealId, resolution) {
    let { data: app } = await db.from('market_appeals').select('*').eq('id', appealId).single();
    if (!app) return;

    if (resolution === 'accept') {
        if (app.action_type === 'delete') {
            await db.from('market_items').update({ is_deleted: false }).eq('id', app.item_id);
        } else if (app.action_type === 'edit' && app.original_state) {
            const orig = app.original_state;
            await db.from('market_items').update({
                item_name: orig.item_name, price: orig.price, category: orig.category, description: orig.description,
                images: orig.images, link_ebay: orig.link_ebay, link_kleinanzeigen: orig.link_kleinanzeigen,
                link_facebook: orig.link_facebook, link_mobile: orig.link_mobile
            }).eq('id', app.item_id);
        }
        await db.from('market_appeals').update({ status: 'accepted' }).eq('id', appealId);
        await sendUserNotification(app.author, "Dein Einspruch wurde akzeptiert. Die Mod-Aktion wurde rückgängig gemacht.", "", "success");
    } else {
        await db.from('market_appeals').update({ status: 'rejected' }).eq('id', appealId);
        await sendUserNotification(app.author, "Dein Einspruch wurde leider abgelehnt. Die Aktion bleibt bestehen.", "", "danger");
    }
    loadAdminAppeals();
    renderMarket();
}

// INJECT APPEALS TAB TO ADMIN CENTER
document.addEventListener('DOMContentLoaded', () => {
    const adminTabs = document.querySelector('.admin-nav-tabs');
    if (adminTabs) {
        adminTabs.innerHTML += `<li class="nav-item" id="admin-tab-appeals"><button class="nav-link" data-bs-toggle="modal" data-bs-target="#adminAppealsModal" onclick="loadAdminAppeals()" type="button"><i class="bi bi-hammer me-1"></i> Einsprüche</button></li>`;
    }
});


