// Per-account login profiles.
// Every staff account keeps its own profile doc keyed by its email:
//   treasurer_profiles/{email}  -> 💰 Treasurer login page
//   secretary_profiles/{email}  -> 📝 Secretary login page
// When a device types an email, that account's own photo + name replaces the
// shared (owner controlled) profile for that role, so every device shows the
// account that belongs to it.

import { db } from './firebase.js';
import { clearLoginProfileOverride, ROLE_SECRETARY, ROLE_TREASURER, setLoginProfileOverride } from './roleTheme.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

export const TREASURER_PROFILES = 'treasurer_profiles';
export const SECRETARY_PROFILES = 'secretary_profiles';

const PROFILE_COLLECTION = {
    [ROLE_TREASURER]: TREASURER_PROFILES,
    [ROLE_SECRETARY]: SECRETARY_PROFILES
};

export function profileCollectionForRole(role) {
    return PROFILE_COLLECTION[role] || '';
}

export function normalizeEmail(email) {
    return (email || '').trim().toLowerCase();
}

export function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email));
}

// Shows the account that owns this email on the login page of that role.
export async function applyLoginProfileForEmail(email, role) {
    const coll = PROFILE_COLLECTION[role];
    if (!coll) return;
    const mail = normalizeEmail(email);
    if (!isValidEmail(mail)) {
        clearLoginProfileOverride(role);
        return;
    }
    try {
        const snap = await getDoc(doc(db, coll, mail));
        if (snap.exists()) {
            const data = snap.data() || {};
            setLoginProfileOverride(role, data.photoUrl || '', data.name || '');
        } else {
            clearLoginProfileOverride(role);
        }
    } catch (e) {
        clearLoginProfileOverride(role);
    }
}

// Remember which account was used on THIS device so the login page can show
// that account's own profile right away.
export function rememberLoginEmail(email, role) {
    try {
        const mail = normalizeEmail(email);
        if (mail) localStorage.setItem('fm_login_email', mail);
        if (role) localStorage.setItem('fm_login_role', role);
    } catch (e) {}
}

export function lastLoginEmail() {
    try {
        return localStorage.getItem('fm_login_email') || '';
    } catch (e) {
        return '';
    }
}

export function lastLoginRole() {
    try {
        return localStorage.getItem('fm_login_role') || '';
    } catch (e) {
        return '';
    }
}
