
        import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
        import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
        import { getFirestore, collection, doc, setDoc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, deleteField, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

        const firebaseConfig = {
            apiKey: "AIzaSyBpsStH3168cx66l1-byMX9obn6aUPiXTc",
            authDomain: "fines-system-7edd5.firebaseapp.com",
            projectId: "fines-system-7edd5",
            storageBucket: "fines-system-7edd5.firebasestorage.app",
            messagingSenderId: "514608325403",
            appId: "1:514608325403:web:0f300f0e43f803cdbee9be",
            measurementId: "G-33TH7LQNQS"
        };

        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const db = getFirestore(app);

        async function sha256(text) {
            const buf = new TextEncoder().encode(text);
            const hash = await crypto.subtle.digest('SHA-256', buf);
            return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
        }
        function isHashed(s) { return typeof s === 'string' && /^[a-f0-9]{64}$/.test(s); }

        let adminPasswordHash = '';
        let adminName = 'Zeraldin Cauba';
        let adminPhotoUrl = '';
        let gcashQRUrl = '';
        let students = [];
        let sections = [];
        let currentSectionId = null;
        let editModeId = null;
        let searchQuery = '';
        let filterGender = 'all';
        let filterStatus = 'all';
        let sortBy = 'name';
        let currentPaymentStudentId = null;
        let studentPrompted = false;
        let unsubscribeSections = null;
        let unsubscribeStudents = null;
        let unsubscribeSuggestions = null;
        let unsubscribeSettings = null;
        let suggestions = [];
        let photoUploadStudentId = null;
        let allowStudentEdit = false;
        let visitorCount = 0;

        const loginAvatarImg = document.getElementById('loginAvatarImg');
        const loginAvatarInitial = document.getElementById('loginAvatarInitial');
        const loginAvatarCircle = document.getElementById('loginAvatarCircle');
        const adminPhotoInput = document.getElementById('adminPhotoInput');

        const adminNameDisplay = document.getElementById('adminNameDisplay');
        const headerAdminName = document.getElementById('headerAdminName');
        const settingsAdminName = document.getElementById('settingsAdminName');
        const saveAdminNameBtn = document.getElementById('saveAdminNameBtn');

        function updateAdminNameDisplay() {
            adminNameDisplay.textContent = adminName;
            headerAdminName.textContent = adminName;
        }

        function updateAdminAvatarDisplay() {
            if (adminPhotoUrl) {
                loginAvatarImg.src = adminPhotoUrl;
                loginAvatarImg.style.display = 'block';
                loginAvatarInitial.style.display = 'none';
                loginAvatarCircle.classList.add('has-photo');
            } else {
                loginAvatarImg.style.display = 'none';
                loginAvatarInitial.style.display = 'block';
                loginAvatarCircle.classList.remove('has-photo');
                const initials = adminName.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
                loginAvatarInitial.textContent = initials;
            }
        }

        const overlay = document.getElementById('loginOverlay');
        const pwInput = document.getElementById('loginPassword');
        const loginBtnEl = document.getElementById('loginBtn');
        const guestBtn = document.getElementById('viewAsGuest');
        const errEl = document.getElementById('loginError');
        const badge = document.getElementById('roleBadge');

        function enterApp(admin) {
            window.__isAdmin = admin;
            overlay.classList.add('hidden');
            badge.className = admin ? 'admin-badge' : 'viewer-badge';
            badge.textContent = admin ? '👑 Admin' : '👨‍🎓 Student';
            errEl.style.display = 'none';
            document.body.classList.toggle('is-admin', admin);
            updateEditProfileBtnVisibility();
            if (window.__fireLogin) window.__fireLogin();
        }

        loginBtnEl.addEventListener('click', async function() {
            if (await sha256(pwInput.value) === adminPasswordHash) enterApp(true);
            else { errEl.style.display = 'block'; pwInput.value = ''; }
        });
        pwInput.addEventListener('keypress', function(e) { if (e.key === 'Enter') loginBtnEl.click(); });
        guestBtn.addEventListener('click', function() { enterApp(false); });

        document.getElementById('logoutBtn').addEventListener('click', function() {
            window.__isAdmin = false;
            document.body.classList.remove('is-admin');
            if (window.__unsubscribeAll) window.__unsubscribeAll();
            if (window._inboxUnsub) { window._inboxUnsub(); window._inboxUnsub = null; }
            currentSectionId = null;
            studentPrompted = false;
            overlay.classList.remove('hidden');
            pwInput.value = '';
            errEl.style.display = 'none';
            badge.className = 'viewer-badge';
            badge.textContent = '👨‍🎓 Student';
            headerAdminName.textContent = '';
        });

        async function loadAdminSettings() {
            try {
                const settingsDoc = await getDoc(doc(db, 'settings', 'admin'));
                if (settingsDoc.exists()) {
                    const data = settingsDoc.data();
                    if (data.adminPwHash) {
                        adminPasswordHash = data.adminPwHash;
                    } else if (data.adminPw) {
                        adminPasswordHash = await sha256(data.adminPw);
                        await setDoc(doc(db, 'settings', 'admin'), { adminPwHash: adminPasswordHash, adminPw: deleteField() }, { merge: true });
                    } else {
                        adminPasswordHash = await sha256('admin123');
                        await setDoc(doc(db, 'settings', 'admin'), { adminPwHash: adminPasswordHash }, { merge: true });
                    }
                    adminName = data.adminName || 'Zeraldin Cauba';
                    adminPhotoUrl = data.adminPhoto || '';
                    gcashQRUrl = data.gcashQR || '';
                    allowStudentEdit = data.allowStudentEdit || false;
                    document.getElementById('allowStudentEditToggle').checked = allowStudentEdit;
                    localStorage.setItem('fm_gcash_qr', gcashQRUrl);
                    updateAdminNameDisplay();
                    updateAdminAvatarDisplay();
                } else {
                    adminPasswordHash = await sha256('admin123');
                    await setDoc(doc(db, 'settings', 'admin'), { adminPwHash: adminPasswordHash, adminName: 'Zeraldin Cauba', adminPhoto: '', gcashQR: '', allowStudentEdit: false, visitorCount: 0 });
                    updateAdminNameDisplay();
                    updateAdminAvatarDisplay();
                }
            } catch (e) {
                const legacyPw = localStorage.getItem('fm_admin_pw');
                if (legacyPw) {
                    adminPasswordHash = await sha256(legacyPw);
                    localStorage.setItem('fm_admin_pw_hash', adminPasswordHash);
                    localStorage.removeItem('fm_admin_pw');
                } else {
                    adminPasswordHash = localStorage.getItem('fm_admin_pw_hash') || await sha256('admin123');
                }
                adminName = localStorage.getItem('fm_admin_name') || 'Zeraldin Cauba';
                adminPhotoUrl = localStorage.getItem('fm_admin_photo') || '';
                gcashQRUrl = localStorage.getItem('fm_gcash_qr') || '';
                allowStudentEdit = localStorage.getItem('fm_allow_student_edit') === 'true';
                document.getElementById('allowStudentEditToggle').checked = allowStudentEdit;
                visitorCount = parseInt(localStorage.getItem('fm_visitor_count') || '0');
                document.getElementById('visitorCountNum').textContent = visitorCount;
                updateAdminNameDisplay();
                updateAdminAvatarDisplay();
            }
        }

        function startSettingsListener() {
            if (unsubscribeSettings) unsubscribeSettings();
            unsubscribeSettings = onSnapshot(doc(db, 'settings', 'admin'), async (settingsDoc) => {
                if (settingsDoc.exists()) {
                    const data = settingsDoc.data();
                    if (data.adminPwHash) {
                        adminPasswordHash = data.adminPwHash;
                    } else if (data.adminPw) {
                        adminPasswordHash = await sha256(data.adminPw);
                        await setDoc(doc(db, 'settings', 'admin'), { adminPwHash: adminPasswordHash, adminPw: deleteField() }, { merge: true });
                    }
                    adminName = data.adminName || 'Zeraldin Cauba';
                    adminPhotoUrl = data.adminPhoto || '';
                    gcashQRUrl = data.gcashQR || '';
                    allowStudentEdit = data.allowStudentEdit || false;
                    document.getElementById('allowStudentEditToggle').checked = allowStudentEdit;
                    updateEditProfileBtnVisibility();
                    visitorCount = data.visitorCount || 0;
                    document.getElementById('visitorCountNum').textContent = visitorCount;
                    localStorage.setItem('fm_visitor_count', visitorCount);
                    localStorage.setItem('fm_gcash_qr', gcashQRUrl);
                    updateAdminNameDisplay();
                    updateAdminAvatarDisplay();
                    updateMainGcash();
                    updateQRPreview();
                }
            }, () => {});
        }

        async function trackVisitor() {
            if (localStorage.getItem('fm_visited')) return;
            try {
                const ref = doc(db, 'settings', 'admin');
                await updateDoc(ref, { visitorCount: (visitorCount || 0) + 1 });
                localStorage.setItem('fm_visited', '1');
            } catch(e) {}
        }

        saveAdminNameBtn.addEventListener('click', async function() {
            const newName = settingsAdminName.value.trim();
            if (!newName) { await showAlert('Please enter a name!'); return; }
            adminName = newName;
            updateAdminNameDisplay();
            updateAdminAvatarDisplay();
            localStorage.setItem('fm_admin_name', adminName);
            try { await updateDoc(doc(db, 'settings', 'admin'), { adminName: adminName }); } catch(e) {}
            await showAlert('✅ Admin name updated!');
        });

        document.getElementById('allowStudentEditToggle').addEventListener('change', async function() {
            allowStudentEdit = this.checked;
            localStorage.setItem('fm_allow_student_edit', allowStudentEdit);
            try { await updateDoc(doc(db, 'settings', 'admin'), { allowStudentEdit }); } catch(e) {}
            updateEditProfileBtnVisibility();
        });

        function updateEditProfileBtnVisibility() {
            const btn = document.getElementById('editProfileBtn');
            if (!getIsAdmin() && allowStudentEdit) {
                btn.style.display = '';
            } else {
                btn.style.display = 'none';
            }
        }

        window.closeStudentEditModal = function() {
            document.getElementById('studentEditModal').classList.remove('active');
        };

        document.getElementById('editProfileBtn').addEventListener('click', function() {
            const sid = localStorage.getItem('fm_student_session_id');
            if (!sid) return;
            const student = students.find(s => String(s.id) === String(sid));
            if (!student) return;
            document.getElementById('editStudentName').value = student.name || '';
            document.getElementById('editStudentGender').value = student.gender || 'male';
            document.getElementById('editStudentRelation').value = student.relationStatus || 'Single';
            document.getElementById('studentEditModal').classList.add('active');
        });

        document.getElementById('saveStudentEditBtn').addEventListener('click', async function() {
            const sid = localStorage.getItem('fm_student_session_id');
            if (!sid) { await showAlert('⛔ No student session.'); return; }
            const name = document.getElementById('editStudentName').value.trim();
            if (!name) { await showAlert('⛔ Name cannot be empty.'); return; }
            const gender = document.getElementById('editStudentGender').value;
            const relation = document.getElementById('editStudentRelation').value;
            try {
                await updateDoc(doc(db, 'students', String(sid)), { name, gender, relationStatus: relation });
                const idx = students.findIndex(s => String(s.id) === String(sid));
                if (idx !== -1) {
                    students[idx].name = name;
                    students[idx].gender = gender;
                    students[idx].relationStatus = relation;
                }
                renderStudentList();
                showStudentProfile(sid);
                closeStudentEditModal();
                await showAlert('✅ Profile updated!');
            } catch (e) {
                await showAlert('⛔ Error: ' + e.message);
            }
        });

        adminPhotoInput.addEventListener('change', async function() {
            if (!adminPhotoInput.files[0]) return;
            const photoUrl = await readFileAsBase64(adminPhotoInput.files[0]);
            adminPhotoUrl = photoUrl;
            updateAdminAvatarDisplay();
            localStorage.setItem('fm_admin_photo', adminPhotoUrl);
            try { await updateDoc(doc(db, 'settings', 'admin'), { adminPhoto: adminPhotoUrl }); } catch(e) {}
            adminPhotoInput.value = '';
        });

        try { await signInAnonymously(auth); } catch (e) { console.warn('Anonymous auth unavailable:', e.message); }
        await loadAdminSettings();
        startSettingsListener();
        trackVisitor();

        const loginOverlay = document.getElementById('loginOverlay');
        const loginPassword = document.getElementById('loginPassword');
        const loginBtn = document.getElementById('loginBtn');
        const loginError = document.getElementById('loginError');
        const viewAsGuest = document.getElementById('viewAsGuest');
        const roleBadge = document.getElementById('roleBadge');
        const darkToggle = document.getElementById('darkToggle');
        const changePwBtn = document.getElementById('changePwBtn');
        const logoutBtn = document.getElementById('logoutBtn');
        const changePwModal = document.getElementById('changePwModal');
        const currentPw = document.getElementById('currentPw');
        const newPw = document.getElementById('newPw');
        const confirmPw = document.getElementById('confirmPw');
        const savePwBtn = document.getElementById('savePwBtn');
        const settingsGcashNumber = document.getElementById('settingsGcashNumber');
        const settingsGcashName = document.getElementById('settingsGcashName');
        const saveGcashBtn = document.getElementById('saveGcashBtn');
        const sectionSelect = document.getElementById('sectionSelect');
        const sectionSelectView = document.getElementById('sectionSelectView');
        const addSectionBtn = document.getElementById('addSectionBtn');
        const nameInput = document.getElementById('studentName');
        const genderSelect = document.getElementById('studentGender');
        const relationStatusSelect = document.getElementById('studentRelationStatus');
        const fineInput = document.getElementById('studentFine');
        const statusSelect = document.getElementById('studentStatus');
        const addBtn = document.getElementById('addBtn');
        const clearFormBtn = document.getElementById('clearFormBtn');
        const studentListContainer = document.getElementById('studentListContainer');
        const searchInput = document.getElementById('searchInput');
        const filterGenderSelect = document.getElementById('filterGender');
        const filterStatusSelect = document.getElementById('filterStatus');
        const sortBySelect = document.getElementById('sortBy');
        const exportCsvBtn = document.getElementById('exportCsvBtn');
        const exportPaymentsBtn = document.getElementById('exportPaymentsBtn');
        const paymentModal = document.getElementById('paymentModal');
        const paymentAmount = document.getElementById('paymentAmount');
        const paymentDate = document.getElementById('paymentDate');
        const paymentNote = document.getElementById('paymentNote');
        const paymentRef = document.getElementById('paymentRef');
        const gcashNumber = document.getElementById('gcashNumber');
        const gcashName = document.getElementById('gcashName');
        const mainGcashNumber = document.getElementById('mainGcashNumber');
        const mainGcashName = document.getElementById('mainGcashName');
        const mainGcashQR = document.getElementById('mainGcashQR');
        const uploadQrBtn = document.getElementById('uploadQrBtn');
        const deleteQrBtn = document.getElementById('deleteQrBtn');
        const qrUploadInput = document.getElementById('qrUploadInput');
        const qrPreviewImg = document.getElementById('qrPreviewImg');
        const qrNoPreview = document.getElementById('qrNoPreview');
        const submitPaymentBtn = document.getElementById('submitPaymentBtn');
        const paymentHistoryList = document.getElementById('paymentHistoryList');
        const paymentModalTitle = document.getElementById('paymentModalTitle');
        const suggestionModal = document.getElementById('suggestionModal');
        const suggestionName = document.getElementById('suggestionName');
        const suggestionText = document.getElementById('suggestionText');
        const submitSuggestionBtn = document.getElementById('submitSuggestionBtn');
        const suggestionsList = document.getElementById('suggestionsList');
        const openSuggestionsBtn = document.getElementById('openSuggestionsBtn');
        const customAlertOverlay = document.getElementById('customAlertOverlay');
        const customAlertMsg = document.getElementById('customAlertMsg');
        const customAlertInput = document.getElementById('customAlertInput');
        const customAlertBtns = document.getElementById('customAlertBtns');
        const customAlertClose = document.getElementById('customAlertClose');
        const photoUploadInput = document.getElementById('photoUploadInput');

        customAlertClose.addEventListener('click', function() {
            customAlertOverlay.classList.add('hidden');
            if (unsubscribeStudents) { unsubscribeStudents(); unsubscribeStudents = null; }
            currentSectionId = null;
            sections = [];
            students = [];
            studentPrompted = false;
            overlay.classList.remove('hidden');
            pwInput.value = '';
            errEl.style.display = 'none';
        });

        document.getElementById('date').textContent = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

        // Use getIsAdmin() from inline script
        function getIsAdmin() { return window.__isAdmin === true; }
        function getAdminPasswordHash() { return adminPasswordHash; }

        function showAlert(msg) {
            return new Promise((resolve) => {
                customAlertMsg.textContent = msg;
                customAlertInput.style.display = 'none';
                customAlertBtns.innerHTML = '<button class="custom-alert-btn custom-alert-ok" id="caOk">OK</button>';
                customAlertOverlay.classList.remove('hidden');
                document.getElementById('caOk').onclick = () => { customAlertOverlay.classList.add('hidden'); resolve(); };
            });
        }

        function showConfirm(msg) {
            return new Promise((resolve) => {
                customAlertMsg.textContent = msg;
                customAlertInput.style.display = 'none';
                customAlertBtns.innerHTML = '<button class="custom-alert-btn custom-alert-cancel" id="caNo">Cancel</button><button class="custom-alert-btn custom-alert-ok" id="caYes">OK</button>';
                customAlertOverlay.classList.remove('hidden');
                document.getElementById('caYes').onclick = () => { customAlertOverlay.classList.add('hidden'); resolve(true); };
                document.getElementById('caNo').onclick = () => { customAlertOverlay.classList.add('hidden'); resolve(false); };
            });
        }

        function showPrompt(msg, defaultVal = '') {
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
        window.__fireLogin = function() {
            document.body.classList.toggle('is-admin', getIsAdmin());
            initApp();
        };

        function renderThemeSwatches() {
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
        function getFinePresets() {
            try { return JSON.parse(localStorage.getItem('fm_fine_presets')) || []; } catch(e) { return []; }
        }
        function saveFinePresets(presets) {
            localStorage.setItem('fm_fine_presets', JSON.stringify(presets));
        }
        function renderFinePresets() {
            const container = document.getElementById('finePresets');
            if (!container) return;
            const presets = getFinePresets();
            if (presets.length === 0) { container.innerHTML = ''; return; }
            container.innerHTML = presets.map((p, i) =>
                `<button onclick="document.getElementById('studentFine').value='${p.amount}'" style="padding:2px 8px;border-radius:12px;border:1px solid var(--accent-a27);background:var(--accent-a7);color:var(--accent);font-size:0.6rem;cursor:pointer;font-family:monospace;white-space:nowrap;">${p.label} ₱${p.amount}</button>`
            ).join('');
        }
        function renderPresetsManager() {
            const container = document.getElementById('presetsManager');
            if (!container) return;
            const presets = getFinePresets();
            if (presets.length === 0) { container.innerHTML = '<div style="font-size:0.75rem;color:#6b7280;">No presets yet. Add one below.</div>'; return; }
            container.innerHTML = presets.map((p, i) =>
                `<div style="display:flex;align-items:center;gap:6px;background:#0d1520;border-radius:8px;padding:4px 8px;"><span style="flex:1;font-size:0.8rem;color:#e0e0e0;font-family:monospace;">${p.label}</span><span style="font-size:0.8rem;color:var(--amber);font-weight:bold;font-family:monospace;">₱${p.amount}</span><button onclick="deletePreset(${i})" style="background:none;border:none;color:#ef4444;cursor:pointer;font-size:0.8rem;padding:2px 6px;">✕</button></div>`
            ).join('');
        }
        function deletePreset(index) {
            const presets = getFinePresets();
            presets.splice(index, 1);
            saveFinePresets(presets);
            renderPresetsManager();
            renderFinePresets();
        }
        function isSoundOn() { return localStorage.getItem('fm_sound') !== 'off'; }
        function toggleSound(on) { localStorage.setItem('fm_sound', on ? 'on' : 'off'); }
        function playSound(type) {
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
        function getSmsSettings() {
            try { return JSON.parse(localStorage.getItem('fm_sms_settings') || '{}'); } catch { return {}; }
        }
        function saveSmsSettings(s) { localStorage.setItem('fm_sms_settings', JSON.stringify(s)); }
        function loadSmsSettings() {
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
        async function sendSms(phone, message) {
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
        changePwBtn.addEventListener('click', () => {
            changePwModal.classList.add('active');
            currentPw.value = ''; newPw.value = ''; confirmPw.value = '';
            settingsAdminName.value = adminName;
            settingsGcashNumber.value = localStorage.getItem('fm_gcash_number') || '';
            settingsGcashName.value = localStorage.getItem('fm_gcash_name') || '';
            updateQRPreview();
            renderThemeSwatches();
            renderPresetsManager();
            const soundCb = document.getElementById('soundToggle');
            if (soundCb) soundCb.checked = isSoundOn();
            loadSmsSettings();
        });

        savePwBtn.addEventListener('click', async () => {
            if (await sha256(currentPw.value) !== getAdminPasswordHash()) { await showAlert('Current password is wrong!'); return; }
            if (newPw.value.length < 4) { await showAlert('Password must be at least 4 characters!'); return; }
            if (newPw.value !== confirmPw.value) { await showAlert('New passwords do not match!'); return; }
            const newHash = await sha256(newPw.value);
            adminPasswordHash = newHash;
            localStorage.setItem('fm_admin_pw_hash', newHash);
            localStorage.removeItem('fm_admin_pw');
            try { await updateDoc(doc(db, 'settings', 'admin'), { adminPwHash: newHash, adminPw: deleteField() }); } catch(e) {}
            await showAlert('✅ Password changed!');
            closeChangePwModal();
        });

        saveGcashBtn.addEventListener('click', async () => {
            const num = settingsGcashNumber.value.trim();
            const name = settingsGcashName.value.trim();
            if (!num || num.length < 11) { await showAlert('Enter a valid 11-digit GCash number'); return; }
            if (!name) { await showAlert('Enter the GCash account name'); return; }
            const oldNum = localStorage.getItem('fm_gcash_number') || '';
            let hadQR = gcashQRUrl ? true : false;
            if (num !== oldNum && hadQR) {
                gcashQRUrl = '';
                localStorage.removeItem('fm_gcash_qr');
                try { await updateDoc(doc(db, 'settings', 'admin'), { gcashQR: '' }); } catch(e) {}
                updateQRPreview();
            }
            localStorage.setItem('fm_gcash_number', num);
            localStorage.setItem('fm_gcash_name', name);
            let msg = '✅ GCash info saved!';
            if (num !== oldNum && hadQR) msg += '\n\n📷 Old QR cleared. Please upload your new GCash QR image.';
            await showAlert(msg);
            updateMainGcash();
        });

        function updateQRPreview() {
            gcashQRUrl = localStorage.getItem('fm_gcash_qr') || '';
            if (gcashQRUrl) {
                qrPreviewImg.src = gcashQRUrl;
                qrPreviewImg.style.display = 'block';
                qrNoPreview.style.display = 'none';
                deleteQrBtn.style.display = 'block';
            } else {
                qrPreviewImg.style.display = 'none';
                qrNoPreview.style.display = 'block';
                deleteQrBtn.style.display = 'none';
            }
        }

        uploadQrBtn.addEventListener('click', () => qrUploadInput.click());

        qrUploadInput.addEventListener('change', async () => {
            if (!qrUploadInput.files[0]) return;
            const reader = new FileReader();
            reader.onload = async () => {
                gcashQRUrl = reader.result;
                localStorage.setItem('fm_gcash_qr', gcashQRUrl);
                try { await updateDoc(doc(db, 'settings', 'admin'), { gcashQR: gcashQRUrl }); } catch(e) {}
                updateQRPreview();
                updateMainGcash();
                await showAlert('✅ QR code uploaded!');
            };
            reader.readAsDataURL(qrUploadInput.files[0]);
            qrUploadInput.value = '';
        });

        deleteQrBtn.addEventListener('click', async () => {
            if (!await showConfirm('Delete QR code image?')) return;
            gcashQRUrl = '';
            localStorage.removeItem('fm_gcash_qr');
            try { await updateDoc(doc(db, 'settings', 'admin'), { gcashQR: '' }); } catch(e) {}
            updateQRPreview();
            updateMainGcash();
            await showAlert('🗑️ QR code deleted!');
        });

        function closeChangePwModal() { changePwModal.classList.remove('active'); }
        window.closeChangePwModal = closeChangePwModal;
        changePwModal.addEventListener('click', (e) => { if (e.target === changePwModal) closeChangePwModal(); });

        function loadDarkMode() {
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

        function nextId(arr) { return arr.length > 0 ? Math.max(...arr.map(x => x.id)) + 1 : 1; }

        function updateMainGcash() {
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

        function initApp() {
            updateMainGcash();
            loadSections();
            renderFinePresets();
            loadAnnouncements();
            updateInboxBadge();
            if (!getIsAdmin()) updateStudentLastOnline();
        }

        let heartbeatInterval = null;
        function updateStudentLastOnline() {
            const sid = localStorage.getItem('fm_student_session_id');
            if (!sid) return;
            updateDoc(doc(db, 'students', sid), { lastOnline: Date.now() }).catch(() => {});
        }
        function startHeartbeat(sid) {
            localStorage.setItem('fm_student_session_id', sid);
            updateDoc(doc(db, 'students', sid), { lastOnline: Date.now() }).catch(() => {});
            heartbeatInterval = setInterval(updateStudentLastOnline, 30000);
            showStudentProfile(sid);
        }
        function stopHeartbeat() {
            if (heartbeatInterval) clearInterval(heartbeatInterval);
            localStorage.removeItem('fm_student_session_id');
            hideStudentProfile();
            document.getElementById('editProfileBtn').style.display = 'none';
        }
        function showWelcome(studentName) {
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
        function createWelcomeParticles(overlay) {
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
        function showStudentProfile(studentId) {
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
        function hideStudentProfile() {
            document.getElementById('studentProfileBar').classList.remove('active');
        }
        window.uploadStudentProfile = function() {
            const sid = localStorage.getItem('fm_student_session_id');
            if (!sid) { showAlert('⛔ No student session active.'); return; }
            photoUploadStudentId = sid;
            photoUploadInput.click();
        };
        window.__startStudentSession = function(studentId) {
            stopHeartbeat();
            startHeartbeat(studentId);
        };

        window.__unsubscribeAll = function() {
            if (unsubscribeSections) unsubscribeSections();
            if (unsubscribeStudents) unsubscribeStudents();
            if (unsubscribeSuggestions) unsubscribeSuggestions();
            if (unsubscribeSettings) unsubscribeSettings();
            stopHeartbeat();
        };

        function loadSections() {
            if (unsubscribeSections) unsubscribeSections();
            const q = query(collection(db, 'sections'), orderBy('order'));
            unsubscribeSections = onSnapshot(q, (snapshot) => {
                sections = [];
                snapshot.forEach((d) => sections.push({ id: parseInt(d.id), ...d.data() }));
                if (sections.length === 0) {
                    const defaultId = Date.now();
                    setDoc(doc(db, 'sections', String(defaultId)), { name: 'BSIS-1A', order: 0 });
                }
                const html = sections.map(s => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('');
                sectionSelect.innerHTML = html;
                sectionSelectView.innerHTML = html;
                if (sections.length > 0 && !currentSectionId) {
                    currentSectionId = sections[0].id;
                    loadStudents();
                }
            });
        }

        function loadStudents() {
            if (unsubscribeStudents) unsubscribeStudents();
            studentListContainer.innerHTML = '<div class="loading-msg">Loading students...</div>';
            const q = query(collection(db, 'students'), orderBy('name'));
            studentPrompted = false;
            unsubscribeStudents = onSnapshot(q, (snapshot) => {
                students = [];
                snapshot.forEach((d) => students.push({ id: parseInt(d.id), ...d.data() }));
                students = students.filter(s => s.section_id === currentSectionId);
                renderStudentList();
                updateStats();
                const sid = localStorage.getItem('fm_student_session_id');
                if (sid && !getIsAdmin()) {
                    showStudentProfile(sid);
                }
                if (!getIsAdmin() && !studentPrompted) {
                    studentPrompted = true;
                    const student = sid ? students.find(s => String(s.id) === String(sid)) : null;
                    if (sid && student && student.pw) {
                        startHeartbeat(sid);
                    } else if (students.length > 0) {
                        stopHeartbeat();
                        promptStudentSelect();
                    }
                }
            });
        }

        function promptStudentSelect() {
            const activeSid = localStorage.getItem('fm_student_session_id');
            document.querySelector('.custom-alert-title').textContent = 'Jonard Suete says!!';
            customAlertMsg.innerHTML = `
                <label style="font-size:0.8rem;font-weight:bold;display:block;">👤 Search your name:</label>
                <input type="text" id="studentSessionInput" placeholder="Type your name..." style="width:100%;padding:8px;margin-top:6px;border-radius:12px;border:2px solid #e2cf9a;font-size:0.85rem;" autocomplete="off">
                <div id="sessionMatches" style="max-height:120px;overflow-y:auto;margin-top:6px;"></div>
            `;
            customAlertInput.style.display = 'none';
            customAlertBtns.innerHTML = '';
            customAlertOverlay.classList.remove('hidden');
            const inp = document.getElementById('studentSessionInput');
            const matchBox = document.getElementById('sessionMatches');
            inp.focus();
            inp.addEventListener('input', function() {
                const q = inp.value.toLowerCase();
                if (!q) { matchBox.innerHTML = ''; return; }
                const matches = students.filter(s => s.name.toLowerCase().includes(q));
                if (matches.length === 0) { matchBox.innerHTML = '<div style="padding:8px;font-size:0.75rem;color:#999;">No matches found</div>'; return; }
                matchBox.innerHTML = matches.slice(0, 8).map(s => `<div onclick="window.__pickSession('${s.id}')" style="padding:8px 10px;border-bottom:1px solid #eee;cursor:pointer;font-size:0.8rem;border-radius:6px;${String(s.id) === String(activeSid) ? 'background:#e8f4e8;font-weight:bold;' : ''}">${escapeHtml(s.name)}${String(s.id) === String(activeSid) ? ' ✓' : ''}</div>`).join('');
            });
        }
        window.__pickSession = function(id) {
            customAlertOverlay.classList.add('hidden');
            promptStudentPassword(id);
        };
        function promptStudentPassword(studentId) {
            const student = students.find(s => String(s.id) === String(studentId));
            if (!student) return;
            const existingPw = student.pw || null;
            document.querySelector('.custom-alert-title').textContent = '🔐 ' + student.name;
            if (existingPw) {
                customAlertMsg.innerHTML = `
                    <label style="font-size:0.75rem;font-weight:bold;display:block;">Enter your password:</label>
                    <input type="password" id="studentPwInput" placeholder="••••••••" style="width:100%;padding:10px;margin-top:6px;border-radius:12px;border:2px solid #e2cf9a;font-size:0.9rem;text-align:center;letter-spacing:3px;" autocomplete="off">
                    <div style="text-align:center;margin-top:8px;"><a id="forgotPwLink" style="font-size:0.7rem;color:#4682b4;cursor:pointer;text-decoration:underline;">🔑 Forgot password? Create new one</a></div>
                `;
                customAlertBtns.innerHTML = '<button class="custom-alert-btn custom-alert-ok" id="caPwOk">🔓 Enter</button>';
                customAlertInput.style.display = 'none';
                customAlertOverlay.classList.remove('hidden');
                const pwIn = document.getElementById('studentPwInput');
                pwIn.focus();
                const checkPw = async () => {
                    let match = false;
                    if (isHashed(existingPw)) {
                        match = (await sha256(pwIn.value)) === existingPw;
                    } else {
                        match = pwIn.value === existingPw;
                        if (match) {
                            const h = await sha256(pwIn.value);
                            await updateDoc(doc(db, 'students', String(studentId)), { pw: h });
                            const migIdx = students.findIndex(s => String(s.id) === String(studentId));
                            if (migIdx !== -1) students[migIdx].pw = h;
                        }
                    }
                    if (match) {
                        customAlertOverlay.classList.add('hidden');
                        document.querySelector('.custom-alert-title').textContent = 'Jonard Suete';
                        startHeartbeat(studentId);
                        showWelcome(student.name);
                    } else {
                        pwIn.style.borderColor = '#dc3545';
                        pwIn.value = '';
                        pwIn.placeholder = 'Wrong! Try again';
                        setTimeout(() => { pwIn.style.borderColor = '#e2cf9a'; pwIn.placeholder = '••••••••'; }, 1500);
                    }
                };
                document.getElementById('caPwOk').onclick = checkPw;
                pwIn.addEventListener('keydown', function(e) { if (e.key === 'Enter') { e.preventDefault(); checkPw(); } });
                document.getElementById('forgotPwLink').onclick = function() {
                    customAlertOverlay.classList.add('hidden');
                    promptCreateNewPassword(studentId);
                };
            } else {
                customAlertMsg.innerHTML = `
                    <p style="font-size:0.75rem;color:#888;margin-bottom:10px;">No password yet. Create one for your account:</p>
                    <input type="password" id="newStudentPw" placeholder="New password (4+ chars)" style="width:100%;padding:10px;margin-bottom:8px;border-radius:12px;border:2px solid #e2cf9a;font-size:0.9rem;text-align:center;letter-spacing:3px;" autocomplete="off">
                    <input type="password" id="confirmStudentPw" placeholder="Confirm password" style="width:100%;padding:10px;border-radius:12px;border:2px solid #e2cf9a;font-size:0.9rem;text-align:center;letter-spacing:3px;" autocomplete="off">
                    <div id="createPwError" style="font-size:0.75rem;color:#dc3545;margin-top:6px;display:none;"></div>
                `;
                customAlertBtns.innerHTML = '<button class="custom-alert-btn custom-alert-ok" id="caCreatePw">✅ Create</button>';
                customAlertInput.style.display = 'none';
                customAlertOverlay.classList.remove('hidden');
                const newPw = document.getElementById('newStudentPw');
                const confPw = document.getElementById('confirmStudentPw');
                const errEl = document.getElementById('createPwError');
                newPw.focus();
                const doCreate = async function() {
                    const p1 = newPw.value;
                    const p2 = confPw.value;
                    if (p1.length < 4) { errEl.textContent = 'Password must be at least 4 characters!'; errEl.style.display = 'block'; return; }
                    if (p1 !== p2) { errEl.textContent = 'Passwords do not match!'; errEl.style.display = 'block'; return; }
                    const h = await sha256(p1);
                    localStorage.setItem('fm_student_pw_' + studentId, h);
                    await updateDoc(doc(db, 'students', String(studentId)), { pw: h });
                    const idx = students.findIndex(s => String(s.id) === String(studentId));
                    if (idx !== -1) students[idx].pw = h;
                    const studentName = student.name;
                    customAlertOverlay.classList.add('hidden');
                    document.querySelector('.custom-alert-title').textContent = 'Jonard Suete';
                    startHeartbeat(studentId);
                    showWelcome(studentName);
                    customAlertMsg.textContent = '✅ Password created successfully!';
                    customAlertBtns.innerHTML = '<button class="custom-alert-btn custom-alert-ok" id="caOk">OK</button>';
                    customAlertInput.style.display = 'none';
                    customAlertOverlay.classList.remove('hidden');
                    document.getElementById('caOk').onclick = function() { customAlertOverlay.classList.add('hidden'); };
                };
                document.getElementById('caCreatePw').onclick = doCreate;
                confPw.addEventListener('keydown', function(e) { if (e.key === 'Enter') { e.preventDefault(); doCreate(); } });
                newPw.addEventListener('keydown', function(e) { if (e.key === 'Enter') { e.preventDefault(); confPw.focus(); } });
            }
        }
        function promptCreateNewPassword(studentId) {
            const student = students.find(s => String(s.id) === String(studentId));
            if (!student) return;
            document.querySelector('.custom-alert-title').textContent = '🔐 Reset ' + student.name;
            customAlertMsg.innerHTML = `
                <p style="font-size:0.7rem;color:#888;margin-bottom:10px;">Create a new password (old one will be deleted):</p>
                <input type="password" id="newStudentPw2" placeholder="New password (4+ chars)" style="width:100%;padding:10px;margin-bottom:8px;border-radius:12px;border:2px solid #e2cf9a;font-size:0.9rem;text-align:center;letter-spacing:3px;" autocomplete="off">
                <input type="password" id="confirmStudentPw2" placeholder="Confirm password" style="width:100%;padding:10px;border-radius:12px;border:2px solid #e2cf9a;font-size:0.9rem;text-align:center;letter-spacing:3px;" autocomplete="off">
                <div id="resetPwError" style="font-size:0.75rem;color:#dc3545;margin-top:6px;display:none;"></div>
            `;
            customAlertBtns.innerHTML = '<button class="custom-alert-btn custom-alert-ok" id="caResetPw">✅ Reset</button>';
            customAlertInput.style.display = 'none';
            customAlertOverlay.classList.remove('hidden');
            const newPw = document.getElementById('newStudentPw2');
            const confPw = document.getElementById('confirmStudentPw2');
            const errEl = document.getElementById('resetPwError');
            newPw.focus();
            const doReset = async function() {
                const p1 = newPw.value;
                const p2 = confPw.value;
                if (p1.length < 4) { errEl.textContent = 'Password must be at least 4 characters!'; errEl.style.display = 'block'; return; }
                if (p1 !== p2) { errEl.textContent = 'Passwords do not match!'; errEl.style.display = 'block'; return; }
                const h = await sha256(p1);
                localStorage.setItem('fm_student_pw_' + studentId, h);
                await updateDoc(doc(db, 'students', String(studentId)), { pw: h });
                const idx2 = students.findIndex(s => String(s.id) === String(studentId));
                if (idx2 !== -1) students[idx2].pw = h;
                const studentName2 = student.name;
                customAlertOverlay.classList.add('hidden');
                document.querySelector('.custom-alert-title').textContent = 'Jonard Suete';
                startHeartbeat(studentId);
                showWelcome(studentName2);
                customAlertMsg.textContent = '✅ Password created successfully!';
                customAlertBtns.innerHTML = '<button class="custom-alert-btn custom-alert-ok" id="caOk">OK</button>';
                customAlertInput.style.display = 'none';
                customAlertOverlay.classList.remove('hidden');
                document.getElementById('caOk').onclick = function() { customAlertOverlay.classList.add('hidden'); };
            };
            document.getElementById('caResetPw').onclick = doReset;
            confPw.addEventListener('keydown', function(e) { if (e.key === 'Enter') { e.preventDefault(); doReset(); } });
            newPw.addEventListener('keydown', function(e) { if (e.key === 'Enter') { e.preventDefault(); confPw.focus(); } });
        }

        function updateStats() {
            const totalStudents = students.length;
            const totalFines = students.reduce((sum, s) => sum + (s.fine || 0), 0);
            const avgFine = totalStudents > 0 ? totalFines / totalStudents : 0;
            const highestFine = totalStudents > 0 ? Math.max(...students.map(s => s.fine || 0)) : 0;
            const paid = students.filter(s => s.status === 'paid').length;
            const unpaid = totalStudents - paid;
            let totalCollected = 0;
            students.forEach(s => { totalCollected += (s.totalPaid || 0); });
            document.getElementById('statTotalStudents').textContent = totalStudents;
            document.getElementById('statTotalFines').textContent = '₱' + totalFines.toFixed(0);
            document.getElementById('statAvgFine').textContent = '₱' + avgFine.toFixed(0);
            document.getElementById('statHighestFine').textContent = '₱' + highestFine.toFixed(0);
            document.getElementById('statPaidUnpaid').textContent = paid + '/' + unpaid;
            document.getElementById('statCollected').textContent = '₱' + totalCollected.toFixed(0);
            updateCollectionProgress(totalFines, totalCollected);
            renderLeaderboard(totalStudents);
        }
        function renderLeaderboard(totalStudents) {
            const box = document.getElementById('leaderboardBox');
            const list = document.getElementById('lbList');
            const lbTotal = document.getElementById('lbTotalStudents');
            const toggleWrap = document.getElementById('lbToggleWrap');
            if (!box || !list) return;
            const sorted = [...students].sort((a, b) => (b.fine || 0) - (a.fine || 0));
            const top = sorted.slice(0, 10);
            if (top.length === 0 || top[0].fine <= 0) { box.style.display = 'none'; return; }
            box.style.display = 'block';
            if (lbTotal) lbTotal.textContent = totalStudents;
            const showAll = window._lbShowAll === true;
            const medals = ['🥇', '🥈', '🥉'];
            const visible = showAll ? top : top.slice(0, 3);
            const barW = (s) => top[0].fine > 0 ? ((s.fine || 0) / top[0].fine) * 100 : 0;
            const row = (s, i) => {
                const rank = i < 3 ? medals[i] : `#${i + 1}`;
                const w = top[0].fine > 0 ? ((s.fine || 0) / top[0].fine) * 100 : 0;
                return `<div style="display:flex;align-items:center;gap:8px;padding:6px 4px;border-bottom:${i < top.length - 1 ? '1px solid #1e293b' : 'none'};">
                    <span style="font-size:0.8rem;width:28px;text-align:center;">${rank}</span>
                    <span style="flex:1;font-size:0.75rem;font-weight:600;color:#e0e0e0;">${escapeHtml(s.name)}</span>
                    <div style="width:60px;height:6px;background:#0d1520;border-radius:3px;overflow:hidden;">
                        <div style="height:100%;width:${w}%;background:linear-gradient(90deg,var(--amber),var(--accent));border-radius:3px;"></div>
                    </div>
                    <span style="font-size:0.75rem;font-weight:bold;color:${s.status === 'paid' ? '#10b981' : '#f87171'};min-width:55px;text-align:right;font-family:monospace;">₱${(s.fine || 0).toFixed(0)}</span>
                </div>`;
            };
            const top3rows = top.slice(0, 3).map((s, i) => row(s, i)).join('');
            const restRows = top.slice(3).map((s, i) => row(s, i + 3)).join('');
            list.innerHTML = top3rows + (showAll ? restRows : '');
            if (top.length > 3) {
                toggleWrap.style.display = 'block';
                document.getElementById('lbToggleBtn').textContent = showAll ? '▲ Show Less' : `▼ Show All (${top.length - 3} more)`;
            } else {
                toggleWrap.style.display = 'none';
            }
        }
        function updateCollectionProgress(totalFines, totalCollected) {
            const pct = totalFines > 0 ? Math.min(100, (totalCollected / totalFines) * 100) : 0;
            const remaining = Math.max(0, totalFines - totalCollected);
            document.getElementById('progressFill').style.width = pct + '%';
            document.getElementById('collectionPercent').textContent = pct.toFixed(1) + '%';
            document.getElementById('progressCollected').innerHTML = '₱' + totalCollected.toFixed(0);
            document.getElementById('progressTotal').innerHTML = '₱' + totalFines.toFixed(0);
            document.getElementById('progressRemaining').innerHTML = '₱' + remaining.toFixed(0);
        }

        function getFilteredStudents() {
            let filtered = [...students];
            if (searchQuery) filtered = filtered.filter(s => (s.name || '').toLowerCase().includes(searchQuery.toLowerCase()));
            if (filterGender !== 'all') filtered = filtered.filter(s => s.gender === filterGender);
            if (filterStatus !== 'all') filtered = filtered.filter(s => s.status === filterStatus);
            if (sortBy === 'fine-high') filtered.sort((a, b) => (b.fine || 0) - (a.fine || 0));
            else if (sortBy === 'fine-low') filtered.sort((a, b) => (a.fine || 0) - (b.fine || 0));
            else filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            return filtered;
        }

        function renderStudentList() {
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

        function escapeHtml(str) {
            if (!str) return '';
            return str.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m] || m));
        }

        const i18n = {
            en: {
                loginTitle: '🔐 Fines Manager', loginDesc: 'Enter secretary password or continue as student',
                btnLogin: '🔓 Secretary Login', btnGuest: '👨‍🎓 Continue as Student',
                headerTitle: '📋 BSIS Fines Manager', roleStudent: '👨‍🎓 Student',
                btnActivity: '📋 Activity', btnAnnounce: '📢 Announce', btnPassword: '🔑 Password', btnLogout: '🚪 Logout',
                profileStudent: '👨‍🎓 Student', profileRole: 'USER',
                pageTitle: 'STUDENT FINES', lblSection: '📚 Section:', btnNewSection: '➕ New Section',
                gcashLabel: '💳 Bayad gamit GCash!!', gcashScan: '📷 Scan QR to get GCash number',
                gcashSteps: 'Send payment → Copy Ref# → Show to Secretary',
                statStudents: 'Students', statTotalFines: 'Total Fines', statAverage: 'Average',
                statHighest: 'Highest', statPaidUnpaid: 'Paid/Unpaid', statCollected: 'Collected',
                lblFullName: '👤 Full Name', lblGender: '⚥ Gender', lblRelationship: '💞 Relationship',
                lblFine: '💰 Fine (₱)', lblStatus: '📊 Status',
                male: 'Male', female: 'Female', nb: 'Non-binary',
                single: 'Single', taken: 'Taken', married: 'Married', uyab: 'Uyab', complicated: 'Complicated',
                unpaid: 'Unpaid', paid: 'Paid',
                btnAdd: '➕ ADD', btnClear: '🗑️ Clear',
                searchPlaceholder: '🔍 Search...', allGenders: 'All Genders', allStatus: 'All Status',
                name: 'Name', fineHigh: 'Fine ↓', fineLow: 'Fine ↑',
                finesLedger: '📌 FINES LEDGER', btnPayCSV: '📥 Payments CSV', btnFinesCSV: '📥 Fines CSV',
                loading: 'Loading...', totalFines: '💰 TOTAL FINES',
                btnSuggestions: '💡 Feature Suggestions', credits: 'Credits: Website Developer: <span>Jonard Suete</span> · <span>Kenneth Panyo</span>',
                paymentHistory: '💳 Payment History', gcashSend: 'Send payment to GCash',
                gcashScanQR: '📷 Scan QR para sa GCash number',
                gcashInstructions: '1️⃣ Open GCash app → Send Money → Enter number above<br>2️⃣ Enter exact amount → Copy Reference Number<br>3️⃣ Paste reference number below',
                paymentAmount: 'Payment Amount (₱)', gcashRef: 'GCash Reference Number',
                date: 'Date', note: 'Note (optional)', notePlaceholder: 'e.g., Partial payment',
                btnComplete: '✅ Complete Payment',
                settings: '🔑 Settings', adminName: '👤 Admin Name', displayName: 'Display Name',
                btnSaveName: '💾 Save Name', passwordSection: '🔐 Password',
                currentPw: 'Current Password', newPw: 'New Password', confirmPw: 'Confirm New Password',
                btnSavePw: '💾 Save Password', gcashSettings: '💳 GCash Settings',
                gcashNum: 'GCash Number', gcashAccName: 'GCash Account Name', btnSaveGcash: '💾 Save GCash Info',
                qrSection: '📷 GCash QR Code', noQR: 'No QR uploaded yet', btnUploadQR: '📷 Upload QR Image',
                btnDeleteQR: '🗑️ Delete QR',
                activityLog: '📋 Activity Log', all: 'ALL', today: 'TODAY',
                suggestions: '💡 Feature Suggestions', suggestDesc: 'Share your ideas! What features do you want to see next?',
                yourName: '👤 Your Name', suggestPlaceholder: 'e.g., Add attendance tracker, export to PDF, etc.',
                btnSubmitSuggest: '📤 Submit Suggestion', allSuggestions: '📋 All Suggestions',
                themeSection: '🎨 Theme',
                announcements: '📢 Announcements', announcePlaceholder: 'Write an announcement...',
                btnPost: '📤 Post',
                noAnnounce: 'No announcements yet.'
            },
            tl: {
                loginTitle: '🔐 Fines Manager', loginDesc: 'Ilagay ang password ng secretary o magpatuloy bilang estudyante',
                btnLogin: '🔓 Mag-login bilang Secretary', btnGuest: '👨‍🎓 Magpatuloy bilang Estudyante',
                headerTitle: '📋 BSIS Fines Manager', roleStudent: '👨‍🎓 Estudyante',
                btnActivity: '📋 Aktibidad', btnAnnounce: '📢 Anunsyo', btnPassword: '🔑 Password', btnLogout: '🚪 Logout',
                profileStudent: '👨‍🎓 Estudyante', profileRole: 'USER',
                pageTitle: 'MGA FINES NG ESTUDYANTE', lblSection: '📚 Seksyon:', btnNewSection: '➕ Bagong Seksyon',
                gcashLabel: '💳 Magbayad gamit ang GCash!!', gcashScan: '📷 I-scan ang QR para sa GCash number',
                gcashSteps: 'Magbayad → Kopyahin ang Ref# → Ipakita sa Secretary',
                statStudents: 'Estudyante', statTotalFines: 'Kabuuang Fines', statAverage: 'Katamtaman',
                statHighest: 'Pinakamataas', statPaidUnpaid: 'Bayad/Hindi', statCollected: 'Nakolekta',
                lblFullName: '👤 Buong Pangalan', lblGender: '⚥ Kasarian', lblRelationship: '💞 Relasyon',
                lblFine: '💰 Multa (₱)', lblStatus: '📊 Katayuan',
                male: 'Lalaki', female: 'Babae', nb: 'Hindi Binary',
                single: 'Single', taken: 'Taken', married: 'May Asawa', uyab: 'Uyab', complicated: 'Magulo',
                unpaid: 'Hindi Bayad', paid: 'Bayad',
                btnAdd: '➕ DAGDAG', btnClear: '🗑️ Linisin',
                searchPlaceholder: '🔍 Maghanap...', allGenders: 'Lahat ng Kasarian', allStatus: 'Lahat ng Katayuan',
                name: 'Pangalan', fineHigh: 'Multa ↓', fineLow: 'Multa ↑',
                finesLedger: '📌 TALAAN NG FINES', btnPayCSV: '📥 CSV ng Bayad', btnFinesCSV: '📥 CSV ng Fines',
                loading: 'Naglo-load...', totalFines: '💰 KABUUANG FINES',
                btnSuggestions: '💡 Mga Mungkahi', credits: 'Mga Nag-develop: <span>Jonard Suete</span> · <span>Kenneth Panyo</span>',
                paymentHistory: '💳 Kasaysayan ng Bayad', gcashSend: 'Magpadala ng bayad sa GCash',
                gcashScanQR: '📷 I-scan ang QR para sa GCash number',
                gcashInstructions: '1️⃣ Buksan ang GCash → Magpadala ng Pera → Ilagay ang numero<br>2️⃣ Ilagay ang tamang halaga → Kopyahin ang Reference Number<br>3️⃣ Idikit ang reference number sa ibaba',
                paymentAmount: 'Halaga ng Bayad (₱)', gcashRef: 'GCash Reference Number',
                date: 'Petsa', note: 'Tala (opsyonal)', notePlaceholder: 'e.g., Partial na bayad',
                btnComplete: '✅ Kumpletuhin ang Bayad',
                settings: '🔑 Settings', adminName: '👤 Pangalan ng Admin', displayName: 'Display Name',
                btnSaveName: '💾 I-save ang Pangalan', passwordSection: '🔐 Password',
                currentPw: 'Kasalukuyang Password', newPw: 'Bagong Password', confirmPw: 'Kumpirmahin ang Password',
                btnSavePw: '💾 I-save ang Password', gcashSettings: '💳 GCash Settings',
                gcashNum: 'GCash Number', gcashAccName: 'GCash Account Name', btnSaveGcash: '💾 I-save ang GCash',
                qrSection: '📷 GCash QR Code', noQR: 'Wala pang QR', btnUploadQR: '📷 Mag-upload ng QR',
                btnDeleteQR: '🗑️ Burahin ang QR',
                activityLog: '📋 Talaan ng Aktibidad', all: 'LAHAT', today: 'NGAYON',
                suggestions: '💡 Mga Mungkahi', suggestDesc: 'Ibahagi ang iyong mga ideya! Anong features ang gusto mong makita?',
                yourName: '👤 Iyong Pangalan', suggestPlaceholder: 'e.g., Magdagdag ng attendance tracker, export sa PDF, atbp.',
                btnSubmitSuggest: '📤 Isumite ang Mungkahi', allSuggestions: '📋 Lahat ng Mungkahi',
                themeSection: '🎨 Theme',
                announcements: '📢 Mga Anunsyo', announcePlaceholder: 'Magsulat ng anunsyo...',
                btnPost: '📤 I-post',
                noAnnounce: 'Wala pang anunsyo.'
            },
            ceb: {
                loginTitle: '🔐 Fines Manager', loginDesc: 'Isulod ang password sa secretary o padayon isip estudyante',
                btnLogin: '🔓 Mag-login isip Secretary', btnGuest: '👨‍🎓 Padayon isip Estudyante',
                headerTitle: '📋 BSIS Fines Manager', roleStudent: '👨‍🎓 Estudyante',
                btnActivity: '📋 Kalihokan', btnAnnounce: '📢 Pahibalo', btnPassword: '🔑 Password', btnLogout: '🚪 Logout',
                profileStudent: '👨‍🎓 Estudyante', profileRole: 'USER',
                pageTitle: 'MGA FINES SA ESTUDYANTE', lblSection: '📚 Seksyon:', btnNewSection: '➕ Bag-ong Seksyon',
                gcashLabel: '💳 Mobayad gamit ang GCash!!', gcashScan: '📷 I-scan ang QR para sa GCash number',
                gcashSteps: 'Mobayad → Kopyaha ang Ref# → Ipakita sa Secretary',
                statStudents: 'Estudyante', statTotalFines: 'Kabuokang Fines', statAverage: 'Kasarangan',
                statHighest: 'Pinakataas', statPaidUnpaid: 'Bayad/Wala', statCollected: 'Nakolekta',
                lblFullName: '👤 Tibuok Ngalan', lblGender: '⚥ Kinatawhan', lblRelationship: '💞 Relasyon',
                lblFine: '💰 Multa (₱)', lblStatus: '📊 Kahimtang',
                male: 'Lalaki', female: 'Babaye', nb: 'Dili Binary',
                single: 'Ulitawo', taken: 'Naay Uyab', married: 'Minyo', uyab: 'Uyab', complicated: 'Gubot',
                unpaid: 'Wala Bayad', paid: 'Bayad',
                btnAdd: '➕ DUGANG', btnClear: '🗑️ Limpyo',
                searchPlaceholder: '🔍 Pangita...', allGenders: 'Tanang Kinatawhan', allStatus: 'Tanang Kahimtang',
                name: 'Ngalan', fineHigh: 'Multa ↓', fineLow: 'Multa ↑',
                finesLedger: '📌 TALAAN SA FINES', btnPayCSV: '📥 CSV sa Bayad', btnFinesCSV: '📥 CSV sa Fines',
                loading: 'Nag-load...', totalFines: '💰 KABUOKANG FINES',
                btnSuggestions: '💡 Mga Sugyot', credits: 'Mga Naghimo: <span>Jonard Suete</span> · <span>Kenneth Panyo</span>',
                paymentHistory: '💳 Kasaysayan sa Bayad', gcashSend: 'Magpadala ug bayad sa GCash',
                gcashScanQR: '📷 I-scan ang QR para sa GCash number',
                gcashInstructions: '1️⃣ Ablihi ang GCash → Magpadala ug Kwarta → Isulod ang numero<br>2️⃣ Isulod ang saktong kantidad → Kopyaha ang Reference Number<br>3️⃣ Idikit ang reference number sa ubos',
                paymentAmount: 'Kantidad sa Bayad (₱)', gcashRef: 'GCash Reference Number',
                date: 'Petsa', note: 'Nota (opsyonal)', notePlaceholder: 'e.g., Dili kompleto nga bayad',
                btnComplete: '✅ Kompletoha ang Bayad',
                settings: '🔑 Settings', adminName: '👤 Ngalan sa Admin', displayName: 'Display Name',
                btnSaveName: '💾 I-save ang Ngalan', passwordSection: '🔐 Password',
                currentPw: 'Karon nga Password', newPw: 'Bag-ong Password', confirmPw: 'Kumpirmaha ang Password',
                btnSavePw: '💾 I-save ang Password', gcashSettings: '💳 GCash Settings',
                gcashNum: 'GCash Number', gcashAccName: 'GCash Account Name', btnSaveGcash: '💾 I-save ang GCash',
                qrSection: '📷 GCash QR Code', noQR: 'Wala pay QR', btnUploadQR: '📷 Mag-upload ug QR',
                btnDeleteQR: '🗑️ Burahon ang QR',
                activityLog: '📋 Talaan sa Kalihokan', all: 'TANAN', today: 'KARON',
                suggestions: '💡 Mga Sugyot', suggestDesc: 'Ipakigbahin ang imong mga ideya! Unsang features ang gusto nimo makita?',
                yourName: '👤 Imong Ngalan', suggestPlaceholder: 'e.g., Pagdugang og attendance tracker, export sa PDF, ug uban pa',
                btnSubmitSuggest: '📤 Isumiter ang Sugyot', allSuggestions: '📋 Tanang Sugyot',
                themeSection: '🎨 Theme',
                announcements: '📢 Mga Pahibalo', announcePlaceholder: 'Pagsulat og pahibalo...',
                btnPost: '📤 I-post',
                noAnnounce: 'Wala pay pahibalo.'
            }
        };
        let currentLang = localStorage.getItem('fm_lang') || 'en';
        function setLanguage(lang) {
            if (!i18n[lang]) lang = 'en';
            currentLang = lang;
            localStorage.setItem('fm_lang', lang);
            document.getElementById('langToggle').textContent = lang === 'en' ? '🇺🇸' : lang === 'tl' ? '🇵🇭' : '🇵🇭';
            document.querySelectorAll('[data-i18n]').forEach(el => {
                const key = el.getAttribute('data-i18n');
                if (i18n[lang][key]) el.innerHTML = i18n[lang][key];
            });
            document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
                const key = el.getAttribute('data-i18n-placeholder');
                if (i18n[lang][key]) el.placeholder = i18n[lang][key].replace(/<[^>]*>/g, '');
            });
            const loginBtn = document.getElementById('loginBtn');
            if (loginBtn) loginBtn.innerHTML = i18n[lang].btnLogin;
            const guestBtn = document.getElementById('viewAsGuest');
            if (guestBtn) guestBtn.innerHTML = i18n[lang].btnGuest;
        }
        document.getElementById('langToggle')?.addEventListener('click', () => {
            const next = { en: 'tl', tl: 'ceb', ceb: 'en' };
            setLanguage(next[currentLang] || 'en');
        });
        document.addEventListener('DOMContentLoaded', () => setLanguage(currentLang));

        const themes = [
            { name: 'Cyber Blue', accent: '#00d4ff', accent_a27: '#00d4ff44', accent_a20: '#00d4ff33', accent_a13: '#00d4ff22', accent_a7: '#00d4ff11', secondary: '#7c3aed', secondary_dark: '#6d28d9', amber: '#f59e0b', amber_dark: '#d97706' },
            { name: 'Neon Pink', accent: '#f472b6', accent_a27: '#f472b644', accent_a20: '#f472b633', accent_a13: '#f472b622', accent_a7: '#f472b611', secondary: '#a855f7', secondary_dark: '#9333ea', amber: '#fbbf24', amber_dark: '#f59e0b' },
            { name: 'Emerald', accent: '#34d399', accent_a27: '#34d39944', accent_a20: '#34d39933', accent_a13: '#34d39922', accent_a7: '#34d39911', secondary: '#10b981', secondary_dark: '#059669', amber: '#f59e0b', amber_dark: '#d97706' },
            { name: 'Sunset', accent: '#fb923c', accent_a27: '#fb923c44', accent_a20: '#fb923c33', accent_a13: '#fb923c22', accent_a7: '#fb923c11', secondary: '#f97316', secondary_dark: '#ea580c', amber: '#eab308', amber_dark: '#ca8a04' },
            { name: 'Royal Purple', accent: '#a78bfa', accent_a27: '#a78bfa44', accent_a20: '#a78bfa33', accent_a13: '#a78bfa22', accent_a7: '#a78bfa11', secondary: '#8b5cf6', secondary_dark: '#7c3aed', amber: '#f59e0b', amber_dark: '#d97706' }
        ];
        let currentTheme = parseInt(localStorage.getItem('fm_theme')) || 0;
        function applyTheme(index) {
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

        function readFileAsBase64(file) {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = () => {
                    const img = new Image();
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        const MAX_SIZE = 150;
                        let w = img.width, h = img.height;
                        if (w > h) { if (w > MAX_SIZE) { h *= MAX_SIZE / w; w = MAX_SIZE; } }
                        else { if (h > MAX_SIZE) { w *= MAX_SIZE / h; h = MAX_SIZE; } }
                        canvas.width = w; canvas.height = h;
                        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                        resolve(canvas.toDataURL('image/jpeg', 0.7));
                    };
                    img.src = reader.result;
                };
                reader.readAsDataURL(file);
            });
        }

        async function logActivity(action, details, studentName, amount) {
            try {
                const actor = getIsAdmin() ? adminName : (students.find(s => String(s.id) === String(localStorage.getItem('fm_student_session_id')))?.name || 'Student');
                const role = getIsAdmin() ? 'admin' : 'student';
                const sec = sections.find(s => s.id === currentSectionId);
                await addDoc(collection(db, 'activity_logs'), {
                    action, details, studentName: studentName || '', amount: amount || 0,
                    actor, actorRole: role, sectionName: sec ? sec.name : '',
                    timestamp: Date.now(), date: new Date().toISOString()
                });
            } catch (e) { console.warn('logActivity error:', e); }
        }

        async function addOrUpdateStudent() {
            if (!getIsAdmin()) return;
            const name = nameInput.value.trim();
            if (!name) { await showAlert('Please enter student name'); return; }
            const data = { name, gender: genderSelect.value, relationStatus: relationStatusSelect.value, fine: parseFloat(fineInput.value) || 0, status: statusSelect.value, section_id: currentSectionId, photoUrl: '' };
            if (editModeId) {
                const existing = students.find(s => s.id === editModeId);
                if (existing && existing.photoUrl) data.photoUrl = existing.photoUrl;
                await updateDoc(doc(db, 'students', String(editModeId)), data);
                logActivity('fine_edit', `Fine updated to ₱${data.fine}`, existing?.name || name, data.fine);
                editModeId = null; addBtn.textContent = '➕ ADD';
            } else {
                const newId = nextId(students);
                data.id = newId; data.totalPaid = 0; data.order = newId;
                await setDoc(doc(db, 'students', String(newId)), data);
                logActivity('student_add', `Student added with fine ₱${data.fine}`, name, data.fine);
                playSound('add');
            }
            clearForm();
        }

        async function editStudent(id) {
            if (!getIsAdmin()) return;
            const student = students.find(s => s.id === id);
            if (student) {
                nameInput.value = student.name; genderSelect.value = student.gender; relationStatusSelect.value = student.relationStatus || 'Single';
                fineInput.value = student.fine; statusSelect.value = student.status;
                editModeId = id; addBtn.textContent = '✏️ UPDATE';
            }
        }

        async function deleteStudent(id) {
            if (!getIsAdmin()) return;
            const s = students.find(st => st.id === id);
            if (!await showConfirm('Delete this student?')) return;
            await deleteDoc(doc(db, 'students', String(id)));
            const payments = await getDocs(collection(db, 'students', String(id), 'payments'));
            await Promise.all(payments.docs.map(d => deleteDoc(doc(db, 'students', String(id), 'payments', d.id))));
            logActivity('student_delete', `Student deleted`, s?.name || 'Unknown', 0);
            playSound('delete');
        }

        function clearForm() {
            nameInput.value = ''; genderSelect.value = 'male'; relationStatusSelect.value = 'Single'; fineInput.value = '0'; statusSelect.value = 'unpaid'; editModeId = null; addBtn.textContent = '➕ ADD';
        }

        async function addNewSection() {
            if (!getIsAdmin()) return;
            const name = await showPrompt('Enter section name (e.g., BSIS-1B):');
            if (name) { const newId = nextId(sections); await setDoc(doc(db, 'sections', String(newId)), { name, order: newId }); logActivity('section_add', `Section "${name}" created`, '', 0); }
        }

        async function openPaymentModal(studentId) {
            currentPaymentStudentId = studentId;
            const student = students.find(s => s.id === studentId);
            if (!student) return;
            const totalPaid = student.totalPaid || 0;
            const remaining = Math.max(0, (student.fine || 0) - totalPaid);
            paymentModalTitle.textContent = `💳 ${student.name} — Remaining: ₱${remaining.toFixed(2)}`;
            paymentAmount.value = remaining > 0 ? remaining.toFixed(2) : '0';
            paymentRef.value = ''; paymentDate.value = new Date().toISOString().split('T')[0]; paymentNote.value = '';
            gcashNumber.textContent = localStorage.getItem('fm_gcash_number') || 'Not set';
            gcashName.textContent = localStorage.getItem('fm_gcash_name') || 'Secretary';
            const qrEl = document.getElementById('gcashQR');
            qrEl.innerHTML = '';
            const uploadedQR = localStorage.getItem('fm_gcash_qr') || '';
            if (uploadedQR) {
                qrEl.innerHTML = `<img src="${uploadedQR}" style="width:130px;height:130px;border-radius:8px;">`;
            } else {
                try {
                    const gcashNum = localStorage.getItem('fm_gcash_number') || '';
                    const gcashAcc = localStorage.getItem('fm_gcash_name') || 'Secretary';
                    const qrData = gcashNum ? `${gcashAcc}\n${gcashNum}` : 'Set GCash number in Settings';
                    new QRCode(qrEl, { text: qrData, width: 130, height: 130, colorDark: '#0a0e1a', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.M });
                } catch(e) { qrEl.innerHTML = '<div style="width:130px;height:130px;background:#1a2332;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:0.7rem;color:#6b7280;">QR unavailable</div>'; }
            }
            renderPaymentHistory(studentId);
            paymentModal.classList.add('active');
        }

        window.closePaymentModal = function() { paymentModal.classList.remove('active'); currentPaymentStudentId = null; };

        async function renderPaymentHistory(studentId) {
            const snapshot = await getDocs(query(collection(db, 'students', String(studentId), 'payments'), orderBy('date', 'desc')));
            const payments = [];
            snapshot.forEach((d) => payments.push({ id: d.id, ...d.data() }));
            if (payments.length === 0) { paymentHistoryList.innerHTML = '<div class="no-results">No payments yet</div>'; return; }
            let html = '';
            payments.forEach((p) => {
                const typeClass = p.type === 'full' ? '' : 'partial';
                const typeLabel = p.type === 'full' ? 'Full' : 'Partial';
                const deleteBtn = getIsAdmin() ? `<button class="btn-delete-payment" onclick="window.deletePayment(${studentId}, '${p.id}')">✕</button>` : '';
                const refDisplay = p.refNum ? `<div style="font-size:0.7rem;color:#4682b4;font-family:monospace;">📱 Ref#: ${escapeHtml(p.refNum)}</div>` : '';
                html += `<div class="payment-history-entry"><div><span class="payment-amount">₱${(p.amount || 0).toFixed(2)}</span><span class="payment-type ${typeClass}">${typeLabel}</span>${refDisplay}${p.note ? `<div style="font-size:0.7rem;color:#888;">${escapeHtml(p.note)}</div>` : ''}<div class="payment-date">${p.date || ''}</div></div>${deleteBtn}</div>`;
            });
            paymentHistoryList.innerHTML = html;
        }

        async function addPayment() {
            if (!currentPaymentStudentId) return;
            const student = students.find(s => s.id === currentPaymentStudentId);
            if (!student) return;
            const amount = parseFloat(paymentAmount.value) || 0;
            const refNum = paymentRef.value.trim();
            if (amount <= 0) { await showAlert('Enter a valid amount'); return; }
            if (!refNum) { await showAlert('Enter the GCash Reference Number'); return; }
            const totalPaid = student.totalPaid || 0;
            const remaining = (student.fine || 0) - totalPaid;
            if (amount > remaining + 0.01) { await showAlert('Amount exceeds remaining balance (₱' + remaining.toFixed(2) + ')'); return; }
            const paymentType = Math.abs(amount - remaining) < 0.01 ? 'full' : 'partial';
            const paymentData = { amount, date: paymentDate.value || new Date().toISOString().split('T')[0], note: paymentNote.value.trim(), type: paymentType, refNum, gcashNumber: localStorage.getItem('fm_gcash_number') || '' };
            await setDoc(doc(collection(db, 'students', String(currentPaymentStudentId), 'payments')), paymentData);
            const updateData = { totalPaid: totalPaid + amount };
            if (paymentType === 'full') updateData.status = 'paid';
            await updateDoc(doc(db, 'students', String(currentPaymentStudentId)), updateData);
            logActivity('payment', `Payment ₱${amount} (${paymentType}) Ref#${refNum}`, student.name, amount);
            playSound('payment');
            const smsSettings = getSmsSettings();
            if (smsSettings.enabled && smsSettings.phone) {
                const msg = `[BSIS-1] Payment of ₱${amount} received from ${student.name}. Ref#${refNum}. ${paymentType === 'full' ? 'Fully paid!' : 'Partial payment.'}`;
                sendSms(smsSettings.phone, msg);
            }
            openPaymentModal(currentPaymentStudentId);
        }

        async function deletePayment(studentId, paymentId) {
            if (!getIsAdmin()) return;
            if (!await showConfirm('Delete this payment?')) return;
            const paymentSnap = await getDoc(doc(db, 'students', String(studentId), 'payments', paymentId));
            if (!paymentSnap.exists()) return;
            const paymentData = paymentSnap.data();
            const wasFull = paymentData.type === 'full';
            const amount = paymentData.amount || 0;
            await deleteDoc(doc(db, 'students', String(studentId), 'payments', paymentId));
            const student = students.find(s => s.id === studentId);
            if (student) {
                const newTotal = Math.max(0, (student.totalPaid || 0) - amount);
                const updateData = { totalPaid: newTotal };
                if (wasFull && newTotal < (student.fine || 0)) updateData.status = 'unpaid';
                await updateDoc(doc(db, 'students', String(studentId)), updateData);
            }
            logActivity('payment_delete', `Payment ₱${amount} deleted`, student?.name || 'Unknown', amount);
            playSound('delete');
            openPaymentModal(studentId);
        }

        submitPaymentBtn.addEventListener('click', addPayment);
        paymentModal.addEventListener('click', (e) => { if (e.target === paymentModal) closePaymentModal(); });

        openSuggestionsBtn.addEventListener('click', () => { suggestionModal.classList.add('active'); loadSuggestions(); });

        submitSuggestionBtn.addEventListener('click', async () => {
            const name = suggestionName.value.trim();
            const text = suggestionText.value.trim();
            if (!name) { await showAlert('Please enter your name!'); return; }
            if (!text) { await showAlert('Please enter your suggestion!'); return; }
            const newId = suggestions.length > 0 ? Math.max(...suggestions.map(s => s.id)) + 1 : 1;
            await setDoc(doc(db, 'suggestions', String(newId)), { id: newId, name, text, date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }), timestamp: Date.now() });
            suggestionName.value = ''; suggestionText.value = '';
        });

        let unsubscribeAnnounce = null;
        let announcements = [];
        window.closeAnnounceModal = function() { document.getElementById('announceModal').classList.remove('active'); };
        function loadAnnouncements() {
            if (unsubscribeAnnounce) unsubscribeAnnounce();
            const container = document.getElementById('announceList');
            container.innerHTML = '<div class="no-results">Loading...</div>';
            const q = query(collection(db, 'announcements'), orderBy('timestamp', 'desc'));
            unsubscribeAnnounce = onSnapshot(q, (snap) => {
                announcements = [];
                snap.forEach(d => announcements.push({ id: d.id, ...d.data() }));
                renderAnnouncements();
            }, () => { container.innerHTML = '<div class="no-results">Failed to load.</div>'; });
        }
        function renderAnnouncements() {
            const container = document.getElementById('announceList');
            const topContainer = document.getElementById('topAnnouncements');
            const topList = document.getElementById('topAnnounceList');
            const dot = document.getElementById('announceDot');
            if (announcements.length === 0) {
                container.innerHTML = '<div class="no-results" data-i18n="noAnnounce">No announcements yet.</div>';
                if (topContainer) topContainer.style.display = 'none';
                return;
            }
            container.innerHTML = '';
            announcements.forEach(a => {
                const del = getIsAdmin() ? `<button class="announce-delete" onclick="deleteAnnounce('${a.id}')">✕</button>` : '';
                const card = document.createElement('div');
                card.className = 'announce-card';
                card.innerHTML = `<div class="announce-text">${escapeHtml(a.text)}</div><div class="announce-meta"><span><span class="announce-author">${escapeHtml(a.author || 'Secretary')}</span> · ${a.date || ''}</span>${del}</div>`;
                container.appendChild(card);
            });
            if (topContainer && topList) {
                const latest = announcements.slice(0, 2);
                topList.innerHTML = latest.map(a =>
                    `<div style="background:#0d1520;border-radius:10px;padding:10px 14px;border-left:3px solid var(--accent);font-size:0.78rem;"><div style="color:#e0e0e0;line-height:1.4;">${escapeHtml(a.text)}</div><div style="font-size:0.6rem;color:#6b7280;margin-top:4px;">— ${escapeHtml(a.author || 'Secretary')} · ${a.date || ''}</div></div>`
                ).join('');
                topContainer.style.display = 'block';
                if (dot) dot.style.display = announcements.length > 0 ? 'block' : 'none';
            }
        }
        async function deleteAnnounce(id) {
            if (!getIsAdmin()) return;
            if (!await showConfirm('Delete this announcement?')) return;
            await deleteDoc(doc(db, 'announcements', id));
        }
        document.getElementById('openAnnounceModalBtn')?.addEventListener('click', () => {
            document.getElementById('announceModal').classList.add('active');
            loadAnnouncements();
        });
        document.getElementById('announceModal')?.addEventListener('click', (e) => {
            if (e.target === document.getElementById('announceModal')) closeAnnounceModal();
        });
        document.getElementById('postAnnounceBtn')?.addEventListener('click', async () => {
            const input = document.getElementById('announceInput');
            const text = input.value.trim();
            if (!text) { await showAlert('Please write something!'); return; }
            const name = getIsAdmin() ? adminName : (students.find(s => String(s.id) === String(localStorage.getItem('fm_student_session_id')))?.name || 'Student');
            await addDoc(collection(db, 'announcements'), {
                text, author: name,
                date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
                timestamp: Date.now()
            });
            input.value = '';
        });

        window.closeSuggestionModal = function() { suggestionModal.classList.remove('active'); };

        function loadSuggestions() {
            if (unsubscribeSuggestions) unsubscribeSuggestions();
            const q = query(collection(db, 'suggestions'), orderBy('timestamp', 'desc'));
            unsubscribeSuggestions = onSnapshot(q, (snapshot) => {
                suggestions = [];
                snapshot.forEach((d) => suggestions.push({ id: parseInt(d.id), ...d.data() }));
                renderSuggestions();
            });
        }

        function renderSuggestions() {
            if (suggestions.length === 0) { suggestionsList.innerHTML = '<div class="no-results">No suggestions yet. Be the first! 💡</div>'; return; }
            let html = '';
            suggestions.forEach((s) => {
                const deleteBtn = getIsAdmin() ? `<button class="btn-delete-payment" onclick="window.deleteSuggestion(${s.id})" style="float:right;">✕</button>` : '';
                html += `<div class="suggestion-card">${deleteBtn}<div class="suggestion-author">👤 ${escapeHtml(s.name || 'Anonymous')}</div><div class="suggestion-text">${escapeHtml(s.text)}</div><div class="suggestion-meta">📅 ${s.date || ''}</div></div>`;
            });
            suggestionsList.innerHTML = html;
        }

        async function deleteSuggestion(id) {
            if (!getIsAdmin()) return;
            if (!await showConfirm('Delete this suggestion?')) return;
            await deleteDoc(doc(db, 'suggestions', String(id)));
        }

        suggestionModal.addEventListener('click', (e) => { if (e.target === suggestionModal) closeSuggestionModal(); });
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

        function exportCSV() {
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

        function exportPaymentsCSV() {
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
        sectionSelect.addEventListener('change', () => { currentSectionId = parseInt(sectionSelect.value); sectionSelectView.value = currentSectionId; loadStudents(); });
        sectionSelectView.addEventListener('change', () => { currentSectionId = parseInt(sectionSelectView.value); sectionSelect.value = currentSectionId; loadStudents(); });
        addSectionBtn.addEventListener('click', addNewSection);
        addBtn.addEventListener('click', addOrUpdateStudent);
        clearFormBtn.addEventListener('click', clearForm);
        searchInput.addEventListener('input', () => { searchQuery = searchInput.value; renderStudentList(); });
        filterGenderSelect.addEventListener('change', () => { filterGender = filterGenderSelect.value; renderStudentList(); });
        filterStatusSelect.addEventListener('change', () => { filterStatus = filterStatusSelect.value; renderStudentList(); });
        sortBySelect.addEventListener('change', () => { sortBy = sortBySelect.value; renderStudentList(); });
        nameInput.addEventListener('keypress', e => { if (e.key === 'Enter') addOrUpdateStudent(); });

        function toggleChatWeb() {
            const panel = document.getElementById('chat-panel');
            const bubble = document.getElementById('chat-bubble');
            const open = panel.classList.toggle('open');
            bubble.classList.toggle('active', open);
            if (open && !panel.dataset.initialized) {
                panel.dataset.initialized = 'true';
                appendMessage('bot', '<span class="bot-tag">▸ AI ASSISTANT v1.0</span> SYSTEM ONLINE. Ako si AI Assistant ng Fines Manager. Pwede mo akong tanungin tungkol sa fines, students, at payments.\n\nI-type ang <b>help</b> para sa listahan ng commands.');
            }
            if (open) {
                const msgs = document.getElementById('chat-messages');
                msgs.scrollTop = msgs.scrollHeight;
                setTimeout(() => document.getElementById('chat-input').focus(), 300);
            }
        }
        function appendMessage(sender, html) {
            const msgs = document.getElementById('chat-messages');
            const div = document.createElement('div');
            div.className = 'chat-msg ' + sender;
            div.innerHTML = html;
            msgs.appendChild(div);
            msgs.scrollTop = msgs.scrollHeight;
        }
        function showTyping() {
            const msgs = document.getElementById('chat-messages');
            const div = document.createElement('div');
            div.className = 'chat-typing';
            div.id = 'chat-typing-indicator';
            div.innerHTML = '<span></span><span></span><span></span>';
            msgs.appendChild(div);
            msgs.scrollTop = msgs.scrollHeight;
        }
        function hideTyping() {
            const el = document.getElementById('chat-typing-indicator');
            if (el) el.remove();
        }
        function formatMoney(n) { return '₱' + Number(n).toFixed(2); }
        function getCurrentSectionName() {
            const sec = sections.find(s => s.id === currentSectionId);
            return sec ? sec.name : 'this section';
        }
        async function processMessage(input) {
            const text = input.trim().toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
            if (!text) return;
            appendMessage('user', escapeHtml(input.trim()));
            showTyping();
            await new Promise(r => setTimeout(r, 400 + Math.random() * 400));
            hideTyping();
            const isTagalog = /(ano|sino|magkano|ilan|paano|bakit|gaano|pwede|mga|meron|wala|ba |po |opo|kayo|ako|ninyo|natin)/i.test(text);
            const studentsList = students || [];
            const sectionName = getCurrentSectionName();
            const totalStudents = studentsList.length;
            const totalFines = studentsList.reduce((sum, s) => sum + (s.fine || 0), 0);
            const totalCollected = studentsList.reduce((sum, s) => sum + (s.totalPaid || 0), 0);
            const paidStudents = studentsList.filter(s => s.status === 'paid');
            const unpaidStudents = studentsList.filter(s => s.status === 'unpaid');
            let reply = '';
            if (/^(hi|hello|hey|musta|good (morning|afternoon|evening|day)|magandang)/i.test(text)) {
                reply = isTagalog
                    ? `Magandang araw! 😊 Ako ang chat assistant ng Fines Manager. Ano ang maitutulong ko?`
                    : `Hello! 😊 I'm the Fines Manager chat assistant. How can I help you?`;
                if (text.length < 10) reply += '\n\n💡 Type <b>help</b> para sa listahan ng commands.';
            } else if (/^(help|commands|tulong|commands)/i.test(text)) {
                reply = isTagalog
                    ? `📋 <b>Mga Pwede Kong Gawin:</b>\n\n🔍 <b>find [name]</b> — Maghanap ng estudyante\n💰 <b>total fines</b> — Kabuuang fines\n⚠️ <b>unpaid</b> — Mga hindi pa bayad\n✅ <b>paid</b> — Mga nakabayad na\n👥 <b>how many students</b> — Bilang ng estudyante\n📊 <b>stats</b> — Statistics ng section\n📚 <b>sections</b> — Listahan ng sections\n💬 Pwede rin Tagalog!`
                    : `📋 <b>Available Commands:</b>\n\n🔍 <b>find [name]</b> — Search for a student\n💰 <b>total fines</b> — Total fines amount\n⚠️ <b>unpaid</b> — List unpaid students\n✅ <b>paid</b> — List paid students\n👥 <b>how many students</b> — Student count\n📊 <b>stats</b> — Section statistics\n📚 <b>sections</b> — List all sections\n💬 Tagalog is also supported!`;
            } else if (/^(find|search|hanapin|sino si|ipakita)/i.test(text) && studentsList.length > 0) {
                const query = text.replace(/^(find|search|hanapin|sino si|ipakita)\s*/i, '');
                if (query) {
                    const matches = studentsList.filter(s => (s.name || '').toLowerCase().includes(query));
                    if (matches.length === 0) {
                        reply = isTagalog ? `😕 Walang nahanap na "${escapeHtml(query)}".` : `😕 No student found matching "${escapeHtml(query)}".`;
                    } else if (matches.length === 1) {
                        const s = matches[0];
                        const remaining = Math.max(0, (s.fine || 0) - (s.totalPaid || 0));
                        const statusEmoji = s.status === 'paid' ? '✅' : '⚠️';
                        reply = `👤 <b>${escapeHtml(s.name)}</b>\n` +
                            `💰 Fine: ${formatMoney(s.fine || 0)}\n` +
                            `💳 Paid: ${formatMoney(s.totalPaid || 0)}\n` +
                            `📊 Remaining: ${formatMoney(remaining)}\n` +
                            `${statusEmoji} Status: <b>${s.status === 'paid' ? 'Paid' : 'Unpaid'}</b>`;
                    } else {
                        reply = (isTagalog ? `🔍 ${matches.length} nahanap: ` : `🔍 ${matches.length} found: `) +
                            matches.slice(0, 8).map(s => escapeHtml(s.name)).join(', ') +
                            (matches.length > 8 ? `, +${matches.length - 8} more` : '');
                    }
                } else {
                    reply = isTagalog ? '👤 Sino ang gusto mong hanapin?' : '👤 Who would you like to find?';
                }
            } else if (/(total|kabuuang|lahat na|sum|total fines)\s*(fine|fines|bayad|multa)?/i.test(text) && !/paid|bayad|nakabayad|collected/i.test(text)) {
                reply = isTagalog
                    ? `💰 <b>Kabuuang Fines</b> (${sectionName}):\n📊 Total: ${formatMoney(totalFines)}\n👥 Students: ${totalStudents}\n📈 Average: ${formatMoney(totalStudents > 0 ? totalFines / totalStudents : 0)}`
                    : `💰 <b>Total Fines</b> (${sectionName}):\n📊 Total: ${formatMoney(totalFines)}\n👥 Students: ${totalStudents}\n📈 Average: ${formatMoney(totalStudents > 0 ? totalFines / totalStudents : 0)}`;
            } else if (/^(unpaid|hindi.*(bayad|paid)|may.*(utang|balance|atraso)|sino.*balance)/i.test(text)) {
                if (unpaidStudents.length === 0) {
                    reply = isTagalog ? '🎉 Lahat ay bayad na! Walang may balance.' : '🎉 Everyone is paid! No outstanding balances.';
                } else {
                    const show = unpaidStudents.slice(0, 10);
                    const list = show.map(s => `• ${escapeHtml(s.name)} — ${formatMoney(s.fine || 0)}`).join('\n');
                    reply = (isTagalog
                        ? `⚠️ <b>${unpaidStudents.length} na estudyante</b> ang hindi pa bayad:\n${list}`
                        : `⚠️ <b>${unpaidStudents.length} student(s)</b> unpaid:\n${list}`)
                        + (unpaidStudents.length > 10 ? `\n(+${unpaidStudents.length - 10} more)` : '');
                }
            } else if (/^(paid|bayad|nakabayad|sino.*bayad)/i.test(text)) {
                if (paidStudents.length === 0) {
                    reply = isTagalog ? '😕 Wala pang nakakabayad.' : '😕 No one has paid yet.';
                } else {
                    const show = paidStudents.slice(0, 10);
                    const list = show.map(s => `• ${escapeHtml(s.name)} — Paid ${formatMoney(s.totalPaid || 0)}`).join('\n');
                    reply = (isTagalog
                        ? `✅ <b>${paidStudents.length} na estudyante</b> ang bayad na:\n${list}`
                        : `✅ <b>${paidStudents.length} student(s)</b> paid:\n${list}`)
                        + (paidStudents.length > 10 ? `\n(+${paidStudents.length - 10} more)` : '');
                }
            } else if (/(how many|ilang|bilang|count|total.*student|ilan.*estudyante)/i.test(text)) {
                reply = isTagalog
                    ? `👥 <b>${totalStudents}</b> na estudyante sa ${sectionName}.`
                    : `👥 <b>${totalStudents}</b> student(s) in ${sectionName}.`;
            } else if (/^(stats|statistics|statistical|estadistika)/i.test(text)) {
                const avgFine = totalStudents > 0 ? totalFines / totalStudents : 0;
                const highestFine = totalStudents > 0 ? Math.max(...studentsList.map(s => s.fine || 0)) : 0;
                reply = (isTagalog
                    ? `📊 <b>Statistics</b> (${sectionName}):\n👥 Students: ${totalStudents}\n💰 Total Fines: ${formatMoney(totalFines)}\n📈 Average: ${formatMoney(avgFine)}\n🏆 Highest: ${formatMoney(highestFine)}\n✅ Paid: ${paidStudents.length}\n⚠️ Unpaid: ${unpaidStudents.length}\n💳 Collected: ${formatMoney(totalCollected)}`
                    : `📊 <b>Statistics</b> (${sectionName}):\n👥 Students: ${totalStudents}\n💰 Total Fines: ${formatMoney(totalFines)}\n📈 Average Fine: ${formatMoney(avgFine)}\n🏆 Highest Fine: ${formatMoney(highestFine)}\n✅ Paid: ${paidStudents.length}\n⚠️ Unpaid: ${unpaidStudents.length}\n💳 Collected: ${formatMoney(totalCollected)}`);
            } else if (/^(sections|section|section list|mga section)/i.test(text)) {
                const sects = sections || [];
                if (sects.length === 0) {
                    reply = isTagalog ? '📚 Walang sections.' : '📚 No sections available.';
                } else {
                    const list = sects.map(s => `• ${escapeHtml(s.name)}${s.id === currentSectionId ? ' ← current' : ''}`).join('\n');
                    reply = (isTagalog ? `📚 <b>Mga Section:</b>\n${list}` : `📚 <b>Sections:</b>\n${list}`);
                }
            } else if (/(collected|nakolekta|total.*paid|total.*collected)/i.test(text)) {
                reply = isTagalog
                    ? `💳 <b>Nakolekta na:</b> ${formatMoney(totalCollected)} mula sa ${totalStudents} na estudyante.`
                    : `💳 <b>Total Collected:</b> ${formatMoney(totalCollected)} from ${totalStudents} student(s).`;
            } else {
                reply = isTagalog
                    ? `😅 Hindi ko maintindihan. I-type ang <b>help</b> para sa listahan ng mga kaya kong gawin.`
                    : `😅 I didn't understand that. Type <b>help</b> to see what I can do.`;
            }
            appendMessage('bot', reply);
            if ('speechSynthesis' in window) {
                const clean = reply.replace(/<[^>]*>/g, '');
                const u = new SpeechSynthesisUtterance(clean.slice(0, 120));
                u.rate = 0.9; u.lang = isTagalog ? 'fil-PH' : 'en-US';
                speechSynthesis.cancel();
                speechSynthesis.speak(u);
            }
        }
        function quickChat(msg) {
            document.getElementById('chat-input').value = msg;
            processMessage(msg);
        }
        document.addEventListener('DOMContentLoaded', () => {
            const input = document.getElementById('chat-input');
            const sendBtn = document.getElementById('chat-send');
            sendBtn.addEventListener('click', () => {
                const val = input.value.trim();
                if (val) { processMessage(val); input.value = ''; }
            });
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const val = input.value.trim();
                    if (val) { processMessage(val); input.value = ''; }
                }
            });
        });
        let activityLogFilter = 'all';
        window.closeActivityLog = function() { document.getElementById('activityLogModal').classList.remove('active'); };
        window.switchActivityTab = function(filter) {
            activityLogFilter = filter;
            document.querySelectorAll('#activityLogTabs .chat-quick-btn').forEach(b => { b.style.background = 'transparent'; b.style.borderColor = '#1e293b'; });
            const active = document.getElementById('activityTab' + filter.charAt(0).toUpperCase() + filter.slice(1));
            if (active) { active.style.background = 'var(--accent-a13)'; active.style.borderColor = 'var(--accent)'; }
            loadActivityLog();
        };
        async function loadActivityLog() {
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

        window.toggleChatWeb = toggleChatWeb;
        window.quickChat = quickChat;
        window.appendMessage = appendMessage;
        window.editStudent = editStudent;
        window.deleteStudent = deleteStudent;
        window.openPaymentModal = openPaymentModal;
        window.deletePayment = deletePayment;
        window.deleteSuggestion = deleteSuggestion;
        window.closePaymentModal = window.closePaymentModal;
        window.closeSuggestionModal = window.closeSuggestionModal;
        window.uploadPhoto = window.uploadPhoto;
        window.speakStudentFine = function(id) {
            if (!('speechSynthesis' in window)) return;
            const s = students.find(st => st.id === id);
            if (!s) return;
            speechSynthesis.cancel();
            const msg = new SpeechSynthesisUtterance(`${s.name} — ${s.status === 'paid' ? 'Paid' : 'Unpaid'} — ${(s.fine || 0).toFixed(0)} pesos`);
            msg.rate = 0.9;
            speechSynthesis.speak(msg);
        };
        window.deleteAnnounce = deleteAnnounce;

        let _chatStudentId = null;
        let _chatUnsub = null;

        window.openChat = function(studentId) {
            const s = students.find(st => st.id === studentId);
            if (!s) return;
            _chatStudentId = studentId;
            document.getElementById('chatModalTitle').textContent = '💬 ' + s.name;
            document.getElementById('chatMessagesContainer').innerHTML = '<div class="no-results" style="padding:20px;font-size:0.75rem;">Loading...</div>';
            document.getElementById('chatMsgInput').value = '';
            document.getElementById('chatModal').classList.add('active');
            if (_chatUnsub) _chatUnsub();
            _chatUnsub = onSnapshot(doc(db, 'chats', String(studentId)), (snap) => {
                const data = snap.data();
                const msgs = data && data.messages ? data.messages : [];
                renderChatMessages(msgs, studentId);
                if (getIsAdmin() && msgs.length > 0) {
                    const updated = msgs.map(m => m.sender === 'student' ? { ...m, read: true } : m);
                    if (JSON.stringify(updated) !== JSON.stringify(msgs)) {
                        setDoc(doc(db, 'chats', String(studentId)), { studentId, studentName: data?.studentName || s.name, messages: updated });
                    }
                }
            });
        };

        function renderChatMessages(msgs, studentId) {
            const container = document.getElementById('chatMessagesContainer');
            if (msgs.length === 0) { container.innerHTML = '<div class="no-results" style="padding:20px;font-size:0.75rem;">No messages yet. Start chatting!</div>'; return; }
            container.innerHTML = msgs.map(m => {
                const isAdmin = m.sender === 'admin';
                const time = new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                return `<div class="${isAdmin ? 'chat-bubble-admin' : 'chat-bubble-student'}">${escapeHtml(m.text)}<div class="chat-msg-time">${time}${isAdmin ? ' · Admin' : ''}</div></div>`;
            }).join('');
            container.scrollTop = container.scrollHeight;
        }

        document.getElementById('chatSendBtn')?.addEventListener('click', async () => {
            const input = document.getElementById('chatMsgInput');
            const text = input.value.trim();
            if (!text || !_chatStudentId) return;
            const s = students.find(st => st.id === _chatStudentId);
            const snap = await getDoc(doc(db, 'chats', String(_chatStudentId)));
            const data = snap.data();
            const msgs = data && data.messages ? [...data.messages] : [];
            msgs.push({ text, sender: getIsAdmin() ? 'admin' : 'student', timestamp: Date.now(), read: false });
            await setDoc(doc(db, 'chats', String(_chatStudentId)), { studentId: _chatStudentId, studentName: s ? s.name : 'Student', messages: msgs });
            input.value = '';
        });

        document.getElementById('chatMsgInput')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('chatSendBtn').click(); } });

        window.closeChatModal = function() {
            document.getElementById('chatModal').classList.remove('active');
            if (_chatUnsub) { _chatUnsub(); _chatUnsub = null; }
            _chatStudentId = null;
        };
        window.closeInboxModal = function() { document.getElementById('inboxModal').classList.remove('active'); };
        document.getElementById('chatModal')?.addEventListener('click', (e) => { if (e.target === document.getElementById('chatModal')) window.closeChatModal(); });
        document.getElementById('inboxModal')?.addEventListener('click', (e) => { if (e.target === document.getElementById('inboxModal')) window.closeInboxModal(); });
        document.getElementById('inboxModal')?.addEventListener('click', (e) => { if (e.target === document.getElementById('inboxModal')) closeInboxModal(); });

        document.getElementById('inboxBtn')?.addEventListener('click', async () => {
            const sid = localStorage.getItem('fm_student_session_id');
            if (!sid) return;
            document.getElementById('inboxModal').classList.add('active');
            const list = document.getElementById('inboxChatList');
            list.innerHTML = '<div class="no-results" style="padding:20px;font-size:0.75rem;">Loading...</div>';
            try {
                const snap = await getDocs(collection(db, 'chats'));
                const chats = [];
                snap.forEach(d => { const data = d.data(); if (String(data.studentId) === String(sid)) chats.push(data); });
                if (chats.length === 0) { list.innerHTML = '<div class="no-results" style="padding:20px;font-size:0.75rem;">No messages from admin yet.</div>'; return; }
                const chat = chats[0];
                const msgs = chat.messages || [];
                list.innerHTML = `<div style="cursor:pointer;padding:12px;background:#0d1520;border-radius:12px;border-left:4px solid var(--accent);" onclick="closeInboxModal();window.openChat(${sid})">
                    <div style="font-size:0.8rem;font-weight:bold;color:var(--accent);">📨 Chat with Admin</div>
                    <div style="font-size:0.7rem;color:#9ca3af;margin-top:4px;">${msgs.length > 0 ? escapeHtml(msgs[msgs.length - 1].text.slice(0, 60)) : 'No messages'}</div>
                </div>`;
            } catch(e) { list.innerHTML = '<div class="no-results">Error loading inbox.</div>'; }
        });

        function updateInboxBadge() {
            const btn = document.getElementById('inboxBtn');
            const badge = document.getElementById('inboxBadge');
            if (!btn || !badge) return;
            const sid = localStorage.getItem('fm_student_session_id');
            if (!sid || getIsAdmin()) { btn.style.display = 'none'; return; }
            btn.style.display = '';
            if (window._inboxUnsub) window._inboxUnsub();
            let _prevUnread = 0;
            window._inboxUnsub = onSnapshot(doc(db, 'chats', String(sid)), (snap) => {
                const data = snap.data();
                if (!data || !data.messages) { badge.style.display = 'none'; _prevUnread = 0; return; }
                const unread = data.messages.filter(m => m.sender === 'admin' && !m.read).length;
                if (unread > 0) { badge.textContent = unread; badge.style.display = ''; if (_prevUnread === 0) playSound('notif'); }
                else { badge.style.display = 'none'; }
                _prevUnread = unread;
            });
        }

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
        document.getElementById('lbToggleBtn')?.addEventListener('click', () => {
            window._lbShowAll = !window._lbShowAll;
            const total = students.length;
            renderLeaderboard(total);
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
        function applyWallpaper(dataUrl) {
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
    