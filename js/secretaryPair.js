// Paired secretary management (treasurer side).
// A treasurer and their secretary are a pair: the treasurer keeps the link in
// treasurer_pairs/{their uid} (plus a copy in their own profile doc) and may
// only edit the name + picture of THAT secretary. Firestore rules repeat the
// same limit, so no treasurer can touch anybody else's secretary.
//
// Settings block: "🤝 My Secretary" inside the Treasurer settings modal.

import { auth, db } from './firebase.js';
import { readImageAsBase64 } from './utils.js';
import { showAlert, showConfirm } from './ui.js';
import { SECRETARY_PROFILES, TREASURER_PROFILES, isValidEmail, normalizeEmail } from './loginProfile.js';
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const mySecEmailInput = document.getElementById('mySecEmailInput');
const mySecLinkBtn = document.getElementById('mySecLinkBtn');
const mySecNameInput = document.getElementById('mySecNameInput');
const saveMySecNameBtn = document.getElementById('saveMySecNameBtn');
const mySecPhotoBtn = document.getElementById('mySecPhotoBtn');
const mySecPhotoInput = document.getElementById('mySecPhotoInput');
const mySecAvatarImg = document.getElementById('mySecAvatarImg');
const mySecAvatarInitial = document.getElementById('mySecAvatarInitial');
const mySecUnlinkBtn = document.getElementById('mySecUnlinkBtn');

const PAIRS_COLLECTION = 'treasurer_pairs';

let linkedSecretaryEmail = '';
let linkedSecretaryName = '';
let linkedSecretaryPhoto = '';

function myEmail() {
    const u = auth.currentUser;
    return u && u.email ? u.email.trim().toLowerCase() : '';
}

function myUid() {
    const u = auth.currentUser;
    return u && u.uid ? u.uid : '';
}

function isTreasurerSession() {
    const u = auth.currentUser;
    if (!u || u.isAnonymous || !u.email) return false;
    return window.__isAdmin === true;
}

function setPreview(photoUrl, name) {
    if (!mySecAvatarImg || !mySecAvatarInitial) return;
    if (photoUrl) {
        mySecAvatarImg.src = photoUrl;
        mySecAvatarImg.style.display = 'block';
        mySecAvatarInitial.style.display = 'none';
    } else {
        mySecAvatarImg.style.display = 'none';
        mySecAvatarInitial.style.display = 'block';
        const initials = (name || '').split(' ').filter(Boolean).map(w => w[0]).join('').substring(0, 2).toUpperCase();
        mySecAvatarInitial.textContent = initials || '📝';
    }
}

function resetForm() {
    linkedSecretaryEmail = '';
    linkedSecretaryName = '';
    linkedSecretaryPhoto = '';
    if (mySecEmailInput) mySecEmailInput.value = '';
    if (mySecNameInput) mySecNameInput.value = '';
    setPreview('', '');
}

// Writes the pairing in both places: the pairing record the rules read
// (treasurer_pairs/{uid}) and the treasurer's own profile doc.
async function writePairing(secMail) {
    const mail = myEmail();
    const uid = myUid();
    if (uid) {
        await setDoc(doc(db, PAIRS_COLLECTION, uid), {
            uid: uid,
            email: mail,
            secretaryEmail: secMail,
            updatedAt: Date.now()
        }, { merge: true });
    }
    await setDoc(doc(db, TREASURER_PROFILES, mail), {
        email: mail,
        secretaryEmail: secMail,
        updatedAt: Date.now()
    }, { merge: true });
}

// Reads the treasurer's own profile doc and fills the settings block with the
// linked secretary's name + picture.
export async function loadMySecretary() {
    if (!isTreasurerSession()) { resetForm(); return; }
    const mail = myEmail();
    const uid = myUid();
    if (!mail) { resetForm(); return; }
    try {
        let secMail = '';
        if (uid) {
            const pairSnap = await getDoc(doc(db, PAIRS_COLLECTION, uid));
            if (pairSnap.exists()) secMail = normalizeEmail((pairSnap.data() || {}).secretaryEmail || '');
        }
        if (!secMail) {
            const snap = await getDoc(doc(db, TREASURER_PROFILES, mail));
            const fromProfile = snap.exists() ? normalizeEmail((snap.data() || {}).secretaryEmail || '') : '';
            if (fromProfile) {
                // Older pairing saved before the pairing record existed.
                secMail = fromProfile;
                try { await writePairing(fromProfile); } catch (e) {}
            }
        }
        linkedSecretaryEmail = secMail;
        if (mySecEmailInput) mySecEmailInput.value = secMail;
        if (!secMail) {
            linkedSecretaryName = '';
            linkedSecretaryPhoto = '';
            if (mySecNameInput) mySecNameInput.value = '';
            setPreview('', '');
            return;
        }
        const secSnap = await getDoc(doc(db, SECRETARY_PROFILES, secMail));
        const data = secSnap.exists() ? (secSnap.data() || {}) : {};
        linkedSecretaryName = data.name || '';
        linkedSecretaryPhoto = data.photoUrl || '';
        if (mySecNameInput && !mySecNameInput.value) mySecNameInput.value = linkedSecretaryName;
        setPreview(linkedSecretaryPhoto, linkedSecretaryName);
    } catch (e) {
        // Offline or no permission — leave the block as it is.
    }
}

// Links (or re-links) the secretary that this treasurer may manage.
export async function linkMySecretary() {
    if (!isTreasurerSession()) { await showAlert('⛔ Treasurer access only.'); return; }
    const mail = myEmail();
    const secMail = normalizeEmail(mySecEmailInput ? mySecEmailInput.value : '');
    if (!secMail) { await showAlert('⛔ Enter your secretary\'s email first.'); return; }
    if (!isValidEmail(secMail)) { await showAlert('⛔ That email looks invalid.'); return; }
    if (secMail === mail) { await showAlert('⛔ That is your own email.'); return; }
    try {
        await writePairing(secMail);
        linkedSecretaryEmail = secMail;
        await loadMySecretary();
        await showAlert('🔗 Linked! You can now set your secretary\'s name and photo.');
    } catch (e) {
        await showAlert('⛔ Could not link: ' + (e && e.message ? e.message : 'error'));
    }
}

async function saveSecretaryProfile(patch, message) {
    if (!isTreasurerSession()) { await showAlert('⛔ Treasurer access only.'); return false; }
    let secMail = linkedSecretaryEmail;
    if (!secMail) {
        // The link may not be loaded yet (or was typed but not linked).
        secMail = normalizeEmail(mySecEmailInput ? mySecEmailInput.value : '');
        if (!secMail) { await showAlert('🔗 Link your secretary first.'); return false; }
        if (!isValidEmail(secMail)) { await showAlert('⛔ That email looks invalid.'); return false; }
        try {
            await writePairing(secMail);
            linkedSecretaryEmail = secMail;
        } catch (e) {
            await showAlert('⛔ Could not link: ' + (e && e.message ? e.message : 'error'));
            return false;
        }
    }
    const payload = { email: secMail, updatedAt: Date.now() };
    Object.keys(patch).forEach(k => { payload[k] = patch[k]; });
    try {
        await setDoc(doc(db, SECRETARY_PROFILES, secMail), payload, { merge: true });
        if (patch.name !== undefined) linkedSecretaryName = patch.name;
        if (patch.photoUrl !== undefined) linkedSecretaryPhoto = patch.photoUrl;
        setPreview(linkedSecretaryPhoto, linkedSecretaryName);
        await showAlert(message);
        return true;
    } catch (e) {
        const msg = e && e.message ? e.message : 'error';
        await showAlert('⛔ Could not save: ' + msg + (msg.indexOf('permission') > -1 ? '\n\nYour secretary must be linked to you, and the new Firestore rules must be published.' : ''));
        return false;
    }
}

export async function saveMySecretaryName() {
    const name = (mySecNameInput ? mySecNameInput.value : '').trim();
    if (!name) { await showAlert('⛔ Name cannot be empty.'); return; }
    await saveSecretaryProfile({ name: name }, '✅ Secretary name saved!');
}

export async function saveMySecretaryPhoto() {
    if (!mySecPhotoInput || !mySecPhotoInput.files[0]) return;
    const photoUrl = await readImageAsBase64(mySecPhotoInput.files[0], 600, 0.8);
    mySecPhotoInput.value = '';
    if (!photoUrl) { await showAlert('⛔ Could not read that image. Try another photo.'); return; }
    await saveSecretaryProfile({ photoUrl: photoUrl }, '✅ Secretary photo saved!');
}

export async function unlinkMySecretary() {
    if (!isTreasurerSession()) { await showAlert('⛔ Treasurer access only.'); return; }
    const mail = myEmail();
    if (!linkedSecretaryEmail) { await showAlert('Nothing to unlink.'); return; }
    if (!await showConfirm('Unlink your secretary? Their name and photo stay as they are.')) return;
    try {
        const uid = myUid();
        if (uid) {
            await setDoc(doc(db, PAIRS_COLLECTION, uid), {
                uid: uid,
                email: mail,
                secretaryEmail: '',
                updatedAt: Date.now()
            }, { merge: true });
        }
        await setDoc(doc(db, TREASURER_PROFILES, mail), {
            email: mail,
            secretaryEmail: '',
            updatedAt: Date.now()
        }, { merge: true });
        resetForm();
        await showAlert('🔓 Secretary unlinked.');
    } catch (e) {
        await showAlert('⛔ Could not unlink: ' + (e && e.message ? e.message : 'error'));
    }
}

export function initSecretaryPair() {
    // Refresh the block whenever the settings modal is opened.
    const settingsBtn = document.getElementById('changePwBtn');
    if (settingsBtn) settingsBtn.addEventListener('click', () => { loadMySecretary(); });
    if (mySecLinkBtn) mySecLinkBtn.addEventListener('click', linkMySecretary);
    if (saveMySecNameBtn) saveMySecNameBtn.addEventListener('click', saveMySecretaryName);
    if (mySecPhotoBtn) mySecPhotoBtn.addEventListener('click', function() {
        if (!isTreasurerSession()) return;
        mySecPhotoInput.click();
    });
    if (mySecPhotoInput) mySecPhotoInput.addEventListener('change', saveMySecretaryPhoto);
    if (mySecUnlinkBtn) mySecUnlinkBtn.addEventListener('click', unlinkMySecretary);
    if (mySecEmailInput) {
        mySecEmailInput.addEventListener('input', function() {
            if (normalizeEmail(mySecEmailInput.value) !== linkedSecretaryEmail) {
                if (mySecNameInput) mySecNameInput.value = '';
                setPreview('', '');
            }
        });
    }
}
