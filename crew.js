/* =========================================
   11. PIXEL RIDER CREW MODUL
   ========================================= */

let allCrewMembers = [];
let activeEditCrewId = null;
let crewNewImageToAdd = null; // Store compressed base64 image

async function loadCrewMembers() {
    const container = document.getElementById('landing-crew-container');
    if (!container) return;
    
    try {
        const { data, error } = await db
            .from('crew_members')
            .select('*')
            .order('sort_order', { ascending: true });
            
        if (error) throw error;
        allCrewMembers = data || [];
        
        if (data.length === 0) {
            container.innerHTML = '<div class="col-12 text-center text-muted">Noch keine Crew-Mitglieder eingetragen.</div>';
            return;
        }

        let html = '';
        data.forEach(member => {
            const defaultImg = 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?q=80&w=1000';
            const imgSrc = member.image_url || defaultImg;
            
            // Social Links
            let socialLinks = '';
            if (member.social_ig) {
                socialLinks += `<a href="${member.social_ig}" target="_blank" class="text-warning fs-5 me-2"><i class="bi bi-instagram"></i></a>`;
            }
            if (member.social_tiktok) {
                socialLinks += `<a href="${member.social_tiktok}" target="_blank" class="text-warning fs-5 me-2"><i class="bi bi-tiktok"></i></a>`;
            }
            if (member.social_youtube) {
                socialLinks += `<a href="${member.social_youtube}" target="_blank" class="text-warning fs-5"><i class="bi bi-youtube"></i></a>`;
            }

            html += `
                <div class="col-md-6 col-lg-4 col-xl-3">
                    <div class="card bg-dark border-secondary h-100 text-center" style="box-shadow: 0 0 15px rgba(255,215,0,0.1);">
                        <div class="card-img-top overflow-hidden" style="height: 250px;">
                            <img src="${imgSrc}" class="w-100 h-100 object-fit-cover" alt="${escapeHTML(member.name)}" loading="lazy">
                        </div>
                        <div class="card-body d-flex flex-column">
                            <h4 class="card-title text-warning fw-bold text-uppercase mb-1">${escapeHTML(member.name)}</h4>
                            <h6 class="text-light mb-3">${escapeHTML(member.role)}</h6>
                            <p class="card-text text-muted small flex-grow-1">${escapeHTML(member.bio || '')}</p>
                            <div class="mt-3">
                                ${socialLinks}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
        
    } catch (err) {
        console.error('Error loading crew members:', err);
        container.innerHTML = '<div class="col-12 text-center text-danger">Fehler beim Laden der Crew.</div>';
    }
}

async function renderCrewAdmin() {
    const container = document.getElementById('crew-container');
    if (!container) return;

    try {
        const { data, error } = await db
            .from('crew_members')
            .select('*')
            .order('sort_order', { ascending: true });
            
        if (error) throw error;
        allCrewMembers = data || [];
        
        if (data.length === 0) {
            container.innerHTML = '<div class="text-center text-muted w-100">Keine Crew-Mitglieder gefunden.</div>';
            return;
        }

        let html = '';
        data.forEach(member => {
            const defaultImg = 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?q=80&w=1000';
            const imgSrc = member.image_url || defaultImg;
            
            html += `
                <div class="col-md-6 col-lg-4">
                    <div class="card bg-dark border-secondary h-100" style="position:relative;">
                        <div class="position-absolute top-0 end-0 p-2 z-3">
                            <button class="btn btn-sm btn-outline-warning rounded-circle me-1" onclick="editCrew('${member.id}')"><i class="bi bi-pencil"></i></button>
                            <button class="btn btn-sm btn-outline-danger rounded-circle" onclick="deleteCrew('${member.id}')"><i class="bi bi-trash"></i></button>
                        </div>
                        <div class="card-img-top overflow-hidden" style="height: 200px;">
                            <img src="${imgSrc}" class="w-100 h-100 object-fit-cover" alt="${escapeHTML(member.name)}">
                        </div>
                        <div class="card-body">
                            <span class="badge bg-secondary mb-2">Order: ${member.sort_order}</span>
                            <h5 class="card-title text-warning fw-bold text-uppercase">${escapeHTML(member.name)}</h5>
                            <h6 class="text-light">${escapeHTML(member.role)}</h6>
                            <p class="card-text text-muted small text-truncate">${escapeHTML(member.bio || '')}</p>
                        </div>
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;
        
    } catch (err) {
        console.error('Error loading admin crew:', err);
        container.innerHTML = '<div class="text-center text-danger w-100">Fehler beim Laden.</div>';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadCrewMembers();

    const form = document.getElementById('crewForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = e.target.querySelector('button[type="submit"]');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Speichert...';
            btn.disabled = true;

            const name = document.getElementById('crewName').value.trim();
            const role = document.getElementById('crewRole').value.trim();
            const bio = document.getElementById('crewBio').value.trim();
            const social_ig = document.getElementById('crewIg').value.trim() || null;
            const social_tiktok = document.getElementById('crewTiktok').value.trim() || null;
            const social_youtube = document.getElementById('crewYoutube').value.trim() || null;
            const sort_order = parseInt(document.getElementById('crewSortOrder').value) || 0;

            const payload = {
                name: name,
                role: role,
                bio: bio,
                social_ig: social_ig,
                social_tiktok: social_tiktok,
                social_youtube: social_youtube,
                sort_order: sort_order
            };

            // Nur überschreiben, wenn ein neues Bild ausgewählt wurde.
            // Ansonsten behält Supabase den bestehenden Wert, wenn man das Feld nicht mitsendet.
            if (crewNewImageToAdd) {
                payload.image_url = crewNewImageToAdd;
            } else if (!activeEditCrewId) {
                payload.image_url = null; // Neu angelegt ohne Bild
            }

            try {
                if (activeEditCrewId) {
                    const { error } = await db
                        .from('crew_members')
                        .update(payload)
                        .eq('id', activeEditCrewId);
                    if (error) throw error;
                } else {
                    if (state.currentUser) payload.created_by = state.currentUser.id;
                    const { error } = await db.from('crew_members').insert([payload]);
                    if (error) throw error;
                }

                const modal = bootstrap.Modal.getInstance(document.getElementById('crewModal'));
                if (modal) modal.hide();
                e.target.reset();
                activeEditCrewId = null;
                crewNewImageToAdd = null;
                
                await renderCrewAdmin();
                await loadCrewMembers();

            } catch (err) {
                console.error('Error saving crew member:', err);
                alert('Fehler beim Speichern: ' + err.message);
            } finally {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        });
    }

    // Modal reset on close
    const modalEl = document.getElementById('crewModal');
    if (modalEl) {
        modalEl.addEventListener('hidden.bs.modal', () => {
            document.getElementById('crewForm').reset();
            activeEditCrewId = null;
            crewNewImageToAdd = null;
            renderCrewImagePreview();
        });
    }
});

window.editCrew = (id) => {
    const member = allCrewMembers.find(m => m.id === id);
    if(!member) return;

    activeEditCrewId = id;
    crewNewImageToAdd = null; // Behalte altes Bild
    
    document.getElementById('crewName').value = member.name;
    document.getElementById('crewRole').value = member.role;
    document.getElementById('crewBio').value = member.bio || '';
    document.getElementById('crewIg').value = member.social_ig || '';
    document.getElementById('crewTiktok').value = member.social_tiktok || '';
    document.getElementById('crewYoutube').value = member.social_youtube || '';
    document.getElementById('crewSortOrder').value = member.sort_order || 0;
    
    if(document.getElementById('crewImageInput')) document.getElementById('crewImageInput').value = '';
    renderCrewImagePreview(member.image_url);
    
    const modal = new bootstrap.Modal(document.getElementById('crewModal'));
    modal.show();
};

window.deleteCrew = async (id) => {
    if(!confirm('Möchtest du dieses Crew-Mitglied wirklich löschen?')) return;
    
    try {
        const { error } = await db
            .from('crew_members')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        
        await renderCrewAdmin();
        await loadCrewMembers();
    } catch (err) {
        console.error('Error deleting crew member:', err);
        alert('Fehler beim Löschen: ' + err.message);
    }
};

// --- Crew Image Upload Handling ---
function renderCrewImagePreview(existingImgUrl = null) {
    const container = document.getElementById('crewImagePreview');
    if(!container) return;
    container.innerHTML = '';
    
    // Zeige das neue Bild oder das bestehende Bild an
    const imgSrc = crewNewImageToAdd || existingImgUrl;
    
    if (imgSrc) {
        container.innerHTML = `<div class="thumb-preview-item" style="border-color:#ffc107"><img src="${imgSrc}" class="thumb-preview-img"></div>`;
    }
}

document.getElementById('crewImageInput')?.addEventListener('change', async function() {
    if (!this.files || this.files.length === 0) return;
    const file = this.files[0];
    
    if (file.size > 15 * 1024 * 1024) {
        showCustomAlert('Das Bild ist zu groß! Bitte max. 15 MB.', "Fehler", "warning");
        this.value = '';
        return;
    }

    const compressImage = (file) => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    const maxDim = 800; // Genug für ein Profilbild
                    
                    if (width > maxDim || height > maxDim) {
                        if (width > height) {
                            height = Math.round((height *= maxDim / width));
                            width = maxDim;
                        } else {
                            width = Math.round((width *= maxDim / height));
                            height = maxDim;
                        }
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', 0.6));
                };
                img.onerror = () => resolve(event.target.result);
                img.src = event.target.result;
            };
        });
    };

    try {
        const compressedBase64 = await compressImage(file);
        if (compressedBase64) {
            crewNewImageToAdd = compressedBase64;
            renderCrewImagePreview();
        }
    } catch(e) {
        console.error('Kompression fehlgeschlagen', e);
        showCustomAlert('Fehler beim Komprimieren des Bildes', 'Fehler', 'danger');
    }
});
