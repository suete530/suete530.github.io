import './i18n.js';
import { getIsAdmin, students } from './state.js';
import { auth, db } from './firebase.js';
import { enterApp, isAdminSession, loadAdminSettings, startSettingsListener, trackVisitor, updateStudentLastOnline, watchOwnRequest } from './auth.js';
import { deleteAnnounce, deletePayment, deleteStudent, deleteSuggestion, editStudent, loadAnnouncements, loadSections, openPaymentModal, startRequestsListener } from './db.js';
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
        const currentUser = auth.currentUser;
        if (currentUser && !currentUser.isAnonymous && !autoEnterAdmin) {
            try {
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
            } catch (e) {}
        }

        function errStudentPending() {
            const el = document.getElementById('loginError');
            if (el) {
                el.textContent = '⏳ Your account is still pending admin approval.';
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
            if (getIsAdmin()) startRequestsListener();
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
        else if (autoEnterStudent) enterApp(false);
