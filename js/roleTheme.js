// Per-role visuals for the login screen.
// Each role (treasurer / secretary / developer) keeps its own avatar,
// display name, role label and login background wallpaper.

import { adminNameDisplay, customAlertOverlay, loginAvatarCircle, loginAvatarImg, loginAvatarInitial, loginOverlay } from './dom.js';
import { currentLang, i18n } from './i18n.js';

export const ROLE_TREASURER = 'treasurer';
export const ROLE_SECRETARY = 'secretary';
export const ROLE_DEVELOPER = 'developer';

const ROLE_META = {
    [ROLE_TREASURER]: { label: '💰 BSIS-1 Treasurer', emoji: '💰', defaultName: 'Treasurer', descKey: 'loginDesc' },
    [ROLE_SECRETARY]: { label: '📝 Secretary', emoji: '📝', defaultName: 'Secretary', descKey: 'loginDescSec' },
    [ROLE_DEVELOPER]: { label: '👑 Developer', emoji: '👑', defaultName: 'Developer', descKey: 'loginDescDev' }
};

const visuals = {
    [ROLE_TREASURER]: { name: '', photo: '', bg: '' },
    [ROLE_SECRETARY]: { name: '', photo: '', bg: '' },
    [ROLE_DEVELOPER]: { name: '', photo: '', bg: '' }
};

let activeRole = ROLE_TREASURER;

const loginRoleLabel = document.getElementById('secretaryRole');
const loginDescEl = document.getElementById('loginDesc');

export function initialsOf(name) {
    const parts = (name || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function setRoleName(role, name) {
    const v = visuals[role];
    if (!v) return;
    v.name = name || '';
    applyRoleVisuals();
}

export function setRolePhoto(role, photo) {
    const v = visuals[role];
    if (!v) return;
    v.photo = photo || '';
    applyRoleVisuals();
}

export function setRoleBackground(role, bg) {
    const v = visuals[role];
    if (!v) return;
    v.bg = bg || '';
    applyRoleVisuals();
}

export function getRoleName(role) { return (visuals[role] || {}).name || ''; }
export function getRolePhoto(role) { return (visuals[role] || {}).photo || ''; }
export function getRoleBackground(role) { return (visuals[role] || {}).bg || ''; }
export function getActiveRole() { return activeRole; }

export function setActiveRole(role) {
    if (!visuals[role]) return;
    activeRole = role;
    applyRoleVisuals();
}

function renderLoginProfile() {
    const v = visuals[activeRole];
    const meta = ROLE_META[activeRole];
    const photo = v.photo;
    const name = v.name || meta.defaultName;

    if (adminNameDisplay) adminNameDisplay.textContent = name;
    if (loginRoleLabel) loginRoleLabel.textContent = meta.label;
    if (loginDescEl) {
        const t = (i18n[currentLang] || {})[meta.descKey];
        if (t) loginDescEl.textContent = t;
    }
    if (!loginAvatarImg || !loginAvatarInitial) return;

    if (photo) {
        loginAvatarImg.src = photo;
        loginAvatarImg.style.display = 'block';
        loginAvatarInitial.style.display = 'none';
        loginAvatarCircle.classList.add('has-photo');
    } else {
        loginAvatarImg.removeAttribute('src');
        loginAvatarImg.style.display = 'none';
        loginAvatarInitial.style.display = 'block';
        loginAvatarInitial.textContent = v.name ? initialsOf(v.name) : meta.emoji;
        loginAvatarCircle.classList.remove('has-photo');
    }
}

export function applyRoleBackground() {
    const bg = (visuals[activeRole] || {}).bg || '';
    const tint = bg
        ? "linear-gradient(rgba(5,8,16,0.55), rgba(5,8,16,0.55)), url('" + bg + "')"
        : '';
    const overlays = [loginOverlay, customAlertOverlay, document.getElementById('welcomeOverlay')];
    overlays.forEach(function(el) {
        if (!el) return;
        el.style.backgroundImage = tint;
        el.style.backgroundSize = tint ? 'cover' : '';
        el.style.backgroundPosition = tint ? 'center' : '';
        el.style.backgroundRepeat = tint ? 'no-repeat' : '';
    });
    if (!localStorage.getItem('fm_wallpaper')) {
        if (bg) {
            document.body.style.backgroundImage = "url('" + bg + "')";
            document.body.classList.add('wp');
        } else {
            document.body.style.backgroundImage = '';
            document.body.classList.remove('wp');
        }
    }
}

export function applyRoleVisuals() {
    renderLoginProfile();
    applyRoleBackground();
}

document.addEventListener('app:langchange', function () {
    renderLoginProfile();
});
