import { auth, db } from './firebase.js';
import { escapeHtml } from './utils.js';
import { showAlert, showConfirm } from './ui.js';
import { DEFAULT_LOGIN_LABEL, developerMode, exitDeveloperMode, exitSetupMode, exitStudentMode, setupMode, studentMode, updateAdminAvatarDisplay, updateAdminNameDisplay, updateSetupButtonVisibility } from './auth.js';
import { setSecretaryProfile } from './profile.js';
import { setActiveRole, ROLE_SECRETARY, ROLE_TREASURER } from './roleTheme.js';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { doc, setDoc, getDoc, updateDoc, deleteDoc, collection, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// ================= STATE =================
export let secretaryMode = false;
export let secretarySession = false;
let secStudents = [];
let secAttendance = {};
let secUnsubStudents = null;
let secUnsubAttendance = null;
let secUnsubHistory = null;
let secUnsubReqWatch = null;

// ================= DOM =================
const secretaryPanelBtn = document.getElementById('secretaryPanelBtn');
const secSignUpBtn = document.getElementById('secSignUpBtn');
const secretaryModeBack = document.getElementById('secretaryModeBack');
const backToTreasurerFromSec = document.getElementById('backToTreasurerFromSec');
const secretaryPage = document.getElementById('secretaryPage');
const loginBtnEl = document.getElementById('loginBtn');
const emailInput = document.getElementById('loginEmail');
const pwInput = document.getElementById('loginPassword');
const errEl = document.getElementById('loginError');
const overlay = document.getElementById('loginOverlay');

const attDate = document.getElementById('attDate');
const secNewStudentName = document.getElementById('secNewStudentName');
const secAddStudentBtn = document.getElementById('secAddStudentBtn');
const secStudentList = document.getElementById('secStudentList');
const attPresentCount = document.getElementById('attPresentCount');
const attAbsentCount = document.getElementById('attAbsentCount');
const attTotalCount = document.getElementById('attTotalCount');
const secMarkAllPresentBtn = document.getElementById('secMarkAllPresentBtn');
const secMarkAllAbsentBtn = document.getElementById('secMarkAllAbsentBtn');
const secClearMarksBtn = document.getElementById('secClearMarksBtn');
const secSaveAttBtn = document.getElementById('secSaveAttBtn');
const secDownloadImgBtn = document.getElementById('secDownloadImgBtn');
const secDownloadTxtBtn = document.getElementById('secDownloadTxtBtn');
const secLoadAttBtn = document.getElementById('secLoadAttBtn');
const secTodayBtn = document.getElementById('secTodayBtn');
const secLogoutBtn = document.getElementById('secLogoutBtn');
const secPageName = document.getElementById('secPageName');
const secHistoryList = document.getElementById('secHistoryList');

// ================= MODE TOGGLE =================
export function enterSecretaryMode() {
    // exit other login modes first so their flags/handlers can't hijack the login button
    if (studentMode) exitStudentMode();
    if (developerMode) exitDeveloperMode();
    if (setupMode) exitSetupMode();
    secretaryMode = true;

    const studentLoginLinks = document.getElementById('studentLoginLinks');
    const studentSignInToggle = document.getElementById('studentSignInToggle');
    const createAccountWrap = document.getElementById('createAccountWrap');
    const studentModeBtn = document.getElementById('studentModeBtn');
    const adminSignUpBtn = document.getElementById('adminSignUpBtn');
    const setupBtn = document.getElementById('setupAdminBtn');
    const devSignUpBtn = document.getElementById('devSignUpBtn');

    if (studentLoginLinks) studentLoginLinks.style.display = 'none';
    if (studentSignInToggle) studentSignInToggle.style.display = 'none';
    if (createAccountWrap) createAccountWrap.style.display = 'none';
    if (studentModeBtn) studentModeBtn.style.display = 'none';
    if (adminSignUpBtn) adminSignUpBtn.style.display = 'none';
    if (setupBtn) setupBtn.style.display = 'none';
    if (devSignUpBtn) devSignUpBtn.style.display = 'none';

    loginBtnEl.textContent = '📝 Secretary Login';
    emailInput.placeholder = 'secretary@email.com';
    secSignUpBtn.style.display = '';
    secretaryModeBack.style.display = 'block';
    errEl.style.color = '';
    errEl.style.display = 'none';
    setActiveRole(ROLE_SECRETARY);
    updateAdminNameDisplay();
    updateAdminAvatarDisplay();
    emailInput.focus();
}

export function exitSecretaryMode() {
    secretaryMode = false;
    loginBtnEl.textContent = DEFAULT_LOGIN_LABEL;
    emailInput.placeholder = 'treasurer@email.com';
    secSignUpBtn.style.display = 'none';
    secretaryModeBack.style.display = 'none';
    const adminSignUpBtn = document.getElementById('adminSignUpBtn');
    const studentModeBtn = document.getElementById('studentModeBtn');
    if (adminSignUpBtn) adminSignUpBtn.style.display = '';
    if (studentModeBtn) studentModeBtn.style.display = '';
    updateSetupButtonVisibility();
    errEl.style.color = '';
    errEl.style.display = 'none';
    setActiveRole(ROLE_TREASURER);
    updateAdminNameDisplay();
    updateAdminAvatarDisplay();
}

// ================= SECRETARY LOGIN =================
export async function handleSecretaryLogin() {
    const email = emailInput.value.trim();
    const password = pwInput.value;
    if (!email || !password) { showSecretaryError('Enter email and password.'); return; }
    loginBtnEl.disabled = true;
    loginBtnEl.textContent = '⏳ Signing in...';
    try {
        if (auth.currentUser && auth.currentUser.isAnonymous) await signOut(auth);
        const cred = await signInWithEmailAndPassword(auth, email, password);
        const secSnap = await getDoc(doc(db, 'secretaries', cred.user.uid));
        if (!secSnap.exists()) {
            await signOut(auth).catch(() => {});
            throw { code: 'app/not-secretary' };
        }
        const data = secSnap.data();
        if (data.status === 'pending') {
            watchOwnSecretaryRequest();
            showSecretaryError('⏳ Your secretary account is still pending approval. Keep this page open — you will enter automatically once approved.');
            pwInput.value = '';
            return;
        }
        if (data.status !== 'approved') {
            await signOut(auth).catch(() => {});
            throw { code: 'app/sec-rejected' };
        }
        pwInput.value = '';
        errEl.style.display = 'none';
        enterSecretaryApp(data.name || email.split('@')[0], data.photoUrl);
    } catch (e) {
        pwInput.value = '';
        loginBtnEl.textContent = '📝 Secretary Login';
        if (e.code === 'app/not-secretary') {
            showSecretaryError('⛔ No secretary account found for this email. Sign up first.');
        } else if (e.code === 'app/sec-rejected') {
            showSecretaryError('⛔ Your secretary request was rejected. Contact the developer for more info.');
        } else if (e.code === 'auth/invalid-credential' || e.code === 'auth/wrong-password') {
            showSecretaryError('Wrong email or password!');
        } else if (e.code === 'auth/user-not-found') {
            showSecretaryError('No secretary account exists for that email.');
        } else if (e.code === 'auth/too-many-requests') {
            showSecretaryError('Too many attempts. Wait a moment and try again.');
        } else if (e.code === 'auth/network-request-failed') {
            showSecretaryError('Network error. Check your connection.');
        } else {
            showSecretaryError('Login failed. Please try again.');
        }
    } finally {
        loginBtnEl.disabled = false;
        if (secretaryMode) loginBtnEl.textContent = '📝 Secretary Login';
    }
}

function showSecretaryError(msg) {
    errEl.style.color = '';
    errEl.textContent = msg;
    errEl.style.display = 'block';
}

// ================= SECRETARY SIGN-UP =================
export function promptSecretaryRegister() {
    const customAlertOverlay = document.getElementById('customAlertOverlay');
    const customAlertMsg = document.getElementById('customAlertMsg');
    const customAlertInput = document.getElementById('customAlertInput');
    const customAlertBtns = document.getElementById('customAlertBtns');
    document.querySelector('.custom-alert-title').textContent = '📝 Secretary Sign-up';
    customAlertMsg.innerHTML = `
        <p style="font-size:0.72rem;color:#888;margin-bottom:10px;">Register as a secretary. The developer must approve your request before you can access the attendance page.</p>
        <input type="text" id="secReqName" placeholder="Your full name" maxlength="60" style="width:100%;padding:10px;margin-bottom:8px;border-radius:12px;border:2px solid #e2cf9a;font-size:0.85rem;" autocomplete="off">
        <input type="email" id="secReqEmail" placeholder="Email address" maxlength="60" style="width:100%;padding:10px;margin-bottom:8px;border-radius:12px;border:2px solid #e2cf9a;font-size:0.85rem;" autocomplete="email">
        <input type="password" id="secReqPw" placeholder="Password (8+ characters)" style="width:100%;padding:10px;margin-bottom:8px;border-radius:12px;border:2px solid #e2cf9a;font-size:0.85rem;text-align:center;letter-spacing:3px;" autocomplete="new-password">
        <input type="password" id="secReqPw2" placeholder="Confirm password" style="width:100%;padding:10px;border-radius:12px;border:2px solid #e2cf9a;font-size:0.85rem;text-align:center;letter-spacing:3px;" autocomplete="new-password">
        <div id="secReqError" style="font-size:0.75rem;color:#dc3545;margin-top:6px;display:none;"></div>
    `;
    customAlertInput.style.display = 'none';
    customAlertBtns.innerHTML = '<button class="custom-alert-btn custom-alert-cancel" id="secReqCancel">Cancel</button><button class="custom-alert-btn custom-alert-ok" id="secReqSubmit">📩 Send Request</button>';
    customAlertOverlay.classList.remove('hidden');
    const nameEl = document.getElementById('secReqName');
    const emailEl = document.getElementById('secReqEmail');
    const pwEl = document.getElementById('secReqPw');
    const pw2El = document.getElementById('secReqPw2');
    const reqErr = document.getElementById('secReqError');
    nameEl.focus();
    document.getElementById('secReqCancel').onclick = function() { customAlertOverlay.classList.add('hidden'); };
    document.getElementById('secReqSubmit').onclick = async function() {
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
        const btn = document.getElementById('secReqSubmit');
        btn.disabled = true; btn.textContent = 'Sending...';
        try {
            const cred = await createUserWithEmailAndPassword(auth, email, p1);
            await setDoc(doc(db, 'secretaries', cred.user.uid), {
                uid: cred.user.uid,
                email: cred.user.email,
                name: name,
                status: 'pending',
                requestedAt: Date.now()
            });
            watchOwnSecretaryRequest();
            customAlertOverlay.classList.add('hidden');
            showSecretaryError('⏳ Request sent! Keep this page open — you will enter automatically once approved.');
        } catch (e) {
            btn.disabled = false; btn.textContent = '📩 Send Request';
            const code = (e && e.code) ? e.code : '';
            fail(code === 'permission-denied'
                ? 'Security rules not deployed yet — ask the developer to publish the new rules first.'
                : code === 'auth/email-already-in-use'
                ? 'That email already has an account — try logging in instead.'
                : 'Sign-up failed. Please try again.');
        }
    };
}

export function watchOwnSecretaryRequest() {
    const u = auth.currentUser;
    if (!u) return;
    if (secUnsubReqWatch) secUnsubReqWatch();
    secUnsubReqWatch = onSnapshot(doc(db, 'secretaries', u.uid), async (snap) => {
        if (!snap.exists()) return;
        const d = snap.data();
        if (d.status === 'approved') {
            if (secUnsubReqWatch) { secUnsubReqWatch(); secUnsubReqWatch = null; }
            errEl.style.display = 'none';
            enterSecretaryApp(d.name || u.email.split('@')[0], d.photoUrl);
        } else if (d.status === 'revoked') {
            if (secUnsubReqWatch) { secUnsubReqWatch(); secUnsubReqWatch = null; }
            showSecretaryError('⛔ Your secretary request was rejected. Contact the developer.');
            await signOut(auth).catch(() => {});
        }
    });
}

// ================= SECRETARY SESSION (attendance page) =================
export function enterSecretaryApp(name, photoUrl) {
    secretarySession = true;
    secretaryMode = false;
    overlay.classList.add('hidden');
    secretaryPage.style.display = 'block';
    if (secretaryPanelBtn) secretaryPanelBtn.style.display = 'none';
    const ownerPanelBtn = document.getElementById('ownerPanelBtn');
    if (ownerPanelBtn) ownerPanelBtn.style.display = 'none';
    document.body.style.overflow = 'hidden';
    if (secPageName) secPageName.textContent = '👤 ' + (name || 'Secretary');
    setSecretaryProfile(name || 'Secretary', photoUrl);
    // default date = today
    const today = new Date().toISOString().split('T')[0];
    attDate.value = today;
    loadSecretaryStudents();
    loadAttendanceForDate(today);
    loadAttendanceHistory();
    secNewStudentName.focus();
}

export function exitSecretaryApp() {
    secretarySession = false;
    secretaryPage.style.display = 'none';
    if (window.closeProfileModal) window.closeProfileModal();
    if (secretaryPanelBtn) secretaryPanelBtn.style.display = '';
    const ownerPanelBtn = document.getElementById('ownerPanelBtn');
    if (ownerPanelBtn) ownerPanelBtn.style.display = '';
    document.body.style.overflow = '';
    secStudents = [];
    secAttendance = {};
    if (secUnsubStudents) { secUnsubStudents(); secUnsubStudents = null; }
    if (secUnsubAttendance) { secUnsubAttendance(); secUnsubAttendance = null; }
    if (secUnsubHistory) { secUnsubHistory(); secUnsubHistory = null; }
    if (secUnsubReqWatch) { secUnsubReqWatch(); secUnsubReqWatch = null; }
    renderStudentList();
    renderCounts();
    exitSecretaryMode();
    overlay.classList.remove('hidden');
    emailInput.value = '';
    pwInput.value = '';
    errEl.style.display = 'none';
}

// ================= STUDENT ROSTER =================
function loadSecretaryStudents() {
    const u = auth.currentUser;
    if (!u) return;
    if (secUnsubStudents) secUnsubStudents();
    secUnsubStudents = onSnapshot(collection(db, 'secretaries', u.uid, 'students'), (snap) => {
        secStudents = [];
        snap.forEach(d => secStudents.push({ id: d.id, ...d.data() }));
        secStudents.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        renderStudentList();
        renderCounts();
    }, () => {});
}

async function addSecretaryStudent() {
    const u = auth.currentUser;
    if (!u) return;
    const name = secNewStudentName.value.trim();
    if (!name) { await showAlert('Please enter a student name.'); return; }
    try {
        await setDoc(doc(collection(db, 'secretaries', u.uid, 'students')), {
            name: name,
            createdAt: Date.now()
        });
        secNewStudentName.value = '';
        secNewStudentName.focus();
    } catch (e) {
        await showAlert('Could not add student. Make sure you are logged in.');
    }
}

async function removeSecretaryStudent(sid) {
    const u = auth.currentUser;
    if (!u) return;
    if (!await showConfirm('Remove this student from your roster?')) return;
    try { await deleteDoc(doc(db, 'secretaries', u.uid, 'students', sid)); } catch (e) {}
}

function renderStudentList() {
    if (!secStudentList) return;
    if (secStudents.length === 0) {
        secStudentList.innerHTML = '<div style="color:#6b7280;font-size:0.78rem;text-align:center;padding:16px;">No students yet. Add students above.</div>';
        return;
    }
    secStudentList.innerHTML = secStudents.map((s, i) => {
        const status = secAttendance[s.id] || null;
        const pActive = status === 'present' ? 'background:linear-gradient(135deg,#10b981,#059669);color:#fff;' : 'background:rgba(16,185,129,0.12);color:#10b981;border:1px solid rgba(16,185,129,0.4);';
        const aActive = status === 'absent' ? 'background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;' : 'background:rgba(239,68,68,0.12);color:#ef4444;border:1px solid rgba(239,68,68,0.4);';
        return `<div style="display:flex;align-items:center;gap:8px;background:#0f1923;border:1px solid #1e293b;border-radius:12px;padding:10px 12px;">
            <span style="font-size:0.7rem;color:#6b7280;font-weight:bold;min-width:20px;">${i + 1}.</span>
            <span style="flex:1;color:#e0e0e0;font-size:0.85rem;font-weight:600;">${escapeHtml(s.name)}</span>
            <button onclick="window.__secMark('${s.id}','present')" style="padding:6px 12px;border-radius:8px;border:none;font-size:0.7rem;font-weight:bold;cursor:pointer;${pActive}">✅ Present</button>
            <button onclick="window.__secMark('${s.id}','absent')" style="padding:6px 12px;border-radius:8px;border:none;font-size:0.7rem;font-weight:bold;cursor:pointer;${aActive}">❌ Absent</button>
            <button onclick="window.__secRemoveStudent('${s.id}')" style="background:transparent;border:none;color:#6b7280;cursor:pointer;font-size:0.85rem;padding:4px;" title="Remove">🗑️</button>
        </div>`;
    }).join('');
}

window.__secMark = async function(sid, status) {
    const u = auth.currentUser;
    if (!u) return;
    if (secAttendance[sid] === status) {
        delete secAttendance[sid];
    } else {
        secAttendance[sid] = status;
    }
    renderStudentList();
    renderCounts();
};

window.__secRemoveStudent = removeSecretaryStudent;

function renderCounts() {
    let present = 0, absent = 0;
    Object.values(secAttendance).forEach(v => { if (v === 'present') present++; else if (v === 'absent') absent++; });
    if (attPresentCount) attPresentCount.textContent = present;
    if (attAbsentCount) attAbsentCount.textContent = absent;
    if (attTotalCount) attTotalCount.textContent = secStudents.length;
}

// ================= ATTENDANCE LOAD/SAVE =================
function loadAttendanceForDate(date) {
    const u = auth.currentUser;
    if (!u) return;
    if (secUnsubAttendance) secUnsubAttendance();
    secAttendance = {};
    renderStudentList();
    renderCounts();
    secUnsubAttendance = onSnapshot(doc(db, 'secretaries', u.uid, 'attendance', date), (snap) => {
        if (snap.exists() && snap.data().records) {
            secAttendance = { ...snap.data().records };
        } else {
            secAttendance = {};
        }
        renderStudentList();
        renderCounts();
    }, () => {});
}

async function saveAttendance() {
    const u = auth.currentUser;
    if (!u) return;
    const date = attDate.value;
    if (!date) { await showAlert('Please select a date first.'); return; }
    try {
        await setDoc(doc(db, 'secretaries', u.uid, 'attendance', date), {
            date: date,
            records: secAttendance,
            savedAt: Date.now(),
            savedBy: u.email || ''
        }, { merge: true });
        await showAlert('✅ Attendance saved for ' + date + '!');
    } catch (e) {
        await showAlert('❌ Could not save attendance. ' + (e && e.message ? e.message : ''));
    }
}

// ================= ATTENDANCE HISTORY =================
function loadAttendanceHistory() {
    const u = auth.currentUser;
    if (!u) return;
    if (secUnsubHistory) secUnsubHistory();
    const q = query(collection(db, 'secretaries', u.uid, 'attendance'), orderBy('date', 'desc'));
    secUnsubHistory = onSnapshot(q, (snap) => {
        const list = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() }));
        renderHistory(list);
    }, () => {});
}

function renderHistory(list) {
    if (!secHistoryList) return;
    if (list.length === 0) {
        secHistoryList.innerHTML = '<div style="color:#6b7280;font-size:0.78rem;text-align:center;padding:12px;">No saved attendance yet.</div>';
        return;
    }
    secHistoryList.innerHTML = list.map(h => {
        const recs = h.records || {};
        let p = 0, a = 0;
        Object.values(recs).forEach(v => { if (v === 'present') p++; else if (v === 'absent') a++; });
        const total = p + a;
        return `<div style="display:flex;align-items:center;gap:8px;background:#0f1923;border:1px solid #1e293b;border-radius:10px;padding:10px 12px;">
            <span style="color:#e0e0e0;font-size:0.82rem;font-weight:600;">📅 ${escapeHtml(h.date || h.id)}</span>
            <span style="margin-left:auto;font-size:0.7rem;color:#10b981;font-weight:bold;">✅ ${p}</span>
            <span style="font-size:0.7rem;color:#ef4444;font-weight:bold;">❌ ${a}</span>
            <span style="font-size:0.7rem;color:#9ca3af;">/${total}</span>
            <button onclick="window.__secLoadHistory('${escapeHtml(h.date || h.id)}')" style="padding:5px 10px;border-radius:8px;border:none;background:linear-gradient(135deg,#38bdf8,#0284c7);color:#fff;font-size:0.65rem;font-weight:bold;cursor:pointer;">📂 Load</button>
        </div>`;
    }).join('');
}

window.__secLoadHistory = function(date) {
    attDate.value = date;
    loadAttendanceForDate(date);
};

// ================= MARK ALL =================
function markAll(status) {
    secStudents.forEach(s => { secAttendance[s.id] = status; });
    renderStudentList();
    renderCounts();
}

function clearMarks() {
    secAttendance = {};
    renderStudentList();
    renderCounts();
}

// ================= DOWNLOAD TEXT =================
function buildAttendanceText() {
    const date = attDate.value || new Date().toISOString().split('T')[0];
    const name = secPageName ? secPageName.textContent.replace('👤 ', '') : 'Secretary';
    let present = 0, absent = 0;
    const lines = [];
    lines.push('========================================');
    lines.push('   📝 ATTENDANCE REPORT');
    lines.push('========================================');
    lines.push('Date: ' + date);
    lines.push('Secretary: ' + name);
    lines.push('----------------------------------------');
    if (secStudents.length === 0) {
        lines.push('(no students in roster)');
    } else {
        secStudents.forEach((s, i) => {
            const st = secAttendance[s.id] || 'unmarked';
            const label = st === 'present' ? 'PRESENT' : st === 'absent' ? 'ABSENT' : 'UNMARKED';
            lines.push((i + 1) + '. ' + s.name + ' — ' + label);
            if (st === 'present') present++;
            else if (st === 'absent') absent++;
        });
    }
    lines.push('----------------------------------------');
    lines.push('Present: ' + present + '  |  Absent: ' + absent + '  |  Total: ' + secStudents.length);
    lines.push('========================================');
    lines.push('Generated: ' + new Date().toLocaleString());
    return lines.join('\n');
}

function downloadText() {
    const text = buildAttendanceText();
    const date = attDate.value || new Date().toISOString().split('T')[0];
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'attendance-' + date + '.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
}

// ================= DOWNLOAD IMAGE =================
function downloadImage() {
    const date = attDate.value || new Date().toISOString().split('T')[0];
    const name = secPageName ? secPageName.textContent.replace('👤 ', '') : 'Secretary';
    let present = 0, absent = 0;
    secStudents.forEach(s => {
        const st = secAttendance[s.id];
        if (st === 'present') present++;
        else if (st === 'absent') absent++;
    });

    const rowH = 36;
    const padTop = 130;
    const padBottom = 80;
    const W = 620;
    const H = padTop + secStudents.length * rowH + padBottom;
    const canvas = document.createElement('canvas');
    canvas.width = W * 2;
    canvas.height = Math.max(H, 300) * 2;
    const ctx = canvas.getContext('2d');
    ctx.scale(2, 2);

    // background
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, '#0a1628');
    grad.addColorStop(1, '#050810');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, Math.max(H, 300));

    // title bar
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(0, 0, W, 50);
    ctx.fillStyle = '#050810';
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('📝 ATTENDANCE REPORT', W / 2, 33);

    // info
    ctx.textAlign = 'left';
    ctx.fillStyle = '#e0e0e0';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('Date: ' + date, 20, 78);
    ctx.fillStyle = '#9ca3af';
    ctx.font = '13px monospace';
    ctx.fillText('Secretary: ' + name, 20, 100);

    // summary boxes
    const boxW = 110, boxY = 65;
    // Present
    ctx.fillStyle = 'rgba(16,185,129,0.15)';
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 1.5;
    roundRect(ctx, W - 20 - boxW * 3 - 20, boxY, boxW, 42, 8);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('PRESENT', W - 20 - boxW * 3 - 20 + boxW / 2, boxY + 16);
    ctx.font = 'bold 16px monospace';
    ctx.fillText(String(present), W - 20 - boxW * 3 - 20 + boxW / 2, boxY + 34);

    // Absent
    ctx.fillStyle = 'rgba(239,68,68,0.15)';
    ctx.strokeStyle = '#ef4444';
    roundRect(ctx, W - 20 - boxW * 2 - 10, boxY, boxW, 42, 8);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 11px monospace';
    ctx.fillText('ABSENT', W - 20 - boxW * 2 - 10 + boxW / 2, boxY + 16);
    ctx.font = 'bold 16px monospace';
    ctx.fillText(String(absent), W - 20 - boxW * 2 - 10 + boxW / 2, boxY + 34);

    // Total
    ctx.fillStyle = 'rgba(56,189,248,0.15)';
    ctx.strokeStyle = '#38bdf8';
    roundRect(ctx, W - 20 - boxW, boxY, boxW, 42, 8);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 11px monospace';
    ctx.fillText('TOTAL', W - 20 - boxW / 2, boxY + 16);
    ctx.font = 'bold 16px monospace';
    ctx.fillText(String(secStudents.length), W - 20 - boxW / 2, boxY + 34);

    // table header
    const tableY = padTop - 10;
    ctx.fillStyle = '#1a2332';
    roundRect(ctx, 15, tableY, W - 30, 30, 6);
    ctx.fill();
    ctx.fillStyle = '#9ca3af';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('#', 28, tableY + 20);
    ctx.fillText('NAME', 60, tableY + 20);
    ctx.textAlign = 'right';
    ctx.fillText('STATUS', W - 40, tableY + 20);

    // rows
    if (secStudents.length === 0) {
        ctx.textAlign = 'center';
        ctx.fillStyle = '#6b7280';
        ctx.font = '13px monospace';
        ctx.fillText('(no students in roster)', W / 2, tableY + 70);
    } else {
        secStudents.forEach((s, i) => {
            const y = padTop + i * rowH;
            const st = secAttendance[s.id] || 'unmarked';
            // row bg
            ctx.fillStyle = i % 2 === 0 ? 'rgba(26,35,50,0.6)' : 'rgba(15,25,35,0.6)';
            roundRect(ctx, 15, y, W - 30, rowH - 4, 6);
            ctx.fill();
            // number
            ctx.fillStyle = '#6b7280';
            ctx.font = '12px monospace';
            ctx.textAlign = 'left';
            ctx.fillText(String(i + 1) + '.', 28, y + 22);
            // name
            ctx.fillStyle = '#e0e0e0';
            ctx.font = 'bold 13px monospace';
            ctx.fillText(s.name || '', 60, y + 22);
            // status pill
            const pillW = 90, pillH = 22, pillX = W - 40 - pillW, pillY = y + (rowH - 4 - pillH) / 2;
            if (st === 'present') {
                ctx.fillStyle = '#10b981';
                roundRect(ctx, pillX, pillY, pillW, pillH, 11);
                ctx.fill();
                ctx.fillStyle = '#fff';
            } else if (st === 'absent') {
                ctx.fillStyle = '#ef4444';
                roundRect(ctx, pillX, pillY, pillW, pillH, 11);
                ctx.fill();
                ctx.fillStyle = '#fff';
            } else {
                ctx.fillStyle = 'rgba(107,114,128,0.25)';
                roundRect(ctx, pillX, pillY, pillW, pillH, 11);
                ctx.fill();
                ctx.fillStyle = '#9ca3af';
            }
            ctx.font = 'bold 11px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(st === 'present' ? '✅ PRESENT' : st === 'absent' ? '❌ ABSENT' : '— UNMARKED', pillX + pillW / 2, pillY + 15);
        });
    }

    // footer
    const footY = Math.max(H, 300) - 40;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(15, footY - 5, W - 30, 1);
    ctx.fillStyle = '#6b7280';
    ctx.font = '11px monospace';
    ctx.textAlign = 'left';
    ctx.fillText('Generated: ' + new Date().toLocaleString(), 20, footY + 18);
    ctx.textAlign = 'right';
    ctx.fillText('BSIS-1 Fines System', W - 20, footY + 18);

    // download
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = 'attendance-' + date + '.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

// ================= EVENT LISTENERS =================
if (secretaryPanelBtn) secretaryPanelBtn.addEventListener('click', enterSecretaryMode);
if (backToTreasurerFromSec) backToTreasurerFromSec.addEventListener('click', exitSecretaryMode);
if (secSignUpBtn) secSignUpBtn.addEventListener('click', function() {
    document.getElementById('customAlertOverlay').classList.add('hidden');
    promptSecretaryRegister();
});
if (secAddStudentBtn) secAddStudentBtn.addEventListener('click', addSecretaryStudent);
if (secNewStudentName) secNewStudentName.addEventListener('keypress', function(e) { if (e.key === 'Enter') addSecretaryStudent(); });
if (secMarkAllPresentBtn) secMarkAllPresentBtn.addEventListener('click', () => markAll('present'));
if (secMarkAllAbsentBtn) secMarkAllAbsentBtn.addEventListener('click', () => markAll('absent'));
if (secClearMarksBtn) secClearMarksBtn.addEventListener('click', clearMarks);
if (secSaveAttBtn) secSaveAttBtn.addEventListener('click', saveAttendance);
if (secDownloadImgBtn) secDownloadImgBtn.addEventListener('click', downloadImage);
if (secDownloadTxtBtn) secDownloadTxtBtn.addEventListener('click', downloadText);
if (secLoadAttBtn) secLoadAttBtn.addEventListener('click', () => loadAttendanceForDate(attDate.value));
if (secTodayBtn) secTodayBtn.addEventListener('click', () => {
    const today = new Date().toISOString().split('T')[0];
    attDate.value = today;
    loadAttendanceForDate(today);
});
if (attDate) attDate.addEventListener('change', () => loadAttendanceForDate(attDate.value));
if (secLogoutBtn) secLogoutBtn.addEventListener('click', async function() {
    if (!await showConfirm('Logout from secretary account?')) return;
    try { await signOut(auth); } catch (e) {}
    exitSecretaryApp();
});

// ================= SECRETARY REQUESTS (for admin/dev approval) =================
export let pendingSecRequests = [];
export let unsubscribeSecRequests = null;

export function startSecRequestsListener() {
    if (unsubscribeSecRequests) unsubscribeSecRequests();
    const q = query(collection(db, 'secretaries'), orderBy('requestedAt'));
    unsubscribeSecRequests = onSnapshot(q, (snapshot) => {
        pendingSecRequests = [];
        snapshot.forEach(d => {
            const data = d.data();
            if (data.status === 'pending') pendingSecRequests.push({ id: d.id, ...data });
        });
        updateSecRequestsBadge();
        const secList = document.getElementById('secRequestsList');
        const adminModal = document.getElementById('adminRequestsModal');
        if (secList && adminModal && adminModal.classList.contains('active')) renderSecRequestsList();
    }, () => {});
}

export function stopSecRequestsListener() {
    if (unsubscribeSecRequests) { unsubscribeSecRequests(); unsubscribeSecRequests = null; }
    pendingSecRequests = [];
    updateSecRequestsBadge();
}

function updateSecRequestsBadge() {
    window.__secReqCount = pendingSecRequests.length;
    const devCount = document.getElementById('devReqCount');
    const total = (window.__adminReqCount || 0) + pendingSecRequests.length;
    if (devCount) {
        devCount.style.display = total > 0 ? 'inline-block' : 'none';
        devCount.textContent = total;
    }
}

export function renderSecRequestsList() {
    const secList = document.getElementById('secRequestsList');
    if (!secList) return;
    if (pendingSecRequests.length === 0) {
        secList.innerHTML = '<div class="no-results">No pending secretary requests.</div>';
        return;
    }
    secList.innerHTML = pendingSecRequests.map(r => {
        const when = r.requestedAt ? new Date(r.requestedAt).toLocaleString() : '';
        return `<div style="background:#0f1923;border:1px solid #1e293b;border-radius:14px;padding:12px;">
            <div style="font-weight:bold;font-size:0.9rem;color:#e0e0e0;">📝 ${escapeHtml(r.name || 'Unknown')}</div>
            <div style="font-size:0.72rem;color:#9ca3af;margin-top:2px;">📧 ${escapeHtml(r.email || '')}</div>
            <div style="font-size:0.65rem;color:#6b7280;margin-top:2px;">🕐 ${escapeHtml(when)}</div>
            <div style="display:flex;gap:8px;margin-top:10px;">
                <button onclick="window.__acceptSecReq('${r.id}')" style="flex:1;background:linear-gradient(135deg,#10b981,#059669);color:#fff;border:none;padding:8px;border-radius:10px;font-size:0.75rem;font-weight:bold;cursor:pointer;">✅ Approve</button>
                <button onclick="window.__rejectSecReq('${r.id}')" style="flex:1;background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;border:none;padding:8px;border-radius:10px;font-size:0.75rem;font-weight:bold;cursor:pointer;">❌ Reject</button>
            </div>
        </div>`;
    }).join('');
}

window.__acceptSecReq = async function(reqId) {
    const req = pendingSecRequests.find(r => String(r.id) === String(reqId));
    if (!req) return;
    if (!await showConfirm('Approve secretary access for "' + req.name + '" (' + req.email + ')?')) return;
    try {
        await updateDoc(doc(db, 'secretaries', String(reqId)), {
            status: 'approved',
            approvedAt: Date.now(),
            approvedBy: auth.currentUser ? auth.currentUser.email : ''
        });
        renderSecRequestsList();
        await showAlert('✅ Secretary access approved for ' + req.name + '!\n\nThey can now log in to the attendance page.');
    } catch (e) {
        await showAlert('❌ Could not approve this request. ' + (e && e.message ? e.message : ''));
    }
};

window.__rejectSecReq = async function(reqId) {
    const req = pendingSecRequests.find(r => String(r.id) === String(reqId));
    if (!req) return;
    if (!await showConfirm('Reject secretary request from "' + req.name + '"?')) return;
    try {
        await updateDoc(doc(db, 'secretaries', String(reqId)), {
            status: 'revoked',
            revokedAt: Date.now()
        });
        renderSecRequestsList();
        await showAlert('❌ Secretary request from ' + req.name + ' rejected.');
    } catch (e) {}
};

// Tab switching for admin requests modal
window.switchAdminReqTab = function(tab) {
    const tabAdmins = document.getElementById('adminReqTabAdmins');
    const tabSecs = document.getElementById('adminReqTabSecs');
    const listAdmins = document.getElementById('adminRequestsList');
    const listSecs = document.getElementById('secRequestsList');
    if (tab === 'admins') {
        tabAdmins.classList.add('active');
        tabAdmins.style.background = 'var(--accent-a13)';
        tabAdmins.style.borderColor = 'var(--accent)';
        tabSecs.classList.remove('active');
        tabSecs.style.background = '';
        tabSecs.style.borderColor = '#1e293b';
        listAdmins.style.display = 'flex';
        listSecs.style.display = 'none';
    } else {
        tabSecs.classList.add('active');
        tabSecs.style.background = 'var(--accent-a13)';
        tabSecs.style.borderColor = 'var(--accent)';
        tabAdmins.classList.remove('active');
        tabAdmins.style.background = '';
        tabAdmins.style.borderColor = '#1e293b';
        listSecs.style.display = 'flex';
        listAdmins.style.display = 'none';
        renderSecRequestsList();
    }
};
