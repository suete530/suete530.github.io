# Fines Management System

A mobile-first web application for managing student fines, sections, payments, and announcements. Built with vanilla JavaScript (ES Modules) and Firebase, hosted on GitHub Pages.

**Live site:** https://suete530.github.io

## Features

- Admin login with SHA-256 hashed passwords
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
| Authentication | Firebase Anonymous Auth |
| Hosting | GitHub Pages |

## Project Structure

```
suete530.github.io/
├── index.html      # Page structure only
├── css/
│   └── styles.css  # All styles (mobile-first + desktop media queries)
├── js/
│   └── app.js      # All application logic (Firebase, auth, UI)
└── README.md
```

## Getting Started

### 1. Firebase setup

1. Create a project at [Firebase Console](https://console.firebase.google.com).
2. Enable **Anonymous** authentication (Authentication → Sign-in method).
3. Create a **Firestore database** (test mode is fine to start).
4. Copy your project's `firebaseConfig` into the `FIREBASE CONFIG` section at the top of `js/app.js`.

### 2. Local development

ES modules require HTTP — opening `index.html` directly (file://) will not work.

```
python -m http.server 8000
# or: npx serve .
```

Then open http://localhost:8000

### 3. Deploy

Push to the `main` branch — GitHub Pages deploys automatically.

## License

Private project. All rights reserved.
