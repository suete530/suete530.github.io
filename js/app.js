import './i18n.js';
import { getIsAdmin, students } from './state.js';
import { auth } from './firebase.js';
import { enterApp, isAdminSession, loadAdminSettings, startSettingsListener, trackVisitor, updateStudentLastOnline } from './auth.js';
import { deleteAnnounce, deletePayment, deleteStudent, deleteSuggestion, editStudent, loadAnnouncements, loadSections, openPaymentModal } from './db.js';
import { initPasswordToggles, renderFinePresets, updateMainGcash } from './ui.js';
import { appendMessage, quickChat, toggleChatWeb, updateInboxBadge } from './chat.js';
import { signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

        initPasswordToggles();

        await new Promise((resolve) => {
            const un = onAuthStateChanged(auth, () => { un(); resolve(); });
        });
        if (!auth.currentUser) {
            try { await signInAnonymously(auth); } catch (e) { console.warn('Anonymous auth unavailable:', e.message); }
        }
        await loadAdminSettings();
        startSettingsListener();
        trackVisitor();
        export const autoEnterAdmin = isAdminSession();

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
