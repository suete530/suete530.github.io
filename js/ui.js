import { customAlertBtns, customAlertInput, customAlertMsg, customAlertOverlay, darkToggle, exportCsvBtn, exportPaymentsBtn, filterGenderSelect, filterStatusSelect, mainGcashName, mainGcashNumber, overlay, photoUploadInput, searchInput, sectionSelect, sectionSelectView, sortBySelect, studentListContainer } from './dom.js';
import { currentSectionId, getIsAdmin, sections, setCurrentSectionId, students } from './state.js';
import { db } from './firebase.js';
import { escapeHtml, readFileAsBase64 } from './utils.js';
import { updateEditProfileBtnVisibility } from './auth.js';
import { loadStudents } from './db.js';
import { collection, doc, getDocs, updateDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

        document.getElementById('date').textContent = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

        // Use getIsAdmin() from inline script
        export function showAlert(msg) {
            return new Promise((resolve) => {
                customAlertMsg.textContent = msg;
                customAlertInput.style.display = 'none';
                customAlertBtns.innerHTML = '<button class="custom-alert-btn custom-alert-ok" id="caOk">OK</button>';
                customAlertOverlay.classList.remove('hidden');
                document.getElementById('caOk').onclick = () => { customAlertOverlay.classList.add('hidden'); resolve(); };
            });
        }

        export function showConfirm(msg) {
            return new Promise((resolve) => {
                customAlertMsg.textContent = msg;
                customAlertInput.style.display = 'none';
                customAlertBtns.innerHTML = '<button class="custom-alert-btn custom-alert-cancel" id="caNo">Cancel</button><button class="custom-alert-btn custom-alert-ok" id="caYes">OK</button>';
                customAlertOverlay.classList.remove('hidden');
                document.getElementById('caYes').onclick = () => { customAlertOverlay.classList.add('hidden'); resolve(true); };
                document.getElementById('caNo').onclick = () => { customAlertOverlay.classList.add('hidden'); resolve(false); };
            });
        }

        export function showPrompt(msg, defaultVal = '') {
            return new Promise((resolve) => {
                customAlertMsg.textContent = msg;
                customAlertInput.style.display = 'block';
                customAlertInput.value = defaultVal;
                customAlertBtns.innerHTML = '<button class="custom-alert-btn custom-alert-cancel" id="caCancel">Cancel</button><button class="custom-alert-btn custom-alert-ok" id="caSubmit">OK</button>';
                customAlertOverlay.classList.remove('hidden');
                customAlertInput.focus();
                document.getElementById('caCancel').onclick = () => { customAlertOverlay.classList.add('hidden'); resolve(null); };
                document.getElementById('caSubmit').onclick = () => { customAlertOverlay.classList.add('hidden'); resolve(customAlertInput.value); };
                customAlertInput.onkeypress = (e) => { if (e.key === 'Enter') { customAlertOverlay.classList.add('hidden'); resolve(customAlertInput.value); } };
            });
        }

        // Called by inline login script after successful login/guest entry
        export function renderThemeSwatches() {
            const container = document.getElementById('themeSelector');
            if (!container) return;
            const emojis = ['🌊','🌸','🌿','🌅','💜'];
            container.innerHTML = '';
            themes.forEach((t, i) => {
                const btn = document.createElement('button');
                btn.style.cssText = `width:40px;height:40px;border-radius:8px;border:2px solid ${i === currentTheme ? 'var(--accent)' : '#1e293b'};cursor:pointer;background:linear-gradient(135deg,${t.accent},${t.secondary});display:flex;align-items:center;justify-content:center;font-size:1rem;transition:transform 0.15s;`;
                btn.innerHTML = emojis[i] || '🎨';
                btn.title = t.name;
                btn.onclick = () => { applyTheme(i); renderThemeSwatches(); };
                container.appendChild(btn);
            });
        }
        export function getFinePresets() {
            try { return JSON.parse(localStorage.getItem('fm_fine_presets')) || []; } catch(e) { return []; }
        }
        export function saveFinePresets(presets) {
            localStorage.setItem('fm_fine_presets', JSON.stringify(presets));
        }
        export function renderFinePresets() {
            const container = document.getElementById('finePresets');
            if (!container) return;
            const presets = getFinePresets();
            if (presets.length === 0) { container.innerHTML = ''; return; }
            container.innerHTML = presets.map((p, i) =>
                `<button onclick="document.getElementById('studentFine').value='${p.amount}'" style="padding:2px 8px;border-radius:12px;border:1px solid var(--accent-a27);background:var(--accent-a7);color:var(--accent);font-size:0.6rem;cursor:pointer;font-family:monospace;white-space:nowrap;">${p.label} ₱${p.amount}</button>`
            ).join('');
        }
        export function renderPresetsManager() {
            const container = document.getElementById('presetsManager');
            if (!container) return;
            const presets = getFinePresets();
            if (presets.length === 0) { container.innerHTML = '<div style="font-size:0.75rem;color:#6b7280;">No presets yet. Add one below.</div>'; return; }
            container.innerHTML = presets.map((p, i) =>
                `<div style="display:flex;align-items:center;gap:6px;background:#0d1520;border-radius:8px;padding:4px 8px;"><span style="flex:1;font-size:0.8rem;color:#e0e0e0;font-family:monospace;">${p.label}</span><span style="font-size:0.8rem;color:var(--amber);font-weight:bold;font-family:monospace;">₱${p.amount}</span><button onclick="deletePreset(${i})" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:0.8rem;padding:2px 6px;">✕</button></div>`
            ).join('');
        }
        export function deletePreset(index) {
            const presets = getFinePresets();
            presets.splice(index, 1);
            saveFinePresets(presets);
            renderPresetsManager();
            renderFinePresets();
        }
        export function isSoundOn() { return localStorage.getItem('fm_sound') !== 'off'; }
        export function toggleSound(on) { localStorage.setItem('fm_sound', on ? 'on' : 'off'); }
        export function playSound(type) {
            if (!isSoundOn() || !window.AudioContext) return;
            try {
                const ctx = new (window.AudioContext || window.webkitAudioContext)();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                gain.gain.value = 0.1;
                if (type === 'add') { osc.frequency.value = 800; osc.type = 'sine'; gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15); osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.15); }
                else if (type === 'payment') { osc.frequency.value = 523; osc.type = 'sine'; gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3); osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.3); setTimeout(() => { const c2 = new (window.AudioContext || window.webkitAudioContext)(); const o2 = c2.createOscillator(); const g2 = c2.createGain(); o2.connect(g2); g2.connect(c2.destination); g2.gain.value = 0.1; o2.frequency.value = 659; o2.type = 'sine'; g2.gain.exponentialRampToValueAtTime(0.001, c2.currentTime + 0.3); o2.start(c2.currentTime); o2.stop(c2.currentTime + 0.3); }, 150); }
                else if (type === 'delete') { osc.frequency.value = 300; osc.type = 'sawtooth'; gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2); osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.2); }
                else if (type === 'notif') { osc.frequency.value = 660; osc.type = 'sine'; gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1); osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.1); setTimeout(() => { const c3 = new (window.AudioContext || window.webkitAudioContext)(); const o3 = c3.createOscillator(); const g3 = c3.createGain(); o3.connect(g3); g3.connect(c3.destination); g3.gain.value = 0.1; o3.frequency.value = 880; o3.type = 'sine'; g3.gain.exponentialRampToValueAtTime(0.001, c3.currentTime + 0.15); o3.start(c3.currentTime); o3.stop(c3.currentTime + 0.15); }, 120); }
            } catch(e) {}
        }
        export function getSmsSettings() {
            try { return JSON.parse(localStorage.getItem('fm_sms_settings') || '{}'); } catch { return {}; }
        }
        export function saveSmsSettings(s) { localStorage.setItem('fm_sms_settings', JSON.stringify(s)); }
        export function loadSmsSettings() {
            const s = getSmsSettings();
            const cb = document.getElementById('smsToggle');
            const key = document.getElementById('smsApiKey');
            const sn = document.getElementById('smsSenderName');
            const ph = document.getElementById('smsAdminPhone');
            if (cb) cb.checked = !!s.enabled;
            if (key) key.value = s.apiKey || '';
            if (sn) sn.value = s.sender || '';
            if (ph) ph.value = s.phone || '';
        }
        export async function sendSms(phone, message) {
            const s = getSmsSettings();
            if (!s.enabled || !s.apiKey || !s.sender || !phone) return false;
            try {
                const r = await fetch('https://semaphore.co/api/v4/messages', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({ apikey: s.apiKey, number: phone, message, sendername: s.sender })
                });
                const d = await r.json();
                return !d.error;
            } catch { return false; }
        }
        export function loadDarkMode() {
            const isDark = localStorage.getItem('fm_dark') === 'true';
            document.body.classList.toggle('dark', isDark);
            darkToggle.textContent = isDark ? '☀️' : '🌙';
        }
        darkToggle.addEventListener('click', () => {
            const isDark = !document.body.classList.contains('dark');
            document.body.classList.toggle('dark', isDark);
            localStorage.setItem('fm_dark', isDark);
            darkToggle.textContent = isDark ? '☀️' : '🌙';
        });
        loadDarkMode();

        export function updateMainGcash() {
            const num = localStorage.getItem('fm_gcash_number') || '09XXXXXXXXX';
            const name = localStorage.getItem('fm_gcash_name') || 'Secretary';
            if (mainGcashNumber) mainGcashNumber.textContent = num;
            if (mainGcashName) mainGcashName.textContent = name;
            const qrEl = document.getElementById('mainGcashQR');
            if (qrEl) {
                qrEl.innerHTML = '';
                const uploadedQR = localStorage.getItem('fm_gcash_qr') || '';
                if (uploadedQR) {
                    qrEl.innerHTML = `<img src="${uploadedQR}" style="width:94px;height:94px;border-radius:8px;">`;
                } else {
                    try {
                        new QRCode(qrEl, { text: num !== '09XXXXXXXXX' ? `${name}\n${num}` : 'Set GCash in Settings', width: 94, height: 94, colorDark: '#0a0e1a', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.M });
                    } catch(e) { qrEl.innerHTML = '<div style="font-size:0.65rem;color:#999;">QR unavailable</div>'; }
                }
            }
        }

        export function showWelcome(studentName) {
            const overlay = document.getElementById('welcomeOverlay');
            const nameEl = document.getElementById('welcomeName');
            nameEl.textContent = studentName;
            overlay.classList.remove('fade-out');
            overlay.classList.add('active');
            createWelcomeParticles(overlay);
            setTimeout(() => {
                overlay.classList.add('fade-out');
                setTimeout(() => { overlay.classList.remove('active', 'fade-out'); }, 800);
            }, 4200);
        }
        export function createWelcomeParticles(overlay) {
            const colors = ['var(--accent)', '#a78bfa', '#fbbf24', '#10b981', '#f472b6', '#ffffff', '#60a5fa'];
            const shapes = ['star', 'cross', 'dot', 'shimmer'];
            const animations = ['welcomeParticle', 'sparkleFloat', 'twinklePulse'];
            const totalParticles = 60;
            for (let i = 0; i < totalParticles; i++) {
                const p = document.createElement('div');
                const shape = shapes[Math.floor(Math.random() * shapes.length)];
                const anim = animations[Math.floor(Math.random() * animations.length)];
                const color = colors[Math.floor(Math.random() * colors.length)];
                p.className = `welcome-particle ${shape}`;
                p.style.color = color;
                if (shape === 'star') { p.style.borderBottomColor = color; }
                else if (shape === 'dot') { p.style.background = color; }
                else if (shape === 'shimmer') { p.style.background = color; }
                else { p.style.color = color; }
                p.style.left = '50%'; p.style.top = '50%';
                const angle = (Math.PI * 2 * i) / totalParticles + (Math.random() - 0.5) * 0.5;
                const dist = 100 + Math.random() * 180;
                const tx = Math.cos(angle) * dist;
                const ty = Math.sin(angle) * dist;
                p.style.setProperty('--tx', tx + 'px');
                p.style.setProperty('--ty', ty + 'px');
                const size = 4 + Math.random() * 8;
                if (shape === 'dot') {
                    p.style.width = size + 'px'; p.style.height = size + 'px';
                }
                if (shape === 'star') {
                    const s = size * 0.8;
                    p.style.borderLeftWidth = (s * 0.4) + 'px';
                    p.style.borderRightWidth = (s * 0.4) + 'px';
                    p.style.borderBottomWidth = s + 'px';
                }
                if (shape === 'shimmer') {
                    p.style.width = (size * 0.5) + 'px';
                    p.style.height = (size * 0.5) + 'px';
                }
                p.style.animation = `${anim} ${0.8 + Math.random() * 1}s ${Math.random() * 0.5}s ease-out forwards`;
                overlay.appendChild(p);
                setTimeout(() => { p.remove(); }, 2500);
            }
        }
        export function showStudentProfile(studentId) {
            const student = students.find(s => String(s.id) === String(studentId));
            if (!student) return;
            const profileBar = document.getElementById('studentProfileBar');
            const profileName = document.getElementById('studentProfileName');
            const profileSection = document.getElementById('studentProfileSection');
            const profileImg = document.getElementById('studentProfileImg');
            const profileInitial = document.getElementById('studentProfileInitial');
            const profileCircle = document.getElementById('studentProfileCircle');
            profileName.textContent = student.name;
            const section = sections.find(s => s.id === student.section_id);
            profileSection.textContent = section ? section.name : 'BSIS-1';
            const totalPaid = student.totalPaid || 0;
            const remaining = Math.max(0, (student.fine || 0) - totalPaid);
            document.getElementById('studentProfileFine').textContent = '₱' + (student.fine || 0).toFixed(2);
            document.getElementById('studentProfileFine').style.color = student.status === 'paid' ? '#10b981' : 'var(--amber)';
            if (student.photoUrl) {
                profileImg.src = student.photoUrl;
                profileImg.style.display = 'block';
                profileInitial.style.display = 'none';
                profileCircle.classList.add('has-photo');
            } else {
                profileImg.style.display = 'none';
                profileInitial.style.display = 'block';
                profileInitial.textContent = student.name.charAt(0).toUpperCase();
                profileCircle.classList.remove('has-photo');
            }
            profileBar.classList.add('active');
            updateEditProfileBtnVisibility();
        }
        export function hideStudentProfile() {
            document.getElementById('studentProfileBar').classList.remove('active');
        }
        window.uploadStudentProfile = function() {
            const sid = localStorage.getItem('fm_student_session_id');
            if (!sid) { showAlert('⛔ No student session active.'); return; }
            photoUploadStudentId = sid;
            photoUploadInput.click();
        };

        export function getFilteredStudents() {
            let filtered = [...students];
            if (searchQuery) filtered = filtered.filter(s => (s.name || '').toLowerCase().includes(searchQuery.toLowerCase()));
            if (filterGender !== 'all') filtered = filtered.filter(s => s.gender === filterGender);
            if (filterStatus !== 'all') filtered = filtered.filter(s => s.status === filterStatus);
            if (sortBy === 'fine-high') filtered.sort((a, b) => (b.fine || 0) - (a.fine || 0));
            else if (sortBy === 'fine-low') filtered.sort((a, b) => (a.fine || 0) - (b.fine || 0));
            else filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            return filtered;
        }

        export function renderStudentList() {
            const filtered = getFilteredStudents();
            if (filtered.length === 0) {
                studentListContainer.innerHTML = '<div class="no-results">✨ No results ✨</div>';
                document.getElementById('totalAmount').textContent = '₱ 0.00';
                return;
            }
            let total = 0;
            let html = '';
            const now = Date.now();
            filtered.forEach(s => {
                total += (s.fine || 0);
                const totalPaid = s.totalPaid || 0;
                const remaining = Math.max(0, (s.fine || 0) - totalPaid);
                const genderLabel = s.gender === 'male' ? '♂ M' : s.gender === 'female' ? '♀ F' : '⚧ NB';
                const icon = s.gender === 'male' ? '👨' : s.gender === 'female' ? '👩' : '🧑';
                const relStatus = s.relationStatus || 'Single';
                const relClass = 'relation-' + relStatus.replace(/'/g, '\\\'');
                const relBadge = `<span class="relation-badge ${relClass}">${relStatus}</span>`;
                const statusClass = s.status === 'paid' ? 'status-paid' : 'status-unpaid';
                const statusLabel = s.status === 'paid' ? '✓ Paid' : '✗ Unpaid';
                const paymentInfo = totalPaid > 0 ? `<div style="font-size:0.55rem;color:#888;margin-top:2px;">Paid: ₱${totalPaid.toFixed(2)} | Remaining: ₱${remaining.toFixed(2)}</div>` : '';
                const lastOnline = s.lastOnline || 0;
                const diff = now - lastOnline;
                const online = diff < 5 * 60 * 1000;
                const dotClass = online ? 'online' : 'offline';
                let timeLabel = online ? 'Online' : '';
                if (!online && lastOnline > 0) {
                    const mins = Math.floor(diff / 60000);
                    const hrs = Math.floor(mins / 60);
                    const days = Math.floor(hrs / 24);
                    if (days > 0) timeLabel = days + 'd ago';
                    else if (hrs > 0) timeLabel = hrs + 'h ago';
                    else if (mins > 0) timeLabel = mins + 'm ago';
                    else timeLabel = 'just now';
                }
                if (!lastOnline) timeLabel = '';
                const statusIndicator = timeLabel ? `<div class="status-indicator"><span class="status-dot ${dotClass}"></span><span>${timeLabel}</span></div>` : '';
                const avatarHtml = s.photoUrl ? `<div style="text-align:center;cursor:pointer;" onclick="window.uploadPhoto(${s.id})"><img src="${s.photoUrl}" class="student-avatar">${statusIndicator}</div>` : `<div style="text-align:center;cursor:pointer;" onclick="window.uploadPhoto(${s.id})"><div class="student-avatar-placeholder">+</div>${statusIndicator}</div>`;
                const adminButtons = getIsAdmin() ? `<button class="icon-btn" onclick="window.openPaymentModal(${s.id})">💳 History</button><button class="icon-btn" onclick="window.editStudent(${s.id})">✏️ Edit</button><button class="icon-btn" onclick="window.openChat(${s.id})">💬</button><button class="icon-btn" onclick="window.deleteStudent(${s.id})">🗑️</button>` : `<button class="icon-btn" onclick="window.openPaymentModal(${s.id})">💳 Pay</button>`;
                html += `<div class="student-entry"><div style="display:flex;align-items:flex-start;">${avatarHtml}<span class="student-name">${escapeHtml(s.name)}</span><span class="gender-badge">${genderLabel}</span>${relBadge}<span class="${statusClass}">${statusLabel}</span><span class="fine-amount">₱ ${(s.fine || 0).toFixed(2)}</span><span onclick="speakStudentFine(${s.id})" style="cursor:pointer;font-size:0.7rem;margin-left:4px;opacity:0.5;transition:opacity 0.15s;" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0.5">🔊</span>${paymentInfo}</div><div class="entry-actions">${adminButtons}</div></div>`;
            });
            studentListContainer.innerHTML = html;
            document.getElementById('totalAmount').textContent = '₱ ' + total.toFixed(2);
        }

        export const themes = [
            { name: 'Cyber Blue', accent: '#00d4ff', accent_a27: '#00d4ff44', accent_a20: '#00d4ff33', accent_a13: '#00d4ff22', accent_a7: '#00d4ff11', secondary: '#7c3aed', secondary_dark: '#6d28d9', amber: '#f59e0b', amber_dark: '#d97706' },
            { name: 'Neon Pink', accent: '#f472b6', accent_a27: '#f472b644', accent_a20: '#f472b633', accent_a13: '#f472b622', accent_a7: '#f472b611', secondary: '#a855f7', secondary_dark: '#9333ea', amber: '#fbbf24', amber_dark: '#f59e0b' },
            { name: 'Emerald', accent: '#34d399', accent_a27: '#34d39944', accent_a20: '#34d39933', accent_a13: '#34d39922', accent_a7: '#34d39911', secondary: '#10b981', secondary_dark: '#059669', amber: '#f59e0b', amber_dark: '#d97706' },
            { name: 'Sunset', accent: '#fb923c', accent_a27: '#fb923c44', accent_a20: '#fb923c33', accent_a13: '#fb923c22', accent_a7: '#fb923c11', secondary: '#f97316', secondary_dark: '#ea580c', amber: '#eab308', amber_dark: '#ca8a04' },
            { name: 'Royal Purple', accent: '#a78bfa', accent_a27: '#a78bfa44', accent_a20: '#a78bfa33', accent_a13: '#a78bfa22', accent_a7: '#a78bfa11', secondary: '#8b5cf6', secondary_dark: '#7c3aed', amber: '#f59e0b', amber_dark: '#d97706' }
        ];
        export let currentTheme = parseInt(localStorage.getItem('fm_theme')) || 0;
        export function applyTheme(index) {
            currentTheme = index;
            localStorage.setItem('fm_theme', String(index));
            const t = themes[index];
            const root = document.documentElement;
            root.style.setProperty('--accent', t.accent);
            root.style.setProperty('--accent-a27', t.accent_a27);
            root.style.setProperty('--accent-a20', t.accent_a20);
            root.style.setProperty('--accent-a13', t.accent_a13);
            root.style.setProperty('--accent-a7', t.accent_a7);
            root.style.setProperty('--secondary', t.secondary);
            root.style.setProperty('--secondary-dark', t.secondary_dark);
            root.style.setProperty('--amber', t.amber);
            root.style.setProperty('--amber-dark', t.amber_dark);
            document.getElementById('themePicker').textContent = ['🌊','🌸','🌿','🌅','💜'][index] || '🎨';
        }
        document.getElementById('themePicker')?.addEventListener('click', () => applyTheme((currentTheme + 1) % themes.length));
        applyTheme(currentTheme);

        document.getElementById('studentEditModal').addEventListener('click', (e) => { if (e.target === e.currentTarget) closeStudentEditModal(); });

        window.uploadPhoto = async function(studentId) {
            if (getIsAdmin()) {
                photoUploadStudentId = studentId;
                photoUploadInput.click();
                return;
            }
            const currentId = localStorage.getItem('fm_student_session_id');
            if (String(studentId) !== String(currentId)) {
                await showAlert('⛔ Hindi mo ito pwedeng baguhin. Sarili mong profile lang.');
                return;
            }
            photoUploadStudentId = studentId;
            photoUploadInput.click();
        };

        photoUploadInput.addEventListener('change', async () => {
            if (!photoUploadStudentId || !photoUploadInput.files[0]) return;
            const student = students.find(s => String(s.id) === String(photoUploadStudentId));
            if (!student) return;
            const photoUrl = await readFileAsBase64(photoUploadInput.files[0]);
            await updateDoc(doc(db, 'students', String(photoUploadStudentId)), { photoUrl });
            const idx = students.findIndex(s => String(s.id) === String(photoUploadStudentId));
            if (idx !== -1) students[idx].photoUrl = photoUrl;
            renderStudentList();
            if (String(photoUploadStudentId) === String(localStorage.getItem('fm_student_session_id'))) {
                showStudentProfile(photoUploadStudentId);
            }
            await showAlert('✅ Profile photo updated!');
            photoUploadInput.value = ''; photoUploadStudentId = null;
        });

        export function exportCSV() {
            const section = sections.find(s => s.id === currentSectionId);
            const sectionName = section ? section.name : 'section';
            let csv = 'Name,Gender,Fine,Status\n';
            students.forEach(s => { csv += `"${s.name}",${s.gender},${(s.fine||0).toFixed(2)},${s.status}\n`; });
            const blob = new Blob([csv], { type: 'text/csv' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = sectionName + '_fines.csv';
            a.click();
            URL.revokeObjectURL(a.href);
        }

        export function exportPaymentsCSV() {
            const section = sections.find(s => s.id === currentSectionId);
            const sectionName = section ? section.name : 'section';
            let csv = 'Student Name,Amount,Date,Type,Note\n';
            students.forEach(async (s) => {
                const snap = await getDocs(collection(db, 'students', String(s.id), 'payments'));
                snap.forEach((d) => { const p = d.data(); csv += `"${s.name}",${(p.amount||0).toFixed(2)},${p.date},${p.type},"${p.note||''}"\n`; });
            });
            setTimeout(() => {
                const blob = new Blob([csv], { type: 'text/csv' });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = sectionName + '_payments.csv';
                a.click(); URL.revokeObjectURL(a.href);
            }, 1000);
        }

        exportCsvBtn.addEventListener('click', exportCSV);
        exportPaymentsBtn.addEventListener('click', exportPaymentsCSV);
        sectionSelect.addEventListener('change', () => { setCurrentSectionId(parseInt(sectionSelect.value)); sectionSelectView.value = currentSectionId; loadStudents(); });
        sectionSelectView.addEventListener('change', () => { setCurrentSectionId(parseInt(sectionSelectView.value)); sectionSelect.value = currentSectionId; loadStudents(); });
        searchInput.addEventListener('input', () => { searchQuery = searchInput.value; renderStudentList(); });
        filterGenderSelect.addEventListener('change', () => { filterGender = filterGenderSelect.value; renderStudentList(); });
        filterStatusSelect.addEventListener('change', () => { filterStatus = filterStatusSelect.value; renderStudentList(); });
        sortBySelect.addEventListener('change', () => { sortBy = sortBySelect.value; renderStudentList(); });

        export let activityLogFilter = 'all';
        window.closeActivityLog = function() { document.getElementById('activityLogModal').classList.remove('active'); };
        window.switchActivityTab = function(filter) {
            activityLogFilter = filter;
            document.querySelectorAll('#activityLogTabs .chat-quick-btn').forEach(b => { b.style.background = 'transparent'; b.style.borderColor = '#1e293b'; });
            const active = document.getElementById('activityTab' + filter.charAt(0).toUpperCase() + filter.slice(1));
            if (active) { active.style.background = 'var(--accent-a13)'; active.style.borderColor = 'var(--accent)'; }
            loadActivityLog();
        };
        export async function loadActivityLog() {
            const container = document.getElementById('activityLogList');
            container.innerHTML = '<div class="no-results">Loading...</div>';
            try {
                const snap = await getDocs(query(collection(db, 'activity_logs'), orderBy('timestamp', 'desc')));
                let logs = [];
                snap.forEach(d => logs.push(d.data()));
                const today = new Date();
                today.setHours(0,0,0,0);
                const todayTs = today.getTime();
                if (activityLogFilter === 'today') {
                    logs = logs.filter(l => l.timestamp >= todayTs);
                }
                if (!getIsAdmin()) {
                    const sid = localStorage.getItem('fm_student_session_id');
                    const myName = students.find(s => String(s.id) === String(sid))?.name || '';
                    logs = logs.filter(l => l.studentName === myName || (l.actorRole === 'student' && l.actor === myName));
                }
                if (logs.length === 0) {
                    container.innerHTML = '<div class="no-results">No activity found.</div>';
                    return;
                }
                container.innerHTML = '';
                logs.forEach(l => {
                    const actionLabels = {
                        payment: '💳 Payment',
                        fine_add: '➕ Fine Added',
                        fine_edit: '✏️ Fine Updated',
                        student_add: '👤 Student Added',
                        student_delete: '🗑️ Student Deleted',
                        section_add: '📚 Section Added',
                        payment_delete: '🗑️ Payment Deleted'
                    };
                    const typeClass = l.action || 'fine_add';
                    const label = actionLabels[typeClass] || typeClass;
                    const time = new Date(l.timestamp || Date.now());
                    const timeStr = time.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                    const entry = document.createElement('div');
                    entry.className = 'activity-entry ' + (typeClass === 'payment' ? 'payment' : typeClass === 'payment_delete' ? 'payment_delete' : typeClass === 'fine_add' ? 'fine_add' : typeClass === 'fine_edit' ? 'fine_edit' : typeClass === 'student_delete' ? 'student_delete' : typeClass === 'section_add' ? 'section_add' : '');
                    entry.innerHTML = `<div class="act-header"><span class="act-action">${label}</span><span class="act-time">${timeStr}</span></div>${l.studentName ? `<div class="act-details">${escapeHtml(l.details || '')} — ${escapeHtml(l.studentName)}</div>` : `<div class="act-details">${escapeHtml(l.details || '')}</div>`}<div class="act-actor">by ${escapeHtml(l.actor || 'System')} ${l.sectionName ? '· ' + escapeHtml(l.sectionName) : ''}</div>`;
                    container.appendChild(entry);
                });
            } catch (e) {
                container.innerHTML = '<div class="no-results">Error loading activity log.</div>';
                console.warn(e);
            }
        }
        document.getElementById('activityLogBtn')?.addEventListener('click', () => {
            document.getElementById('activityLogModal').classList.add('active');
            switchActivityTab(activityLogFilter);
        });
        document.getElementById('activityLogModal')?.addEventListener('click', (e) => {
            if (e.target === document.getElementById('activityLogModal')) closeActivityLog();
        });

        document.getElementById('addPresetBtn')?.addEventListener('click', () => {
            const label = document.getElementById('newPresetLabel').value.trim();
            const amount = parseFloat(document.getElementById('newPresetAmount').value);
            if (!label || !amount || amount <= 0) return;
            const presets = getFinePresets();
            presets.push({ label, amount });
            saveFinePresets(presets);
            document.getElementById('newPresetLabel').value = '';
            document.getElementById('newPresetAmount').value = '';
            renderPresetsManager();
            renderFinePresets();
        });
        document.getElementById('readAllBtn')?.addEventListener('click', () => {
            const btn = document.getElementById('readAllBtn');
            if (window._readingAll) { speechSynthesis.cancel(); btn.textContent = '🔊 Read All'; window._readingAll = false; return; }
            window._readingAll = true;
            btn.textContent = '⏹ Stop';
            const list = getFilteredStudents();
            if (list.length === 0) { btn.textContent = '🔊 Read All'; window._readingAll = false; return; }
            let i = 0;
            const speakNext = () => {
                if (i >= list.length || !window._readingAll) { btn.textContent = '🔊 Read All'; window._readingAll = false; return; }
                const s = list[i];
                const msg = new SpeechSynthesisUtterance(`${s.name} — ${s.status === 'paid' ? 'Paid' : 'Unpaid'} — ${(s.fine || 0).toFixed(0)} pesos`);
                msg.rate = 0.85;
                msg.onend = () => { i++; speakNext(); };
                speechSynthesis.speak(msg);
            };
            speakNext();
        });
        document.getElementById('soundToggle')?.addEventListener('change', function() {
            toggleSound(this.checked);
        });
        export function applyWallpaper(dataUrl) {
            if (dataUrl) {
                localStorage.setItem('fm_wallpaper', dataUrl);
                document.body.style.backgroundImage = `url(${dataUrl})`;
                document.body.classList.add('wp');
            } else {
                localStorage.removeItem('fm_wallpaper');
                document.body.style.backgroundImage = '';
                document.body.classList.remove('wp');
            }
        }
        (function restoreWallpaper() {
            const saved = localStorage.getItem('fm_wallpaper');
            if (saved) { document.body.style.backgroundImage = `url(${saved})`; document.body.classList.add('wp'); }
        })();
        document.getElementById('applyWallpaperBtn')?.addEventListener('click', () => {
            const file = document.getElementById('wallpaperInput').files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (e) => applyWallpaper(e.target.result);
            reader.readAsDataURL(file);
        });
        document.getElementById('removeWallpaperBtn')?.addEventListener('click', () => {
            applyWallpaper(null);
            document.getElementById('wallpaperInput').value = '';
        });
        document.getElementById('saveSmsSettingsBtn')?.addEventListener('click', () => {
            const cb = document.getElementById('smsToggle');
            const key = document.getElementById('smsApiKey');
            const sn = document.getElementById('smsSenderName');
            const ph = document.getElementById('smsAdminPhone');
            saveSmsSettings({ enabled: cb.checked, apiKey: key.value.trim(), sender: sn.value.trim(), phone: ph.value.trim() });
            showAlert('SMS settings saved!');
        });
    
        export let searchQuery = '';
        export let filterGender = 'all';
        export let filterStatus = 'all';
        export let sortBy = 'name';
        export let photoUploadStudentId = null;

        export function enhancePasswordField(input) {
            if (!input || input.dataset.pwEnhanced) return;
            input.dataset.pwEnhanced = '1';
            const wrap = document.createElement('span');
            wrap.className = 'pw-wrap';
            input.parentNode.insertBefore(wrap, input);
            wrap.appendChild(input);
            if (getComputedStyle(input).textAlign !== 'center') input.style.paddingRight = '38px';
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'pw-eye';
            btn.tabIndex = -1;
            btn.setAttribute('aria-label', 'Show password');
            btn.textContent = '👁️';
            btn.addEventListener('click', function() {
                const show = input.type === 'password';
                input.type = show ? 'text' : 'password';
                btn.textContent = show ? '🙈' : '👁️';
                btn.classList.toggle('active', show);
            });
            wrap.appendChild(btn);
            const sync = function() {
                wrap.style.display = getComputedStyle(input).display === 'none' ? 'none' : '';
            };
            new MutationObserver(sync).observe(input, { attributes: true, attributeFilter: ['style', 'class'] });
            sync();
        }

        export function initPasswordToggles() {
            document.querySelectorAll('input[type="password"]').forEach(enhancePasswordField);
            const obs = new MutationObserver(function(muts) {
                for (const m of muts) {
                    m.addedNodes.forEach(function(node) {
                        if (node.nodeType !== 1) return;
                        if (node.matches && node.matches('input[type="password"]')) enhancePasswordField(node);
                        else if (node.querySelectorAll) node.querySelectorAll('input[type="password"]').forEach(enhancePasswordField);
                    });
                }
            });
            obs.observe(document.body, { childList: true, subtree: true });
        }
