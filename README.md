# 🏢 Hall Attendance Tracker

> A modern, real-time Progressive Web Application (PWA) designed to track, monitor, and manage student attendance across various rooms and floors within a university residential hall.

![Version](https://img.shields.io/badge/version-2.0.0-blue)
![Platform](https://img.shields.io/badge/platform-Web%20%7C%20PWA%20%7C%20iOS%20%7C%20Android-green)
![Firebase](https://img.shields.io/badge/firebase-Auth%20%7C%20RTDB-orange)

## ✨ Features

- **📱 Full PWA Support:** Installable on iOS, Android, and Desktop natively with an immersive fullscreen experience and offline capabilities via Service Workers.
- **⚡ Real-Time Synchronization:** Live attendance tracking and viewing stats empowered by Firebase Realtime Database.
- **📍 Geolocation Verification:** Restricts attendance inputs dynamically based on user physical location bounds.
- **🔐 Secure Authentication:** Complete authentication flow via Firebase Auth (Login, Register, Password Reset, Email Verification).
- **🛡️ Admin & Role Management:** Dedicated administrative dashboards to monitor live occupancy, inspect activity logs, announce notices, and handle floor management.
- **🎨 Premium UI/UX:** Built with a custom modular CSS architecture and Tailwind CSS CDN for fluid, aesthetic animations and responsive designs perfectly optimized for mobile (e.g., standard viewport `100svh` iOS fixes).
- **🚫 Safe-Interaction Mechanics:** Deep-level scroll locks during preloaders and custom zoom-prevention states to deliver true app-like native feel. 

## 📁 Project Structure

```text
📦 Hall-Attendance-Tracker
├── index.html            # Main Entry application
├── pwa/                  # PWA configurations
│   └── manifest.json     # App manifest
├── sw.js                 # Service Worker for Offline caching
├── pages/                # App Views
│   ├── auth.html         # Login / Registration
│   ├── admin.html        # Main Admin Dashboard
│   ├── profile.html      # User Profile Management
│   ├── floor.html        # Individual Floor Data View
│   ├── location.html     # GPS Location debug tool
│   └── ...               # Additional views (announcements, users)
├── js/                   # Core Logic
│   ├── app.js            # Main interaction & Firebase initialization
│   ├── auth.js           # Authentication flows
│   ├── admin.js          # Admin dashboard & controls
│   ├── profile.js        # Current user profile sync
│   └── globalState.js    # Global viewport & UI locking
├── css/                  # Styling Architecture
│   ├── base.css          # CSS Resets, Typography & App Layouts
│   ├── components.css    # Cards, Modals, Inputs, Loaders
│   ├── layout.css        # Spatial grids, Menus, Footers
│   ├── utilities.css     # Helpers, App bounding shells
│   ├── pages.css         # Page-specific rules
│   └── responsive.css    # Media Queries & Mobile Overrides
└── assets/               # Local Graphics
    └── images/           # App Logo & static icons
```

## 🚀 Quick Start

1. **Clone the repository:**
   ```bash
   git clone https://github.com/MueidShahriar/Hall-Attendance-Tracker.git
   ```
2. **Serve locally:**
   You can use standard live-server to serve the app directly. No build-step is required as everything is purely native ESM + CDN powered.
   ```bash
   npx serve .
   ```

## 🛠️ Built With

- Vanilla HTML5 / CSS3 / JavaScript (ES6 Modules)
- Firebase (Authentication, Realtime Database)
- Tailwind CSS (Via CDN)
- Native Service Workers (PWA)

## 👨‍💻 Developer

Developed with ❤️ by **Md. Mueid Shahriar**.

---
*For any bugs or feature requests, please open an issue in the repository.*
# Hall-Attendance-Tracker
