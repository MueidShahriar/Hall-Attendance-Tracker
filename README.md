# 🏛️ Hall Attendance Tracker

A real-time, browser-based attendance management system for **Boral Hall, BAUET, Qadirabad Cantonment, Natore**. Track room-wise attendance across 6 floors with geo-location gating, email/Google authentication, an admin panel, user profiles, push notifications, announcements, a PWA with offline support, and a fully responsive mobile-first UI.

---

## 🚀 Features

### 1. Real-Time Attendance Updates
- Firebase Realtime Database for instant sync across all connected clients
- Live student counts per room with animated counter transitions
- Per-floor and total hall attendance auto-recalculates in real-time

### 2. Multi-Floor Support (6 Floors)
- Supports **1st to 6th Floor** with dynamic room generation per floor
- Specific rooms excluded per floor (e.g., 102–106 & 116 on 1st floor, 203 on 2nd floor, 502–505 on 5th floor, 602–605 on 6th floor)
- Floor overview dashboard with 2×3 grid cards showing live counts
- Active/Empty dot badges per floor
- **Clickable floor cards** — tap any floor card to jump directly to the dedicated floor detail page (`floor.html?floor=N`)
- Floor selector dropdown as an alternative navigation method

### 3. Room-Wise Attendance
- Each room supports **0 to 6 students**
- Visual progress bars showing room occupancy (0/6 to 6/6)
- Rooms with 0 students display **🚫** icon and dashed border styling
- "My Room" badge for the logged-in user's own room
- Users can **only edit their own room** — other rooms are read-only with dimmed inputs
- Room search with instant filter and clear button

### 4. Geo-Location Based Access Control
- **GPS-gated attendance** — users must be within **100 meters** of Boral Hall to mark attendance
- Uses **Haversine distance formula** for accurate Earth-surface distance calculation
- **Real-time location watching** — continuously monitors user position via `watchPosition()`
- **Location banner** — persistent status banner showing distance and status
- **Geo-toast notifications** — slide-in toast alerts for location status changes
- Inputs automatically **disabled when outside** the hall radius and **re-enabled** when entering
- Dedicated **Location Debug Tool** (`location.html`) for verifying GPS coordinates
- Hall coordinates: `24.289462, 89.008797` (Plus Code: 72Q5+QGM)

### 5. Authentication System
- **Email/Password** registration with full validation (name, email, room number, password)
- **Gmail-only registration** — only `@gmail.com` emails are accepted; temp/disposable emails rejected
- **Google Sign-In** via Firebase Auth popup (prompts for room number on first login)
- **Email Verification** — mandatory before login; verification waiting modal with auto-check every 3 seconds
- **Auto-resend verification email** — when an unverified user attempts to login, a new verification email is automatically sent
- **Spam folder warning** — red notice reminding users to check spam for the verification email
- **Forgot Password** — sends a password reset link via email
- **View-Only Mode** — browse attendance data without logging in (no editing); shows "👁️ View Only" badge
- **Gender defaults to Male** on registration
- Standalone login page (`auth.html`) and in-app auth modal (`index.html`)

### 6. Admin Panel (`admin.html`)
- **Role-based access** — only users with `role: 'admin'` can access; others see "Access Denied"
- **Clickable Stat Cards** — 4 cards (Total Users, Admins, Verified, Unverified) that filter the user list when clicked
  - Active card gets highlighted border/shadow
- **User Management**:
  - View all users with avatar initials, role badge (ADMIN/MEMBER), verified badge (✅/⏳)
  - Search users by name or email
  - Toggle user role (Make Admin / Make Member)
  - Delete user (removes data from `users/`, `activity_logs/`, `fcm_tokens/`)
  - **Send Verify Email** button for unverified users — queues a `pendingVerifyEmail` flag; verification email is auto-sent on the user's next login attempt
- **Announcements**:
  - Post announcements with message and type (Info / Warning / Success / Urgent)
  - View active announcements with delete option
  - Announcements visible only to **logged-in users** on the dashboard (guests cannot see them)

### 7. User Profile Page (`profile.html`)
- **Profile Information**: Full name, email, room number, department (editable), gender, join date
- **Editable Department**: Select from CE, CSE, EEE, ICE, ME, BBA, ELL, LLB
- **Change Password**: Sends a password reset email to the registered address
- **Danger Zone**: Permanently delete account with re-authentication required (removes user data, activity logs, FCM tokens)
- **Attendance History**: Shows the user's room update history from `room_updates/`

### 8. Hamburger Menu Navigation
- Available on **all pages** (index, floor, profile, admin)
- Shows user avatar, name, and email
- Navigation links: Home, Profile, My Floor, Admin Panel (admin only)
- **My Floor** link — dynamically calculates the user's floor from their room number and links to `floor.html?floor=N`
- Logout button (hidden for guests)
- Slide-in overlay with close button

### 9. Progressive Web App (PWA)
- **Service Worker** (`sw.js`) with intelligent caching strategies:
  - Static assets: Cache-first with background update
  - Firebase API: Network-first with data cache fallback
  - CDN resources: Stale-while-revalidate
  - HTML navigation: Network-first with cache fallback
- **Offline support** — works offline with cached data; offline/online banner notification
- **Installable** — `manifest.json` with app shortcuts (Dashboard, Profile, Admin Panel)
- **Background Sync** — queues offline attendance updates for sync when back online

### 10. Push Notifications (FCM)
- **Firebase Cloud Messaging** integration for real-time push notifications
- FCM token stored per user with platform info (mobile/desktop)
- **Service Worker push handler** — displays rich notifications with icon, badge, vibration, and action buttons (Open App / Dismiss)
- **In-app notification** — shows toast when receiving FCM message while app is open
- **Browser notifications** — native OS-level notifications for attendance reminders

### 11. Total Views & Online Now Counter
- **Stats counter bar** displayed before the footer on all pages
- **Total Views**: Incremented atomically on every page load using Firebase `increment(1)`
- **Online Now**: Real-time presence tracking using Firebase `onDisconnect().remove()` — automatically cleans up when a user leaves
- Pulsing green dot animation for the online indicator

### 12. Automatic Unverified User Cleanup (24h)
- Users who register but **don't verify their email within 24 hours** are automatically deleted from the database
- Runs on every app initialization

### 13. Attendance Input Time Window
- Updates allowed only between **6:30 PM – 10:00 PM**
- Countdown timer shows time remaining / time until window opens / "Window closed"
- Timer turns red when ≤15 minutes remain
- Three automatic reminders: window open (6:30 PM), 1 hour left (9:00 PM), 15 min left (9:45 PM)

### 14. Daily Auto-Reset
- At 6:00 PM, all room attendance counts reset to 0 for the new day
- Tracked via `reset_tracker/last_reset` in Firebase

### 15. Data Retention & Cleanup
- **20-day retention** — attendance records, activity logs, room updates, and login logs older than 20 days are automatically purged
- Runs on every app initialization

### 16. Activity Logging
- **User Logins**: records email, name, login time, date
- **Room Updates**: logs each update with room, floor, count, timestamp, user
- **User Stats**: tracks total update count, last update time per user
- **Activity Log Modal**: filterable by date, user, and room

### 17. Date-Based Historical View
- Browse attendance for any previous date via date picker
- Total hall count updates based on selected date
- "Today" button for quick reset to current date
- Historical dates are read-only

### 18. UI Features
| Feature | Details |
|---------|---------|
| **5 Color Themes** | Blue, Green, Purple, Rose, Indigo/Gold — saved to localStorage |
| **Sound Effects** | Click, success, celebration, warning — Web Audio API oscillator-based |
| **Confetti Animation** | Canvas-based 150-particle celebration on full room capacity |
| **Toast Notifications** | Icon-based toasts (info/warning/success/danger/error) with auto-dismiss |
| **Geo-Location Toasts** | Slide-in/out toast alerts for location status changes |
| **Browser Notifications** | Native OS-level notifications for reminders |
| **Page Preloader** | Animated logo with ring spinner and dot animation |
| **Offline Banner** | Shows persistent banner when connection is lost |
| **Password Toggle** | 👁️/🙈 visibility toggle for all password fields |
| **Firebase Retry** | Auto-retry wrapper (3 attempts) for Firebase operations |

### 19. Mobile-Optimized
- Fully responsive layout with breakpoints at 768px, 640px, 480px, 420px, 360px, and 320px
- Touch-friendly inputs and adaptive grid layouts

---

## 🧱 Project Structure

```
├── index.html          Main dashboard with auth modal, floor cards, room grid, announcements
├── floor.html          Dedicated floor detail page with room grid (accessed via ?floor=N)
├── profile.html        User profile page (info, password, delete, attendance history)
├── admin.html          Admin panel (user management, announcements, stats)
├── auth.html           Standalone login/register page
├── location.html       GPS location debug tool for verifying hall coordinates
├── app.js              Core application logic (~2445 lines) — auth, geo, Firebase, UI, FCM, stats
├── auth.js             Standalone auth page logic
├── admin.js            Admin panel logic — users, roles, announcements, verify email, stats
├── profile.js          Profile page logic — edit fields, delete account, history, stats
├── sw.js               Service worker — caching, push notifications, background sync
├── manifest.json       PWA manifest with app shortcuts
├── styles.css          Main stylesheet (imports all CSS modules)
├── css/
│   ├── base.css        CSS variables, reset, animations, theme definitions
│   ├── components.css  Buttons, cards, room cards, badges, inputs, modals
│   ├── layout.css      Navbar, grid, footer, search, color picker, stats counter bar
│   ├── pages.css       Admin panel, profile page, floor page specific styles
│   ├── utilities.css   Page loader, countdown, notifications, confetti
│   ├── auth.css        Auth modal & standalone auth page styles
│   └── responsive.css  All responsive breakpoints (768px → 320px)
├── images/
│   └── hall.png        Hall logo (used as app icon, favicon, PWA icon)
└── README.md           Documentation
```

---

## 🔧 Technologies Used

| Technology | Purpose |
|------------|---------|
| **Firebase v11.6.1** | Realtime Database, Authentication, Analytics, Cloud Messaging |
| **Firebase Realtime Database** | Real-time data sync, presence tracking, atomic increments |
| **Firebase Authentication** | Email/Password, Google Sign-In, Email Verification |
| **Firebase Cloud Messaging (FCM)** | Push notifications to users |
| **Geolocation API** | GPS-based hall proximity verification (`watchPosition`) |
| **Haversine Formula** | Earth-surface distance calculation for geo-fencing |
| **Tailwind CSS (CDN)** | Utility-based styling |
| **Vanilla JavaScript (ES Modules)** | Application logic across all pages |
| **Web Audio API** | Oscillator-based sound effects (no audio files) |
| **Canvas API** | Confetti particle animation |
| **Web Notifications API** | Native browser notifications |
| **Service Workers** | PWA offline support, push handling, background sync |
| **HTML5 / CSS3** | Core UI with CSS custom properties & animations |

---

## 📦 Database Structure

### Users
```
users/
  └── {uid}/
        ├── fullName
        ├── email
        ├── roomNumber
        ├── role                  ("admin" or "member")
        ├── gender                (default: "Male")
        ├── department
        ├── emailVerified         (boolean)
        ├── pendingVerifyEmail    (boolean, set by admin)
        └── createdAt
```

### Attendance Data
```
attendance/
  └── floor_{N}/
        └── {YYYY-MM-DD}/
              └── room_{R}/
                    ├── room
                    ├── floor
                    ├── present_count
                    ├── updated_by
                    └── timestamp
```

### Announcements
```
announcements/
  └── {id}/
        ├── message
        ├── type          ("info", "warning", "success", "danger")
        ├── postedBy
        ├── createdAt
        └── expiresAt
```

### FCM Tokens
```
fcm_tokens/
  └── {uid}/
        ├── token
        ├── email
        ├── name
        ├── updatedAt
        └── platform      ("mobile" or "desktop")
```

### Stats (Views & Online Presence)
```
stats/
  ├── totalViews          (atomic counter)
  └── online/
        └── {sessionId}/
              └── timestamp
```

### User Logins
```
user_logins/
  └── {timestamp}/
        ├── email
        ├── name
        ├── user_id
        ├── login_time
        └── date
```

### Room Updates Log
```
room_updates/
  └── {timestamp}/
        ├── email
        ├── name
        ├── user_id
        ├── room
        ├── floor
        ├── count
        ├── timestamp
        └── date
```

### User Statistics
```
user_stats/
  └── {email_key}/
        ├── email
        ├── name
        ├── update_count
        ├── last_update
        ├── last_room
        └── last_floor
```

### Activity Logs
```
activity_logs/
  └── {user_id}/
        └── {timestamp}/
              ├── user
              ├── name
              ├── action
              └── timestamp
```

### Reset Tracker
```
reset_tracker/
  └── last_reset
```

---

## 🔐 Authentication Flow

1. User opens the app → Auth modal appears (or redirects to `auth.html`)
2. **Register**: Enter name, Gmail address, room number, password → Email verification sent
3. **Verification Modal**: Auto-checks every 3 seconds; red warning to check spam folder
4. **Unverified after 24h** → User record automatically deleted from database
5. **Login**: Email/Password or Google Sign-In → Must be email-verified
6. **Unverified login attempt** → Automatically resends verification email with a warning message
7. **Admin "Send Verify Email"** → Queues a `pendingVerifyEmail` flag; verification email is auto-sent on next login attempt
8. **View-Only**: Browse all data without logging in — no editing allowed

---

## 🏢 Floor & Room Configuration

| Floor | Room Range | Excluded Rooms | Active Rooms |
|-------|-----------|----------------|--------------|
| 1st | 102–117 | 102, 103, 104, 105, 106, 116 | 10 |
| 2nd | 202–217 | 203 | 15 |
| 3rd | 302–317 | — | 16 |
| 4th | 402–417 | — | 16 |
| 5th | 502–517 | 502, 503, 504, 505 | 12 |
| 6th | 602–617 | 602, 603, 604, 605 | 12 |

**Max capacity per room**: 6 students

---

## ⏰ Time Restrictions

| Parameter | Value |
|-----------|-------|
| Input Window Opens | **6:30 PM** |
| Input Window Closes | **10:00 PM** |
| Second Reminder | **9:00 PM** (1 hour left) |
| Final Reminder | **9:45 PM** (15 min left) |
| Daily Auto-Reset | **6:00 PM** |
| Data Retention | **20 days** |
| Unverified User Cleanup | **24 hours** |

---

## 👨‍💻 Developer

Developed and maintained by **Md. Mueid Shahriar**

- [LinkedIn](https://www.linkedin.com/in/mueid16/)
- [GitHub](https://github.com/MueidShahriar)
- [WhatsApp](https://wa.me/8801712460423)

---

&copy; 2026 Hall Attendance Tracker. All rights reserved.

## 📄 License

This project is provided for educational and operational use.