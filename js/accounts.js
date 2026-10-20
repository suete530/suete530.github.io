import { db } from './firebase.js';
import { escapeHtml } from './utils.js';
import { doc, getDoc, getDocs, collection } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const devAccountsBtn = document.getElementById('devAccountsBtn');
const devAccountsModal = document.getElementById('devAccountsModal');
const devAccountsSearch = document.getElementById('devAccountsSearch');
const devAccountsSummary = document.getElementById('devAccountsSummary');
const devAccountsList = document.getElementById('devAccountsList');
const devAccountsRefreshBtn = document.getElementById('devAccountsRefreshBtn');

let devAccountsData = [];

const LEVELS = {
    developer: { emoji: '👑', label: 'Developer', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    treasurer: { emoji: '💰', label: 'Treasurer', color: '#eab308', bg: 'rgba(234,179,8,0.12)' },
    secretary: { emoji: '📝', label: 'Secretary', color: '#38bdf8', bg: 'rgba(56,189,248,0.12)' },
    student:   { emoji: '👨‍🎓', label: 'Student',  color: '#10b981', bg: 'rgba(16,185,129,0.12)' }
};

function fmtDate(ts) {
    return ts ? new Date(ts).toLocaleString() : '';
}

async function loadDevAccounts() {
    const results = [];

    try {
        const settingsSnap = await getDoc(doc(db, 'settings', 'admin'));
        if (settingsSnap.exists() && settingsSnap.data().adminEmail) {
            results.push({
                level: 'developer',
                name: 'Owner (Developer)',
                email: settingsSnap.data().adminEmail,
                when: settingsSnap.data().adminRegisteredAt || 0
            });
        }
    } catch (e) {}

    try {
        const snap = await getDocs(collection(db, 'admins'));
        snap.forEach(d => {
            const data = d.data();
            if (data.status === 'approved') {
                results.push({
                    level: 'treasurer',
                    name: data.name || 'Unknown',
                    email: data.email || '',
                    when: data.approvedAt || data.requestedAt || 0
                });
            }
        });
    } catch (e) {}

    try {
        const snap = await getDocs(collection(db, 'secretaries'));
        snap.forEach(d => {
            const data = d.data();
            if (data.status === 'approved') {
                results.push({
                    level: 'secretary',
                    name: data.name || 'Unknown',
                    email: data.email || '',
                    when: data.approvedAt || data.requestedAt || 0
                });
            }
        });
    } catch (e) {}

    try {
        const usersSnap = await getDocs(collection(db, 'users'));
        const studentIds = [];
        const userDocs = [];
        usersSnap.forEach(d => {
            const data = d.data();
            if (data.role === 'student' && data.studentId) {
                studentIds.push(String(data.studentId));
                userDocs.push(data);
            }
        });
        const studentsMap = {};
        if (studentIds.length) {
            const studentsSnap = await getDocs(collection(db, 'students'));
            studentsSnap.forEach(d => { studentsMap[String(d.id)] = d.data(); });
        }
        userDocs.forEach(data => {
            const st = studentsMap[String(data.studentId)];
            results.push({
                level: 'student',
                name: st ? st.name : ('Student #' + data.studentId),
                email: data.email || '',
                when: st && st.createdAt ? st.createdAt : 0
            });
        });
    } catch (e) {}

    const order = { developer: 0, treasurer: 1, secretary: 2, student: 3 };
    results.sort((a, b) => (order[a.level] - order[b.level]) || (a.name || '').localeCompare(b.name || ''));
    return results;
}

function renderDevAccounts() {
    if (!devAccountsList || !devAccountsSummary) return;
    const q = (devAccountsSearch ? devAccountsSearch.value : '').trim().toLowerCase();
    const filtered = q
        ? devAccountsData.filter(a => (a.name || '').toLowerCase().includes(q) || (a.email || '').toLowerCase().includes(q))
        : devAccountsData;

    const counts = { developer: 0, treasurer: 0, secretary: 0, student: 0 };
    devAccountsData.forEach(a => { counts[a.level]++; });
    devAccountsSummary.innerHTML = Object.keys(LEVELS).map(k =>
        `<span style="font-size:0.65rem;font-weight:bold;color:${LEVELS[k].color};background:${LEVELS[k].bg};border:1px solid ${LEVELS[k].color}40;border-radius:20px;padding:4px 10px;">${LEVELS[k].emoji} ${LEVELS[k].label}: ${counts[k]}</span>`
    ).join('');

    if (filtered.length === 0) {
        devAccountsList.innerHTML = '<div class="no-results">' + (q ? 'No accounts match "' + escapeHtml(q) + '".' : 'No registered accounts yet.') + '</div>';
        return;
    }

    devAccountsList.innerHTML = filtered.map(a => {
        const lv = LEVELS[a.level];
        return `<div style="display:flex;align-items:center;gap:10px;background:#0f1923;border:1px solid #1e293b;border-radius:12px;padding:10px 12px;">
            <span style="flex-shrink:0;font-size:0.6rem;font-weight:bold;color:${lv.color};background:${lv.bg};border:1px solid ${lv.color}40;border-radius:20px;padding:3px 8px;white-space:nowrap;">${lv.emoji} ${lv.label}</span>
            <div style="min-width:0;flex:1;">
                <div style="color:#e0e0e0;font-size:0.85rem;font-weight:600;">${escapeHtml(a.name || 'Unknown')}</div>
                <div style="color:#9ca3af;font-size:0.7rem;">📧 ${escapeHtml(a.email || '—')}</div>
            </div>
            ${a.when ? `<span style="color:#6b7280;font-size:0.62rem;white-space:nowrap;">🕐 ${escapeHtml(fmtDate(a.when))}</span>` : ''}
        </div>`;
    }).join('');
}

async function openDevAccounts() {
    if (!devAccountsModal) return;
    devAccountsModal.classList.add('active');
    if (devAccountsSearch) devAccountsSearch.value = '';
    if (devAccountsSummary) devAccountsSummary.innerHTML = '';
    if (devAccountsList) devAccountsList.innerHTML = '<div class="no-results">Loading accounts...</div>';
    try {
        devAccountsData = await loadDevAccounts();
        renderDevAccounts();
    } catch (e) {
        if (devAccountsList) devAccountsList.innerHTML = '<div class="no-results">Could not load accounts. Make sure you are logged in as the developer.</div>';
    }
}

function closeDevAccountsModal() {
    if (devAccountsModal) devAccountsModal.classList.remove('active');
}

window.closeDevAccountsModal = closeDevAccountsModal;

if (devAccountsBtn) devAccountsBtn.addEventListener('click', openDevAccounts);
if (devAccountsRefreshBtn) devAccountsRefreshBtn.addEventListener('click', openDevAccounts);
if (devAccountsSearch) devAccountsSearch.addEventListener('input', renderDevAccounts);
if (devAccountsModal) devAccountsModal.addEventListener('click', (e) => { if (e.target === devAccountsModal) closeDevAccountsModal(); });
