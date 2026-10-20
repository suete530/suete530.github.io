import { auth, db } from './firebase.js';
import { readFileAsBase64 } from './utils.js';
import { showAlert } from './ui.js';
import { adminName, adminPhotoUrl } from './auth.js';
import { doc, updateDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const devProfileBtn = document.getElementById('devProfileBtn');
const devProfileImg = document.getElementById('devProfileImg');
const devProfileInitial = document.getElementById('devProfileInitial');
const devProfileName = document.getElementById('devProfileName');
const secProfileBtn = document.getElementById('secProfileBtn');
const secProfileImg = document.getElementById('secProfileImg');
const secProfileInitial = document.getElementById('secProfileInitial');
const profileModal = document.getElementById('profileModal');
const profileModalCircle = document.getElementById('profileModalCircle');
const profileModalImg = document.getElementById('profileModalImg');
const profileModalInitial = document.getElementById('profileModalInitial');
const profileModalName = document.getElementById('profileModalName');
const profileModalRole = document.getElementById('profileModalRole');
const profileUploadBtn = document.getElementById('profileUploadBtn');
const profilePhotoInput = document.getElementById('profilePhotoInput');

let currentRole = 'developer';
let secName = '';
let secPhotoUrl = '';

function initials(name) {
    const parts = (name || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function setCircleImg(imgEl, initialEl, photoUrl, name) {
    if (photoUrl) {
        imgEl.src = photoUrl;
        imgEl.style.display = 'block';
        initialEl.style.display = 'none';
    } else {
        imgEl.removeAttribute('src');
        imgEl.style.display = 'none';
        initialEl.textContent = initials(name);
        initialEl.style.display = 'block';
    }
}

export function renderDevProfile() {
    if (!devProfileName) return;
    const name = adminName || 'Developer';
    devProfileName.textContent = name;
    setCircleImg(devProfileImg, devProfileInitial, adminPhotoUrl, name);
}

export function setSecretaryProfile(name, photoUrl) {
    secName = name || 'Secretary';
    secPhotoUrl = photoUrl || '';
    renderSecProfile();
}

function renderSecProfile() {
    if (!secProfileImg) return;
    setCircleImg(secProfileImg, secProfileInitial, secPhotoUrl, secName);
}

function renderModal() {
    const name = currentRole === 'developer' ? (adminName || 'Developer') : (secName || 'Secretary');
    const photo = currentRole === 'developer' ? adminPhotoUrl : secPhotoUrl;
    const roleLabel = currentRole === 'developer' ? '👑 Developer' : '📝 Secretary';
    const roleColor = currentRole === 'developer' ? '#f59e0b' : '#38bdf8';
    profileModalName.textContent = name;
    profileModalRole.textContent = roleLabel;
    profileModalRole.style.color = roleColor;
    profileModalCircle.style.borderColor = roleColor;
    profileModalInitial.style.color = roleColor;
    setCircleImg(profileModalImg, profileModalInitial, photo, name);
}

function openProfileModal(role) {
    currentRole = role;
    renderModal();
    profileModal.classList.add('active');
}

function closeProfileModal() {
    if (profileModal) profileModal.classList.remove('active');
}

window.closeProfileModal = closeProfileModal;

async function uploadProfilePhoto() {
    if (!profilePhotoInput.files[0]) return;
    const photoUrl = await readFileAsBase64(profilePhotoInput.files[0]);
    profilePhotoInput.value = '';
    if (!photoUrl) { await showAlert('⚠️ Could not read that image. Try another photo.'); return; }
    profileUploadBtn.disabled = true;
    profileUploadBtn.textContent = '⏳ Saving...';
    try {
        if (currentRole === 'developer') {
            localStorage.setItem('fm_admin_photo', photoUrl);
            await updateDoc(doc(db, 'settings', 'admin'), { adminPhoto: photoUrl });
            renderDevProfile();
        } else {
            const u = auth.currentUser;
            if (!u) throw { code: 'app/not-signed-in' };
            await updateDoc(doc(db, 'secretaries', u.uid), { photoUrl });
            secPhotoUrl = photoUrl;
            renderSecProfile();
        }
        renderModal();
        await showAlert('✅ Profile photo updated!');
    } catch (e) {
        await showAlert('❌ Could not save photo. ' + (e && e.code === 'permission-denied'
            ? 'Your account is not allowed to update this record.'
            : 'Check your connection and try again.'));
    } finally {
        profileUploadBtn.disabled = false;
        profileUploadBtn.textContent = '📷 Upload Photo';
    }
}

if (devProfileBtn) devProfileBtn.addEventListener('click', () => openProfileModal('developer'));
if (secProfileBtn) secProfileBtn.addEventListener('click', () => openProfileModal('secretary'));
if (profileUploadBtn) profileUploadBtn.addEventListener('click', () => profilePhotoInput.click());
if (profilePhotoInput) profilePhotoInput.addEventListener('change', uploadProfilePhoto);
if (profileModal) profileModal.addEventListener('click', (e) => { if (e.target === profileModal) closeProfileModal(); });
