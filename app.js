import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getDatabase, ref, set, onValue, update, get, remove } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-database.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-analytics.js";
import { 
    getAuth, 
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signInWithPopup,
    signOut,
    GoogleAuthProvider,
    sendPasswordResetEmail,
    sendEmailVerification,
    updateProfile
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
const appId = typeof __app_id !== 'undefined' ? __app_id : 'floor-attendance-system';
const firebaseConfig = {
    apiKey: "AIzaSyBYTnrnXjBCvlfEu2nDc0IVIZ_rtzlix9s",
    authDomain: "floor-attendance-system.firebaseapp.com",
    databaseURL: "https://floor-attendance-system-default-rtdb.firebaseio.com",
    projectId: "floor-attendance-system",
    storageBucket: "floor-attendance-system.firebasestorage.app",
    messagingSenderId: "721240132639",
    appId: "1:721240132639:web:629b90ae09d3fcbcc1d92a",
    measurementId: "G-RZ8YDY6F4S"
};
let db;
let userId = 'system';
let userEmail = 'system@attendance.local';
let userName = 'User';
let currentViewDate = getTodayDateKey();
let currentFloor = null;
let isViewingToday = true;
let lastNotifiedTotal = 0;
let hasShownInputWindowReminder = false;
let sentNotifications = {
    reminder1: false,
    reminder2: false,
    reminder3: false
};
let activityLog = [];
let displayedCounts = {};
let currentUnsubscribe = null;
let isLoggedIn = true;
let isViewOnlyMode = false;
const ALLOW_TIME_LIMIT = true;
const ALLOWED_START_MINUTES = (18 * 60) + 30;
const ALLOWED_END_MINUTES = (22 * 60);

// ===== GEO-LOCATION CONFIGURATION =====
// Boral Hall, BAUET, Qadirabad Cantonment, Natore (Plus Code: 72Q5+QGM)
const HALL_LATITUDE = 24.289462;
const HALL_LONGITUDE = 89.008797;
const ALLOWED_RADIUS_METERS = 100;
let isWithinHallRadius = false;
let userLatitude = null;
let userLongitude = null;
let geoLocationChecked = false;
let geoWatchId = null;
const SECOND_REMINDER_MINUTES = ALLOWED_END_MINUTES - 60;
const FINAL_REMINDER_MINUTES = ALLOWED_END_MINUTES - 15;
function getRoomsForFloor(floorNumber) {
    const baseRoom = floorNumber * 100 + 2;
    const rooms = Array.from({ length: 16 }, (_, i) => baseRoom + i);
    const excludedRooms = [
        102, 103, 104, 105, 106, 116,
        203,
        502, 503, 504, 505,
        602, 603, 604, 605
    ];
    return rooms.filter(room => !excludedRooms.includes(room));
}
let ROOMS = [];
const ROOMS_PER_FLOOR = 16;
const MAX_CAPACITY = ROOMS_PER_FLOOR * 6;
let soundEnabled = localStorage.getItem('fas_sound') !== 'false';
let audioContext;
try {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
} catch (e) {
}
function playSound(type) {
    if (!soundEnabled || !audioContext) return;
    try {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        switch (type) {
            case 'click':
                oscillator.frequency.value = 800;
                gainNode.gain.value = 0.1;
                oscillator.type = 'sine';
                oscillator.start();
                oscillator.stop(audioContext.currentTime + 0.05);
                break;
            case 'success':
                oscillator.frequency.value = 523.25;
                gainNode.gain.value = 0.15;
                oscillator.type = 'sine';
                oscillator.start();
                setTimeout(() => { oscillator.frequency.value = 659.25; }, 100);
                setTimeout(() => { oscillator.frequency.value = 783.99; }, 200);
                oscillator.stop(audioContext.currentTime + 0.3);
                break;
            case 'celebration':
                oscillator.frequency.value = 523.25;
                gainNode.gain.value = 0.2;
                oscillator.type = 'triangle';
                oscillator.start();
                setTimeout(() => { oscillator.frequency.value = 659.25; }, 100);
                setTimeout(() => { oscillator.frequency.value = 783.99; }, 200);
                setTimeout(() => { oscillator.frequency.value = 1046.50; }, 300);
                oscillator.stop(audioContext.currentTime + 0.5);
                break;
            case 'warning':
                oscillator.frequency.value = 300;
                gainNode.gain.value = 0.15;
                oscillator.type = 'square';
                oscillator.start();
                oscillator.stop(audioContext.currentTime + 0.15);
                break;
        }
    } catch (e) {
    }
}
const confettiCanvas = document.getElementById('confetti-canvas');
const confettiCtx = confettiCanvas ? confettiCanvas.getContext('2d') : null;
let confettiParticles = [];
let confettiAnimating = false;
let hasShownFullConfetti = false;
function resizeConfettiCanvas() {
    if (confettiCanvas) {
        confettiCanvas.width = window.innerWidth;
        confettiCanvas.height = window.innerHeight;
    }
}
if (confettiCanvas) {
    resizeConfettiCanvas();
    window.addEventListener('resize', resizeConfettiCanvas);
}
function createConfettiParticle() {
    const colors = ['#6366f1', '#7c3aed', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899', '#14b8a6'];
    return {
        x: Math.random() * confettiCanvas.width,
        y: -20,
        size: Math.random() * 10 + 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        speed: Math.random() * 3 + 2,
        angle: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.2,
        drift: (Math.random() - 0.5) * 2
    };
}
function animateConfetti() {
    if (!confettiAnimating || !confettiCtx) return;
    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    confettiParticles.forEach((p, i) => {
        p.y += p.speed;
        p.x += p.drift;
        p.angle += p.spin;
        confettiCtx.save();
        confettiCtx.translate(p.x, p.y);
        confettiCtx.rotate(p.angle);
        confettiCtx.fillStyle = p.color;
        confettiCtx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        confettiCtx.restore();
        if (p.y > confettiCanvas.height + 20) {
            confettiParticles.splice(i, 1);
        }
    });
    if (confettiParticles.length > 0) {
        requestAnimationFrame(animateConfetti);
    } else {
        confettiAnimating = false;
    }
}
function launchConfetti() {
    if (!confettiCanvas) return;
    confettiParticles = [];
    for (let i = 0; i < 150; i++) {
        setTimeout(() => {
            confettiParticles.push(createConfettiParticle());
        }, i * 20);
    }
    confettiAnimating = true;
    animateConfetti();
    playSound('celebration');
}
let notificationPermission = 'default';
async function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        notificationPermission = await Notification.requestPermission();
    } else if ('Notification' in window) {
        notificationPermission = Notification.permission;
    }
}
function sendBrowserNotification(title, body, icon = '📋') {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, {
            body: body,
            icon: '📋',
            tag: 'fas-notification',
            renotify: true
        });
    }
}
const countdownContainer = document.getElementById('countdown-container');
const countdownTimer = document.getElementById('countdown-timer');
const countdownStatus = document.getElementById('countdown-status');
function initDraggableCountdown() {
    if (!countdownContainer) return;
    let isDragging = false;
    let startX, startY, initialX, initialY;
    const savedPos = localStorage.getItem('countdown_position');
    if (savedPos) {
        try {
            const pos = JSON.parse(savedPos);
            countdownContainer.style.top = pos.top;
            countdownContainer.style.right = 'auto';
            countdownContainer.style.left = pos.left;
        } catch (e) {}
    }
    function onStart(e) {
        isDragging = true;
        countdownContainer.classList.add('dragging');
        if (e.type === 'touchstart') {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
        } else {
            startX = e.clientX;
            startY = e.clientY;
        }
        const rect = countdownContainer.getBoundingClientRect();
        initialX = rect.left;
        initialY = rect.top;
        e.preventDefault();
    }
    function onMove(e) {
        if (!isDragging) return;
        let clientX, clientY;
        if (e.type === 'touchmove') {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }
        const deltaX = clientX - startX;
        const deltaY = clientY - startY;
        let newLeft = initialX + deltaX;
        let newTop = initialY + deltaY;
        const rect = countdownContainer.getBoundingClientRect();
        newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - rect.width));
        newTop = Math.max(0, Math.min(newTop, window.innerHeight - rect.height));
        countdownContainer.style.left = newLeft + 'px';
        countdownContainer.style.top = newTop + 'px';
        countdownContainer.style.right = 'auto';
    }
    function onEnd() {
        if (!isDragging) return;
        isDragging = false;
        countdownContainer.classList.remove('dragging');
        localStorage.setItem('countdown_position', JSON.stringify({
            top: countdownContainer.style.top,
            left: countdownContainer.style.left
        }));
    }
    countdownContainer.addEventListener('mousedown', onStart);
    countdownContainer.addEventListener('touchstart', onStart, { passive: false });
    document.addEventListener('mousemove', onMove);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('mouseup', onEnd);
    document.addEventListener('touchend', onEnd);
}
initDraggableCountdown();
function updateCountdown() {
    if (!countdownContainer || !countdownTimer || !countdownStatus) return;
    if (!currentFloor) {
        countdownContainer.classList.add('hidden');
        return;
    }
    const now = new Date();
    const minutes = getMinutesSinceMidnight(now);
    if (minutes >= ALLOWED_START_MINUTES && minutes < ALLOWED_END_MINUTES) {
        const remainingMinutes = ALLOWED_END_MINUTES - minutes;
        const hours = Math.floor(remainingMinutes / 60);
        const mins = remainingMinutes % 60;
        const secs = 59 - now.getSeconds();
        countdownContainer.classList.remove('hidden');
        countdownTimer.textContent = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        countdownStatus.textContent = 'remaining to submit';
        countdownTimer.classList.remove('text-red-600');
        countdownTimer.classList.add('text-indigo-600');
        if (remainingMinutes <= 15) {
            countdownTimer.classList.remove('text-indigo-600');
            countdownTimer.classList.add('text-red-600');
        }
    } else if (minutes < ALLOWED_START_MINUTES) {
        const untilStartMinutes = ALLOWED_START_MINUTES - minutes;
        const hours = Math.floor(untilStartMinutes / 60);
        const mins = untilStartMinutes % 60;
        const secs = 59 - now.getSeconds();
        countdownContainer.classList.remove('hidden');
        countdownTimer.textContent = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        countdownStatus.textContent = 'until window opens';
        countdownTimer.classList.remove('text-red-600');
        countdownTimer.classList.add('text-gray-600');
    } else {
        countdownContainer.classList.remove('hidden');
        countdownTimer.textContent = '00:00:00';
        countdownStatus.textContent = 'window closed';
        countdownTimer.classList.remove('text-indigo-600');
        countdownTimer.classList.add('text-red-600');
    }
}
const roomSearch = document.getElementById('room-search');
const clearSearchBtn = document.getElementById('clear-search');
function filterRooms(searchTerm) {
    const term = searchTerm.trim().toLowerCase();
    ROOMS.forEach(room => {
        const card = document.getElementById(`room_${room}`);
        if (card) {
            if (term === '' || String(room).includes(term)) {
                card.style.display = '';
                card.classList.remove('room-hidden');
            } else {
                card.style.display = 'none';
                card.classList.add('room-hidden');
            }
        }
    });
    if (clearSearchBtn) {
        if (term !== '') {
            clearSearchBtn.classList.remove('hidden');
        } else {
            clearSearchBtn.classList.add('hidden');
        }
    }
}
if (roomSearch) {
    roomSearch.addEventListener('input', (e) => {
        playSound('click');
        filterRooms(e.target.value);
    });
}
if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', () => {
        playSound('click');
        if (roomSearch) roomSearch.value = '';
        filterRooms('');
    });
}
const colorPickerBtn = document.getElementById('color-picker-btn');
const colorDropdown = document.getElementById('color-picker-dropdown');
const colorOptions = document.querySelectorAll('.color-option');
const themeColors = {
    indigo: { primary: '#EBB328', secondary: '#EBB328', gradient: 'linear-gradient(135deg, #EBB328 0%, #EBB328 100%)' },
    blue: { primary: '#3b82f6', secondary: '#2563eb', gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' },
    green: { primary: '#10b981', secondary: '#059669', gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' },
    purple: { primary: '#8b5cf6', secondary: '#7c3aed', gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' },
    rose: { primary: '#f43f5e', secondary: '#e11d48', gradient: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)' }
};
function applyColorTheme(colorName) {
    const theme = themeColors[colorName] || themeColors.indigo;
    document.documentElement.style.setProperty('--theme-primary', theme.primary);
    document.documentElement.style.setProperty('--theme-secondary', theme.secondary);
    document.documentElement.style.setProperty('--theme-gradient', theme.gradient);
    const gradientCard = document.getElementById('total-attendance-card');
    if (gradientCard) {
        gradientCard.style.background = theme.gradient;
    }
    const totalHallCard = document.getElementById('total-hall-card');
    if (totalHallCard) {
        totalHallCard.style.background = theme.gradient;
    }
    document.querySelectorAll('.input-number').forEach(input => {
        input.style.setProperty('--focus-color', theme.primary);
    });
    localStorage.setItem('fas_color_theme', colorName);
    colorOptions.forEach(opt => {
        opt.classList.remove('active');
        if (opt.dataset.color === colorName) {
            opt.classList.add('active');
        }
    });
}
if (colorPickerBtn) {
    colorPickerBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        playSound('click');
        if (colorDropdown) colorDropdown.classList.toggle('hidden');
    });
}
colorOptions.forEach(option => {
    option.addEventListener('click', (e) => {
        e.stopPropagation();
        playSound('success');
        const color = option.dataset.color;
        applyColorTheme(color);
        if (colorDropdown) colorDropdown.classList.add('hidden');
    });
});
document.addEventListener('click', () => {
    if (colorDropdown) colorDropdown.classList.add('hidden');
});
const soundToggle = document.getElementById('sound-toggle');
function updateSoundToggle() {
    if (soundToggle) {
        soundToggle.textContent = soundEnabled ? '🔊' : '🔇';
        soundToggle.title = soundEnabled ? 'Sound On' : 'Sound Off';
    }
}
if (soundToggle) {
    soundToggle.addEventListener('click', () => {
        soundEnabled = !soundEnabled;
        localStorage.setItem('fas_sound', soundEnabled);
        updateSoundToggle();
        if (soundEnabled) playSound('click');
    });
}
function getTodayDateKey() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
function formatDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
function formatDisplayDate(dateKey) {
    const [year, month, day] = dateKey.split('-');
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}
const DATA_RETENTION_DAYS = 20;
async function cleanupOldData() {
    if (!db) return;
    const today = new Date();
    const cutoffDate = new Date(today);
    cutoffDate.setDate(today.getDate() - DATA_RETENTION_DAYS);
    try {
        for (const floor of ALL_FLOORS) {
            const floorRef = ref(db, `attendance/floor_${floor}`);
            const snapshot = await get(floorRef);
            const floorData = snapshot.val();
            if (floorData) {
                for (const dateKey of Object.keys(floorData)) {
                    const [year, month, day] = dateKey.split('-').map(Number);
                    const recordDate = new Date(year, month - 1, day);
                    if (recordDate < cutoffDate) {
                        const dateRef = ref(db, `attendance/floor_${floor}/${dateKey}`);
                        await remove(dateRef);
                    }
                }
            }
        }
        const activityLogsRef = ref(db, 'activity_logs');
        const activitySnapshot = await get(activityLogsRef);
        const activityData = activitySnapshot.val();
        if (activityData) {
            const cutoffTimestamp = cutoffDate.getTime();
            for (const userId of Object.keys(activityData)) {
                const userLogs = activityData[userId];
                for (const timestamp of Object.keys(userLogs)) {
                    if (parseInt(timestamp) < cutoffTimestamp) {
                        const logRef = ref(db, `activity_logs/${userId}/${timestamp}`);
                        await remove(logRef);
                    }
                }
            }
        }
        const roomUpdatesRef = ref(db, 'room_updates');
        const roomUpdatesSnapshot = await get(roomUpdatesRef);
        const roomUpdatesData = roomUpdatesSnapshot.val();
        if (roomUpdatesData) {
            const cutoffTimestamp = cutoffDate.getTime();
            for (const timestamp of Object.keys(roomUpdatesData)) {
                if (parseInt(timestamp) < cutoffTimestamp) {
                    const updateRef = ref(db, `room_updates/${timestamp}`);
                    await remove(updateRef);
                }
            }
        }
        const userLoginsRef = ref(db, 'user_logins');
        const userLoginsSnapshot = await get(userLoginsRef);
        const userLoginsData = userLoginsSnapshot.val();
        if (userLoginsData) {
            const cutoffTimestamp = cutoffDate.getTime();
            for (const timestamp of Object.keys(userLoginsData)) {
                if (parseInt(timestamp) < cutoffTimestamp) {
                    const loginRef = ref(db, `user_logins/${timestamp}`);
                    await remove(loginRef);
                }
            }
        }
    } catch (error) {
    }
}
// ===== GEO-LOCATION: Haversine Distance Calculation =====
function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth's radius in meters
    const toRad = (deg) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // distance in meters
}

function updateLocationBanner(status, message) {
    const banner = document.getElementById('geo-location-banner');
    const bannerText = document.getElementById('geo-location-text');
    const bannerIcon = document.getElementById('geo-location-icon');
    if (!banner || !bannerText) return;
    banner.className = 'geo-location-banner';
    banner.classList.add(`geo-${status}`);
    banner.classList.remove('hidden');
    bannerText.textContent = message;
    if (bannerIcon) {
        bannerIcon.textContent = status === 'inside' ? '📍' : status === 'outside' ? '🚫' : status === 'error' ? '⚠️' : '📡';
    }
}

function showGeoToast(message, type = 'error') {
    const container = document.getElementById('geo-toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `geo-toast geo-toast-${type}`;
    toast.innerHTML = `
        <span class="geo-toast-icon">${type === 'error' ? '🚫' : type === 'success' ? '✅' : '📍'}</span>
        <span class="geo-toast-message">${message}</span>
        <button class="geo-toast-close" onclick="this.parentElement.remove()">×</button>
    `;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'geoToastSlideOut 0.4s ease forwards';
        setTimeout(() => toast.remove(), 400);
    }, 6000);
}

function applyLocationGating() {
    const allInputs = document.querySelectorAll('.input-number');
    const roomCards = document.querySelectorAll('.room-card');
    if (!isWithinHallRadius && geoLocationChecked && isLoggedIn && !isViewOnlyMode) {
        allInputs.forEach(input => {
            input.disabled = true;
            input.style.opacity = '0.4';
            input.style.cursor = 'not-allowed';
            input.title = "You're outside the hall area. Attendance disabled.";
        });
        roomCards.forEach(card => {
            card.classList.add('geo-disabled');
        });
    }
}

function checkGeoLocation() {
    if (!navigator.geolocation) {
        geoLocationChecked = true;
        isWithinHallRadius = false;
        updateLocationBanner('error', 'Geolocation is not supported by your browser');
        showGeoToast("Your browser doesn't support geolocation. Attendance disabled.", 'error');
        applyLocationGating();
        return;
    }
    updateLocationBanner('checking', 'Checking your location...');
    navigator.geolocation.getCurrentPosition(
        (position) => {
            userLatitude = position.coords.latitude;
            userLongitude = position.coords.longitude;
            const distance = haversineDistance(userLatitude, userLongitude, HALL_LATITUDE, HALL_LONGITUDE);
            geoLocationChecked = true;
            if (distance <= ALLOWED_RADIUS_METERS) {
                isWithinHallRadius = true;
                updateLocationBanner('inside', `You're inside the hall area (${Math.round(distance)}m away)`);
                showGeoToast('Location verified! You can mark attendance.', 'success');
            } else {
                isWithinHallRadius = false;
                updateLocationBanner('outside', `You're out of Hall (${Math.round(distance)}m away - max ${ALLOWED_RADIUS_METERS}m)`);
                showGeoToast("You're out of Hall", 'error');
                applyLocationGating();
            }
            // Start watching position for real-time updates
            startGeoWatch();
        },
        (error) => {
            geoLocationChecked = true;
            isWithinHallRadius = false;
            let errorMsg = 'Location access denied. Attendance disabled.';
            switch (error.code) {
                case error.PERMISSION_DENIED:
                    errorMsg = 'Location permission denied. Please allow location access to mark attendance.';
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorMsg = 'Location unavailable. Please check your GPS settings.';
                    break;
                case error.TIMEOUT:
                    errorMsg = 'Location request timed out. Please try again.';
                    break;
            }
            updateLocationBanner('error', errorMsg);
            showGeoToast(errorMsg, 'error');
            applyLocationGating();
        },
        {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0
        }
    );
}

function startGeoWatch() {
    if (geoWatchId !== null) navigator.geolocation.clearWatch(geoWatchId);
    geoWatchId = navigator.geolocation.watchPosition(
        (position) => {
            userLatitude = position.coords.latitude;
            userLongitude = position.coords.longitude;
            const distance = haversineDistance(userLatitude, userLongitude, HALL_LATITUDE, HALL_LONGITUDE);
            const wasInside = isWithinHallRadius;
            if (distance <= ALLOWED_RADIUS_METERS) {
                isWithinHallRadius = true;
                updateLocationBanner('inside', `You're inside the hall area (${Math.round(distance)}m away)`);
                if (!wasInside) {
                    showGeoToast('You entered the hall area. Attendance enabled!', 'success');
                    // Re-render rooms to enable inputs
                    if (currentFloor) {
                        ROOMS.forEach(room => {
                            const count = displayedCounts[room] ?? 0;
                            renderRoomCard(room, count);
                        });
                    }
                }
            } else {
                isWithinHallRadius = false;
                updateLocationBanner('outside', `You're out of Hall (${Math.round(distance)}m away - max ${ALLOWED_RADIUS_METERS}m)`);
                if (wasInside) {
                    showGeoToast("You're out of Hall", 'error');
                    applyLocationGating();
                }
            }
        },
        null,
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    );
}

function getMinutesSinceMidnight(date = new Date()) {
    return date.getHours() * 60 + date.getMinutes();
}
function isWithinAllowedTime() {
    if (!ALLOW_TIME_LIMIT) return true;
    const minutes = getMinutesSinceMidnight();
    return minutes >= ALLOWED_START_MINUTES && minutes < ALLOWED_END_MINUTES;
}
function updateInputsBasedOnLogin() {
    const allInputs = document.querySelectorAll('.input-number');
    allInputs.forEach(input => {
        if (isViewingToday && isWithinAllowedTime()) {
            input.disabled = false;
            input.style.opacity = '1';
            input.style.cursor = 'text';
            input.title = '';
        }
    });
}
function logActivity(action) {
    if (!db) return;
    const timestamp = new Date().toISOString();
    const activityRef = ref(db, `activity_logs/${userId}/${Date.now()}`);
    set(activityRef, {
        user: userEmail,
        name: userName,
        action: action,
        timestamp: timestamp
    }).catch(() => {});
}
function logUserLogin() {
    if (!db || !userEmail) return;
    const timestamp = new Date().toISOString();
    const loginRef = ref(db, `user_logins/${Date.now()}`);
    set(loginRef, {
        email: userEmail,
        name: userName,
        user_id: userId,
        login_time: timestamp,
        date: getTodayDateKey()
    }).catch(() => {});
}
async function logRoomUpdate(roomNumber, floor, count) {
    if (!db || !userEmail) return;
    const timestamp = new Date().toISOString();
    const emailKey = userEmail.replace(/[.#$[\]]/g, '_');
    const updateRef = ref(db, `room_updates/${Date.now()}`);
    await set(updateRef, {
        email: userEmail,
        name: userName,
        user_id: userId,
        room: roomNumber,
        floor: floor,
        count: count,
        timestamp: timestamp,
        date: getTodayDateKey()
    }).catch(() => {});
    const userStatsRef = ref(db, `user_stats/${emailKey}`);
    try {
        const snapshot = await get(userStatsRef);
        const currentStats = snapshot.val() || { update_count: 0, rooms_updated: [] };
        const newCount = (currentStats.update_count || 0) + 1;
        await set(userStatsRef, {
            email: userEmail,
            name: userName,
            update_count: newCount,
            last_update: timestamp,
            last_room: roomNumber,
            last_floor: floor
        });
    } catch (err) {
    }
}
const totalCountDisplay = document.getElementById('total-count-display');
const roomGrid = document.getElementById('room-grid');
const loadingStatus = document.getElementById('loading-status');
const dateDisplay = document.getElementById('date-display');
const errorDiv = document.getElementById('error-message');
const errorText = document.getElementById('error-text');
const datePicker = document.getElementById('date-picker');
const todayBtn = document.getElementById('today-btn');
const viewModeIndicator = document.getElementById('view-mode-indicator');
const notificationContainer = document.getElementById('notification-container');
const floorSelect = document.getElementById('floor-select');
const roomContainer = document.getElementById('room-container');
const noFloorMessage = document.getElementById('no-floor-message');
const totalAttendanceCard = document.getElementById('total-attendance-card');
const floorTitle = document.getElementById('floor-title');
const roomSectionTitle = document.getElementById('room-section-title');
const timeNote = document.getElementById('time-note');
const totalHallCount = document.getElementById('total-hall-count');
const ALL_FLOORS = [1, 2, 3, 4, 5, 6];
const activityLogModal = document.getElementById('activity-log-modal');
const closeActivityLog = document.getElementById('close-activity-log');
const activityLogContent = document.getElementById('activity-log-content');
const logDateFilter = document.getElementById('log-date-filter');
const logUserFilter = document.getElementById('log-user-filter');
const logRoomFilter = document.getElementById('log-room-filter');
function displayError(message) {
    if (errorText) errorText.textContent = message;
    if (errorDiv) errorDiv.classList.remove('hidden');
    if (loadingStatus) loadingStatus.classList.add('hidden');
}
async function loadActivityLog() {
    return [];
}
async function showActivityLog() {
    if (!activityLogModal) return;
    activityLogModal.classList.remove('hidden');
    if (activityLogContent) {
        activityLogContent.innerHTML = '<p class="text-center text-gray-500 py-8">Loading activity log...</p>';
    }
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    if (logDateFilter) logDateFilter.value = `${year}-${month}-${day}`;
    activityLog = await loadActivityLog();
    const users = [...new Set(activityLog.map(log => log.user))];
    if (logUserFilter) {
        logUserFilter.innerHTML = '<option value="">All Users</option>';
        users.forEach(user => {
            logUserFilter.innerHTML += `<option value="${user}">${user}</option>`;
        });
    }
    if (logRoomFilter) {
        logRoomFilter.innerHTML = '<option value="">All Rooms</option>';
        ROOMS.forEach(room => {
            logRoomFilter.innerHTML += `<option value="${room}">Room ${room}</option>`;
        });
    }
    filterActivityLog();
}
function filterActivityLog() {
    const dateFilter = logDateFilter ? logDateFilter.value : '';
    const userFilter = logUserFilter ? logUserFilter.value : '';
    const roomFilter = logRoomFilter ? logRoomFilter.value : '';
    let filtered = activityLog;
    if (dateFilter) {
        filtered = filtered.filter(log => log.date === dateFilter);
    }
    if (userFilter) {
        filtered = filtered.filter(log => log.user === userFilter);
    }
    if (roomFilter) {
        filtered = filtered.filter(log =>
            log.details && log.details.includes(`Room ${roomFilter}`)
        );
    }
    displayActivityLog(filtered);
}
function displayActivityLog(logs) {
    if (!activityLogContent) return;
    if (logs.length === 0) {
        activityLogContent.innerHTML = '<p class="text-center text-gray-500 py-8">No activity found for selected filters.</p>';
        return;
    }
    activityLogContent.innerHTML = logs.map(log => {
        const time = new Date(log.timestamp).toLocaleString();
        const actionColor = log.action === 'update' ? 'text-blue-600' :
            log.action === 'reset' ? 'text-red-600' : 'text-green-600';
        return `
            <div class="activity-log-item border border-gray-200 rounded-lg p-4">
                <div class="flex justify-between items-start">
                    <div class="flex-1">
                        <p class="font-semibold ${actionColor}">${log.action.toUpperCase()}</p>
                        <p class="text-sm text-gray-700 mt-1">${log.details}</p>
                        <p class="text-xs text-gray-500 mt-2">by <strong>${log.user}</strong> at ${time}</p>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}
function showNotification(message, type = 'info', duration = 5000) {
    if (!notificationContainer) return;
    const notification = document.createElement('div');
    notification.className = `notification notification-${type} text-white p-4 rounded-lg shadow-lg flex items-start gap-3`;
    const icon = {
        'info': 'ℹ️',
        'warning': '⚠️',
        'success': '✓',
        'danger': '⚡'
    }[type] || 'ℹ️';
    notification.innerHTML = `
        <span class="text-2xl">${icon}</span>
        <div class="flex-1">
            <p class="font-semibold text-sm">${message}</p>
        </div>
        <button class="text-white hover:text-gray-200 font-bold text-xl leading-none" onclick="this.parentElement.remove()">×</button>
    `;
    notificationContainer.appendChild(notification);
    if (duration > 0) {
        setTimeout(() => {
            notification.style.animation = 'slideIn 0.3s ease-out reverse';
            setTimeout(() => notification.remove(), 300);
        }, duration);
    }
}
function checkInputWindowAndNotify() {
    if (!isViewingToday) return;
    const now = new Date();
    const minutes = getMinutesSinceMidnight(now);
    if (minutes >= ALLOWED_START_MINUTES && minutes < ALLOWED_START_MINUTES + 5 && !sentNotifications.reminder1) {
        showNotification(`🔔 Reminder for ${userId}: Attendance input window is now OPEN! Please update room attendance until 10:00 PM.`, 'info', 10000);
        sentNotifications.reminder1 = true;
    }
    else if (minutes >= SECOND_REMINDER_MINUTES && minutes < SECOND_REMINDER_MINUTES + 5 && !sentNotifications.reminder2) {
        showNotification(`⏰ Second Reminder for ${userId}: Only 1 hour left! Attendance window closes at 10:00 PM.`, 'warning', 10000);
        sentNotifications.reminder2 = true;
    }
    else if (minutes >= FINAL_REMINDER_MINUTES && minutes < FINAL_REMINDER_MINUTES + 5 && !sentNotifications.reminder3) {
        showNotification(`🚨 FINAL Reminder for ${userId}: Only 15 minutes left to submit attendance! Window closes at 10:00 PM.`, 'danger', 12000);
        sentNotifications.reminder3 = true;
    }
    if (minutes < ALLOWED_START_MINUTES || minutes >= ALLOWED_END_MINUTES) {
        sentNotifications = {
            reminder1: false,
            reminder2: false,
            reminder3: false
        };
    }
}
function hidePageLoader() {
    const loader = document.getElementById('page-loader');
    if (loader && !loader.classList.contains('hidden')) {
        setTimeout(() => {
            loader.classList.add('hidden');
            setTimeout(() => {
                loader.style.display = 'none';
            }, 200);
        }, 100);
    }
}
async function initializeFirebase() {
    try {
        if (Object.keys(firebaseConfig).length === 0) {
            throw new Error("Firebase configuration is missing. Cannot initialize database.");
        }
        const app = initializeApp(firebaseConfig);
        db = getDatabase(app);
        try {
            const analytics = getAnalytics(app);
        } catch (e) {
        }
        if (loadingStatus) loadingStatus.textContent = 'Connected. Setting up real-time listener...';
        setupRealtimeListener();
        checkAndRunDailyReset();
        hidePageLoader();
        cleanupOldData();
        cleanupUnverifiedUsers();
        setupTotalHallListener();
    } catch (error) {
        displayError(`Firebase Initialization failed: ${error.message}`);
        hidePageLoader();
    }
}
let totalHallUnsubscribe = null;
function setupTotalHallListener() {
    if (!db) return;
    if (totalHallUnsubscribe) {
        totalHallUnsubscribe();
        totalHallUnsubscribe = null;
    }
    const attendanceRef = ref(db, `attendance`);
    const unsubscribe = onValue(attendanceRef, (snapshot) => {
        const viewDateKey = currentViewDate || getTodayDateKey();
        const data = snapshot.val() || {};
        let grandTotal = 0;
        ALL_FLOORS.forEach(floor => {
            const floorData = data[`floor_${floor}`];
            if (floorData && floorData[viewDateKey]) {
                const dateData = floorData[viewDateKey];
                Object.keys(dateData).forEach(roomKey => {
                    if (dateData[roomKey] && typeof dateData[roomKey].present_count === 'number' && dateData[roomKey].present_count >= 1) {
                        grandTotal += dateData[roomKey].present_count;
                    }
                });
            }
        });
        if (totalHallCount) {
            const oldTotal = parseInt(totalHallCount.textContent) || 0;
            totalHallCount.textContent = grandTotal;
            if (grandTotal !== oldTotal) {
                totalHallCount.classList.remove('count-pop');
                void totalHallCount.offsetWidth;
                totalHallCount.classList.add('count-pop');
            }
        }
        ALL_FLOORS.forEach(floor => {
            let floorTotal = 0;
            const floorData = data[`floor_${floor}`];
            if (floorData && floorData[viewDateKey]) {
                const dateData = floorData[viewDateKey];
                Object.keys(dateData).forEach(roomKey => {
                    if (dateData[roomKey] && typeof dateData[roomKey].present_count === 'number' && dateData[roomKey].present_count >= 1) {
                        floorTotal += dateData[roomKey].present_count;
                    }
                });
            }
            updateFloorCard(floor, floorTotal);
        });
    });
    totalHallUnsubscribe = unsubscribe;
}
function updateFloorCard(floorNumber, count) {
    const countEl = document.getElementById(`floor-count-${floorNumber}`);
    const badgeEl = document.getElementById(`floor-badge-${floorNumber}`);
    const cardEl = document.getElementById(`floor-card-${floorNumber}`);
    if (countEl) {
        const oldCount = parseInt(countEl.textContent) || 0;
        countEl.textContent = count;
        if (count !== oldCount) {
            countEl.classList.remove('count-pop');
            void countEl.offsetWidth;
            countEl.classList.add('count-pop');
        }
    }
    if (badgeEl) {
        badgeEl.className = 'floor-badge';
        if (count === 0) {
            badgeEl.innerHTML = '<span class="floor-dot floor-dot-red"></span>';
            badgeEl.classList.add('badge-empty');
            if (cardEl) {
                cardEl.classList.add('floor-empty');
                cardEl.classList.remove('floor-active');
            }
        } else {
            badgeEl.innerHTML = '<span class="floor-dot floor-dot-green"></span>';
            badgeEl.classList.add('badge-active');
            if (cardEl) {
                cardEl.classList.remove('floor-empty');
                cardEl.classList.add('floor-active');
            }
        }
    }
}
function renderRoomCard(roomNumber, currentCount) {
    const docId = `room_${roomNumber}`;
    const existingCard = document.getElementById(docId);
    const isUserRoom = userRoomNumber === roomNumber;
    const isEditable = isViewingToday && isWithinAllowedTime() && isLoggedIn && isUserRoom && !isViewOnlyMode && (isWithinHallRadius || !geoLocationChecked);
    const displayValue = (currentCount === null || currentCount === undefined) ? '0' : (currentCount === 0 ? '🚫' : String(currentCount));
    if (existingCard) {
        const input = existingCard.querySelector('input');
        if (input && document.activeElement !== input) {
            input.value = displayValue;
        }
        updateRoomBadge(roomNumber, currentCount);
        updateRoomProgress(roomNumber, currentCount);
        if (input) {
            input.disabled = !isEditable;
            input.style.opacity = isEditable ? '1' : '0.5';
            input.style.cursor = isEditable ? 'text' : 'not-allowed';
            input.title = isViewOnlyMode ? 'View only mode - login to edit' : (!isUserRoom ? 'You can only edit your own room' : (!isLoggedIn ? 'Please login to input attendance' : ''));
        }
        if (!isUserRoom) {
            existingCard.classList.add('other-room');
        } else {
            existingCard.classList.remove('other-room');
        }
        displayedCounts[roomNumber] = currentCount;
        return;
    }
    const card = document.createElement('div');
    card.id = docId;
    const inputTitle = isViewOnlyMode ? 'View only mode - login to edit' : (!isUserRoom ? 'You can only edit your own room' : (!isLoggedIn ? 'Please login to input attendance' : ''));
    card.className = `room-card p-5 rounded-2xl ${!isUserRoom ? 'other-room' : ''}`;
    card.innerHTML = `
        <div class="flex items-center justify-between mb-1">
            <div class="text-lg font-bold text-gray-800">Room ${roomNumber}</div>
            <div class="room-badge" id="badge-${roomNumber}">-</div>
        </div>
        ${isUserRoom && !isViewOnlyMode ? '<div class="mb-2"><span class="text-[10px] bg-green-500 text-white px-2 py-0.5 rounded-full">My Room</span></div>' : '<div class="mb-2"></div>'}
        <div class="text-sm text-gray-500 mb-2">Students Present:</div>
        <div class="input-with-controls" style="display:flex;gap:8px;align-items:center;justify-content:center;">
            <input
                type="text"
                inputmode="numeric"
                id="input-${roomNumber}"
                value="${displayValue}"
                placeholder="0"
                class="input-number"
                ${!isEditable ? 'disabled' : ''}
                title="${inputTitle}"
            />
        </div>
        <div class="mt-3">
            <div class="progress-track" id="progress-${roomNumber}">
                <div class="progress-fill" style="width: 0%;"></div>
            </div>
            <div class="progress-label text-xs text-gray-500 mt-1" id="progress-label-${roomNumber}">-/6</div>
        </div>
    `;
    const inputElement = card.querySelector(`#input-${roomNumber}`);
    function sanitizeAndSave(val) {
        if (isViewOnlyMode) {
            showNotification('👁️ View only mode - please login to edit attendance', 'warning', 3000);
            if (inputElement) inputElement.value = displayedCounts[roomNumber] ?? '-';
            return;
        }
        if (!isLoggedIn) {
            showNotification('🔒 Please login to input attendance', 'warning', 3000);
            return;
        }
        if (!isUserRoom) {
            showNotification('🔒 You can only edit your own room attendance', 'warning', 3000);
            if (inputElement) inputElement.value = displayedCounts[roomNumber] ?? '-';
            return;
        }
        const digits = String(val ?? '').replace(/\D/g, '');
        let num = digits === '' ? 0 : parseInt(digits, 10);
        if (isNaN(num) || num < 0) num = 0;
        if (num > 6) {
            showNotification('⚠️ Maximum 6 students allowed per room', 'warning', 2000);
            if (inputElement) inputElement.value = displayedCounts[roomNumber] ?? '-';
            return;
        }
        if (inputElement) inputElement.value = String(num);
        updateAttendance(roomNumber, num);
    }
    if (isEditable && inputElement) {
        inputElement.addEventListener('input', (event) => {
            sanitizeAndSave(event.target.value);
        });
        inputElement.addEventListener('focus', (event) => {
            setTimeout(() => {
                const len = inputElement.value.length;
                inputElement.setSelectionRange(len, len);
            }, 0);
        });
    } else if (inputElement) {
        inputElement.style.opacity = '0.5';
        inputElement.style.cursor = 'not-allowed';
    }
    updateRoomBadge(roomNumber, currentCount);
    if (roomGrid) roomGrid.appendChild(card);
}
function renderInitialRooms() {
    if (!roomGrid) return;
    if (!currentFloor || ROOMS.length === 0) {
        roomGrid.innerHTML = '<p class="col-span-full text-center text-gray-500 py-8">Please select a floor first.</p>';
        return;
    }
    roomGrid.innerHTML = '';
    ROOMS.forEach(room => {
        renderRoomCard(room, null);
        displayedCounts[room] = null;
    });
    if (totalCountDisplay) {
        totalCountDisplay.textContent = '0';
    }
}
function calculateTotal(attendanceData) {
    const total = attendanceData.reduce((sum, doc) => sum + (doc.present_count || 0), 0);
    if (totalCountDisplay) totalCountDisplay.textContent = total;
    animateTotalChange();
    if (isViewingToday) {
        checkCapacityAndNotify(total);
    }
}
function getOrdinalSuffix(num) {
    const n = parseInt(num);
    if (n === 1) return '1st';
    if (n === 2) return '2nd';
    if (n === 3) return '3rd';
    return n + 'th';
}
function selectFloor(floorNumber) {
    if (!floorNumber) return;
    currentFloor = parseInt(floorNumber);
    ROOMS = getRoomsForFloor(currentFloor);
    displayedCounts = {};
    const floorOrdinal = getOrdinalSuffix(currentFloor);
    ALL_FLOORS.forEach(f => {
        const fc = document.getElementById(`floor-card-${f}`);
        if (fc) fc.classList.remove('floor-selected');
    });
    const selectedCard = document.getElementById(`floor-card-${currentFloor}`);
    if (selectedCard) selectedCard.classList.add('floor-selected');
    if (noFloorMessage) noFloorMessage.classList.add('hidden');
    if (totalAttendanceCard) totalAttendanceCard.classList.remove('hidden');
    if (roomContainer) roomContainer.classList.remove('hidden');
    if (loadingStatus) loadingStatus.classList.remove('hidden');
    if (timeNote) timeNote.classList.remove('hidden');
    if (floorTitle) {
        floorTitle.textContent = `Total Students Present on ${floorOrdinal} Floor`;
    }
    if (roomSectionTitle) {
        roomSectionTitle.textContent = `${floorOrdinal} Floor - Room Attendance Inputs`;
    }
    localStorage.setItem('fas_selected_floor', currentFloor);
    renderInitialRooms();
    setupRealtimeListener(currentViewDate);
    playSound('success');
    showNotification(`Switched to ${floorOrdinal} Floor`, 'info', 2500);
}
if (floorSelect) {
    floorSelect.addEventListener('change', (e) => {
        selectFloor(e.target.value);
    });
}
ALL_FLOORS.forEach(floor => {
    const card = document.getElementById(`floor-card-${floor}`);
    if (card) {
        card.addEventListener('click', () => {
            if (floorSelect) floorSelect.value = String(floor);
            selectFloor(floor);
        });
    }
});
function setupRealtimeListener(dateKey = null) {
    if (!db) return;
    if (!currentFloor) return;
    const viewDateKey = dateKey || currentViewDate;
    const todayDateKey = getTodayDateKey();
    isViewingToday = (viewDateKey === todayDateKey);
    lastNotifiedTotal = 0;
    hasShownInputWindowReminder = false;
    const floorOrdinal = getOrdinalSuffix(currentFloor);
    if (dateDisplay) {
        dateDisplay.innerHTML = `Viewing: <strong>${floorOrdinal} Floor</strong> | Date: <strong>${formatDisplayDate(viewDateKey)}</strong>`;
    }
    if (viewModeIndicator) {
        if (isViewingToday) {
            viewModeIndicator.innerHTML = '<strong>Live View</strong> - Data updates in real-time';
            viewModeIndicator.className = 'text-xs text-center mt-3 text-green-600 font-medium';
        } else {
            viewModeIndicator.innerHTML = '<strong>Historical View</strong> - Read-only mode';
            viewModeIndicator.className = 'text-xs text-center mt-3 text-blue-600 font-medium';
        }
    }
    const attendanceRef = ref(db, `attendance/floor_${currentFloor}/${viewDateKey}`);
    onValue(attendanceRef, (snapshot) => {
        if (loadingStatus) loadingStatus.classList.add('hidden');
        const data = snapshot.val() || {};
        if (Object.keys(data).length === 0 && isViewingToday) {
            seedInitialRooms();
        } else if (Object.keys(data).length === 0) {
            if (roomGrid) {
                roomGrid.innerHTML = '<p class="col-span-full text-center text-gray-500 py-8">No attendance records found for this date.</p>';
            }
            if (totalCountDisplay) totalCountDisplay.textContent = '0';
            return;
        }
        const newTotals = [];
        ROOMS.forEach(room => {
            const roomKey = `room_${room}`;
            const roomData = data[roomKey];
            const presentCount = roomData && typeof roomData.present_count === 'number' ? roomData.present_count : null;
            if (presentCount !== null && presentCount >= 1) {
                newTotals.push(presentCount);
            }
            const existing = document.getElementById(`room_${room}`);
            const prev = displayedCounts[room];
            if (!existing) {
                renderRoomCard(room, presentCount);
                setTimeout(() => updateRoomProgress(room, presentCount), 50);
                displayedCounts[room] = presentCount;
                return;
            }
            if (prev !== presentCount) {
                const inputEl = existing.querySelector(`#input-${room}`);
                const displayValue = (presentCount === null || presentCount === undefined) ? '0' : (presentCount === 0 ? '🚫' : String(presentCount));
                if (inputEl && document.activeElement !== inputEl) {
                    inputEl.value = displayValue;
                }
                updateRoomBadge(room, presentCount);
                updateRoomProgress(room, presentCount);
                displayedCounts[room] = presentCount;
            }
        });
        const newTotal = newTotals.reduce((s, v) => s + (v || 0), 0);
        const oldTotal = totalCountDisplay ? parseInt(totalCountDisplay.textContent) || 0 : 0;
        if (newTotal !== oldTotal) {
            if (totalCountDisplay) totalCountDisplay.textContent = newTotal;
            animateTotalChange();
            if (isViewingToday) checkCapacityAndNotify(newTotal);
        }
    }, (error) => {
        displayError(`Real-time listener failed: ${error.message}`);
    });
}
async function seedInitialRooms() {
    if (!db || !currentFloor) return;
    const todayDateKey = getTodayDateKey();
    const updates = {};
    ROOMS.forEach(room => {
        const roomKey = `room_${room}`;
        updates[`attendance/floor_${currentFloor}/${todayDateKey}/${roomKey}`] = {
            room: room,
            floor: currentFloor,
            present_count: 0,
            timestamp: new Date().toISOString(),
            date: todayDateKey
        };
    });
    try {
        await update(ref(db), updates);
    } catch (error) {
        displayError(`Failed to initialize database: ${error.message}`);
    }
}
async function clearAllAttendance(isManual = false) {
    if (!db) {
        if (isManual) displayError("Database not initialized. Please wait.");
        return;
    }
    if (!currentFloor) return;
    if (errorDiv) errorDiv.classList.add('hidden');
    if (loadingStatus) loadingStatus.textContent = 'Auto-reset in progress...';
    try {
        const todayDateKey = getTodayDateKey();
        const updates = {};
        ROOMS.forEach(room => {
            const roomKey = `room_${room}`;
            updates[`attendance/floor_${currentFloor}/${todayDateKey}/${roomKey}`] = {
                room: room,
                floor: currentFloor,
                present_count: 0,
                timestamp: new Date().toISOString()
            };
        });
        updates['reset_tracker/last_reset'] = new Date().toISOString();
        await update(ref(db), updates);
    } catch (error) {
        displayError(`Failed to complete automatic reset: ${error.message}`);
    } finally {
        if (loadingStatus) loadingStatus.textContent = 'Database loaded and real-time listener active.';
    }
}
async function checkAndRunDailyReset() {
    if (!db) return;
    const now = new Date();
    const targetResetTimeToday = new Date();
    targetResetTimeToday.setHours(18, 0, 0, 0);
    if (now.getTime() < targetResetTimeToday.getTime()) {
        return;
    }
    const resetRef = ref(db, 'reset_tracker/last_reset');
    try {
        const snapshot = await get(resetRef);
        const lastResetTimestamp = snapshot.exists() ? snapshot.val() : null;
        let lastResetTime = null;
        if (lastResetTimestamp) {
            lastResetTime = new Date(lastResetTimestamp);
        }
        const resetAlreadyDone = lastResetTime && lastResetTime.getTime() > targetResetTimeToday.getTime();
        if (!resetAlreadyDone) {
            await clearAllAttendance(false);
        } else {
        }
    } catch (error) {
    }
}
async function updateAttendance(roomNumber, value) {
    if (!db || !currentFloor) return;
    if (!isLoggedIn) {
        showNotification('🔒 Please login with Google to input attendance', 'warning', 3000);
        return;
    }
    if (geoLocationChecked && !isWithinHallRadius) {
        showGeoToast("You're out of Hall", 'error');
        return;
    }
    if (!isWithinAllowedTime()) {
        displayError('Attendance can only be updated between 06:30 PM to 9:30 AM.');
        return;
    }
    let count = parseInt(value);
    if (isNaN(count) || count < 0) {
        count = 0;
    }
    if (count > 6) {
        displayError('Maximum 6 students allowed per room.');
        count = 6;
        const inputElement = document.getElementById(`input-${roomNumber}`);
        if (inputElement) inputElement.value = 6;
    }
    const todayDateKey = getTodayDateKey();
    const roomKey = `room_${roomNumber}`;
    const roomRef = ref(db, `attendance/floor_${currentFloor}/${todayDateKey}/${roomKey}`);
    try {
        await set(roomRef, {
            room: roomNumber,
            floor: currentFloor,
            present_count: count,
            timestamp: new Date().toISOString(),
            updated_by: userEmail
        });
        await logRoomUpdate(roomNumber, currentFloor, count);
        const msg = count === 0
            ? `🚫 Room ${roomNumber} marked as empty - No one in hall`
            : `Thank you ${userName} - Room ${roomNumber} updated (${count})`;
        showNotification(msg, 'success', 2500);
        playSound('success');
        try {
            updateRoomBadge(roomNumber, count);
            updateRoomProgress(roomNumber, count);
            const inputEl = document.getElementById(`input-${roomNumber}`);
            if (inputEl && count === 0) inputEl.value = '🚫';
            if (inputEl) {
                inputEl.classList.add('input-saved');
                setTimeout(() => inputEl.classList.remove('input-saved'), 900);
            }
        } catch (e) {
        }
    } catch (error) {
        displayError(`Failed to update attendance for Room ${roomNumber}: ${error.message}`);
    }
}
function setDatePickerToToday() {
    if (!datePicker) return;
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    datePicker.value = `${year}-${month}-${day}`;
}
function initializeDatePicker() {
    setDatePickerToToday();
    if (datePicker) {
        datePicker.addEventListener('change', (event) => {
            const selectedDate = new Date(event.target.value + 'T00:00:00');
            currentViewDate = formatDateKey(selectedDate);
            updateTotalForDate();
            if (currentFloor) {
                renderInitialRooms();
                setupRealtimeListener(currentViewDate);
            }
            if (errorDiv) errorDiv.classList.add('hidden');
        });
    }
    if (todayBtn) {
        todayBtn.addEventListener('click', () => {
            setDatePickerToToday();
            currentViewDate = getTodayDateKey();
            updateTotalForDate();
            if (currentFloor) {
                renderInitialRooms();
                setupRealtimeListener(currentViewDate);
            }
            if (errorDiv) errorDiv.classList.add('hidden');
        });
    }
}
async function updateTotalForDate() {
    if (!db) return;
    const viewDateKey = currentViewDate || getTodayDateKey();
    try {
        const attendanceRef = ref(db, `attendance`);
        const snapshot = await get(attendanceRef);
        const data = snapshot.val() || {};
        let grandTotal = 0;
        ALL_FLOORS.forEach(floor => {
            const floorData = data[`floor_${floor}`];
            if (floorData && floorData[viewDateKey]) {
                const dateData = floorData[viewDateKey];
                Object.keys(dateData).forEach(roomKey => {
                    if (dateData[roomKey] && typeof dateData[roomKey].present_count === 'number' && dateData[roomKey].present_count >= 1) {
                        grandTotal += dateData[roomKey].present_count;
                    }
                });
            }
        });
        if (totalHallCount) {
            const oldTotal = parseInt(totalHallCount.textContent) || 0;
            totalHallCount.textContent = grandTotal;
            if (grandTotal !== oldTotal) {
                totalHallCount.classList.remove('count-pop');
                void totalHallCount.offsetWidth;
                totalHallCount.classList.add('count-pop');
            }
        }
        ALL_FLOORS.forEach(floor => {
            let floorTotal = 0;
            const floorData = data[`floor_${floor}`];
            if (floorData && floorData[viewDateKey]) {
                const dateData = floorData[viewDateKey];
                Object.keys(dateData).forEach(roomKey => {
                    if (dateData[roomKey] && typeof dateData[roomKey].present_count === 'number' && dateData[roomKey].present_count >= 1) {
                        floorTotal += dateData[roomKey].present_count;
                    }
                });
            }
            updateFloorCard(floor, floorTotal);
        });
    } catch (error) {
    }
}
function updateRoomBadge(roomNumber, count) {
    const badge = document.getElementById(`badge-${roomNumber}`);
    const card = document.getElementById(`room_${roomNumber}`);
    if (!badge) return;
    badge.className = 'room-badge';
    badge.style.display = 'none';
    if (card) {
        card.classList.remove('room-empty', 'room-no-one', 'room-active');
    }
    if (count === null || count === undefined) {
    } else if (count === 0) {
        if (card) card.classList.add('room-no-one');
    } else if (count >= 1 && count <= 6) {
        if (card) card.classList.add('room-active');
    }
}
function updateRoomProgress(roomNumber, count) {
    const track = document.getElementById(`progress-${roomNumber}`);
    const label = document.getElementById(`progress-label-${roomNumber}`);
    const card = document.getElementById(`room_${roomNumber}`);
    if (!track || !label) return;
    const capacity = 6;
    const actualCount = (count === null || count === undefined) ? 0 : count;
    const percent = Math.min(100, Math.round((actualCount / capacity) * 100));
    const displayLabel = (count === null || count === undefined) ? '0' : actualCount;
    const fill = track.querySelector('.progress-fill');
    if (fill) {
        fill.style.width = percent + '%';
        fill.setAttribute('aria-valuenow', actualCount);
        if (actualCount >= capacity) {
            fill.classList.add('full');
            if (card) card.classList.add('room-full');
        } else {
            fill.classList.remove('full');
            if (card) card.classList.remove('room-full');
        }
    }
    label.textContent = `${displayLabel}/${capacity}`;
}
function animateTotalChange() {
    const el = document.getElementById('total-count-display');
    if (!el) return;
    el.classList.remove('count-pop');
    void el.offsetWidth;
    el.classList.add('count-pop');
}
function getInitials(name) {
    if (!name) return '👤';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}
let userRoomNumber = null;
let authModal, authLoginForm, authRegisterForm, authForgotForm;
let authLoginTabBtn, authRegisterTabBtn, authAlertBox, authForgotPasswordLink, authBackToLoginBtn;
let authTabContainer;
let firebaseAuth;
const googleProvider = new GoogleAuthProvider();
function initAuthModal() {
    authModal = document.getElementById('auth-modal');
    authLoginForm = document.getElementById('auth-login-form');
    authRegisterForm = document.getElementById('auth-register-form');
    authForgotForm = document.getElementById('auth-forgot-form');
    authLoginTabBtn = document.getElementById('auth-login-tab-btn');
    authRegisterTabBtn = document.getElementById('auth-register-tab-btn');
    authAlertBox = document.getElementById('auth-alert-box');
    authForgotPasswordLink = document.getElementById('auth-forgot-password-link');
    authBackToLoginBtn = document.getElementById('auth-back-to-login');
    authTabContainer = document.querySelector('.auth-tab-container');
    if (!authModal) return;
    authLoginTabBtn?.addEventListener('click', () => switchAuthTab('login'));
    authRegisterTabBtn?.addEventListener('click', () => switchAuthTab('register'));
    authForgotPasswordLink?.addEventListener('click', (e) => {
        e.preventDefault();
        switchAuthTab('forgot');
    });
    authBackToLoginBtn?.addEventListener('click', () => switchAuthTab('login'));
    document.querySelectorAll('.auth-password-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            const input = document.getElementById(targetId);
            if (input.type === 'password') {
                input.type = 'text';
                btn.textContent = '🙈';
            } else {
                input.type = 'password';
                btn.textContent = '👁️';
            }
        });
    });
    document.getElementById('auth-continue-without-login')?.addEventListener('click', () => {
        isViewOnlyMode = true;
        isLoggedIn = false;
        userRoomNumber = null;
        userName = 'Guest';
        hideAuthModal();
        updateProfileDisplayForGuest();
    });
    authLoginForm?.addEventListener('submit', handleLogin);
    authRegisterForm?.addEventListener('submit', handleRegister);
    document.getElementById('auth-google-login-btn')?.addEventListener('click', handleGoogleSignIn);
    document.getElementById('auth-google-register-btn')?.addEventListener('click', handleGoogleSignIn);
    authForgotForm?.addEventListener('submit', handleForgotPassword);
}
function switchAuthTab(tab) {
    hideAuthAlert();
    authLoginForm?.classList.remove('active');
    authRegisterForm?.classList.remove('active');
    authForgotForm?.classList.remove('active');
    if (tab === 'login') {
        authLoginTabBtn?.classList.add('active');
        authRegisterTabBtn?.classList.remove('active');
        authLoginForm?.classList.add('active');
        if (authTabContainer) authTabContainer.style.display = 'flex';
    } else if (tab === 'register') {
        authLoginTabBtn?.classList.remove('active');
        authRegisterTabBtn?.classList.add('active');
        authRegisterForm?.classList.add('active');
        if (authTabContainer) authTabContainer.style.display = 'flex';
    } else if (tab === 'forgot') {
        authForgotForm?.classList.add('active');
        if (authTabContainer) authTabContainer.style.display = 'none';
    }
}
function showAuthAlert(message, type) {
    if (authAlertBox) {
        authAlertBox.textContent = message;
        authAlertBox.className = `auth-alert show auth-alert-${type}`;
    }
}
function hideAuthAlert() {
    if (authAlertBox) {
        authAlertBox.className = 'auth-alert';
    }
}
function showAuthModal() {
    if (authModal) {
        authModal.classList.add('show');
    }
}
function hideAuthModal() {
    if (authModal) {
        authModal.classList.remove('show');
    }
}
let verificationCheckInterval = null;
function showVerificationWaitingModal(user, email) {
    hideAuthModal();
    let verificationModal = document.getElementById('verification-modal');
    if (!verificationModal) {
        verificationModal = document.createElement('div');
        verificationModal.id = 'verification-modal';
        verificationModal.className = 'auth-modal-overlay show';
        document.body.appendChild(verificationModal);
    }
    verificationModal.innerHTML = `
        <div class="auth-modal-card" style="text-align: center;">
            <div style="font-size: 64px; margin-bottom: 20px;">📧</div>
            <h2 style="font-size: 1.5rem; font-weight: 700; color: #111827; margin-bottom: 12px;">Verify Your Email</h2>
            <p style="color: #6b7280; margin-bottom: 8px;">We've sent a verification link to:</p>
            <p style="color: #6366f1; font-weight: 600; margin-bottom: 24px;">${email}</p>
            <div id="verification-status" style="display: flex; align-items: center; justify-content: center; gap: 12px; padding: 16px; background: #fef3c7; border-radius: 12px; margin-bottom: 20px;">
                <div class="auth-loading-spinner" style="border-color: rgba(217, 119, 6, 0.3); border-top-color: #d97706;"></div>
                <span style="color: #92400e; font-weight: 500;">Waiting for verification...</span>
            </div>
            <p style="color: #9ca3af; font-size: 13px; margin-bottom: 12px;">Click the link in your email to verify your account. This page will automatically redirect once verified.</p>
            <p style="color: #dc2626; font-size: 13px; font-weight: 700; margin-bottom: 16px; background: #fee2e2; padding: 8px 12px; border-radius: 8px; border: 1px solid #fca5a5;">⚠️ NB: Please check your spam folder of Email</p>
            <button id="resend-verification-btn" class="auth-btn" style="background: #f3f4f6; color: #374151; margin-bottom: 12px;">
                📨 Resend Verification Email
            </button>
            <button id="cancel-verification-btn" class="auth-btn" style="background: #fee2e2; color: #dc2626;">
                ✕ Cancel
            </button>
        </div>
    `;
    verificationModal.classList.add('show');
    document.getElementById('resend-verification-btn').addEventListener('click', async () => {
        try {
            await sendEmailVerification(user);
            showNotification('Verification email sent!', 'success');
        } catch (error) {
            showNotification('Failed to send email. Try again later.', 'error');
        }
    });
    document.getElementById('cancel-verification-btn').addEventListener('click', () => {
        clearInterval(verificationCheckInterval);
        verificationModal.remove();
        showAuthModal();
        switchAuthTab('login');
    });
    verificationCheckInterval = setInterval(async () => {
        try {
            await user.reload();
            if (user.emailVerified) {
                clearInterval(verificationCheckInterval);
                const statusEl = document.getElementById('verification-status');
                if (statusEl) {
                    statusEl.style.background = '#d1fae5';
                    statusEl.innerHTML = `
                        <span style="font-size: 24px;">✅</span>
                        <span style="color: #065f46; font-weight: 500;">Email verified! Redirecting...</span>
                    `;
                }
                setTimeout(() => {
                    verificationModal.remove();
                    window.location.reload();
                }, 1500);
            }
        } catch (error) {
        }
    }, 3000);
}
function updateProfileDisplay(user, userData) {
    const profileSection = document.getElementById('user-profile-section');
    if (user && profileSection) {
        const displayName = user.displayName || userData?.fullName || 'User';
        const roomNumber = userData?.roomNumber || '';
        profileSection.innerHTML = `
            <div class="profile-name-display">
                <span id="profile-name-display">${displayName}</span>
                <span class="profile-room-badge" id="profile-room-display">${roomNumber ? 'Room ' + roomNumber : ''}</span>
            </div>
        `;
        if (roomNumber) {
            userRoomNumber = roomNumber;
            localStorage.setItem('userRoom', roomNumber);
        }
    }
}
function updateProfileDisplayForGuest() {
    const profileSection = document.getElementById('user-profile-section');
    if (profileSection) {
        profileSection.innerHTML = `
            <div class="profile-name-display" id="guest-login-btn" title="Click to login" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); cursor: pointer;">
                <span>👁️ View Only</span>
            </div>
        `;
        const guestLoginBtn = document.getElementById('guest-login-btn');
        if (guestLoginBtn) {
            guestLoginBtn.onclick = (e) => {
                e.preventDefault();
                showAuthModal();
            };
        }
    }
}
async function cleanupUnverifiedUsers() {
    if (!db) return;
    try {
        const usersRef = ref(db, 'users');
        const snapshot = await get(usersRef);
        if (!snapshot.exists()) return;
        const users = snapshot.val();
        const now = Date.now();
        const twentyFourHours = 24 * 60 * 60 * 1000;
        for (const uid in users) {
            const userData = users[uid];
            if (userData.emailVerified === false && userData.createdAt) {
                const createdTime = new Date(userData.createdAt).getTime();
                if (now - createdTime > twentyFourHours) {
                    await remove(ref(db, `users/${uid}`));
                }
            }
        }
    } catch (error) {}
}
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}
function isGmailEmail(email) {
    return email.toLowerCase().endsWith('@gmail.com');
}
function isValidRoomNumber(roomNumber) {
    const room = parseInt(roomNumber);
    if (isNaN(room) || room < 102 || room > 617) return false;
    const excludedRooms = [
        102, 103, 104, 105, 106, 116,
        203,
        502, 503, 504, 505,
        602, 603, 604, 605
    ];
    return !excludedRooms.includes(room);
}
async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('auth-login-email').value.trim();
    const password = document.getElementById('auth-login-password').value;
    if (!isValidEmail(email)) {
        showAuthAlert('Please enter a valid email address', 'error');
        return;
    }
    const loginBtn = document.getElementById('auth-login-btn');
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<span class="auth-loading-spinner"></span>';
    try {
        const userCredential = await signInWithEmailAndPassword(firebaseAuth, email, password);
        if (!userCredential.user.emailVerified) {
            showAuthAlert('Please verify your email before logging in. Check your inbox.', 'warning');
            loginBtn.disabled = false;
            loginBtn.innerHTML = '<span class="btn-text">Login</span>';
            return;
        }
        showAuthAlert('Login successful!', 'success');
        setTimeout(() => {
            hideAuthModal();
            window.location.reload();
        }, 1000);
    } catch (error) {
        let errorMessage = 'Login failed. Please try again.';
        if (error.code === 'auth/user-not-found') {
            errorMessage = 'No account found with this email.';
        } else if (error.code === 'auth/wrong-password') {
            errorMessage = 'Incorrect password.';
        } else if (error.code === 'auth/invalid-credential') {
            errorMessage = 'Invalid email or password.';
        }
        showAuthAlert(errorMessage, 'error');
        loginBtn.disabled = false;
        loginBtn.innerHTML = '<span class="btn-text">Login</span>';
    }
}
async function handleRegister(e) {
    e.preventDefault();
    const name = document.getElementById('auth-register-name').value.trim();
    const email = document.getElementById('auth-register-email').value.trim();
    const roomNumber = document.getElementById('auth-register-room').value.trim();
    const password = document.getElementById('auth-register-password').value;
    const confirmPassword = document.getElementById('auth-register-confirm-password').value;
    if (!name) {
        showAuthAlert('Please enter your full name', 'error');
        return;
    }
    if (!isValidEmail(email)) {
        showAuthAlert('Please enter a valid email address', 'error');
        return;
    }
    if (!isGmailEmail(email)) {
        showAuthAlert('Only @gmail.com emails are allowed. Temp/disposable emails are not accepted.', 'error');
        return;
    }
    if (!isValidRoomNumber(roomNumber)) {
        showAuthAlert('Please enter a valid room number', 'error');
        return;
    }
    if (password.length < 6) {
        showAuthAlert('Password must be at least 6 characters', 'error');
        return;
    }
    if (password !== confirmPassword) {
        showAuthAlert('Passwords do not match', 'error');
        return;
    }
    const registerBtn = document.getElementById('auth-register-btn');
    registerBtn.disabled = true;
    registerBtn.innerHTML = '<span class="auth-loading-spinner"></span>';
    try {
        const userCredential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
        const userRef = ref(db, `users/${userCredential.user.uid}`);
        await set(userRef, {
            fullName: name,
            email: email,
            roomNumber: parseInt(roomNumber),
            emailVerified: false,
            createdAt: new Date().toISOString()
        });
        await sendEmailVerification(userCredential.user);
        registerBtn.disabled = false;
        registerBtn.innerHTML = '<span class="btn-text">Create Account</span>';
        showVerificationWaitingModal(userCredential.user, email);
    } catch (error) {
        let errorMessage = 'Registration failed. Please try again.';
        if (error.code === 'auth/email-already-in-use') {
            errorMessage = 'An account with this email already exists.';
        } else if (error.code === 'auth/weak-password') {
            errorMessage = 'Password is too weak.';
        }
        showAuthAlert(errorMessage, 'error');
        registerBtn.disabled = false;
        registerBtn.innerHTML = '<span class="btn-text">Create Account</span>';
    }
}
async function handleGoogleSignIn() {
    try {
        const result = await signInWithPopup(firebaseAuth, googleProvider);
        const user = result.user;
        const userRef = ref(db, `users/${user.uid}`);
        const snapshot = await get(userRef);
        if (!snapshot.exists() || !snapshot.val().roomNumber) {
            const roomNumber = prompt('Please enter your room number (e.g., 302):');
            if (!roomNumber || !isValidRoomNumber(roomNumber)) {
                showAuthAlert('Please enter a valid room number to continue', 'error');
                return;
            }
            await set(userRef, {
                fullName: user.displayName || 'User',
                email: user.email,
                roomNumber: parseInt(roomNumber),
                emailVerified: true,
                createdAt: snapshot.exists() ? snapshot.val().createdAt : new Date().toISOString()
            });
        } else {
            await update(userRef, { emailVerified: true });
        }
        showAuthAlert('Login successful!', 'success');
        setTimeout(() => {
            hideAuthModal();
            window.location.reload();
        }, 1000);
    } catch (error) {
        showAuthAlert('Google sign-in failed. Please try again.', 'error');
    }
}
async function handleForgotPassword(e) {
    e.preventDefault();
    const email = document.getElementById('auth-forgot-email').value.trim();
    if (!isValidEmail(email)) {
        showAuthAlert('Please enter a valid email address', 'error');
        return;
    }
    const forgotBtn = document.getElementById('auth-forgot-btn');
    forgotBtn.disabled = true;
    forgotBtn.innerHTML = '<span class="auth-loading-spinner"></span>';
    try {
        await sendPasswordResetEmail(firebaseAuth, email);
        showAuthAlert('Password reset email sent! Check your inbox.', 'success');
        forgotBtn.disabled = false;
        forgotBtn.innerHTML = '<span class="btn-text">Send Reset Link</span>';
    } catch (error) {
        let errorMessage = 'Failed to send reset email.';
        if (error.code === 'auth/user-not-found') {
            errorMessage = 'No account found with this email.';
        }
        showAuthAlert(errorMessage, 'error');
        forgotBtn.disabled = false;
        forgotBtn.innerHTML = '<span class="btn-text">Send Reset Link</span>';
    }
}
async function checkAuth() {
    const { getApp } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js");
    let firebaseApp;
    try {
        firebaseApp = getApp();
    } catch (e) {
        firebaseApp = initializeApp(firebaseConfig);
    }
    firebaseAuth = getAuth(firebaseApp);
    initAuthModal();
    const urlParams = new URLSearchParams(window.location.search);
    const isViewOnlyRequested = urlParams.get('viewOnly') === 'true';
    return new Promise((resolve) => {
        onAuthStateChanged(firebaseAuth, async (user) => {
            if (!user) {
                if (isViewOnlyRequested) {
                    isViewOnlyMode = true;
                    isLoggedIn = false;
                    userRoomNumber = null;
                    userName = 'Guest';
                    hideAuthModal();
                    updateProfileDisplayForGuest();
                    resolve(true);
                    return;
                }
                showAuthModal();
                resolve(false);
                return;
            }
            if (!user.emailVerified) {
                showAuthModal();
                showAuthAlert('Please verify your email to continue. Check your inbox.', 'warning');
                resolve(false);
                return;
            }
            hideAuthModal();
            userId = user.uid;
            userEmail = user.email;
            userName = user.displayName || 'User';
            isLoggedIn = true;
            isViewOnlyMode = false;
            if (isViewOnlyRequested) {
                urlParams.delete('viewOnly');
                const newUrl = urlParams.toString()
                    ? `${window.location.pathname}?${urlParams.toString()}`
                    : window.location.pathname;
                window.history.replaceState({}, document.title, newUrl);
            }
            localStorage.setItem('userId', user.uid);
            localStorage.setItem('userEmail', user.email);
            localStorage.setItem('userName', userName);
            // Trigger geo-location check immediately after login
            checkGeoLocation();
            try {
                const userRef = ref(db, `users/${user.uid}`);
                const snapshot = await get(userRef);
                if (snapshot.exists()) {
                    await update(userRef, { emailVerified: true });
                    const userData = snapshot.val();
                    if (userData.fullName) {
                        userName = userData.fullName;
                        localStorage.setItem('userName', userName);
                    }
                    if (userData.roomNumber && userData.roomNumber !== 0) {
                        userRoomNumber = userData.roomNumber;
                        localStorage.setItem('userRoom', userData.roomNumber);
                    }
                    updateProfileDisplay(user, userData);
                } else {
                    updateProfileDisplay(user, null);
                }
            } catch (error) {
                updateProfileDisplay(user, null);
            }
            resolve(true);
        });
    });
}
async function init() {
    updateSoundToggle();
    const savedColorTheme = localStorage.getItem('fas_color_theme') || 'indigo';
    applyColorTheme(savedColorTheme);
    updateCountdown();
    setInterval(updateCountdown, 1000);
    requestNotificationPermission();
    checkInputWindowAndNotify();
    setInterval(checkInputWindowAndNotify, 60000);
    setTimeout(() => {
        hidePageLoader();
    }, 8000);
    await initializeFirebase();
    await checkAuth();
    initializeDatePicker();
    localStorage.removeItem('fas_selected_floor');
    currentFloor = null;
    if (floorSelect) floorSelect.value = '';
    ALL_FLOORS.forEach(f => {
        const fc = document.getElementById(`floor-card-${f}`);
        if (fc) fc.classList.remove('floor-selected');
    });
    if (noFloorMessage) noFloorMessage.classList.remove('hidden');
    if (totalAttendanceCard) totalAttendanceCard.classList.add('hidden');
    if (roomContainer) roomContainer.classList.add('hidden');
    if (countdownContainer) countdownContainer.classList.add('hidden');
    if (timeNote) timeNote.classList.add('hidden');
    if (dateDisplay) dateDisplay.innerHTML = '';
}
init();
