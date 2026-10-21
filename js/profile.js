import { auth, db } from './firebase.js';
import { readFileAsBase64, readImageAsBase64 } from './utils.js';
import { showAlert, showConfirm } from './ui.js';
import { adminName, adminPhotoUrl, devName, devPhotoUrl, setDeveloperName, setDeveloperPhoto, setDeveloperWallpaper, setSecretaryRolePhoto, setSecretaryWallpaper } from './auth.js';
import { getRoleBackground, ROLE_DEVELOPER, ROLE_SECRETARY } from './roleTheme.js';
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
const profileWallpaperBtn = document.getElementById('profileWallpaperBtn');
const profileWallpaperInput = document.getElementById('profileWallpaperInput');
const profileWallpaperRemoveBtn = document.getElementById('profileWallpaperRemoveBtn');
const profileNameRow = document.getElementById('profileNameRow');
const profileNameInput = document.getElementById('profileNameInput');
const profileNameSaveBtn = document.getElementById('profileNameSaveBtn');

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
    const name = devName || adminName || 'Developer';
    devProfileName.textContent = name;
    setCircleImg(devProfileImg, devProfileInitial, devPhotoUrl || adminPhotoUrl, name);
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

function currentName() {
    return currentRole === 'developer' ? (devName || adminName || 'Developer') : (secName || 'Secretary');
}

function currentPhoto() {
    return currentRole === 'developer' ? (devPhotoUrl || adminPhotoUrl) : secPhotoUrl;
}

function renderModal() {
    const name = currentName();
    const photo = currentPhoto();
    const roleLabel = currentRole === 'developer' ? '👑 Developer' : '📝 Secretary';
    const roleColor = currentRole === 'developer' ? '#f59e0b' : '#38bdf8';
    profileModalName.textContent = name;
    profileModalRole.textContent = roleLabel;
    profileModalRole.style.color = roleColor;
    profileModalCircle.style.borderColor = roleColor;
    profileModalInitial.style.color = roleColor;
    setCircleImg(profileModalImg, profileModalInitial, photo, name);
    if (profileNameRow) profileNameRow.style.display = currentRole === 'developer' ? 'block' : 'none';
    if (profileNameInput && currentRole === 'developer' && document.activeElement !== profileNameInput) {
        profileNameInput.value = devName || adminName || '';
    }
    const hasWallpaper = currentRole === 'developer'
        ? !!getRoleBackground(ROLE_DEVELOPER)
        : !!getRoleBackground(ROLE_SECRETARY);
    if (profileWallpaperRemoveBtn) profileWallpaperRemoveBtn.style.display = hasWallpaper ? 'block' : 'none';
}

async function saveProfileName() {
    if (currentRole !== 'developer') return;
    const name = (profileNameInput.value || '').trim();
    if (!name) { await showAlert('⚠️ Please enter a display name.'); return; }
    try {
        await updateDoc(doc(db, 'settings', 'admin'), { devName: name });
        setDeveloperName(name);
        renderModal();
        await showAlert('✅ Display name updated!');
    } catch (e) {
        await showAlert('❌ Could not save the name. ' + (e && e.code === 'permission-denied'
            ? 'Your account is not allowed to update this record.'
            : 'Check your connection and try again.'));
    }
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
            setDeveloperPhoto(photoUrl);
            await updateDoc(doc(db, 'settings', 'admin'), { devPhoto: photoUrl });
            renderDevProfile();
        } else {
            const u = auth.currentUser;
            if (!u) throw { code: 'app/not-signed-in' };
            await updateDoc(doc(db, 'secretaries', u.uid), { photoUrl });
            secPhotoUrl = photoUrl;
            renderSecProfile();
            try {
                setSecretaryRolePhoto(photoUrl, secName);
                await updateDoc(doc(db, 'settings', 'admin'), { secPhoto: photoUrl, secName: secName });
            } catch (e) {}
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

async function uploadWallpaper() {
    const file = profileWallpaperInput.files[0];
    profileWallpaperInput.value = '';
    if (!file) return;
    const dataUrl = await readImageAsBase64(file, 1600, 0.78);
    if (!dataUrl) { await showAlert('⚠️ Could not read that image. Try another picture.'); return; }
    if (dataUrl.length > 950000) { await showAlert('⚠️ Image is too large. Please choose a smaller or simpler picture.'); return; }
    try {
        if (currentRole === 'developer') {
            setDeveloperWallpaper(dataUrl);
            await updateDoc(doc(db, 'settings', 'admin'), { loginBgDev: dataUrl });
        } else {
            setSecretaryWallpaper(dataUrl);
            await updateDoc(doc(db, 'settings', 'admin'), { loginBgSec: dataUrl });
        }
        renderModal();
        await showAlert('✅ Login wallpaper updated!');
    } catch (e) {
        await showAlert('❌ Could not save the wallpaper. ' + (e && e.code === 'permission-denied'
            ? 'Your account is not allowed to update this record.'
            : 'Check your connection and try again.'));
    }
}

async function removeWallpaper() {
    if (!await showConfirm('Remove this role\'s login wallpaper?')) return;
    try {
        if (currentRole === 'developer') {
            setDeveloperWallpaper('');
            await updateDoc(doc(db, 'settings', 'admin'), { loginBgDev: '' });
        } else {
            setSecretaryWallpaper('');
            await updateDoc(doc(db, 'settings', 'admin'), { loginBgSec: '' });
        }
        renderModal();
        await showAlert('🗑️ Login wallpaper removed!');
    } catch (e) {
        await showAlert('❌ Could not remove the wallpaper. ' + (e && e.code === 'permission-denied'
            ? 'Your account is not allowed to update this record.'
            : 'Check your connection and try again.'));
    }
}

if (devProfileBtn) devProfileBtn.addEventListener('click', () => openProfileModal('developer'));
if (secProfileBtn) secProfileBtn.addEventListener('click', () => openProfileModal('secretary'));
if (profileUploadBtn) profileUploadBtn.addEventListener('click', () => profilePhotoInput.click());
if (profilePhotoInput) profilePhotoInput.addEventListener('change', uploadProfilePhoto);
if (profileWallpaperBtn) profileWallpaperBtn.addEventListener('click', () => profileWallpaperInput.click());
if (profileWallpaperInput) profileWallpaperInput.addEventListener('change', uploadWallpaper);
if (profileWallpaperRemoveBtn) profileWallpaperRemoveBtn.addEventListener('click', removeWallpaper);
if (profileNameSaveBtn) profileNameSaveBtn.addEventListener('click', saveProfileName);
if (profileNameInput) profileNameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') saveProfileName(); });
if (profileModal) profileModal.addEventListener('click', (e) => { if (e.target === profileModal) closeProfileModal(); });
