        import { addBtn, addSectionBtn, clearFormBtn, fineInput, gcashName, gcashNumber, genderSelect, nameInput, openSuggestionsBtn, paymentAmount, paymentDate, paymentHistoryList, paymentModal, paymentModalTitle, paymentNote, paymentRef, relationStatusSelect, requestsBadge, requestsBtn, requestsList, requestsModal, sectionSelect, sectionSelectView, statusSelect, studentListContainer, submitPaymentBtn, submitSuggestionBtn, suggestionModal, suggestionName, suggestionText, suggestionsList } from './dom.js';
import { currentSectionId, getIsAdmin, sections, setCurrentSectionId, setSections, setStudentPrompted, setStudents, setUnsubscribeStudents, studentPrompted, students, unsubscribeStudents } from './state.js';
import { db } from './firebase.js';
import { escapeHtml, nextId } from './utils.js';
import { adminName, promptStudentSelect, startHeartbeat, stopHeartbeat } from './auth.js';
import { getSmsSettings, playSound, renderStudentList, sendSms, showAlert, showConfirm, showPrompt, showStudentProfile } from './ui.js';
import { updateStats } from './stats.js';
import { collection, doc, setDoc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

        export function loadSections() {
            if (unsubscribeSections) unsubscribeSections();
            const q = query(collection(db, 'sections'), orderBy('order'));
            unsubscribeSections = onSnapshot(q, (snapshot) => {
                setSections([]);
                snapshot.forEach((d) => sections.push({ id: parseInt(d.id), ...d.data() }));
                if (sections.length === 0) {
                    const defaultId = Date.now();
                    setDoc(doc(db, 'sections', String(defaultId)), { name: 'BSIS-1A', order: 0 });
                }
                const html = sections.map(s => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('');
                sectionSelect.innerHTML = html;
                sectionSelectView.innerHTML = html;
                if (sections.length > 0 && !currentSectionId) {
                    setCurrentSectionId(sections[0].id);
                    loadStudents();
                }
            });
        }

        export function loadStudents() {
            if (unsubscribeStudents) unsubscribeStudents();
            studentListContainer.innerHTML = '<div class="loading-msg">Loading students...</div>';
            const q = query(collection(db, 'students'), orderBy('name'));
            setStudentPrompted(false);
            setUnsubscribeStudents(onSnapshot(q, (snapshot) => {
                setStudents([]);
                snapshot.forEach((d) => students.push({ id: parseInt(d.id), ...d.data() }));
                setStudents(students.filter(s => s.section_id === currentSectionId));
                renderStudentList();
                updateStats();
                const sid = localStorage.getItem('fm_student_session_id');
                if (sid && !getIsAdmin()) {
                    showStudentProfile(sid);
                }
                if (!getIsAdmin() && !studentPrompted) {
                    setStudentPrompted(true);
                    const student = sid ? students.find(s => String(s.id) === String(sid)) : null;
                    if (sid && student && student.pw) {
                        startHeartbeat(sid);
                    } else if (students.length > 0) {
                        stopHeartbeat();
                        promptStudentSelect();
                    }
                }
            }));
        }

        export async function logActivity(action, details, studentName, amount) {
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

        export async function addOrUpdateStudent() {
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

        export async function editStudent(id) {
            if (!getIsAdmin()) return;
            const student = students.find(s => s.id === id);
            if (student) {
                nameInput.value = student.name; genderSelect.value = student.gender; relationStatusSelect.value = student.relationStatus || 'Single';
                fineInput.value = student.fine; statusSelect.value = student.status;
                editModeId = id; addBtn.textContent = '✏️ UPDATE';
            }
        }

        export async function deleteStudent(id) {
            if (!getIsAdmin()) return;
            const s = students.find(st => st.id === id);
            if (!await showConfirm('Delete this student?')) return;
            await deleteDoc(doc(db, 'students', String(id)));
            const payments = await getDocs(collection(db, 'students', String(id), 'payments'));
            await Promise.all(payments.docs.map(d => deleteDoc(doc(db, 'students', String(id), 'payments', d.id))));
            logActivity('student_delete', `Student deleted`, s?.name || 'Unknown', 0);
            playSound('delete');
        }

        export function clearForm() {
            nameInput.value = ''; genderSelect.value = 'male'; relationStatusSelect.value = 'Single'; fineInput.value = '0'; statusSelect.value = 'unpaid'; editModeId = null; addBtn.textContent = '➕ ADD';
        }

        export async function addNewSection() {
            if (!getIsAdmin()) return;
            const name = await showPrompt('Enter section name (e.g., BSIS-1B):');
            if (name) { const newId = nextId(sections); await setDoc(doc(db, 'sections', String(newId)), { name, order: newId }); logActivity('section_add', `Section "${name}" created`, '', 0); }
        }

        export async function openPaymentModal(studentId) {
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

        export async function renderPaymentHistory(studentId) {
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

        export async function addPayment() {
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

        export async function deletePayment(studentId, paymentId) {
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

        export let unsubscribeAnnounce = null;
        export let announcements = [];
        window.closeAnnounceModal = function() { document.getElementById('announceModal').classList.remove('active'); };
        export function loadAnnouncements() {
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
        export function renderAnnouncements() {
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
        export async function deleteAnnounce(id) {
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

        export function loadSuggestions() {
            if (unsubscribeSuggestions) unsubscribeSuggestions();
            const q = query(collection(db, 'suggestions'), orderBy('timestamp', 'desc'));
            unsubscribeSuggestions = onSnapshot(q, (snapshot) => {
                suggestions = [];
                snapshot.forEach((d) => suggestions.push({ id: parseInt(d.id), ...d.data() }));
                renderSuggestions();
            });
        }

        export function renderSuggestions() {
            if (suggestions.length === 0) { suggestionsList.innerHTML = '<div class="no-results">No suggestions yet. Be the first! 💡</div>'; return; }
            let html = '';
            suggestions.forEach((s) => {
                const deleteBtn = getIsAdmin() ? `<button class="btn-delete-payment" onclick="window.deleteSuggestion(${s.id})" style="float:right;">✕</button>` : '';
                html += `<div class="suggestion-card">${deleteBtn}<div class="suggestion-author">👤 ${escapeHtml(s.name || 'Anonymous')}</div><div class="suggestion-text">${escapeHtml(s.text)}</div><div class="suggestion-meta">📅 ${s.date || ''}</div></div>`;
            });
            suggestionsList.innerHTML = html;
        }

        export async function deleteSuggestion(id) {
            if (!getIsAdmin()) return;
            if (!await showConfirm('Delete this suggestion?')) return;
            await deleteDoc(doc(db, 'suggestions', String(id)));
        }

        suggestionModal.addEventListener('click', (e) => { if (e.target === suggestionModal) closeSuggestionModal(); });
        export let editModeId = null;
        export let currentPaymentStudentId = null;
        export let unsubscribeSections = null;
        export let unsubscribeSuggestions = null;
        export let suggestions = [];
        addSectionBtn.addEventListener('click', addNewSection);
        addBtn.addEventListener('click', addOrUpdateStudent);
        clearFormBtn.addEventListener('click', clearForm);
        nameInput.addEventListener('keypress', e => { if (e.key === 'Enter') addOrUpdateStudent(); });

        export let pendingRequests = [];
        export let unsubscribeRequests = null;

        export function startRequestsListener() {
            if (unsubscribeRequests) unsubscribeRequests();
            const q = query(collection(db, 'account_requests'), orderBy('requestedAt'));
            unsubscribeRequests = onSnapshot(q, (snapshot) => {
                pendingRequests = [];
                snapshot.forEach(d => pendingRequests.push({ id: d.id, ...d.data() }));
                updateRequestsBadge();
                if (requestsModal && requestsModal.classList.contains('active')) renderRequestsList();
            }, () => {});
        }

        export function stopRequestsListener() {
            if (unsubscribeRequests) { unsubscribeRequests(); unsubscribeRequests = null; }
            pendingRequests = [];
            updateRequestsBadge();
        }

        export function updateRequestsBadge() {
            const n = pendingRequests.length;
            if (requestsBadge) {
                requestsBadge.style.display = n > 0 ? 'inline-block' : 'none';
                requestsBadge.textContent = n;
            }
        }

        export function renderRequestsList() {
            if (!requestsList) return;
            if (pendingRequests.length === 0) {
                requestsList.innerHTML = '<div class="no-results">No pending requests.</div>';
                return;
            }
            requestsList.innerHTML = pendingRequests.map(r => {
                const when = r.requestedAt ? new Date(r.requestedAt).toLocaleString() : '';
                return `<div style="background:#0f1923;border:1px solid #1e293b;border-radius:14px;padding:12px;">
                    <div style="font-weight:bold;font-size:0.9rem;color:#e0e0e0;">${escapeHtml(r.name || 'Unknown')}</div>
                    <div style="font-size:0.72rem;color:#9ca3af;margin-top:2px;">📚 ${escapeHtml(r.sectionName || 'No section')}</div>
                    <div style="font-size:0.65rem;color:#6b7280;margin-top:2px;">🕒 ${escapeHtml(when)}</div>
                    <div style="display:flex;gap:8px;margin-top:10px;">
                        <button onclick="window.__acceptReq('${r.id}')" style="flex:1;background:linear-gradient(135deg,#10b981,#059669);color:#fff;border:none;padding:8px;border-radius:10px;font-size:0.75rem;font-weight:bold;cursor:pointer;">✅ Accept</button>
                        <button onclick="window.__rejectReq('${r.id}')" style="flex:1;background:linear-gradient(135deg,#ef4444,#dc2626);color:#fff;border:none;padding:8px;border-radius:10px;font-size:0.75rem;font-weight:bold;cursor:pointer;">❌ Reject</button>
                    </div>
                </div>`;
            }).join('');
        }

        export function closeRequestsModal() { if (requestsModal) requestsModal.classList.remove('active'); }
        window.closeRequestsModal = closeRequestsModal;
        window.__acceptReq = async function(reqId) {
            if (!getIsAdmin()) return;
            const req = pendingRequests.find(r => String(r.id) === String(reqId));
            if (!req) return;
            if (!await showConfirm('Approve account for "' + req.name + '"?')) return;
            try {
                const all = await getDocs(collection(db, 'students'));
                let maxId = 0;
                all.forEach(d => { const v = parseInt(d.id); if (!isNaN(v) && v > maxId) maxId = v; });
                const newId = maxId + 1;
                await setDoc(doc(db, 'students', String(newId)), {
                    id: newId,
                    name: req.name,
                    gender: '',
                    relationStatus: 'Single',
                    fine: 0,
                    status: 'unpaid',
                    section_id: req.section_id,
                    photoUrl: '',
                    totalPaid: 0,
                    order: newId,
                    pw: req.pw || null
                });
                await deleteDoc(doc(db, 'account_requests', String(reqId)));
                logActivity('student_add', 'Account request approved', req.name, 0);
                playSound('add');
                renderRequestsList();
                await showAlert('✅ Account approved for ' + req.name + '!');
            } catch (e) {
                await showAlert('❌ Could not approve this request. ' + (e && e.message ? e.message : ''));
            }
        };
        window.__rejectReq = async function(reqId) {
            if (!getIsAdmin()) return;
            const req = pendingRequests.find(r => String(r.id) === String(reqId));
            if (!req) return;
            if (!await showConfirm('Reject request from "' + req.name + '"?')) return;
            try {
                await deleteDoc(doc(db, 'account_requests', String(reqId)));
                renderRequestsList();
            } catch (e) {}
        };
        if (requestsBtn) requestsBtn.addEventListener('click', () => { renderRequestsList(); requestsModal.classList.add('active'); });
        if (requestsModal) requestsModal.addEventListener('click', (e) => { if (e.target === requestsModal) closeRequestsModal(); });
