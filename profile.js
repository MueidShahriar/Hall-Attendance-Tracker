import { initializeApp, getApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getDatabase, ref, get, remove, update, onValue, set, increment, onDisconnect } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-database.js";
import { 
    getAuth, onAuthStateChanged, sendPasswordResetEmail, deleteUser, signOut, reauthenticateWithCredential, EmailAuthProvider
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

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

let app, db, auth;
try { app = getApp(); } catch(e) { app = initializeApp(firebaseConfig); }
db = getDatabase(app);
auth = getAuth(app);

let currentUser = null;

function showToast(message, type = 'info', duration = 4000) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const icons = { info: 'ℹ️', success: '✅', warning: '⚠️', error: '❌' };
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || icons.info}</span>
        <span class="toast-message">${message}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `;
    container.appendChild(toast);
    if (duration > 0) {
        setTimeout(() => {
            toast.style.animation = 'toastSlideOut 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }
}

function hidePreloader() {
    const loader = document.getElementById('page-loader');
    const appEl = document.getElementById('app');
    if (loader) { loader.classList.add('loaded'); setTimeout(() => loader.style.display = 'none', 500); }
    if (appEl) appEl.style.opacity = '1';
}

onAuthStateChanged(auth, async (user) => {
    hidePreloader();
    if (!user || !user.emailVerified) {
        document.getElementById('not-logged-in').classList.remove('hidden');
        return;
    }
    currentUser = user;
    document.getElementById('profile-card').classList.remove('hidden');
    document.getElementById('password-card').classList.remove('hidden');
    document.getElementById('danger-card').classList.remove('hidden');
    document.getElementById('history-card').classList.remove('hidden');

    // Update mobile menu
    const mMenuLogout = document.getElementById('mobile-menu-logout');
    if (mMenuLogout) mMenuLogout.style.display = 'flex';

    // Load profile data
    try {
        const userRef = ref(db, `users/${user.uid}`);
        const snap = await get(userRef);
        if (snap.exists()) {
            const data = snap.val();
            document.getElementById('profile-name').textContent = data.fullName || user.displayName || 'N/A';
            document.getElementById('profile-email').textContent = data.email || user.email || 'N/A';
            document.getElementById('profile-room').textContent = data.roomNumber ? 'Room ' + data.roomNumber : 'Not set';
            
            const deptEl = document.getElementById('profile-department');
            const deptText = deptEl?.querySelector('.profile-value-text');
            if (deptText) deptText.textContent = data.department || 'Not set';
            const deptInput = document.getElementById('edit-department-input');
            if (deptInput && data.department) deptInput.value = data.department;

            // Gender editable
            const genderEl = document.getElementById('profile-gender');
            const genderText = genderEl?.querySelector('.profile-value-text');
            if (genderText) genderText.textContent = data.gender || 'Not set';
            const genderInput = document.getElementById('edit-gender-input');
            if (genderInput && data.gender) genderInput.value = data.gender;

            document.getElementById('profile-joined').textContent = data.createdAt ? new Date(data.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A';
            
            const roleBadge = document.getElementById('profile-role-badge');
            if (data.role === 'admin') {
                roleBadge.textContent = 'ADMIN';
                roleBadge.className = 'user-role-badge user-role-admin';
                const adminLink = document.getElementById('mobile-menu-admin');
                if (adminLink) adminLink.style.display = 'flex';
            } else {
                roleBadge.textContent = 'MEMBER';
                roleBadge.className = 'user-role-badge user-role-member';
            }

            // Update mobile menu user info
            const mName = document.getElementById('mobile-menu-name');
            const mEmail = document.getElementById('mobile-menu-email');
            const mAvatar = document.getElementById('mobile-menu-avatar');
            const name = data.fullName || user.displayName || 'User';
            if (mName) mName.textContent = name;
            if (mEmail) mEmail.textContent = user.email || '';
            if (mAvatar) mAvatar.textContent = name.charAt(0).toUpperCase();

            // Set My Floor link
            const myFloorLink = document.getElementById('mobile-menu-myfloor');
            if (myFloorLink && data.roomNumber) {
                const floor = Math.floor(parseInt(data.roomNumber) / 100);
                if (floor >= 1 && floor <= 6) {
                    myFloorLink.href = `floor.html?floor=${floor}`;
                    myFloorLink.style.display = 'flex';
                }
            }
        }
    } catch(e) {
        showToast('Failed to load profile data', 'error');
    }

    // Load attendance history
    loadAttendanceHistory(user.email);
});

// Password reset
document.getElementById('send-reset-btn').addEventListener('click', async () => {
    if (!currentUser) return;
    const btn = document.getElementById('send-reset-btn');
    btn.disabled = true;
    btn.textContent = '📧 Sending...';
    try {
        await sendPasswordResetEmail(auth, currentUser.email);
        showToast('Password reset email sent! Check your inbox.', 'success');
    } catch(e) {
        showToast('Failed to send reset email: ' + e.message, 'error');
    }
    btn.disabled = false;
    btn.textContent = '📧 Send Password Reset Email';
});

// Delete account
document.getElementById('delete-account-btn').addEventListener('click', async () => {
    if (!currentUser) return;
    
    const confirmed = prompt('Type "DELETE" to confirm account deletion:');
    if (confirmed !== 'DELETE') {
        showToast('Account deletion cancelled', 'info');
        return;
    }

    const btn = document.getElementById('delete-account-btn');
    btn.disabled = true;
    btn.textContent = '🗑️ Deleting...';

    try {
        const uid = currentUser.uid;
        // Delete user data from database
        await remove(ref(db, `users/${uid}`));
        await remove(ref(db, `activity_logs/${uid}`));
        await remove(ref(db, `fcm_tokens/${uid}`));
        await remove(ref(db, `pending_deletions/${uid}`));
        
        // Delete Firebase Auth user
        try {
            await deleteUser(currentUser);
        } catch(reAuthError) {
            // If requires recent login, prompt for password
            if (reAuthError.code === 'auth/requires-recent-login') {
                const password = prompt('For security, please enter your password to confirm deletion:');
                if (!password) {
                    showToast('Deletion cancelled', 'info');
                    btn.disabled = false;
                    btn.textContent = '🗑️ Delete My Account';
                    return;
                }
                const credential = EmailAuthProvider.credential(currentUser.email, password);
                await reauthenticateWithCredential(currentUser, credential);
                await deleteUser(currentUser);
            } else {
                throw reAuthError;
            }
        }

        // Clear local storage
        localStorage.clear();
        showToast('Account deleted successfully. Redirecting...', 'success');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
    } catch(e) {
        showToast('Failed to delete account: ' + e.message, 'error');
        btn.disabled = false;
        btn.textContent = '🗑️ Delete My Account';
    }
});

// Attendance history
async function loadAttendanceHistory(email) {
    const container = document.getElementById('attendance-history-container');
    if (!email) {
        container.innerHTML = '<p style="text-align:center; color:#9ca3af; padding:20px;">No history available.</p>';
        return;
    }
    try {
        const updatesRef = ref(db, 'room_updates');
        const snap = await get(updatesRef);
        const data = snap.val() || {};
        
        const myUpdates = Object.entries(data)
            .filter(([ts, u]) => u.email === email)
            .sort((a, b) => parseInt(b[0]) - parseInt(a[0]))
            .slice(0, 50); // Last 50 updates

        if (myUpdates.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:#9ca3af; padding:20px;">No attendance updates found.</p>';
            return;
        }

        // Group by date
        const grouped = {};
        myUpdates.forEach(([ts, u]) => {
            const date = u.date || new Date(u.timestamp).toISOString().split('T')[0];
            if (!grouped[date]) grouped[date] = [];
            grouped[date].push(u);
        });

        container.innerHTML = Object.entries(grouped).map(([date, updates]) => {
            const formattedDate = new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
            return `
                <div class="history-date-group">
                    <div class="history-date-header">${formattedDate}</div>
                    ${updates.map(u => {
                        const time = new Date(u.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                        const countText = u.count === 0 ? 'Marked empty' : `Set to ${u.count}`;
                        return `
                            <div class="history-item">
                                <div class="history-item-room">Room ${u.room}</div>
                                <div class="history-item-detail">${countText} • Floor ${u.floor}</div>
                                <div class="history-item-time">${time}</div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        }).join('');
    } catch(e) {
        container.innerHTML = '<p style="text-align:center; color:#ef4444; padding:20px;">Failed to load history.</p>';
    }
}

// ===== Edit Department =====
function setupEditField(field) {
    const editBtn = document.querySelector(`#profile-${field} .profile-edit-btn`);
    const editForm = document.getElementById(`edit-${field}-form`);
    const saveBtn = document.getElementById(`save-${field}-btn`);
    const cancelBtn = document.getElementById(`cancel-${field}-btn`);
    const valueEl = document.getElementById(`profile-${field}`);
    const input = document.getElementById(`edit-${field}-input`);

    if (!editBtn || !editForm || !saveBtn || !cancelBtn) return;

    editBtn.addEventListener('click', () => {
        editForm.classList.remove('hidden');
        valueEl.style.display = 'none';
    });

    cancelBtn.addEventListener('click', () => {
        editForm.classList.add('hidden');
        valueEl.style.display = 'flex';
    });

    saveBtn.addEventListener('click', async () => {
        if (!currentUser || !input.value) {
            showToast('Please select a value', 'warning');
            return;
        }
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';
        try {
            const userRef = ref(db, `users/${currentUser.uid}`);
            await update(userRef, { [field]: input.value });
            const textEl = valueEl.querySelector('.profile-value-text');
            if (textEl) textEl.textContent = input.value;
            editForm.classList.add('hidden');
            valueEl.style.display = 'flex';
            showToast(`${field.charAt(0).toUpperCase() + field.slice(1)} updated!`, 'success');
        } catch(e) {
            showToast(`Failed to update ${field}: ${e.message}`, 'error');
        }
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save';
    });
}

setupEditField('department');
setupEditField('gender');

// ===== Profile Logout (mobile menu only) =====
const mobileMenuLogout = document.getElementById('mobile-menu-logout');
async function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        try {
            await signOut(auth);
            localStorage.removeItem('fas_selected_floor');
            localStorage.removeItem('fas_selected_date');
            localStorage.removeItem('userId');
            localStorage.removeItem('userEmail');
            localStorage.removeItem('userName');
            localStorage.removeItem('userRoom');
            window.location.href = 'index.html';
        } catch(e) {
            showToast('Logout failed: ' + e.message, 'error');
        }
    }
}
if (mobileMenuLogout) mobileMenuLogout.addEventListener('click', handleLogout);

// ===== Stats Counter: Total Views & Online Now =====
function initStatsCounter() {
    update(ref(db, 'stats'), { totalViews: increment(1) }).catch(() => {});
    onValue(ref(db, 'stats/totalViews'), (snapshot) => {
        const el = document.getElementById('stats-total-views');
        if (el) el.textContent = (snapshot.val() || 0).toLocaleString();
    });
    const sessionId = (currentUser ? currentUser.uid : 'anon') + '_' + Math.random().toString(36).substr(2, 9);
    const onlineRef = ref(db, `stats/online/${sessionId}`);
    onValue(ref(db, '.info/connected'), (snap) => {
        if (snap.val() === true) {
            set(onlineRef, { timestamp: Date.now() });
            onDisconnect(onlineRef).remove();
        }
    });
    onValue(ref(db, 'stats/online'), (snapshot) => {
        const el = document.getElementById('stats-online-now');
        if (el) el.textContent = (snapshot.val() ? Object.keys(snapshot.val()).length : 0).toLocaleString();
    });
}
initStatsCounter();
