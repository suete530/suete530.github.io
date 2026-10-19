# Security Architecture

This document describes how the Fines Management System protects its data, what
it assumes about its environment, and where its limits are.

## Roles

- **Admin (secretary)** — authenticates with **email + password** through Firebase
  Authentication. Note that the application is a public static site, so the first
  person to use the "Create admin account" flow becomes the admin (see
  [Limitations](#limitations)).
- **Student** — does **not** type a password to view the site. A student gets an
  **anonymous** Firebase session and may optionally set a password to protect
  their own profile edit/heartbeat.
- **Visitor / unauthenticated** — no access to any Firestore collection.

## Password handling

### Admin passwords

- Managed entirely by **Firebase Authentication**. Firebase stores only a salted
  password hash server-side; the plaintext never touches Firestore.
- The client never stores the admin password. There is **no** `adminPwHash`
  document field and **no** `localStorage` copy (older versions did store these;
  `cleanupLegacyAdminSecrets()` deletes them on first load).
- Changing the password requires a fresh **reauthentication** with the current
  password (`reauthenticateWithCredential`) before `updatePassword` is called.
- `settings/admin` records only **which** account is the admin, via the public
  `adminEmail` field (plus `adminUid`). The password itself is never there.
- Changing the admin **email** requires a fresh reauthentication, then Firebase
  `verifyBeforeUpdateEmail()` sends a confirmation link to the new address. The
  change only takes effect after the owner opens that link. `adminEmail` is
  re-synced to the verified address on the next sign-in (matched by `adminUid`).

### Student passwords

- Hashed with **PBKDF2-SHA256, 100,000 iterations**, using a random 16-byte salt
  generated with `crypto.getRandomValues`. Stored as
  `{ salt, hash, iter, algo: 'PBKDF2-SHA256' }` in the student document.
- Verification uses `crypto.subtle.deriveBits` and a constant-time hex compare.
- **Backward compatible:** legacy plaintext and legacy single-pass SHA-256 values
  are still accepted on login and transparently upgraded to PBKDF2.

## Firestore security rules

All rules live in [`firestore.rules`](firestore.rules). Key properties:

1. **Everything requires `request.auth != null`.** Anonymous sessions count as
   authenticated, which is what lets students read; nothing is world-readable.
2. **Admin identity is derived from data, not from the client.** `isAdmin()`
   looks up `settings/admin.adminEmail` and compares it to the verified token
   email (`request.auth.token.email`). A client cannot claim to be admin.
3. **Write actions are admin-gated.** Create/delete of students, sections,
   payments, and destructive edits require `isAdmin()`.
4. **Students can only touch their own profile fields.** `selfEditableStudentFields()`
   allows updates whose affected keys are a subset of
   `{name, gender, relationStatus, lastOnline, pw, photoUrl}`. Fines, `status`,
   `section_id`, and payment records remain admin-only.
5. **First-run bootstrap is narrow.** `settings/admin` may be created by any
   email-auth user while it does not yet exist, and may be updated by a non-admin
   only while `adminRegistered != true`; otherwise updates require `isAdmin()`.
6. **Announcements / suggestions** are post-able by any signed-in user but only
   editable/deletable by the admin.
7. **`visitorCount`** is the single field a non-admin may bump, and only that
   field (`visitorCountOnly()`).

### Matrix

| Collection | Read | Create | Update | Delete |
|---|---|---|---|---|
| `settings/admin` | signed-in | email user (bootstrap) | bootstrap / `visitorCount` only / admin | admin |
| `sections` | signed-in | admin | admin | admin |
| `students` | signed-in | admin | self (limited fields) or admin | admin |
| `students/*/payments` | signed-in | admin | admin | admin |
| `announcements` | signed-in | signed-in | admin | admin |
| `suggestions` | signed-in | signed-in | admin | admin |
| `chats` | signed-in | signed-in | signed-in | admin |
| `activity_logs` | signed-in | signed-in | admin | admin |

## Code organization

The application is split into ES modules. The most security-relevant separation:

- `crypto.js` — all hashing. Pure functions, no DOM or network.
- `firebase.js` — the only place the Firebase SDK is initialized.
- `state.js` — the only module holding mutable shared state; other modules mutate
  it through explicit setters, so data flow stays reviewable.
- `auth.js` — login, admin setup, session handling, password change.
- `db.js` — all Firestore reads/writes.

## Limitations

These are known, accepted trade-offs, stated honestly:

1. **First-admin bootstrap race.** Until the first admin account is created and
   `settings/admin` exists, any user who can sign in with email/password may
   create it. Mitigation: register the admin account **immediately** after
   deploying the rules, and disable public sign-up if not needed. A production
   system should provision the admin via the Firebase Admin SDK / console instead.
2. **Students are trusted as anonymous users.** The app cannot cryptographically
   tie an anonymous session to a real student. A student password gates *profile
   self-editing*, not *reading*. Sensitive data (fines of other students) is
   readable by any signed-in session, matching the original product's
   open-to-classmates model.
3. **Client-side enforcement is not security.** UI hiding of admin controls is a
   convenience layer. The real enforcement is in `firestore.rules`; keep those
   rules deployed and reviewed.
4. **No audit trail for admin auth events.** Firestore activity logs capture app
   actions, not Firebase login events. Use the Firebase console's Authentication
   logs for those.
5. **Public Firebase web config.** `apiKey`, `projectId`, etc. in `firebase.js`
   are intentionally public (they identify the project, they do not authorize
   anything). Never add server secrets (service-account keys, API secrets) to
   this repository.
