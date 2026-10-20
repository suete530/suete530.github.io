import './i18n.js';
import { getIsAdmin, students } from './state.js';
import { auth, db } from './firebase.js';
import { enterApp, isAdminSession, loadAdminSettings, startSettingsListener, trackVisitor, updateStudentLastOnline, watchOwnAdminRequest, watchOwnRequest } from './auth.js';
import { enterSecretaryApp, startSecRequestsListener, watchOwnSecretaryRequest } from './secretary.js';
import './accounts.js';
import './profile.js';
import { deleteAnnounce, deletePayment, deleteStudent, deleteSuggestion, editStudent, loadAnnouncements, loadSections, openPaymentModal, startAdminRequestsListener, startRequestsListener } from './db.js';
import { initPasswordToggles, renderFinePresets, updateMainGcash } from './ui.js';
import { appendMessage, quickChat, toggleChatWeb, updateInboxBadge } from './chat.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

        initPasswordToggles();

        await new Promise((resolve) => {
            const un = onAuthStateChanged(auth, () => { un(); resolve(); });
        });
        // No automatic anonymous sign-in: guests only become anonymous when
        // they press the Guest button, so rules can tell them apart.
        await loadAdminSettings();
        startSettingsListener();
        trackVisitor();
        export const autoEnterAdmin = isAdminSession();

        let autoEnterStudent = false;
        let autoEnterAdminApproved = false;
        const currentUser = auth.currentUser;
        if (currentUser && !currentUser.isAnonymous && !autoEnterAdmin) {
            try {
                // Check if this user is an approved multi-admin
                const adminDocSnap = await getDoc(doc(db, 'admins', currentUser.uid));
                if (adminDocSnap.exists() && adminDocSnap.data().status === 'approved') {
                    window.__approvedAdmin = true;
                    autoEnterAdminApproved = true;
                } else if (adminDocSnap.exists() && adminDocSnap.data().status === 'pending') {
                    window.__approvedAdmin = false;
                    watchOwnAdminRequest();
                    errAdminPending();
                } else {
                    // Check student account
                    const userSnap = await getDoc(doc(db, 'users', currentUser.uid));
                    if (userSnap.exists() && userSnap.data().role === 'student' && userSnap.data().studentId) {
                        localStorage.setItem('fm_student_session_id', String(userSnap.data().studentId));
                        autoEnterStudent = true;
                    } else {
                        const reqSnap = await getDoc(doc(db, 'account_requests', currentUser.uid));
                        if (reqSnap.exists()) {
                            watchOwnRequest();
                            errStudentPending();
                        }
                    }
                }
            } catch (e) {}
        }

        // Auto-enter approved secretary session
        if (currentUser && !currentUser.isAnonymous && !autoEnterAdmin && !autoEnterAdminApproved && !autoEnterStudent) {
            try {
                const secSnap = await getDoc(doc(db, 'secretaries', currentUser.uid));
                if (secSnap.exists() && secSnap.data().status === 'approved') {
                    enterSecretaryApp(secSnap.data().name || (currentUser.email || '').split('@')[0], secSnap.data().photoUrl);
                } else if (secSnap.exists() && secSnap.data().status === 'pending') {
                    watchOwnSecretaryRequest();
                    errSecretaryPending();
                } else if (secSnap.exists()) {
                    watchOwnSecretaryRequest();
                }
            } catch (e) {}
        }

        function errStudentPending() {
            const el = document.getElementById('loginError');
            if (el) {
                el.textContent = '⏳ Your account is still pending admin approval.';
                el.style.display = 'block';
            }
        }

        function errAdminPending() {
            const el = document.getElementById('loginError');
            if (el) {
                el.textContent = '⏳ Your admin request is still pending owner approval.';
                el.style.display = 'block';
            }
        }

        function errSecretaryPending() {
            const el = document.getElementById('loginError');
            if (el) {
                el.textContent = '⏳ Your secretary request is still pending approval.';
                el.style.display = 'block';
            }
        }

        window.__fireLogin = function() {
            document.body.classList.toggle('is-admin', getIsAdmin());
            initApp();
        };

        export function initApp() {
            updateMainGcash();
            loadSections();
            renderFinePresets();
            loadAnnouncements();
            updateInboxBadge();
            if (getIsAdmin()) {
                startRequestsListener();
                startAdminRequestsListener();
                startSecRequestsListener();
            }
            if (!getIsAdmin()) updateStudentLastOnline();
        }

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

        if (autoEnterAdmin) enterApp(true);
        else if (autoEnterAdminApproved) enterApp(true);
        else if (autoEnterStudent) enterApp(false);
