// Developer voice greeting.
// Upload a short clip or record straight from the browser; it is stored in
// settings/admin (the same doc the app already reads for GCash details) and
// plays automatically when the Fines System opens.
import { db } from './firebase.js';
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { showAlert } from './ui.js';
import { devVoiceBtn, devVoiceDeleteBtn, devVoiceFile, devVoiceModal, devVoicePreview, devVoiceRecordBtn, devVoiceSaveBtn, devVoiceStatus, devVoiceStopBtn, devVoiceTimer } from './dom.js';

const MAX_BYTES = 480 * 1024;      // Firestore doc limit is 1 MiB and base64 adds ~33%
const PLAYED_KEY = 'fm_voice_played';

let pending = null;                // { dataUrl, mime, name }
let recorder = null;
let chunks = [];
let timerId = null;

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

export async function openVoiceModal() {
    if (!devVoiceModal) return;
    devVoiceModal.classList.add('active');
    pending = null;
    if (devVoicePreview) { devVoicePreview.removeAttribute('src'); devVoicePreview.style.display = 'none'; }
    setStatus('Loading saved voice...');
    await loadCurrentVoice();
}
window.openDevVoiceModal = openVoiceModal;
window.closeDevVoiceModal = () => { if (devVoiceModal) devVoiceModal.classList.remove('active'); };

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
    if (!file) return;
    if (!/^audio\//.test(file.type) && !/\.(mp3|m4a|wav|ogg|webm|aac)$/i.test(file.name)) {
        setStatus('Please pick an audio file (mp3, m4a, wav, ogg, webm).', true);
        return;
    }
    if (file.size > MAX_BYTES) {
        setStatus('Too big (' + Math.round(file.size / 1024) + ' KB). Limit is ' + Math.round(MAX_BYTES / 1024) + ' KB - use the Record button or a smaller file.', true);
        return;
    }
    const dataUrl = await fileToDataUrl(file);
    pending = { dataUrl, mime: file.type || 'audio/mpeg', name: file.name };
    showPreview(dataUrl);
    setStatus('Ready to save: ' + file.name + ' (' + Math.round(file.size / 1024) + ' KB)');
}

export async function saveVoice() {
    if (!pending || !pending.dataUrl) { setStatus('Nothing to save yet.', true); return; }
    try {
        await updateDoc(doc(db, 'settings', 'admin'), {
            voiceData: pending.dataUrl,
            voiceMime: pending.mime,
            voiceName: pending.name,
            voiceUpdatedAt: Date.now()
        });
        try { sessionStorage.removeItem(PLAYED_KEY); } catch (e) {}
        setStatus('Saved. It will play when the Fines System opens.');
        await showAlert('🎙 Voice saved! It will play when the Fines System opens.');
    } catch (e) {
        setStatus('Could not save: ' + (e && e.message ? e.message : 'error'), true);
    }
}

export async function deleteVoice() {
    try {
        await updateDoc(doc(db, 'settings', 'admin'), { voiceData: '', voiceMime: '', voiceName: '', voiceUpdatedAt: Date.now() });
        pending = null;
        if (devVoicePreview) { devVoicePreview.removeAttribute('src'); devVoicePreview.style.display = 'none'; }
        setStatus('Voice removed.');
    } catch (e) {
        setStatus('Could not remove the voice.', true);
    }
}

export async function startRecording() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setStatus('Recording is not supported in this browser.', true);
        return;
    }
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        chunks = [];
        const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
        const mime = (typeof MediaRecorder !== 'undefined' && types.find(m => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(m))) || '';
        recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
        recorder.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
        recorder.onstop = async () => {
            stream.getTracks().forEach(t => t.stop());
            const type = recorder.mimeType || 'audio/webm';
            const blob = new Blob(chunks, { type });
            const ext = type.indexOf('mp4') >= 0 ? 'm4a' : (type.indexOf('ogg') >= 0 ? 'ogg' : 'webm');
            await acceptFile(new File([blob], 'voice-recording.' + ext, { type }));
        };
        recorder.start();
        startTimer();
        if (devVoiceRecordBtn) devVoiceRecordBtn.style.display = 'none';
        if (devVoiceStopBtn) devVoiceStopBtn.style.display = 'inline-block';
        setStatus('Recording...');
    } catch (e) {
        setStatus('Microphone was blocked or is unavailable.', true);
    }
}

export function stopRecording() {
    if (recorder && recorder.state !== 'inactive') recorder.stop();
    recorder = null;
    stopTimer();
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

export async function playVoiceOnOpen() {
    try {
        if (sessionStorage.getItem(PLAYED_KEY) === '1') return;
        const snap = await getDoc(doc(db, 'settings', 'admin'));
        const d = snap.data();
        if (!d || !d.voiceData) return;
        const audio = new Audio();
        audio.src = d.voiceData;
        await audio.play();
        try { sessionStorage.setItem(PLAYED_KEY, '1'); } catch (e) {}
    } catch (e) {
        // autoplay blocked or nothing saved - stay silent
    }
}

if (devVoiceBtn) devVoiceBtn.addEventListener('click', openVoiceModal);
if (devVoiceFile) devVoiceFile.addEventListener('change', (e) => acceptFile(e.target.files && e.target.files[0]));
if (devVoiceRecordBtn) devVoiceRecordBtn.addEventListener('click', startRecording);
if (devVoiceStopBtn) devVoiceStopBtn.addEventListener('click', stopRecording);
if (devVoiceSaveBtn) devVoiceSaveBtn.addEventListener('click', saveVoice);
if (devVoiceDeleteBtn) devVoiceDeleteBtn.addEventListener('click', deleteVoice);
if (devVoiceModal) devVoiceModal.addEventListener('click', (e) => { if (e.target === devVoiceModal) devVoiceModal.classList.remove('active'); });
