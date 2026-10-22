import { badge, changePwBtn, changePwModal, confirmInput, confirmPw, currentPw, customAlertBtns, customAlertClose, customAlertInput, customAlertMsg, customAlertOverlay, deleteQrBtn, emailCurrentPw, emailInput, errEl, headerAdminName, loginBtnEl, newPw, ownerOnlySettings, overlay, pwInput, qrNoPreview, qrPreviewImg, qrUploadInput, saveEmailBtn, saveGcashBtn, savePwBtn, saveTreasProfileNameBtn, settingsCurrentEmail, settingsGcashName, settingsGcashNumber, settingsNewEmail, setupBtn, setupNote, treasProfileAvatarImg, treasProfileAvatarInitial, treasProfileNameInput, treasProfilePhotoBtn, treasProfilePhotoInput, uploadQrBtn } from './dom.js';
import { getIsAdmin, sections, setCurrentSectionId, setSections, setStudentPrompted, setStudents, setUnsubscribeStudents, students, unsubscribeStudents } from './state.js';
import { auth, db } from './firebase.js';
import { escapeHtml, readImageAsBase64 } from './utils.js';
        import { unsubscribeSections, unsubscribeSuggestions, stopAdminRequestsListener, stopRequestsListener } from './db.js';
import { hideStudentProfile, isSoundOn, loadSmsSettings, renderPresetsManager, renderStudentList, renderThemeSwatches, showAlert, showConfirm, showStudentProfile, showWelcome, updateMainGcash , setSecretaryHeroName } from './ui.js';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, signOut, EmailAuthProvider, reauthenticateWithCredential, updatePassword, verifyBeforeUpdateEmail, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
        import { doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, deleteField, onSnapshot, increment, collection, query, orderBy } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
        import { sendDevEmail } from './notify.js';
        import { secretaryMode, handleSecretaryLogin, enterSecretaryMode, exitSecretaryApp, exitSecretaryMode, stopSecRequestsListener } from './secretary.js';
        import { renderDevProfile } from './profile.js';
        import { setActiveRole, setRoleBackground, setRoleName, setRolePhoto, ROLE_DEVELOPER, ROLE_SECRETARY, ROLE_TREASURER } from './roleTheme.js';
        import { applyLoginProfileForEmail, lastLoginEmail, lastLoginRole, rememberLoginEmail, TREASURER_PROFILES } from './loginProfile.js';

        // The signed-in admin's OWN profile (a delegated treasurer is not the
        // owner, so the app header shows their own name and photo).
        let ownAdminName = '';
        let ownAdminPhotoUrl = '';

        export function updateAdminNameDisplay() {
            setRoleName(ROLE_TREASURER, adminName);
            setRoleName(ROLE_DEVELOPER, devName || adminName);
            headerAdminName.textContent = ownAdminName || adminName;
            setSecretaryHeroName(ownAdminName || adminName);
            renderDevProfile();
        }

        export function updateAdminAvatarDisplay() {
            setRolePhoto(ROLE_TREASURER, adminPhotoUrl);
            setRolePhoto(ROLE_DEVELOPER, devPhotoUrl || adminPhotoUrl);
            renderDevProfile();
        }

        // Preview for the signed-in admin's OWN treasurer profile.
        export function updateTreasProfilePreview() {
            if (treasProfileNameInput && !treasProfileNameInput.value) {
                treasProfileNameInput.value = ownAdminName || '';
            }
            if (!treasProfileAvatarImg || !treasProfileAvatarInitial) return;
            if (ownAdminPhotoUrl) {
                treasProfileAvatarImg.src = ownAdminPhotoUrl;
                treasProfileAvatarImg.style.display = 'block';
                treasProfileAvatarInitial.style.display = 'none';
            } else {
                treasProfileAvatarImg.style.display = 'none';
                treasProfileAvatarInitial.style.display = 'block';
                const initials = (ownAdminName || '').split(' ').filter(Boolean).map(w => w[0]).join('').substring(0, 2).toUpperCase();
                treasProfileAvatarInitial.textContent = initials || '💰';
            }
        }

        // The shared secretary login identity is retired. Every secretary keeps
        // their own photo + name in secretary_profiles/{email}, so the old
        // shared value is purged once so no face or name can leak to anybody
        // else on the 📝 login page. The shared admin name goes with it: the
        // app falls back to its own default and to each account's own profile.
        let sharedSecretaryProfilePurged = false;
        export async function purgeSharedSecretaryProfile() {
            if (sharedSecretaryProfilePurged) return;
            sharedSecretaryProfilePurged = true;
            roleSecPhotoUrl = '';
            roleSecName = '';
            try { localStorage.removeItem('fm_sec_photo'); localStorage.removeItem('fm_sec_name'); localStorage.removeItem('fm_admin_name'); } catch (e) {}
            if (!isOwnerSession()) return;
            try {
                await updateDoc(doc(db, 'settings', 'admin'), { secName: '', secPhoto: '', adminName: '' });
                adminName = DEFAULT_ADMIN_NAME;
                updateAdminNameDisplay();
            } catch (e) {}
        }

        // Only the owner (developer) may change the shared app settings
        // (student self-edit toggle).
        export function applyOwnerOnlySettingsVisibility() {
            if (!ownerOnlySettings) return;
            const owner = isOwnerSession();
            ownerOnlySettings.style.display = owner ? '' : 'none';
        }

        export let setupMode = false;
        export let legacyCleanupDone = false;
        export const DEFAULT_LOGIN_LABEL = loginBtnEl.textContent;

        // Phone fallback row inside the login box (Secretary / Developer).
        export function toggleMobilePanelLinks(show) {
            const el = document.getElementById('mobilePanelLinks');
            if (el) el.classList.toggle('is-hidden', !show);
        }

        export function authErrorMessage(e) {
            const code = (e && e.code) || '';
            if (code === 'auth/invalid-email') return 'Invalid email address.';
            if (code === 'auth/missing-password') return 'Enter your password.';
            if (code === 'auth/weak-password') return 'Password must be at least 8 characters.';
            if (code === 'auth/email-already-in-use') return 'That email already has an account — try logging in instead.';
            if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') return 'Wrong email or password!';
            if (code === 'auth/user-not-found') return 'No account exists for that email.';
            if (code === 'auth/too-many-requests') return 'Too many attempts. Wait a moment and try again.';
            if (code === 'auth/network-request-failed') return 'Network error. Check your connection.';
            if (code === 'auth/operation-not-allowed') return 'Email/Password sign-in is turned off. Enable it in Firebase Console → Authentication → Sign-in method.';
            if (code === 'auth/configuration-not-found') return 'Firebase Auth is not set up yet. Enable Email/Password in Firebase Console.';
            if (code === 'auth/not-admin') return 'This account is not the registered admin.';
            if (code === 'app/not-linked') return "This email isn't linked to a student yet. Click 'Create account' first — the admin will approve it.";
            if (code === 'app/pending') return 'Your account is still pending admin approval.';
            return 'Login failed' + (code ? ' (' + code + ')' : '') + '. Please try again.';
        }
        export function showLoginError(msg) {
            errEl.textContent = msg;
            errEl.style.display = 'block';
        }
        export function isAdminSession() {
            const u = auth.currentUser;
            if (!u || u.isAnonymous || !u.email) return false;
            if (adminRegisteredEmail) return u.email === adminRegisteredEmail || window.__approvedAdmin === true;
            return true;
        }
        // The OWNER (developer) is the only account registered in
        // settings/admin. Delegated treasurers (admins/{uid}) are admins but
        // never owners — they cannot approve staff accounts.
        export function isOwnerSession() {
            const u = auth.currentUser;
            if (!u || u.isAnonymous || !u.email) return false;
            if (window.__ownerSession === true) return true;
            return !!adminRegisteredEmail && u.email.toLowerCase() === adminRegisteredEmail.toLowerCase();
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
            purgeLegacyStudentPw();
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
                if (password.length < 8) { showLoginError('Password must be at least 8 characters.'); return; }
                if (password !== confirmInput.value) { showLoginError('Passwords do not match.'); return; }
                loginBtnEl.disabled = true;
                try {
                    const cred = await createUserWithEmailAndPassword(auth, email, password);
                    await setDoc(doc(db, 'settings', 'admin'), { adminRegistered: true, adminEmail: cred.user.email, adminUid: cred.user.uid }, { merge: true });
                    adminRegistered = true;
                    adminRegisteredEmail = cred.user.email;
                    window.__ownerSession = true;
                    sendDevEmail('account_created', cred.user.email);
                    updateSetupButtonVisibility();
                    exitSetupMode();
                    pwInput.value = ''; confirmInput.value = '';
                    enterApp(true);
                    if (developerMode) { exitDeveloperMode(); enterDevSession(); }
                } catch (e) {
                    showLoginError(authErrorMessage(e));
                } finally {
                    loginBtnEl.disabled = false;
                }
                return;
            }
            if (studentMode) {
                await studentSignIn(email, password);
                return;
            }
            if (secretaryMode) {
                await handleSecretaryLogin();
                return;
            }
            if (developerMode) {
                loginBtnEl.disabled = true;
                loginBtnEl.textContent = '⏳ Signing in...';
                try {
                    if (auth.currentUser && auth.currentUser.isAnonymous) await signOut(auth);
                    const cred = await signInWithEmailAndPassword(auth, email, password);
                    if (!adminRegisteredEmail || cred.user.email !== adminRegisteredEmail) {
                        throw { code: 'auth/not-admin' };
                    }
                    window.__approvedAdmin = false;
                    window.__ownerSession = true;
                    pwInput.value = '';
                    rememberLoginEmail(cred.user.email || email, 'developer');
                    errEl.style.display = 'none';
                    errEl.style.color = '#10b981';
                    errEl.textContent = '✅ Developer signed in successfully!';
                    errEl.style.display = 'block';
                    setDevSignedInStatus(true);
                    // Log the sign-in to activity_logs
                    try {
                        const { addDoc, collection: col, serverTimestamp } = await import("https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js");
                        await addDoc(col(db, 'activity_logs'), {
                            action: 'developer_login',
                            details: 'Developer (owner) signed in',
                            studentName: '',
                            amount: 0,
                            timestamp: Date.now()
                        });
                    } catch (e) {}
                    setTimeout(() => {
                        errEl.style.color = '';
                        exitDeveloperMode();
                        enterApp(true);
                        enterDevSession();
                    }, 1500);
                } catch (e) {
                    errEl.style.color = '';
                    showLoginError(e.code === 'auth/not-admin'
                        ? '⛔ Access denied. Only the owner (developer) can log in here.'
                        : authErrorMessage(e));
                    pwInput.value = '';
                    loginBtnEl.textContent = '👑 Developer Login';
                } finally {
                    loginBtnEl.disabled = false;
                }
                return;
            }
            loginBtnEl.disabled = true;
            try {
                if (auth.currentUser && auth.currentUser.isAnonymous) await signOut(auth);
                const cred = await signInWithEmailAndPassword(auth, email, password);
                // Owner check first
                if (adminRegisteredEmail && cred.user.email === adminRegisteredEmail) {
                    window.__approvedAdmin = false;
                    window.__ownerSession = true;
                    pwInput.value = '';
                    rememberLoginEmail(cred.user.email || email, 'treasurer');
                    loadOwnAdminProfile(cred.user.email || email, adminName);
                    enterApp(true);
                    return;
                }
                // Multi-admin: check admins/{uid} collection
                const adminSnap = await getDoc(doc(db, 'admins', cred.user.uid));
                if (adminSnap.exists() && adminSnap.data().status === 'approved') {
                    window.__approvedAdmin = true;
                    window.__ownerSession = false;
                    pwInput.value = '';
                    rememberLoginEmail(cred.user.email || email, 'treasurer');
                    loadOwnAdminProfile(cred.user.email || email, adminSnap.data().name || '');
                    enterApp(true);
                    return;
                }
                if (adminSnap.exists() && adminSnap.data().status === 'pending') {
                    window.__approvedAdmin = false;
                    window.__ownerSession = false;
                    watchOwnAdminRequest();
                    showLoginError('⏳ Your admin account is still pending owner approval. Keep this page open — you will enter automatically once approved.');
                    pwInput.value = '';
                    return;
                }
                // Not an admin at all
                window.__approvedAdmin = false;
                window.__ownerSession = false;
                throw { code: 'auth/not-admin' };
            } catch (e) {
                showLoginError(authErrorMessage(e));
                pwInput.value = '';
            } finally {
                loginBtnEl.disabled = false;
            }
        });
        pwInput.addEventListener('keypress', function(e) { if (e.key === 'Enter') loginBtnEl.click(); });
        confirmInput.addEventListener('keypress', function(e) { if (e.key === 'Enter') loginBtnEl.click(); });

        // ================= STUDENT EMAIL AUTH =================
        export let studentMode = false;
        const studentModeBtn = document.getElementById('studentModeBtn');
        const studentLoginLinks = document.getElementById('studentLoginLinks');
        const studentModeBack = document.getElementById('studentModeBack');
        const forgotPwLinkEl = document.getElementById('forgotPwLink');
        const createAccountLinkEl = document.getElementById('createAccountLink');
        const backToSecretaryLoginEl = document.getElementById('backToSecretaryLogin');
        const studentSignInToggle = document.getElementById('studentSignInToggle');
        const createAccountWrap = document.getElementById('createAccountWrap');
        const adminSignUpBtnEl = document.getElementById('adminSignUpBtn');

        function enterStudentMode() {
            studentMode = true;
            exitSetupMode();
            setupBtn.style.display = 'none';
            loginBtnEl.textContent = '🎓 Student Login';
            emailInput.placeholder = 'student@email.com';
            studentLoginLinks.style.display = 'block';
            studentSignInToggle.style.display = '';
            createAccountWrap.style.display = 'none';
            studentModeBack.style.display = 'block';
            studentModeBtn.style.display = 'none';
            errEl.style.display = 'none';
            setActiveRole(ROLE_TREASURER);
            toggleMobilePanelLinks(false);
        }
        export function exitStudentMode() {
            studentMode = false;
            loginBtnEl.textContent = DEFAULT_LOGIN_LABEL;
            emailInput.placeholder = 'treasurer@email.com';
            studentLoginLinks.style.display = 'none';
            studentSignInToggle.style.display = 'none';
            createAccountWrap.style.display = 'none';
            studentModeBack.style.display = 'none';
            studentModeBtn.style.display = '';
            adminSignUpBtnEl.style.display = '';
            updateSetupButtonVisibility();
            errEl.style.display = 'none';
            setActiveRole(ROLE_TREASURER);
            toggleMobilePanelLinks(true);
        }
        studentModeBtn.addEventListener('click', enterStudentMode);
        studentSignInToggle.addEventListener('click', function() {
            createAccountWrap.style.display = createAccountWrap.style.display === 'block' ? 'none' : 'block';
        });
        backToSecretaryLoginEl.addEventListener('click', exitStudentMode);

        export async function studentSignIn(email, password) {
            loginBtnEl.disabled = true;
            try {
                if (auth.currentUser && auth.currentUser.isAnonymous) await signOut(auth);
                const cred = await signInWithEmailAndPassword(auth, email, password);
                if (isAdminSession()) { pwInput.value = ''; rememberLoginEmail(cred.user.email || email, 'treasurer'); if (studentMode) exitStudentMode(); enterApp(true); return; }
                const userSnap = await getDoc(doc(db, 'users', cred.user.uid));
                if (userSnap.exists() && userSnap.data().role === 'student' && userSnap.data().studentId) {
                    rememberLoginEmail(cred.user.email || email, 'student');
                    finishStudentLogin(String(userSnap.data().studentId));
                    return;
                }
                const reqSnap = await getDoc(doc(db, 'account_requests', cred.user.uid));
                if (reqSnap.exists()) {
                    watchOwnRequest();
                    showLoginError('⏳ Your account is still pending approval. Keep this page open — you will enter automatically once approved.');
                    return;
                }
                throw { code: 'app/not-linked' };
            } catch (e) {
                showLoginError(authErrorMessage(e));
                pwInput.value = '';
            } finally {
                loginBtnEl.disabled = false;
            }
        }

        function finishStudentLogin(sid) {
            localStorage.setItem('fm_student_session_id', sid);
            cleanupLegacyStudentPw(sid);
            pwInput.value = '';
            if (studentMode) exitStudentMode();
            errEl.style.display = 'none';
            enterApp(false);
        }

        async function cleanupLegacyStudentPw(sid) {
            try { Object.keys(localStorage).filter(k => k.startsWith('fm_student_pw_')).forEach(k => localStorage.removeItem(k)); } catch (e) {}
            try { await updateDoc(doc(db, 'students', String(sid)), { pw: deleteField() }); } catch (e) {}
        }

        // Admin-only sweep: strip legacy password hashes from every student doc.
        export async function purgeLegacyStudentPw() {
            try {
                const snap = await getDocs(collection(db, 'students'));
                const jobs = [];
                snap.forEach(d => { const data = d.data() || {}; if ('pw' in data) jobs.push(updateDoc(d.ref, { pw: deleteField() })); });
                if (jobs.length) await Promise.all(jobs);
            } catch (e) {}
            purgeLegacyStudentPw();
        }

        forgotPwLinkEl.addEventListener('click', async function() {
            const email = emailInput.value.trim();
            if (!email) { showLoginError('Enter your email address first, then click Forgot password.'); return; }
            try {
                await sendPasswordResetEmail(auth, email);
                await showAlert('📧 Password reset link sent to ' + email + '.\n\nOpen it from your inbox to set a new password.');
            } catch (e) {
                showLoginError(authErrorMessage(e));
            }
        });

        let _requestUnsub = null;
        export function stopRequestWatcher() { if (_requestUnsub) { _requestUnsub(); _requestUnsub = null; } }

        export function watchOwnRequest() {
            const u = auth.currentUser;
            if (!u) return;
            stopRequestWatcher();
            showPendingRequestScreen();
            _requestUnsub = onSnapshot(doc(db, 'account_requests', u.uid), async (snap) => {
                if (snap.exists()) return;
                stopRequestWatcher();
                try {
                    const us = await getDoc(doc(db, 'users', u.uid));
                    if (us.exists() && us.data().role === 'student' && us.data().studentId) {
                        customAlertOverlay.classList.add('hidden');
                        finishStudentLogin(String(us.data().studentId));
                    } else {
                        customAlertOverlay.classList.add('hidden');
                        showLoginError('Your account request was not approved. Contact the admin or try again with your correct name.');
                        await signOut(auth).catch(() => {});
                    }
                } catch (e) {
                    customAlertOverlay.classList.add('hidden');
                    showLoginError('Could not verify your account. Please log in again.');
                }
            });
        }

        function showPendingRequestScreen() {
            document.querySelector('.custom-alert-title').textContent = '⏳ Account Pending Approval';
            customAlertMsg.innerHTML = `
                <p style="font-size:0.78rem;line-height:1.6;text-align:center;">
                    Your account was created and sent to the admin for approval.<br><br>
                    <b>Keep this page open</b> — you will enter automatically once approved.<br>
                    You can also close this and log in again later with your email and password.
                </p>`;
            customAlertInput.style.display = 'none';
            customAlertBtns.innerHTML = '<button class="custom-alert-btn custom-alert-cancel" id="cancelReqBtn">Cancel request</button><button class="custom-alert-btn custom-alert-ok" id="waitReqBtn">OK, waiting...</button>';
            customAlertOverlay.classList.remove('hidden');
            document.getElementById('waitReqBtn').onclick = function() { customAlertOverlay.classList.add('hidden'); };
            document.getElementById('cancelReqBtn').onclick = async function() {
                stopRequestWatcher();
                const u = auth.currentUser;
                customAlertOverlay.classList.add('hidden');
                try { if (u) await deleteDoc(doc(db, 'account_requests', u.uid)); } catch (e) {}
                try { await signOut(auth); } catch (e) {}
                showLoginError('Account request cancelled.');
            };
        }

        export async function promptStudentRegister() {
            let secOpts = '<option value="">Loading sections...</option>';
            try {
                const snap = await getDocs(query(collection(db, 'sections'), orderBy('order')));
                const list = [];
                snap.forEach(d => list.push({ id: parseInt(d.id), ...d.data() }));
                secOpts = list.length
                    ? list.map(s => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('')
                    : '<option value="">No section yet — ask the admin first</option>';
            } catch (e) {
                secOpts = '<option value="">Could not load sections — try again</option>';
            }
            document.querySelector('.custom-alert-title').textContent = '🙋 Create Student Account';
            customAlertMsg.innerHTML = `
                <p style="font-size:0.72rem;color:#888;margin-bottom:10px;">Register with your email. The admin will approve it and link it to your name in the class list.</p>
                <input type="text" id="reqName" placeholder="Your full name (as in the class list)" maxlength="60" style="width:100%;padding:10px;margin-bottom:8px;border-radius:12px;border:2px solid #e2cf9a;font-size:0.85rem;" autocomplete="off">
                <label style="font-size:0.7rem;font-weight:bold;display:block;text-align:left;">📚 Section</label>
                <select id="reqSection" style="width:100%;padding:10px;margin:4px 0 8px;border-radius:12px;border:2px solid #e2cf9a;font-size:0.85rem;">${secOpts}</select>
                <input type="email" id="reqEmail" placeholder="Email address" maxlength="60" style="width:100%;padding:10px;margin-bottom:8px;border-radius:12px;border:2px solid #e2cf9a;font-size:0.85rem;" autocomplete="email">
                <input type="password" id="reqPw" placeholder="Password (8+ characters)" style="width:100%;padding:10px;margin-bottom:8px;border-radius:12px;border:2px solid #e2cf9a;font-size:0.85rem;text-align:center;letter-spacing:3px;" autocomplete="new-password">
                <input type="password" id="reqPw2" placeholder="Confirm password" style="width:100%;padding:10px;border-radius:12px;border:2px solid #e2cf9a;font-size:0.85rem;text-align:center;letter-spacing:3px;" autocomplete="new-password">
                <div id="reqError" style="font-size:0.75rem;color:#dc3545;margin-top:6px;display:none;"></div>
            `;
            customAlertInput.style.display = 'none';
            customAlertBtns.innerHTML = '<button class="custom-alert-btn custom-alert-cancel" id="reqCancel">Cancel</button><button class="custom-alert-btn custom-alert-ok" id="reqSubmit">📩 Create Account</button>';
            customAlertOverlay.classList.remove('hidden');
            const nameEl = document.getElementById('reqName');
            const secEl = document.getElementById('reqSection');
            const emailEl = document.getElementById('reqEmail');
            const pwEl = document.getElementById('reqPw');
            const pw2El = document.getElementById('reqPw2');
            const reqErr = document.getElementById('reqError');
            nameEl.focus();
            document.getElementById('reqCancel').onclick = function() {
                customAlertOverlay.classList.add('hidden');
            };
            document.getElementById('reqSubmit').onclick = async function() {
                const name = nameEl.value.trim();
                const sectionId = secEl.value;
                const email = emailEl.value.trim();
                const p1 = pwEl.value;
                const p2 = pw2El.value;
                const fail = function(m) { reqErr.textContent = m; reqErr.style.display = 'block'; };
                reqErr.style.display = 'none';
                if (name.length < 2) return fail('Please enter your full name.');
                if (!sectionId) return fail('Please choose your section.');
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail('Please enter a valid email address.');
                if (p1.length < 8) return fail('Password must be at least 8 characters.');
                if (p1 !== p2) return fail('Passwords do not match.');
                const btn = document.getElementById('reqSubmit');
                btn.disabled = true; btn.textContent = 'Creating...';
                try {
                    const cred = await createUserWithEmailAndPassword(auth, email, p1);
                    const secList = [];
                    const secSnap = await getDocs(query(collection(db, 'sections'), orderBy('order')));
                    secSnap.forEach(d => secList.push({ id: parseInt(d.id), ...d.data() }));
                    const sec = secList.find(s => String(s.id) === String(sectionId));
                    await setDoc(doc(db, 'account_requests', cred.user.uid), {
                        uid: cred.user.uid,
                        email: cred.user.email,
                        name: name,
                        section_id: isNaN(parseInt(sectionId)) ? sectionId : parseInt(sectionId),
                        sectionName: sec ? sec.name : '',
                        status: 'pending',
                        requestedAt: Date.now()
                    });
                    watchOwnRequest();
                } catch (e) {
                    btn.disabled = false; btn.textContent = '📩 Create Account';
                    const code = (e && e.code) ? e.code : '';
                    fail(code === 'permission-denied'
                        ? 'Security rules not deployed yet — ask the admin to publish the new rules first.'
                        : authErrorMessage(e));
                }
            };
        }
        createAccountLinkEl.addEventListener('click', function() {
            customAlertOverlay.classList.add('hidden');
            promptStudentRegister();
        });

        // ================= ADMIN REQUEST (MULTI-ADMIN) =================
        let _adminReqUnsub = null;
        export function stopAdminRequestWatcher() { if (_adminReqUnsub) { _adminReqUnsub(); _adminReqUnsub = null; } }

        export function watchOwnAdminRequest() {
            const u = auth.currentUser;
            if (!u) return;
            stopAdminRequestWatcher();
            showPendingAdminScreen();
            _adminReqUnsub = onSnapshot(doc(db, 'admins', u.uid), async (snap) => {
                if (!snap.exists()) return;
                if (snap.data().status === 'approved') {
                    stopAdminRequestWatcher();
                    customAlertOverlay.classList.add('hidden');
                    window.__approvedAdmin = true;
                    pwInput.value = '';
                    enterApp(true);
                } else if (snap.data().status === 'revoked') {
                    stopAdminRequestWatcher();
                    customAlertOverlay.classList.add('hidden');
                    window.__approvedAdmin = false;
                    showLoginError('Your admin request was rejected. Contact the owner for more info.');
                    await signOut(auth).catch(() => {});
                }
            });
        }

        function showPendingAdminScreen() {
            document.querySelector('.custom-alert-title').textContent = '⏳ Admin Request Pending';
            customAlertMsg.innerHTML = `
                <p style="font-size:0.78rem;line-height:1.6;text-align:center;">
                    Your admin account request was sent to the owner for approval.<br><br>
                    <b>Keep this page open</b> — you will enter automatically once approved.<br>
                    You can also close this and log in again later with your email and password.
                </p>`;
            customAlertInput.style.display = 'none';
            customAlertBtns.innerHTML = '<button class="custom-alert-btn custom-alert-cancel" id="cancelAdminReqBtn">Cancel request</button><button class="custom-alert-btn custom-alert-ok" id="waitAdminReqBtn">OK, waiting...</button>';
            customAlertOverlay.classList.remove('hidden');
            document.getElementById('waitAdminReqBtn').onclick = function() { customAlertOverlay.classList.add('hidden'); };
            document.getElementById('cancelAdminReqBtn').onclick = async function() {
                stopAdminRequestWatcher();
                const u = auth.currentUser;
                customAlertOverlay.classList.add('hidden');
                try { if (u) await deleteDoc(doc(db, 'admins', u.uid)); } catch (e) {}
                try { await signOut(auth); } catch (e) {}
                showLoginError('Admin request cancelled.');
            };
        }

        export async function promptAdminRegister() {
            document.querySelector('.custom-alert-title').textContent = '🤝 Request Admin Access';
            customAlertMsg.innerHTML = `
                <p style="font-size:0.72rem;color:#888;margin-bottom:10px;">Register as an admin. The owner must approve your request before you can access the system.</p>
                <input type="text" id="adminReqName" placeholder="Your full name" maxlength="60" style="width:100%;padding:10px;margin-bottom:8px;border-radius:12px;border:2px solid #e2cf9a;font-size:0.85rem;" autocomplete="off">
                <input type="email" id="adminReqEmail" placeholder="Email address" maxlength="60" style="width:100%;padding:10px;margin-bottom:8px;border-radius:12px;border:2px solid #e2cf9a;font-size:0.85rem;" autocomplete="email">
                <input type="password" id="adminReqPw" placeholder="Password (8+ characters)" style="width:100%;padding:10px;margin-bottom:8px;border-radius:12px;border:2px solid #e2cf9a;font-size:0.85rem;text-align:center;letter-spacing:3px;" autocomplete="new-password">
                <input type="password" id="adminReqPw2" placeholder="Confirm password" style="width:100%;padding:10px;border-radius:12px;border:2px solid #e2cf9a;font-size:0.85rem;text-align:center;letter-spacing:3px;" autocomplete="new-password">
                <div id="adminReqError" style="font-size:0.75rem;color:#dc3545;margin-top:6px;display:none;"></div>
            `;
            customAlertInput.style.display = 'none';
            customAlertBtns.innerHTML = '<button class="custom-alert-btn custom-alert-cancel" id="adminReqCancel">Cancel</button><button class="custom-alert-btn custom-alert-ok" id="adminReqSubmit">📩 Send Request</button>';
            customAlertOverlay.classList.remove('hidden');
            const nameEl = document.getElementById('adminReqName');
            const emailEl = document.getElementById('adminReqEmail');
            const pwEl = document.getElementById('adminReqPw');
            const pw2El = document.getElementById('adminReqPw2');
            const reqErr = document.getElementById('adminReqError');
            nameEl.focus();
            document.getElementById('adminReqCancel').onclick = function() {
                customAlertOverlay.classList.add('hidden');
            };
            document.getElementById('adminReqSubmit').onclick = async function() {
                const name = nameEl.value.trim();
                const email = emailEl.value.trim();
                const p1 = pwEl.value;
                const p2 = pw2El.value;
                const fail = function(m) { reqErr.textContent = m; reqErr.style.display = 'block'; };
                reqErr.style.display = 'none';
                if (name.length < 2) return fail('Please enter your full name.');
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail('Please enter a valid email address.');
                if (p1.length < 8) return fail('Password must be at least 8 characters.');
                if (p1 !== p2) return fail('Passwords do not match.');
                // Prevent registering with the owner email
                if (adminRegisteredEmail && email.toLowerCase() === adminRegisteredEmail.toLowerCase()) return fail('This email is already the owner account. Please log in instead.');
                const btn = document.getElementById('adminReqSubmit');
                btn.disabled = true; btn.textContent = 'Sending...';
                try {
                    const cred = await createUserWithEmailAndPassword(auth, email, p1);
                    await setDoc(doc(db, 'admins', cred.user.uid), {
                        uid: cred.user.uid,
                        email: cred.user.email,
                        name: name,
                        status: 'pending',
                        requestedAt: Date.now()
                    });
                    // Per-account login profile: the login page shows this
                    // applicant's own name (and later their photo) once they
                    // type this email on any device.
                    try {
                        const mail = (cred.user.email || email).trim().toLowerCase();
                        await setDoc(doc(db, TREASURER_PROFILES, mail), {
                            email: mail,
                            name: name,
                            photoUrl: '',
                            updatedAt: Date.now()
                        }, { merge: true });
                    } catch (e) {}
                    rememberLoginEmail(cred.user.email || email, 'treasurer');
                    watchOwnAdminRequest();
                } catch (e) {
                    btn.disabled = false; btn.textContent = '📩 Send Request';
                    const code = (e && e.code) ? e.code : '';
                    fail(code === 'permission-denied'
                        ? 'Security rules not deployed yet — ask the owner to publish the new rules first.'
                        : authErrorMessage(e));
                }
            };
        }

        if (adminSignUpBtnEl) {
            adminSignUpBtnEl.addEventListener('click', function() {
                customAlertOverlay.classList.add('hidden');
                promptAdminRegister();
            });
        }

        // ================= DEVELOPER MODE =================
        export let developerMode = false;
        const ownerPanelBtnEl = document.getElementById('ownerPanelBtn');
        const developerModeBack = document.getElementById('developerModeBack');
        const devSignUpBtnEl = document.getElementById('devSignUpBtn');

        function setDevSignedInStatus(show) {
            const el = document.getElementById('devSignedInStatus');
            if (el) el.style.display = show ? 'block' : 'none';
        }

        const devSessionBarEl = document.getElementById('devSessionBar');
        const devOpenRequestsBtnEl = document.getElementById('devOpenRequestsBtn');
        const devLogoutBtnEl = document.getElementById('devLogoutBtn');

        export function enterDevSession() {
            document.body.classList.add('dev-session');
            if (devSessionBarEl) devSessionBarEl.style.display = 'flex';
            syncDevSessionPad();
            renderDevProfile();
            const adminRequestsModalEl = document.getElementById('adminRequestsModal');
            const adminRequestsListEl = document.getElementById('adminRequestsList');
            if (adminRequestsListEl) adminRequestsListEl.innerHTML = '<div class="no-results">Loading admin requests...</div>';
            if (adminRequestsModalEl) { if (window.switchAdminReqTab) window.switchAdminReqTab('admins'); adminRequestsModalEl.classList.add('active'); }
        }
        export function exitDevSession() {
            document.body.classList.remove('dev-session');
            document.body.style.paddingTop = '';
            if (devSessionBarEl) devSessionBarEl.style.display = 'none';
            if (window.closeProfileModal) window.closeProfileModal();
            const adminRequestsModalEl = document.getElementById('adminRequestsModal');
            if (adminRequestsModalEl) adminRequestsModalEl.classList.remove('active');
        }
        // The developer bar wraps to two rows on narrow phones — measure it so
        // the page content always starts below it.
        function syncDevSessionPad() {
            if (!devSessionBarEl) return;
            const hidden = devSessionBarEl.style.display === 'none';
            const h = hidden ? 0 : devSessionBarEl.offsetHeight;
            document.body.style.paddingTop = h ? (h + 4) + 'px' : '';
            // Every modal overlay starts below the developer bar so the
            // developer buttons stay clickable while a modal is open.
            document.documentElement.style.setProperty('--devbar-h', (h || 0) + 'px');
        }
        window.addEventListener('resize', syncDevSessionPad);
        window.addEventListener('orientationchange', function () { setTimeout(syncDevSessionPad, 250); });
        if (devOpenRequestsBtnEl) devOpenRequestsBtnEl.addEventListener('click', function() {
            const adminRequestsModalEl = document.getElementById('adminRequestsModal');
            if (window.switchAdminReqTab) window.switchAdminReqTab('admins');
            if (adminRequestsModalEl) adminRequestsModalEl.classList.add('active');
        });
        if (devLogoutBtnEl) devLogoutBtnEl.addEventListener('click', function() {
            exitDevSession();
            document.getElementById('logoutBtn').click();
        });

        function enterDeveloperMode() {
            developerMode = true;
            if (secretaryMode) exitSecretaryMode();
            if (studentMode) exitStudentMode();
            exitSetupMode();
            setupBtn.style.display = 'none';
            studentModeBtn.style.display = 'none';
            loginBtnEl.textContent = '👑 Developer Login';
            emailInput.placeholder = 'developer@email.com';
            studentLoginLinks.style.display = 'none';
            studentSignInToggle.style.display = 'none';
            createAccountWrap.style.display = 'none';
            developerModeBack.style.display = 'block';
            adminSignUpBtnEl.style.display = 'none';
            const secSignUpBtnEl = document.getElementById('secSignUpBtn');
            const secretaryModeBackEl = document.getElementById('secretaryModeBack');
            if (secSignUpBtnEl) secSignUpBtnEl.style.display = 'none';
            if (secretaryModeBackEl) secretaryModeBackEl.style.display = 'none';
            errEl.style.display = 'none';
            setDevSignedInStatus(false);
            devSignUpBtnEl.style.display = adminRegistered ? 'none' : '';
            setActiveRole(ROLE_DEVELOPER);
            updateAdminNameDisplay();
            updateAdminAvatarDisplay();
            toggleMobilePanelLinks(false);
            emailInput.focus();
        }
        export function exitDeveloperMode() {
            developerMode = false;
            loginBtnEl.textContent = DEFAULT_LOGIN_LABEL;
            emailInput.placeholder = 'treasurer@email.com';
            developerModeBack.style.display = 'none';
            adminSignUpBtnEl.style.display = '';
            studentModeBtn.style.display = '';
            devSignUpBtnEl.style.display = 'none';
            updateSetupButtonVisibility();
            errEl.style.display = 'none';
            setDevSignedInStatus(false);
            setActiveRole(ROLE_TREASURER);
            updateAdminNameDisplay();
            updateAdminAvatarDisplay();
            toggleMobilePanelLinks(true);
        }
        if (ownerPanelBtnEl) ownerPanelBtnEl.addEventListener('click', enterDeveloperMode);
        const mobileDeveloperBtn = document.getElementById('mobileDeveloperBtn');
        if (mobileDeveloperBtn) mobileDeveloperBtn.addEventListener('click', enterDeveloperMode);
        if (developerModeBack) developerModeBack.addEventListener('click', exitDeveloperMode);
        const backToSecretaryFromDevEl = document.getElementById('backToSecretaryFromDev');
        if (backToSecretaryFromDevEl) backToSecretaryFromDevEl.addEventListener('click', exitDeveloperMode);
        if (devSignUpBtnEl) devSignUpBtnEl.addEventListener('click', function() {
            enterSetupMode();
            loginBtnEl.textContent = '🛠️ Create Developer Account';
            devSignUpBtnEl.style.display = 'none';
        });

        document.getElementById('logoutBtn').addEventListener('click', async function() {
            try { await signOut(auth); } catch (e) {}
            window.__isAdmin = false;
            window.__ownerSession = false;
            window.__approvedAdmin = false;
            ownAdminName = '';
            ownAdminPhotoUrl = '';
            updateAdminNameDisplay();
            updateAdminAvatarDisplay();
            document.body.classList.remove('is-admin');
            if (window.__unsubscribeAll) window.__unsubscribeAll();
            if (window._inboxUnsub) { window._inboxUnsub(); window._inboxUnsub = null; }
            stopRequestsListener();
            stopAdminRequestsListener();
            stopAdminRequestWatcher();
            stopSecRequestsListener();
            exitSecretaryApp();
            setCurrentSectionId(null);
            setStudentPrompted(false);
            overlay.classList.remove('hidden');
            emailInput.value = '';
            pwInput.value = '';
            confirmInput.value = '';
            exitSetupMode();
            errEl.style.display = 'none';
            setDevSignedInStatus(false);
            exitDevSession();
            badge.className = 'viewer-badge';
            badge.textContent = '👨‍🎓 Student';
            headerAdminName.textContent = '';
        });

        export async function loadAdminSettings() {
            loginBgUrl = localStorage.getItem('fm_login_bg') || '';
            loginBgSecUrl = localStorage.getItem('fm_login_bg_sec') || '';
            loginBgDevUrl = localStorage.getItem('fm_login_bg_dev') || '';
            devPhotoUrl = localStorage.getItem('fm_dev_photo') || '';
            devName = localStorage.getItem('fm_dev_name') || '';
            // The shared secretary identity is retired: no shared photo/name
            // is ever loaded, so the 📝 login page can only show the profile
            // of the account whose email was typed.
            roleSecPhotoUrl = '';
            roleSecName = '';
            applyRoleSettings();
            try {
                const settingsDoc = await getDoc(doc(db, 'settings', 'admin'));
                if (settingsDoc.exists()) {
                    const data = settingsDoc.data();
                    adminRegistered = data.adminRegistered === true;
                    adminRegisteredEmail = data.adminEmail || '';
                    adminName = data.adminName || DEFAULT_ADMIN_NAME;
                    adminPhotoUrl = data.adminPhoto || '';
                    loginBgUrl = data.loginBg || '';
                    loginBgSecUrl = data.loginBgSec || '';
                    loginBgDevUrl = data.loginBgDev || '';
                    devPhotoUrl = data.devPhoto || '';
                    devName = data.devName || '';
                    roleSecPhotoUrl = '';
                    roleSecName = '';
                    localStorage.setItem('fm_login_bg', loginBgUrl);
                    localStorage.setItem('fm_login_bg_sec', loginBgSecUrl);
                    localStorage.setItem('fm_login_bg_dev', loginBgDevUrl);
                    localStorage.setItem('fm_dev_photo', devPhotoUrl);
                    localStorage.setItem('fm_dev_name', devName);
                    applyRoleSettings();
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
                adminName = localStorage.getItem('fm_admin_name') || DEFAULT_ADMIN_NAME;
                adminPhotoUrl = localStorage.getItem('fm_admin_photo') || '';
                gcashQRUrl = localStorage.getItem('fm_gcash_qr') || '';
                allowStudentEdit = localStorage.getItem('fm_allow_student_edit') === 'true';
                document.getElementById('allowStudentEditToggle').checked = allowStudentEdit;
                visitorCount = parseInt(localStorage.getItem('fm_visitor_count') || '0');
                document.getElementById('visitorCountNum').textContent = visitorCount;
                updateAdminNameDisplay();
                updateAdminAvatarDisplay();
                applyRoleSettings();
            }
            // One-time cleanup of the retired shared identity (owner only).
            purgeSharedSecretaryProfile();
        }

        export function startSettingsListener() {
            if (unsubscribeSettings) unsubscribeSettings();
            unsubscribeSettings = onSnapshot(doc(db, 'settings', 'admin'), (settingsDoc) => {
                if (settingsDoc.exists()) {
                    const data = settingsDoc.data();
                    adminRegistered = data.adminRegistered === true;
                    adminRegisteredEmail = data.adminEmail || '';
                    adminName = data.adminName || DEFAULT_ADMIN_NAME;
                    adminPhotoUrl = data.adminPhoto || '';
                    gcashQRUrl = data.gcashQR || '';
                    allowStudentEdit = data.allowStudentEdit || false;
                    loginBgUrl = data.loginBg || '';
                    loginBgSecUrl = data.loginBgSec || '';
                    loginBgDevUrl = data.loginBgDev || '';
                    devPhotoUrl = data.devPhoto || '';
                    devName = data.devName || '';
                    roleSecPhotoUrl = '';
                    roleSecName = '';
                    localStorage.setItem('fm_login_bg', loginBgUrl);
                    localStorage.setItem('fm_login_bg_sec', loginBgSecUrl);
                    localStorage.setItem('fm_login_bg_dev', loginBgDevUrl);
                    localStorage.setItem('fm_dev_photo', devPhotoUrl);
                    localStorage.setItem('fm_dev_name', devName);
                    applyRoleSettings();
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

        // ================= OWN TREASURER PROFILE (per account) =================
        // Every treasurer keeps their own profile doc (treasurer_profiles/{email})
        // so the 💰 login page shows THAT account's picture + name.
        if (saveTreasProfileNameBtn) saveTreasProfileNameBtn.addEventListener('click', async function() {
            if (!isAdminSession()) return;
            const u = auth.currentUser;
            if (!u || !u.email) { await showAlert('⛔ No account signed in.'); return; }
            const name = (treasProfileNameInput.value || '').trim();
            if (!name) { await showAlert('⛔ Name cannot be empty.'); return; }
            const mail = u.email.trim().toLowerCase();
            try {
                await setDoc(doc(db, TREASURER_PROFILES, mail), {
                    email: mail,
                    name: name,
                    photoUrl: ownAdminPhotoUrl || '',
                    updatedAt: Date.now()
                }, { merge: true });
                ownAdminName = name;
                updateAdminNameDisplay();
                updateTreasProfilePreview();
                await showAlert('✅ Your treasurer profile name was saved!');
            } catch (e) {
                await showAlert('⛔ Could not save: ' + (e && e.message ? e.message : 'error'));
            }
        });

        if (treasProfilePhotoBtn) treasProfilePhotoBtn.addEventListener('click', function() {
            if (!isAdminSession()) return;
            treasProfilePhotoInput.click();
        });

        if (treasProfilePhotoInput) treasProfilePhotoInput.addEventListener('change', async function() {
            if (!isAdminSession()) { treasProfilePhotoInput.value = ''; return; }
            const u = auth.currentUser;
            if (!u || !u.email) { treasProfilePhotoInput.value = ''; return; }
            if (!treasProfilePhotoInput.files[0]) return;
            const photoUrl = await readImageAsBase64(treasProfilePhotoInput.files[0], 600, 0.8);
            treasProfilePhotoInput.value = '';
            if (!photoUrl) { await showAlert('⛔ Could not read that image. Try another photo.'); return; }
            const mail = u.email.trim().toLowerCase();
            try {
                await setDoc(doc(db, TREASURER_PROFILES, mail), {
                    email: mail,
                    name: ownAdminName || (treasProfileNameInput.value || '').trim(),
                    photoUrl: photoUrl,
                    updatedAt: Date.now()
                }, { merge: true });
                ownAdminPhotoUrl = photoUrl;
                updateAdminAvatarDisplay();
                updateTreasProfilePreview();
                await showAlert('✅ Your treasurer profile photo was saved!');
            } catch (e) {
                await showAlert('⛔ Could not save: ' + (e && e.message ? e.message : 'error'));
            }
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
            settingsCurrentEmail.value = (auth.currentUser && auth.currentUser.email) || adminRegisteredEmail || '';
            settingsNewEmail.value = '';
            emailCurrentPw.value = '';
            settingsGcashNumber.value = localStorage.getItem('fm_gcash_number') || '';
            settingsGcashName.value = localStorage.getItem('fm_gcash_name') || '';
            if (treasProfileNameInput) treasProfileNameInput.value = ownAdminName || '';
            updateTreasProfilePreview();
            applyOwnerOnlySettingsVisibility();
            purgeSharedSecretaryProfile();
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
            if (newPw.value.length < 8) { await showAlert('Password must be at least 8 characters (Firebase requirement)!'); return; }
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

        saveEmailBtn.addEventListener('click', async () => {
            const user = auth.currentUser;
            if (!user || user.isAnonymous) { await showAlert('Sign in as admin first!'); return; }
            const newEmail = settingsNewEmail.value.trim();
            const pw = emailCurrentPw.value;
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) { await showAlert('Enter a valid email address.'); return; }
            if (newEmail === (user.email || '').toLowerCase()) { await showAlert('That is already your current email.'); return; }
            if (!pw) { await showAlert('Enter your current password to confirm.'); return; }
            if (!await showConfirm('Change your admin login email to:\n\n' + newEmail + '\n\nA confirmation link will be sent to the new email. You must open it to complete the change.')) return;
            saveEmailBtn.disabled = true;
            try {
                const cred = EmailAuthProvider.credential(user.email, pw);
                await reauthenticateWithCredential(user, cred);
            } catch (e) {
                saveEmailBtn.disabled = false;
                await showAlert(e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential' ? 'Current password is wrong!' : 'Re-authentication failed: ' + (e.message || 'try logging in again.'));
                return;
            }
            try {
                await verifyBeforeUpdateEmail(user, newEmail);
            } catch (e) {
                saveEmailBtn.disabled = false;
                const code = (e && e.code) || '';
                if (code === 'auth/email-already-in-use') await showAlert('That email is already used by another account.');
                else if (code === 'auth/requires-recent-login') await showAlert('For security, please log out and log back in, then try again.');
                else await showAlert('Could not change email: ' + (e.message || 'unknown error.'));
                return;
            }
            settingsNewEmail.value = '';
            emailCurrentPw.value = '';
            saveEmailBtn.disabled = false;
            await showAlert('📧 Confirmation link sent to ' + newEmail + '.\n\nOpen it from your inbox to finish changing your admin email.\n\n⚠️ Important: log out and log back in only AFTER confirming.');
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
            heartbeatInterval = null;
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
            stopAdminRequestsListener();
            stopSecRequestsListener();
            exitSecretaryApp();
        };

        export let adminRegistered = false;
        export let adminRegisteredEmail = '';
        // Fallback name of the class treasurer, used when no shared admin
        // name is stored (the shared admin name is no longer editable).
        export const DEFAULT_ADMIN_NAME = 'Zeraldin Cauba';
        export let adminName = DEFAULT_ADMIN_NAME;
        export let adminPhotoUrl = '';
        export let gcashQRUrl = '';
        export let unsubscribeSettings = null;
        export let allowStudentEdit = false;
        export let visitorCount = 0;
        export let loginBgUrl = '';
        export let loginBgSecUrl = '';
        export let loginBgDevUrl = '';
        export let devPhotoUrl = '';
        export let devName = '';
        export let roleSecPhotoUrl = '';
        export let roleSecName = '';

        onAuthStateChanged(auth, async (user) => {
            if (!user || user.isAnonymous || !user.email) return;
            try {
                const snap = await getDoc(doc(db, 'settings', 'admin'));
                if (snap.exists()) {
                    const data = snap.data();
                    // Only sync owner email/uid if this user IS the owner (matches existing or first-time bootstrap)
                    if (!data.adminEmail || data.adminEmail === user.email) {
                        const updates = {};
                        if (data.adminEmail !== user.email) updates.adminEmail = user.email;
                        if (!data.adminUid) updates.adminUid = user.uid;
                        if (Object.keys(updates).length) await updateDoc(doc(db, 'settings', 'admin'), updates);
                    }
                }
            } catch (e) {}
        });

        export function applyRoleSettings() {
            setRoleBackground(ROLE_TREASURER, loginBgUrl);
            setRoleBackground(ROLE_SECRETARY, loginBgSecUrl);
            setRoleBackground(ROLE_DEVELOPER, loginBgDevUrl);
            setRolePhoto(ROLE_SECRETARY, roleSecPhotoUrl);
            setRoleName(ROLE_SECRETARY, roleSecName);
        }

        export function setDeveloperPhoto(url) {
            devPhotoUrl = url || '';
            localStorage.setItem('fm_dev_photo', devPhotoUrl);
            setRolePhoto(ROLE_DEVELOPER, devPhotoUrl || adminPhotoUrl);
        }

        export function setDeveloperName(name) {
            devName = (name || '').trim();
            localStorage.setItem('fm_dev_name', devName);
            updateAdminNameDisplay();
        }

        export function setDeveloperWallpaper(url) {
            loginBgDevUrl = url || '';
            localStorage.setItem('fm_login_bg_dev', loginBgDevUrl);
            setRoleBackground(ROLE_DEVELOPER, loginBgDevUrl);
        }

        export function setSecretaryWallpaper(url) {
            loginBgSecUrl = url || '';
            localStorage.setItem('fm_login_bg_sec', loginBgSecUrl);
            setRoleBackground(ROLE_SECRETARY, loginBgSecUrl);
        }

        export function applyLoginBg() {
            applyRoleSettings();
        }

        // ================= PER-ACCOUNT LOGIN PROFILE =================
        // Every device shows the profile of the account it logs in as: typing
        // an email swaps the shared (owner controlled) login profile for that
        // account's own document (treasurer_profiles / secretary_profiles).
        let loginProfileLookupTimer = null;

        function currentLoginProfileRole() {
            if (studentMode) return '';
            if (developerMode) return '';
            return secretaryMode ? ROLE_SECRETARY : ROLE_TREASURER;
        }

        if (emailInput) {
            emailInput.addEventListener('input', function () {
                const role = currentLoginProfileRole();
                if (!role) return;
                clearTimeout(loginProfileLookupTimer);
                loginProfileLookupTimer = setTimeout(function () {
                    applyLoginProfileForEmail(emailInput.value, role);
                }, 400);
            });
        }

        // The account last used on THIS device is restored, so two devices
        // show two different accounts on the login page.
        (function restoreLastLoginProfile() {
            try {
                const last = lastLoginEmail();
                const role = lastLoginRole();
                if (!last || (role !== 'treasurer' && role !== 'secretary')) return;
                if (emailInput) emailInput.value = last;
                if (role === 'secretary') {
                    enterSecretaryMode();
                    if (emailInput) emailInput.blur();
                } else {
                    applyLoginProfileForEmail(last, ROLE_TREASURER);
                }
            } catch (e) {}
        })();

        // Loads the signed-in admin's OWN profile (name + photo). A delegated
        // treasurer is not the owner, so the app shows their own identity.
        export async function loadOwnAdminProfile(email, fallbackName) {
            const mail = (email || '').trim().toLowerCase();
            if (!mail) return;
            let name = fallbackName || '';
            let photo = '';
            try {
                const snap = await getDoc(doc(db, TREASURER_PROFILES, mail));
                if (snap.exists()) {
                    const data = snap.data() || {};
                    if (data.name) name = data.name;
                    photo = data.photoUrl || '';
                } else {
                    // Older accounts have no profile doc yet — create one so
                    // their own name shows on the login page.
                    await setDoc(doc(db, TREASURER_PROFILES, mail), {
                        email: mail,
                        name: name,
                        photoUrl: '',
                        updatedAt: Date.now()
                    }, { merge: true });
                }
            } catch (e) {}
            ownAdminName = name || '';
            ownAdminPhotoUrl = photo || '';
            updateAdminNameDisplay();
            updateAdminAvatarDisplay();
            updateTreasProfilePreview();
        }
