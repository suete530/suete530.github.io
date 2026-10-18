# Fines Management System

A mobile-first web application for managing student fines, sections, payments, and announcements. Built with vanilla JavaScript (ES Modules) and Firebase, hosted on GitHub Pages.

**Live site:** https://suete530.github.io

## Features

- Admin login via Firebase Authentication (email + password)
- Student passwords hashed with PBKDF2-SHA256 (100,000 iterations)
- Student management — add, edit, delete, search
- Section-based organization with section switching
- Fine tracking with full payment history
- GCash payment reference recording and QR generation
- Announcements board and student suggestions inbox
- Built-in chat assistant
- Statistics dashboard with leaderboard and charts
- Dark mode, sound effects, and i18n (English / Filipino)
- Responsive layout for phone, tablet, and laptop

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, Vanilla JavaScript (ES Modules) |
| Database | Firebase Firestore |
| Authentication | Firebase Auth (email/password for admins, anonymous for students) |
| Password hashing | Web Crypto PBKDF2-SHA256 (student accounts) |
| Hosting | GitHub Pages |

## Project Structure

```
suete530.github.io/
├── index.html        # Page structure only
├── firebase.json     # Firebase CLI config (Firestore rules)
├── firestore.rules   # Firestore security rules
├── css/
│   └── styles.css    # All styles (mobile-first + desktop media queries)
├── js/
│   ├── app.js        # Bootstrap: auth restore, auto-enter, window.* exports
│   ├── firebase.js   # Firebase app / auth / firestore init
│   ├── dom.js        # Cached DOM element references (leaf module)
│   ├── state.js      # Shared mutable app state (students, sections, ...)
│   ├── crypto.js     # SHA-256 + PBKDF2 password hashing helpers
│   ├── utils.js      # Small helpers (ids, escaping, formatting, files)
│   ├── i18n.js       # EN/TL/CEB translations and language switching
│   ├── auth.js       # Login, setup, admin settings, sessions, heartbeat
│   ├── db.js         # Firestore reads/writes (students, sections, payments)
│   ├── ui.js         # Rendering, modals, theme, sound, CSV export
│   ├── stats.js      # Dashboard stats, leaderboard, progress
│   └── chat.js       # Chat assistant, inbox, typing indicator
└── README.md
```

## Getting Started

### 1. Firebase setup

1. Create a project at [Firebase Console](https://console.firebase.google.com).
2. Enable **Email/Password** authentication (Authentication → Sign-in method) for admin accounts.
3. Enable **Anonymous** authentication (used for read-only student sessions).
4. Create a **Firestore database**.
5. Deploy the security rules from `firestore.rules`:
   ```
   firebase deploy --only firestore:rules
   ```
   (or paste the file contents into Firestore → Rules in the console).
6. Copy your project's `firebaseConfig` into `js/firebase.js`.
7. Open the site and use **"First time? Create admin account"** to register the
   first admin. Do this immediately after deploying the rules.

### 2. Local development

ES modules require HTTP — opening `index.html` directly (file://) will not work.

```
python -m http.server 8000
# or: npx serve .
```

Then open http://localhost:8000

### 3. Deploy

Push to the `main` branch — GitHub Pages deploys automatically.

## Security Architecture

See [SECURITY.md](SECURITY.md) for the full threat model. Summary:

- **Admin auth** — Firebase Authentication (email + password). Verified on
  Firebase servers; the password is never stored in Firestore or in the browser.
- **Student auth** — anonymous Firebase sessions; student passwords are hashed
  with **PBKDF2-SHA256, 100,000 iterations**, random 16-byte salt per password.
- **Firestore rules** — all reads require an authenticated session; every write
  requires either the registered admin account or an allowed field update.
- **No secrets in the client** — the Firebase web config is public by design;
  authorization is enforced entirely by the security rules.
- **Modular code** — the app is split into ES modules with a single shared
  state module, so privileged logic is isolated from presentation.

### Firestore access matrix

| Collection | Read | Create | Update | Delete |
|---|---|---|---|---|
| `settings/admin` | signed-in | email user (bootstrap) | bootstrap / `visitorCount` only / admin | admin |
| `sections` | signed-in | admin | admin | admin |
| `students` | signed-in | admin | self (name, gender, relationStatus, lastOnline, pw, photoUrl) or admin | admin |
| `students/*/payments` | signed-in | admin | admin | admin |
| `announcements` | signed-in | signed-in | admin | admin |
| `suggestions` | signed-in | signed-in | admin | admin |
| `chats` | signed-in | signed-in | signed-in | admin |
| `activity_logs` | signed-in | signed-in | admin | admin |

## License

Private project. All rights reserved.
