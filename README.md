# 🏛️ Hall Attendance Tracker

A real-time, browser-based attendance management system for **Boral Hall, BAUET, Qadirabad Cantonment, Natore**. Track room-wise attendance across 6 floors with geo-location gating, email/Google authentication, email verification, activity logging, auto-cleanup of unverified accounts, and a fully responsive UI.

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
- **Clickable floor cards** — tap any floor card to jump directly to room view
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
- **Location banner** — persistent status banner showing:
  - 📡 Checking location...
  - 📍 Inside hall area (with distance)
  - 🚫 Outside hall area (with distance)
  - ⚠️ Location error/denied
- **Geo-toast notifications** — slide-in toast alerts for location status changes
- Inputs automatically **disabled when outside** the hall radius
- Inputs automatically **re-enabled** when user enters the hall area
- Dedicated **Location Debug Tool** (`location.html`) for verifying GPS coordinates & troubleshooting
- Hall coordinates: `24.289462, 89.008797` (Plus Code: 72Q5+QGM)

### 5. Authentication System
- **Email/Password** registration with full validation (name, email, room number, password)
- **Gmail-only registration** — only `@gmail.com` emails are accepted; temp/disposable emails rejected
- **Google Sign-In** via Firebase Auth popup (prompts for room number on first login)
- **Email Verification** — mandatory before login; verification waiting modal with auto-check every 3 seconds
- **Spam folder warning** — red notice reminding users to check spam for the verification email
- **Forgot Password** — sends a password reset link via email
- **View-Only Mode** — browse attendance data without logging in (no editing); shows "👁️ View Only" badge
- **User Profile Display** — logged-in user's name and room number shown in the header
- Standalone login page (`auth.html`) and in-app auth modal (`index.html`)

### 6. Automatic Unverified User Cleanup (24h)
- Users who register but **don't verify their email within 24 hours** are automatically deleted from the database
- Runs on every app initialization
- Prevents accumulation of temporary/spam email accounts

### 7. Attendance Input Time Window
- Updates allowed only between **6:30 PM – 10:00 PM**
- Draggable countdown timer (mouse + touch) shows:
  - Time remaining to submit (during window)
  - Time until window opens (before window)
  - "Window closed" (after window)
- Timer turns red when ≤15 minutes remain
- Timer position saved to localStorage
- Three automatic reminders: window open (6:30 PM), 1 hour left (9:00 PM), 15 min left (9:45 PM)

### 8. Daily Auto-Reset
- At 6:00 PM, all room attendance counts reset to 0 for the new day
- Tracked via `reset_tracker/last_reset` in Firebase

### 9. Data Retention & Cleanup
- **20-day retention** — attendance records, activity logs, room updates, and login logs older than 20 days are automatically purged
- Runs on every app initialization

### 10. Activity Logging
- **User Logins**: records email, name, login time, date
- **Room Updates**: logs each update with room, floor, count, timestamp, user
- **User Stats**: tracks total update count, last update time per user

### 11. Date-Based Historical View
- Browse attendance for any previous date via date picker
- Total hall count updates based on selected date
- "Today" button for quick reset to current date
- Historical dates are read-only

### 12. UI Features
| Feature | Details |
|---------|---------|
| **5 Color Themes** | Blue, Green, Purple, Rose, Indigo/Gold — saved to localStorage |
| **Sound Effects** | Click, success, celebration, warning — Web Audio API oscillator-based |
| **Confetti Animation** | Canvas-based 150-particle celebration on full capacity |
| **Room Search** | Filter rooms by number with clear button |
| **Notifications** | Toast-style (info/warning/success/danger) with auto-dismiss |
| **Geo-Location Toasts** | Slide-in/out toast alerts for location status changes |
| **Browser Notifications** | Native OS-level notifications for reminders |
| **Page Loader** | Animated logo fill with clip-path reveal |
| **Activity Log Modal** | Filterable by date, user, and room |
| **Password Toggle** | 👁️/🙈 visibility toggle for all password fields |
| **User Profile Header** | Displays logged-in user's name and room number |

### 13. Mobile-Optimized
- Fully responsive layout with breakpoints at 768px, 640px, 480px, 420px, 360px, and 320px
- Touch-friendly inputs, draggable countdown, and adaptive grid layouts

---

## 🧱 Project Structure

```
├── index.html          Main application UI with in-app auth modal
├── auth.html           Standalone login/register page
├── location.html       GPS location debug tool for verifying hall coordinates
├── app.js              Core application logic, geo-location & Firebase integration
├── auth.js             Standalone auth page logic
├── styles.css          Main stylesheet (imports all CSS modules)
├── css/
│   ├── base.css        CSS variables, reset, animations
│   ├── components.css  Buttons, cards, room cards, badges, inputs
│   ├── layout.css      Header, grid, search, color picker, modals
│   ├── utilities.css   Page loader, countdown, notifications, confetti
│   ├── auth.css        Auth modal & standalone auth page styles
│   └── responsive.css  All responsive breakpoints
├── images/
│   └── hall.png        Hall logo
└── README.md           Documentation
```

## 🔧 Technologies Used

| Technology | Purpose |
|------------|---------|
| **Firebase Realtime Database** | Real-time data sync & storage |
| **Firebase Authentication** | Email/Password, Google Sign-In, Email Verification |
| **Firebase Analytics** | Usage tracking |
| **Geolocation API** | GPS-based hall proximity verification (`getCurrentPosition`, `watchPosition`) |
| **Haversine Formula** | Earth-surface distance calculation for geo-fencing |
| **Tailwind CSS (CDN)** | Utility-based styling |
| **Vanilla JavaScript (ES Modules)** | Application logic |
| **Web Audio API** | Oscillator-based sound effects (no audio files) |
| **Canvas API** | Confetti particle animation |
| **Web Notifications API** | Native browser notifications |
| **HTML5 / CSS3** | Core UI with CSS custom properties |

---

## 📦 Database Structure

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

### User Profiles
```
users/
  └── {uid}/
        ├── fullName
        ├── email
        ├── roomNumber
        ├── emailVerified
        ├── address
        ├── parentsName
        ├── department
        ├── batch
        └── createdAt
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

## 🔐 Authentication Flow

1. User opens the app → Auth modal appears (or redirects to `auth.html`)
2. **Register**: Enter name, email, room number, password → Email verification sent
3. **Verification Modal**: Auto-checks every 3 seconds; red warning to check spam folder
4. **Unverified after 24h** → User record automatically deleted from database
5. **Login**: Email/Password or Google Sign-In → Must be email-verified
6. **View-Only**: Browse all data without logging in — no editing allowed

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