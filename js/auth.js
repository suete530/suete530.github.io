import { adminNameDisplay, adminPhotoBtn, adminPhotoInput, badge, changePwBtn, changePwModal, confirmInput, confirmPw, currentPw, customAlertBtns, customAlertClose, customAlertInput, customAlertMsg, customAlertOverlay, deleteBgBtn, deleteQrBtn, emailInput, errEl, guestBtn, headerAdminName, loginBgInput, loginOverlay, loginAvatarCircle, loginAvatarImg, loginAvatarInitial, loginBtnEl, newPw, overlay, pwInput, qrNoPreview, qrPreviewImg, qrUploadInput, saveAdminNameBtn, saveGcashBtn, savePwBtn, settingsAdminName, settingsAvatarImg, settingsAvatarInitial, settingsGcashName, settingsGcashNumber, setupBtn, setupNote, uploadBgBtn, uploadQrBtn } from './dom.js';
import { getIsAdmin, setCurrentSectionId, setSections, setStudentPrompted, setStudents, setUnsubscribeStudents, students, unsubscribeStudents } from './state.js';
import { auth, db } from './firebase.js';
import { hashPassword, verifyPassword } from './crypto.js';
import { escapeHtml, readFileAsBase64, readImageAsBase64 } from './utils.js';
import { unsubscribeSections, unsubscribeSuggestions } from './db.js';
import { hideStudentProfile, isSoundOn, loadSmsSettings, renderPresetsManager, renderStudentList, renderThemeSwatches, showAlert, showConfirm, showStudentProfile, showWelcome, updateMainGcash } from './ui.js';
import { signInAnonymously, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { doc, setDoc, getDoc, updateDoc, deleteField, onSnapshot, increment } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

        export function updateAdminNameDisplay() {
            adminNameDisplay.textContent = adminName;
            headerAdminName.textContent = adminName;
        }

        export function updateAdminAvatarDisplay() {
            if (adminPhotoUrl) {
                loginAvatarImg.src = adminPhotoUrl;
                loginAvatarImg.style.display = 'block';
                loginAvatarInitial.style.display = 'none';
                loginAvatarCircle.classList.add('has-photo');
                settingsAvatarImg.src = adminPhotoUrl;
                settingsAvatarImg.style.display = 'block';
                settingsAvatarInitial.style.display = 'none';
            } else {
                loginAvatarImg.style.display = 'none';
                loginAvatarInitial.style.display = 'block';
                loginAvatarCircle.classList.remove('has-photo');
                settingsAvatarImg.style.display = 'none';
                settingsAvatarInitial.style.display = 'block';
                const initials = adminName.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
                loginAvatarInitial.textContent = initials;
                settingsAvatarInitial.textContent = initials || 'ZC';
            }
        }

        export let setupMode = false;
        export let legacyCleanupDone = false;
        export const DEFAULT_LOGIN_LABEL = loginBtnEl.textContent;

        export function authErrorMessage(e) {
            const code = (e && e.code) || '';
            if (code === 'auth/invalid-email') return 'Invalid email address.';
            if (code === 'auth/missing-password') return 'Enter your password.';
            if (code === 'auth/weak-password') return 'Password must be at least 6 characters.';
            if (code === 'auth/email-already-in-use') return 'That email already has an account — try logging in instead.';
            if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') return 'Wrong email or password!';
            if (code === 'auth/too-many-requests') return 'Too many attempts. Wait a moment and try again.';
            if (code === 'auth/network-request-failed') return 'Network error. Check your connection.';
            if (code === 'auth/operation-not-allowed') return 'Email/Password sign-in is turned off. Enable it in Firebase Console → Authentication → Sign-in method.';
            if (code === 'auth/configuration-not-found') return 'Firebase Auth is not set up yet. Enable Email/Password in Firebase Console.';
            if (code === 'auth/not-admin') return 'This account is not the registered admin.';
            return 'Login failed' + (code ? ' (' + code + ')' : '') + '. Please try again.';
        }
        export function showLoginError(msg) {
            errEl.textContent = msg;
            errEl.style.display = 'block';
        }
        export function isAdminSession() {
            const u = auth.currentUser;
            if (!u || u.isAnonymous || !u.email) return false;
            if (adminRegisteredEmail) return u.email === adminRegisteredEmail;
            return true;
        }
        export function updateSetupButtonVisibility() {
            setupBtn.style.display = adminRegistered ? 'none' : '';
        }
        export function enterSetupMode() {
            setupMode = true;
            confirmInput.style.display = 'block';
            setupNote.style.display = 'block';
            loginBtnEl.textContent = '✅ Create Admin Account';
        }
        export function exitSetupMode() {
            setupMode = false;
            confirmInput.style.display = 'none';
            setupNote.style.display = 'none';
            loginBtnEl.textContent = DEFAULT_LOGIN_LABEL;
        }
        setupBtn.addEventListener('click', function() {
            errEl.style.display = 'none';
            if (setupMode) exitSetupMode(); else enterSetupMode();
        });

        export async function cleanupLegacyAdminSecrets() {
            if (legacyCleanupDone) return;
            legacyCleanupDone = true;
            try {
                localStorage.removeItem('fm_admin_pw');
                localStorage.removeItem('fm_admin_pw_hash');
                const snap = await getDoc(doc(db, 'settings', 'admin'));
                if (snap.exists() && (snap.data().adminPwHash || snap.data().adminPw)) {
                    await updateDoc(doc(db, 'settings', 'admin'), { adminPwHash: deleteField(), adminPw: deleteField() });
                }
            } catch (e) {}
        }

        export function enterApp(admin) {
            window.__isAdmin = admin;
            overlay.classList.add('hidden');
            badge.className = admin ? 'admin-badge' : 'viewer-badge';
            badge.textContent = admin ? '👑 Admin' : '👨‍🎓 Student';
            errEl.style.display = 'none';
            document.body.classList.toggle('is-admin', admin);
            updateEditProfileBtnVisibility();
            if (admin) cleanupLegacyAdminSecrets();
            if (window.__fireLogin) window.__fireLogin();
        }

        loginBtnEl.addEventListener('click', async function() {
            errEl.style.display = 'none';
            const email = emailInput.value.trim();
            const password = pwInput.value;
            if (!email || !password) { showLoginError('Enter email and password.'); return; }
            if (setupMode) {
                if (password !== confirmInput.value) { showLoginError('Passwords do not match.'); return; }
                loginBtnEl.disabled = true;
                try {
                    const cred = await createUserWithEmailAndPassword(auth, email, password);
                    await setDoc(doc(db, 'settings', 'admin'), { adminRegistered: true, adminEmail: cred.user.email }, { merge: true });
                    adminRegistered = true;
                    adminRegisteredEmail = cred.user.email;
                    updateSetupButtonVisibility();
                    exitSetupMode();
                    pwInput.value = ''; confirmInput.value = '';
                    enterApp(true);
                } catch (e) {
                    showLoginError(authErrorMessage(e));
                } finally {
                    loginBtnEl.disabled = false;
                }
                return;
            }
            loginBtnEl.disabled = true;
            try {
                if (auth.currentUser && auth.currentUser.isAnonymous) await signOut(auth);
                await signInWithEmailAndPassword(auth, email, password);
                if (!isAdminSession()) throw { code: 'auth/not-admin' };
                pwInput.value = '';
                enterApp(true);
            } catch (e) {
                showLoginError(authErrorMessage(e));
                pwInput.value = '';
            } finally {
                loginBtnEl.disabled = false;
            }
        });
        pwInput.addEventListener('keypress', function(e) { if (e.key === 'Enter') loginBtnEl.click(); });
        confirmInput.addEventListener('keypress', function(e) { if (e.key === 'Enter') loginBtnEl.click(); });
        guestBtn.addEventListener('click', async function() {
            if (!auth.currentUser) { try { await signInAnonymously(auth); } catch (e) { console.warn('Anonymous auth unavailable:', e.message); } }
            enterApp(false);
        });

        document.getElementById('logoutBtn').addEventListener('click', async function() {
            try { await signOut(auth); } catch (e) {}
            window.__isAdmin = false;
            document.body.classList.remove('is-admin');
            if (window.__unsubscribeAll) window.__unsubscribeAll();
            if (window._inboxUnsub) { window._inboxUnsub(); window._inboxUnsub = null; }
            setCurrentSectionId(null);
            setStudentPrompted(false);
            overlay.classList.remove('hidden');
            emailInput.value = '';
            pwInput.value = '';
            confirmInput.value = '';
            exitSetupMode();
            errEl.style.display = 'none';
            badge.className = 'viewer-badge';
            badge.textContent = '👨‍🎓 Student';
            headerAdminName.textContent = '';
        });

        export async function loadAdminSettings() {
            loginBgUrl = localStorage.getItem('fm_login_bg') || '';
            applyLoginBg();
            try {
                const settingsDoc = await getDoc(doc(db, 'settings', 'admin'));
                if (settingsDoc.exists()) {
                    const data = settingsDoc.data();
                    adminRegistered = data.adminRegistered === true;
                    adminRegisteredEmail = data.adminEmail || '';
                    adminName = data.adminName || 'Zeraldin Cauba';
                    adminPhotoUrl = data.adminPhoto || '';
                    loginBgUrl = data.loginBg || '';
                    localStorage.setItem('fm_login_bg', loginBgUrl);
                    applyLoginBg();
                    gcashQRUrl = data.gcashQR || '';
                    allowStudentEdit = data.allowStudentEdit || false;
                    document.getElementById('allowStudentEditToggle').checked = allowStudentEdit;
                    localStorage.setItem('fm_gcash_qr', gcashQRUrl);
                    updateAdminNameDisplay();
                    updateAdminAvatarDisplay();
                } else {
                    adminRegistered = false;
                    adminRegisteredEmail = '';
                    updateAdminNameDisplay();
                    updateAdminAvatarDisplay();
                }
                updateSetupButtonVisibility();
            } catch (e) {
                adminRegistered = true;
                adminName = localStorage.getItem('fm_admin_name') || 'Zeraldin Cauba';
                adminPhotoUrl = localStorage.getItem('fm_admin_photo') || '';
                gcashQRUrl = localStorage.getItem('fm_gcash_qr') || '';
                allowStudentEdit = localStorage.getItem('fm_allow_student_edit') === 'true';
                document.getElementById('allowStudentEditToggle').checked = allowStudentEdit;
                visitorCount = parseInt(localStorage.getItem('fm_visitor_count') || '0');
                document.getElementById('visitorCountNum').textContent = visitorCount;
                updateAdminNameDisplay();
                updateAdminAvatarDisplay();
                applyLoginBg();
            }
        }

        export function startSettingsListener() {
            if (unsubscribeSettings) unsubscribeSettings();
            unsubscribeSettings = onSnapshot(doc(db, 'settings', 'admin'), (settingsDoc) => {
                if (settingsDoc.exists()) {
                    const data = settingsDoc.data();
                    adminRegistered = data.adminRegistered === true;
                    adminRegisteredEmail = data.adminEmail || '';
                    adminName = data.adminName || 'Zeraldin Cauba';
                    adminPhotoUrl = data.adminPhoto || '';
                    gcashQRUrl = data.gcashQR || '';
                    allowStudentEdit = data.allowStudentEdit || false;
                    loginBgUrl = data.loginBg || '';
                    localStorage.setItem('fm_login_bg', loginBgUrl);
                    applyLoginBg();
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

        export async function trackVisitor() {
            if (localStorage.getItem('fm_visited')) return;
            try {
                await updateDoc(doc(db, 'settings', 'admin'), { visitorCount: increment(1) });
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

        export function updateEditProfileBtnVisibility() {
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

        adminPhotoBtn.addEventListener('click', function() {
            if (!isAdminSession()) return;
            adminPhotoInput.click();
        });

        adminPhotoInput.addEventListener('change', async function() {
            if (!isAdminSession()) { adminPhotoInput.value = ''; return; }
            if (!adminPhotoInput.files[0]) return;
            const photoUrl = await readFileAsBase64(adminPhotoInput.files[0]);
            adminPhotoUrl = photoUrl;
            updateAdminAvatarDisplay();
            localStorage.setItem('fm_admin_photo', adminPhotoUrl);
            try { await updateDoc(doc(db, 'settings', 'admin'), { adminPhoto: adminPhotoUrl }); } catch(e) {}
            adminPhotoInput.value = '';
        });

        uploadBgBtn.addEventListener('click', function() {
            if (!isAdminSession()) return;
            loginBgInput.click();
        });

        loginBgInput.addEventListener('change', async function() {
            if (!isAdminSession()) { loginBgInput.value = ''; return; }
            if (!loginBgInput.files[0]) return;
            const dataUrl = await readImageAsBase64(loginBgInput.files[0], 1600, 0.78);
            loginBgInput.value = '';
            if (!dataUrl) { await showAlert('Could not read that image. Try another file.'); return; }
            if (dataUrl.length > 950000) { await showAlert('Image is too large. Please choose a smaller or simpler photo.'); return; }
            loginBgUrl = dataUrl;
            localStorage.setItem('fm_login_bg', loginBgUrl);
            applyLoginBg();
            try {
                await updateDoc(doc(db, 'settings', 'admin'), { loginBg: loginBgUrl });
                await showAlert('✅ Login background updated!');
            } catch(e) {
                await showAlert('❌ Could not save background. Make sure you are logged in as admin.');
            }
        });

        deleteBgBtn.addEventListener('click', async function() {
            if (!isAdminSession()) return;
            if (!await showConfirm('Remove the login page background?')) return;
            loginBgUrl = '';
            localStorage.removeItem('fm_login_bg');
            applyLoginBg();
            try { await updateDoc(doc(db, 'settings', 'admin'), { loginBg: '' }); } catch(e) {}
            await showAlert('🗑️ Login background removed!');
        });

        customAlertClose.addEventListener('click', function() {
            customAlertOverlay.classList.add('hidden');
            if (unsubscribeStudents) { unsubscribeStudents(); setUnsubscribeStudents(null); }
            setCurrentSectionId(null);
            setSections([]);
            setStudents([]);
            setStudentPrompted(false);
            overlay.classList.remove('hidden');
            pwInput.value = '';
            errEl.style.display = 'none';
        });

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
            const user = auth.currentUser;
            if (!user || user.isAnonymous) { await showAlert('Sign in as admin first!'); return; }
            if (newPw.value.length < 6) { await showAlert('Password must be at least 6 characters (Firebase requirement)!'); return; }
            if (newPw.value !== confirmPw.value) { await showAlert('New passwords do not match!'); return; }
            try {
                const cred = EmailAuthProvider.credential(user.email, currentPw.value);
                await reauthenticateWithCredential(user, cred);
            } catch (e) {
                await showAlert(e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential' ? 'Current password is wrong!' : 'Re-authentication failed: ' + (e.message || 'try logging in again.'));
                return;
            }
            try {
                await updatePassword(user, newPw.value);
            } catch (e) {
                await showAlert('Could not change password: ' + (e.message || 'unknown error.'));
                return;
            }
            currentPw.value = ''; newPw.value = ''; confirmPw.value = '';
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

        export function updateQRPreview() {
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

        export function closeChangePwModal() { changePwModal.classList.remove('active'); }
        window.closeChangePwModal = closeChangePwModal;
        changePwModal.addEventListener('click', (e) => { if (e.target === changePwModal) closeChangePwModal(); });

        export let heartbeatInterval = null;
        export function updateStudentLastOnline() {
            const sid = localStorage.getItem('fm_student_session_id');
            if (!sid) return;
            updateDoc(doc(db, 'students', sid), { lastOnline: Date.now() }).catch(() => {});
        }
        export function startHeartbeat(sid) {
            localStorage.setItem('fm_student_session_id', sid);
            updateDoc(doc(db, 'students', sid), { lastOnline: Date.now() }).catch(() => {});
            heartbeatInterval = setInterval(updateStudentLastOnline, 30000);
            showStudentProfile(sid);
        }
        export function stopHeartbeat() {
            if (heartbeatInterval) clearInterval(heartbeatInterval);
            localStorage.removeItem('fm_student_session_id');
            hideStudentProfile();
            document.getElementById('editProfileBtn').style.display = 'none';
        }
        window.__unsubscribeAll = function() {
            if (unsubscribeSections) unsubscribeSections();
            if (unsubscribeStudents) unsubscribeStudents();
            if (unsubscribeSuggestions) unsubscribeSuggestions();
            if (unsubscribeSettings) unsubscribeSettings();
            stopHeartbeat();
        };

        export function promptStudentSelect() {
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
        export function promptStudentPassword(studentId) {
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
                    const match = await verifyPassword(pwIn.value, existingPw);
                    if (match && typeof existingPw === 'string') {
                        try {
                            const record = await hashPassword(pwIn.value);
                            await updateDoc(doc(db, 'students', String(studentId)), { pw: record });
                            localStorage.setItem('fm_student_pw_' + studentId, JSON.stringify(record));
                            const migIdx = students.findIndex(s => String(s.id) === String(studentId));
                            if (migIdx !== -1) students[migIdx].pw = record;
                        } catch (e) {}
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
                    const h = await hashPassword(p1);
                    localStorage.setItem('fm_student_pw_' + studentId, JSON.stringify(h));
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
        export function promptCreateNewPassword(studentId) {
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
                const h = await hashPassword(p1);
                localStorage.setItem('fm_student_pw_' + studentId, JSON.stringify(h));
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

        export let adminRegistered = false;
        export let adminRegisteredEmail = '';
        export let adminName = 'Zeraldin Cauba';
        export let adminPhotoUrl = '';
        export let gcashQRUrl = '';
        export let unsubscribeSettings = null;
        export let allowStudentEdit = false;
        export let visitorCount = 0;
        export let loginBgUrl = '';

        export function applyLoginBg() {
            if (loginBgUrl) {
                loginOverlay.style.backgroundImage = "linear-gradient(rgba(5,8,16,0.55), rgba(5,8,16,0.55)), url('" + loginBgUrl + "')";
                loginOverlay.style.backgroundSize = 'cover';
                loginOverlay.style.backgroundPosition = 'center';
                loginOverlay.style.backgroundRepeat = 'no-repeat';
            } else {
                loginOverlay.style.backgroundImage = '';
                loginOverlay.style.backgroundSize = '';
                loginOverlay.style.backgroundPosition = '';
                loginOverlay.style.backgroundRepeat = '';
            }
            if (deleteBgBtn) deleteBgBtn.style.display = loginBgUrl ? 'block' : 'none';
        }

        window.__startStudentSession = function(studentId) {
            stopHeartbeat();
            startHeartbeat(studentId);
        };
