# Hall Attendance Tracker

A real-time, browser-based attendance management system for multi-floor student hall accommodation. Track room-wise attendance efficiently with Google authentication, activity logging and responsive UI.

---

## 🚀 Features

### **1. Real-Time Attendance Updates**
- Firebase Realtime Database for instant sync across all clients
- Live student counts for each room
- Total attendance auto-recalculates across all floors

### **2. Multi-Floor Support**
- Supports floors 2-5 with room-wise tracking
- Floor selector dropdown
- Per-floor and total hall attendance display

### **3. Room-Wise Attendance Controls**
- Each room supports **0 to 6 students**
- Visual badges: "No One", "Open", "Near-full", "Full"
- Progress bars showing room occupancy
- Rooms with 0 students shown with dashed border styling

### **4. Google Authentication**
- Login with Google account required to input attendance
- User name displayed in green button after login
- Login persists across sessions (no logout required)
- "Thank you [Name]" notification on room update

### **5. Attendance Input Time Window**
- Updates allowed only between **10:30 PM – 5:00 AM**
- Countdown timer shows time until window opens/closes
- Inputs disabled outside allowed time

### **6. Activity Logging to Firebase**
- **User Logins**: Records email, name, login time
- **Room Updates**: Logs each update with room, floor, count, timestamp
- **User Stats**: Tracks total update count per user

### **7. Date-Based Viewing**
- View attendance for any previous date
- Total hall count updates based on selected date
- Today button for quick reset to current date

### **8. Notifications System**
- Capacity alerts (full room celebration)
- Login reminders
- Success/error notifications with sounds

### **9. Mobile-Optimized Interface**
- Responsive layout for all screen sizes
- Touch-friendly inputs and controls

---

## 🧱 Project Structure

```
├── index.html      # Main application UI
├── app.js          # Application logic and Firebase integration
├── styles.css      # Custom UI styles
├── images/         # Logo and assets
└── README.md       # Documentation
```

---

## 🔧 Technologies Used

- **Firebase Realtime Database** – Real-time data sync
- **Firebase Authentication** – Google Sign-In
- **TailwindCSS CDN** – Utility-based styling
- **Vanilla JavaScript (ES Modules)** – Application logic
- **HTML5 / CSS3** – Core UI

---

## 🛠️ Setup Instructions

### **1. Clone the Repository**
```bash
git clone https://github.com/your-repo/Hall-Attendance-Tracker.git
cd Hall-Attendance-Tracker
```

### **2. Configure Firebase**
Update Firebase config in `app.js`:
```js
const firebaseConfig = {
    apiKey: "your-api-key",
    authDomain: "your-project.firebaseapp.com",
    databaseURL: "https://your-project.firebaseio.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "your-sender-id",
    appId: "your-app-id"
};
```

### **3. Run the System**
Open `index.html` in any modern browser. No local server required.

---

## 📦 Database Structure

### **Attendance Data**
```
attendance/
  └── floor_3/
        └── 2026-02-01/
              └── room_301/ { room, floor, present_count, updated_by, timestamp }
              └── room_302/ ...
```

### **User Logins**
```
user_logins/
   └── <timestamp>/ { email, name, user_id, login_time, date }
```

### **Room Updates Log**
```
room_updates/
   └── <timestamp>/ { email, name, user_id, room, floor, count, timestamp, date }
```

### **User Statistics**
```
user_stats/
   └── <email_key>/ { email, name, update_count, last_update, last_room, last_floor }
```

### **Activity Logs**
```
activity_logs/
   └── <user_id>/
         └── <timestamp>/ { user, name, action, timestamp }
```

---

## 🔐 Authentication

- Google Sign-In required for attendance input
- Login persists using Firebase Auth state
- User email stored with each update for audit trail

---

## ⏰ Time Restrictions

- **Allowed Input Window**: 10:30 PM to 5:00 AM
- Countdown timer displays remaining time
- Inputs automatically disabled outside window

---

## 📱 Room Status Indicators

| Badge | Meaning |
|-------|---------|
| No One (Grey) | 0 students |
| Open (Green) | 1-4 students |
| Near-full (Orange) | 5 students |
| Full (Red) | 6 students |

---

## 👨‍💻 Developer

**Md. Mueid Shahriar**  
[LinkedIn](https://www.linkedin.com/in/mdmueid/)

---

## 📄 License

This project is provided for educational and operational use.
