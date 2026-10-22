// Developer voice greeting.
// Upload a short clip or record straight from the browser; it is stored in
// settings/admin (the same doc the app already writes for the developer
// profile picture and wallpaper) and plays when the Fines System opens.
import { db } from './firebase.js';
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { showAlert } from './ui.js';
import { devVoiceBtn, devVoiceDeleteBtn, devVoiceFile, devVoiceModal, devVoicePreview, devVoiceRecordBtn, devVoiceSaveBtn, devVoiceStatus, devVoiceStopBtn, devVoiceTimer } from './dom.js';

const MAX_BYTES = 480 * 1024;      // Firestore doc limit is 1 MiB and base64 adds ~33%

let pending = null;                // { dataUrl, mime, name }
let recorder = null;
let micStream = null;
let chunks = [];
let timerId = null;

// Once per visit (per page load): the greeting plays on the login screen and
// again on the dashboard, but never twice for the same screen.
const playedScenes = {};
let gesture = null;                // { scene, dataUrl, handler }

function setStatus(msg, isError) {
    if (!devVoiceStatus) return;
    devVoiceStatus.textContent = msg || '';
    devVoiceStatus.style.color = isError ? '#f87171' : '#94a3b8';
}

function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.onerror = reject;
        r.readAsDataURL(file);
    });
}

function showPreview(dataUrl) {
    if (!devVoicePreview) return;
    devVoicePreview.src = dataUrl;
    devVoicePreview.style.display = 'block';
}

function releaseMic() {
    if (micStream) {
        micStream.getTracks().forEach(t => { try { t.stop(); } catch (e) {} });
        micStream = null;
    }
}

export async function openVoiceModal() {
    if (!devVoiceModal) return;
    devVoiceModal.classList.add('active');
    pending = null;
    if (devVoicePreview) { devVoicePreview.removeAttribute('src'); devVoicePreview.style.display = 'none'; }
    setStatus('Loading saved voice...');
    await loadCurrentVoice();
}
window.openDevVoiceModal = openVoiceModal;
window.closeDevVoiceModal = () => {
    stopRecording();
    if (devVoiceModal) devVoiceModal.classList.remove('active');
};

async function loadCurrentVoice() {
    try {
        const snap = await getDoc(doc(db, 'settings', 'admin'));
        const d = snap.data();
        if (d && d.voiceData) {
            pending = { dataUrl: d.voiceData, mime: d.voiceMime || 'audio/mpeg', name: d.voiceName || 'saved voice' };
            showPreview(d.voiceData);
            setStatus('Saved voice: ' + pending.name);
        } else {
            setStatus('No voice saved yet. Upload a file or record one.');
        }
    } catch (e) {
        setStatus('Could not read the saved voice.', true);
    }
}

async function acceptFile(file) {
    if (!file) return false;
    if (!/^audio\//.test(file.type) && !/\.(mp3|m4a|wav|ogg|webm|aac)$/i.test(file.name)) {
        setStatus('Please pick an audio file (mp3, m4a, wav, ogg, webm).', true);
        return false;
    }
    if (file.size > MAX_BYTES) {
        setStatus('Too big (' + Math.round(file.size / 1024) + ' KB). Limit is ' + Math.round(MAX_BYTES / 1024) + ' KB - use the Record button or a smaller file.', true);
        await showAlert('🎙 That clip is too big (' + Math.round(file.size / 1024) + ' KB). Keep it under ' + Math.round(MAX_BYTES / 1024) + ' KB.');
        return false;
    }
    const dataUrl = await fileToDataUrl(file);
    pending = { dataUrl, mime: file.type || 'audio/mpeg', name: file.name };
    showPreview(dataUrl);
    setStatus('Ready to save: ' + file.name + ' (' + Math.round(file.size / 1024) + ' KB)');
    return true;
}

export async function saveVoice(isAuto) {
    if (!pending || !pending.dataUrl) {
        setStatus('Nothing to save yet.', true);
        if (!isAuto) await showAlert('🎙 Nothing to save yet. Record a clip or pick a file first.');
        return false;
    }
    try {
        await updateDoc(doc(db, 'settings', 'admin'), {
            voiceData: pending.dataUrl,
            voiceMime: pending.mime,
            voiceName: pending.name,
            voiceUpdatedAt: Date.now()
        });
        setStatus('Saved. It will play when the Fines System opens.');
        await showAlert('🎙 Voice saved! It will play when the Fines System opens.');
        playClip(pending.dataUrl);
        return true;
    } catch (e) {
        const msg = (e && e.code === 'permission-denied')
            ? 'the Firestore rules blocked this write'
            : (e && e.message ? e.message : 'error');
        setStatus('Could not save: ' + msg, true);
        await showAlert('❌ Could not save the voice: ' + msg);
        return false;
    }
}

export async function deleteVoice() {
    try {
        await updateDoc(doc(db, 'settings', 'admin'), { voiceData: '', voiceMime: '', voiceName: '', voiceUpdatedAt: Date.now() });
        pending = null;
        if (devVoicePreview) { devVoicePreview.removeAttribute('src'); devVoicePreview.style.display = 'none'; }
        setStatus('Voice removed.');
        await showAlert('🗑 Voice removed.');
    } catch (e) {
        setStatus('Could not remove the voice.', true);
        await showAlert('❌ Could not remove the voice.');
    }
}

export async function startRecording() {
    if (recorder && recorder.state !== 'inactive') {
        setStatus('Already recording - press Stop first.', true);
        return;
    }
    if (!window.isSecureContext) {
        setStatus('Recording needs a secure (https) connection.', true);
        await showAlert('🎙 Recording needs https. Open the site with the https:// link.');
        return;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setStatus('Recording is not supported in this browser.', true);
        await showAlert('🎙 This browser cannot record audio. Try Chrome or Safari.');
        return;
    }
    // This is the browser permission prompt.
    try {
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
        const name = e && e.name;
        if (name === 'NotAllowedError' || name === 'SecurityError') {
            setStatus('Microphone permission was denied. Allow the mic for this site, then try again.', true);
            await showAlert('🎙 Microphone blocked. Tap "Allow" on the browser prompt (or enable the mic in the site settings), then press Record again.');
        } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
            setStatus('No microphone found on this device.', true);
            await showAlert('🎙 No microphone found on this device.');
        } else {
            setStatus('Microphone error: ' + (e && e.message ? e.message : name || 'unknown'), true);
            await showAlert('🎙 Microphone error: ' + (e && e.message ? e.message : name || 'unknown'));
        }
        return;
    }
    try {
        chunks = [];
        const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4;codecs=mp4a.40.2', 'audio/mp4', 'audio/ogg;codecs=opus'];
        const mime = (typeof MediaRecorder !== 'undefined' && types.find(m => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(m))) || '';
        const rec = new MediaRecorder(micStream, mime ? { mimeType: mime } : undefined);
        recorder = rec;
        const recMime = rec.mimeType || mime || 'audio/webm';
        rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
        rec.onstop = async () => {
            releaseMic();
            const type = recMime;
            const blob = new Blob(chunks, { type });
            chunks = [];
            if (!blob.size) {
                setStatus('Nothing was recorded - please try again.', true);
                return;
            }
            const ext = type.indexOf('mp4') >= 0 ? 'm4a' : (type.indexOf('ogg') >= 0 ? 'ogg' : 'webm');
            const file = new File([blob], 'voice-recording.' + ext, { type });
            const ok = await acceptFile(file);
            if (!ok) return;
            setStatus('Recorded ' + Math.round(blob.size / 1024) + ' KB - saving...');
            await saveVoice(true);
        };
        rec.onerror = (e) => {
            releaseMic();
            setStatus('Recording failed: ' + (e && e.error ? e.error.name : 'unknown'), true);
        };
        rec.start();
        startTimer();
        if (devVoiceRecordBtn) devVoiceRecordBtn.style.display = 'none';
        if (devVoiceStopBtn) devVoiceStopBtn.style.display = 'inline-block';
        setStatus('Recording... press Stop when done.');
    } catch (e) {
        releaseMic();
        setStatus('Could not start recording: ' + (e && e.message ? e.message : 'error'), true);
        await showAlert('🎙 Could not start recording: ' + (e && e.message ? e.message : 'error'));
    }
}

export function stopRecording() {
    const rec = recorder;
    recorder = null;
    stopTimer();
    if (rec && rec.state !== 'inactive') { try { rec.stop(); } catch (e) {} }
    if (devVoiceRecordBtn) devVoiceRecordBtn.style.display = '';
    if (devVoiceStopBtn) devVoiceStopBtn.style.display = 'none';
}

function startTimer() {
    let sec = 0;
    stopTimer();
    timerId = setInterval(() => {
        sec++;
        if (devVoiceTimer) {
            const mm = String(Math.floor(sec / 60)).padStart(2, '0');
            const ss = String(sec % 60).padStart(2, '0');
            devVoiceTimer.textContent = mm + ':' + ss;
        }
        if (sec >= 60) stopRecording();
    }, 1000);
}

function stopTimer() {
    if (timerId) { clearInterval(timerId); timerId = null; }
}

function playClip(dataUrl) {
    return new Promise((resolve) => {
        const audio = new Audio();
        audio.src = dataUrl;
        audio.onended = () => resolve(true);
        audio.onerror = () => resolve(false);
        const p = audio.play();
        if (p && p.catch) p.catch(() => resolve(false));
    });
}

// Browsers block sound until the page is touched, so try again on the very
// first click / tap if the automatic play was refused.
function cancelGesture() {
    if (!gesture) return;
    document.removeEventListener('pointerdown', gesture.handler);
    document.removeEventListener('touchstart', gesture.handler);
    document.removeEventListener('keydown', gesture.handler);
    gesture = null;
}

function armGesture(scene, dataUrl) {
    cancelGesture();
    const handler = (e) => {
        const g = gesture;
        if (!g) return;
        // Clicking the login button means the dashboard greeting is coming
        // right after - do not play both back to back.
        const onLoginBtn = e && e.target && e.target.closest && e.target.closest('#loginBtn');
        if (g.scene === 'login' && onLoginBtn) { cancelGesture(); return; }
        cancelGesture();
        playClip(g.dataUrl);
    };
    gesture = { scene, dataUrl, handler };
    document.addEventListener('pointerdown', handler);
    document.addEventListener('touchstart', handler);
    document.addEventListener('keydown', handler);
}

// The login screen and the dashboard each get the greeting once per visit.
export async function playVoiceOnOpen(scene) {
    const key = scene === 'login' ? 'login' : 'app';
    if (playedScenes[key]) return;
    try {
        const snap = await getDoc(doc(db, 'settings', 'admin'));
        const d = snap.data();
        if (!d || !d.voiceData) return;
        playedScenes[key] = 'pending';
        const played = await playClip(d.voiceData);
        if (played) {
            playedScenes[key] = 'done';
            return;
        }
        armGesture(key, d.voiceData);
    } catch (e) {
        // nothing saved / offline - stay silent
    }
}

// Play on the login screen whenever it appears (first visit, sign out,
// expired session) and cancel a pending greeting once the app opens.
function watchLoginScreen() {
    const ov = document.getElementById('loginOverlay');
    if (!ov) return;
    let lastHidden = ov.classList.contains('hidden');
    const check = () => {
        const hidden = ov.classList.contains('hidden');
        if (hidden) {
            if (!lastHidden && gesture && gesture.scene === 'login') cancelGesture();
        } else if (lastHidden) {
            // the login screen just appeared (new visit, sign out, expired session)
            delete playedScenes['login'];
            delete playedScenes['app'];
            playVoiceOnOpen('login');
        }
        lastHidden = hidden;
    };
    new MutationObserver(check).observe(ov, { attributes: true, attributeFilter: ['class'] });
    if (!lastHidden) playVoiceOnOpen('login');
}

if (devVoiceBtn) devVoiceBtn.addEventListener('click', openVoiceModal);
if (devVoiceFile) devVoiceFile.addEventListener('change', (e) => acceptFile(e.target.files && e.target.files[0]));
if (devVoiceRecordBtn) devVoiceRecordBtn.addEventListener('click', startRecording);
if (devVoiceStopBtn) devVoiceStopBtn.addEventListener('click', stopRecording);
if (devVoiceSaveBtn) devVoiceSaveBtn.addEventListener('click', () => saveVoice(false));
if (devVoiceDeleteBtn) devVoiceDeleteBtn.addEventListener('click', deleteVoice);
if (devVoiceModal) devVoiceModal.addEventListener('click', (e) => { if (e.target === devVoiceModal) { stopRecording(); devVoiceModal.classList.remove('active'); } });

watchLoginScreen();
