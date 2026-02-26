import { initializeApp, getApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getDatabase, ref, set, onValue, update, get, remove, increment, onDisconnect } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-database.js";
import { 
    getAuth, onAuthStateChanged, deleteUser as firebaseDeleteUser, signOut
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

let currentAdminUid = null;
let allUsers = {};

// Toast system
function showToast(message, type = 'info', duration = 4000) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const icons = { info: 'ℹ️', success: '✅', warning: '⚠️', error: '❌', danger: '🚨' };
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

// Check auth + admin
onAuthStateChanged(auth, async (user) => {
    hidePreloader();
    if (!user || !user.emailVerified) {
        document.getElementById('access-denied').classList.remove('hidden');
        return;
    }
    currentAdminUid = user.uid;

    // Update mobile menu user info
    const mName = document.getElementById('mobile-menu-name');
    const mEmail = document.getElementById('mobile-menu-email');
    const mAvatar = document.getElementById('mobile-menu-avatar');
    const mLogout = document.getElementById('mobile-menu-logout');
    const name = user.displayName || 'Admin';
    if (mName) mName.textContent = name;
    if (mEmail) mEmail.textContent = user.email || '';
    if (mAvatar) mAvatar.textContent = name.charAt(0).toUpperCase();
    if (mLogout) {
        mLogout.style.display = 'flex';
        mLogout.addEventListener('click', async () => {
            if (confirm('Are you sure you want to logout?')) {
                try {
                    await signOut(auth);
                    localStorage.clear();
                    window.location.href = 'index.html';
                } catch(e) { alert('Logout failed'); }
            }
        });
    }

    try {
        const userRef = ref(db, `users/${user.uid}`);
        const snap = await get(userRef);
        if (!snap.exists() || snap.val().role !== 'admin') {
            document.getElementById('access-denied').classList.remove('hidden');
            return;
        }
        // Set My Floor link
        const adminData = snap.val();
        const myFloorLink = document.getElementById('mobile-menu-myfloor');
        if (myFloorLink && adminData.roomNumber) {
            const floor = Math.floor(parseInt(adminData.roomNumber) / 100);
            if (floor >= 1 && floor <= 6) {
                myFloorLink.href = `floor.html?floor=${floor}`;
                myFloorLink.style.display = 'flex';
            }
        }
    } catch(e) {
        document.getElementById('access-denied').classList.remove('hidden');
        return;
    }
    document.getElementById('admin-stats').classList.remove('hidden');
    document.getElementById('admin-announcements').classList.remove('hidden');
    document.getElementById('admin-user-list').classList.remove('hidden');
    loadUsers();
    loadAnnouncements();
    setupAnnouncementForm();
    setupStatCardFilters();
});

let activeStatFilter = 'all';

// Load all users
function loadUsers() {
    const usersRef = ref(db, 'users');
    onValue(usersRef, (snapshot) => {
        allUsers = snapshot.val() || {};
        renderUsers(allUsers);
        updateStats(allUsers);
    });
}

function updateStats(users) {
    let total = 0, admins = 0, verified = 0, unverified = 0;
    for (const uid in users) {
        total++;
        if (users[uid].role === 'admin') admins++;
        if (users[uid].emailVerified) verified++;
        else unverified++;
    }
    document.getElementById('stat-total-users').textContent = total;
    document.getElementById('stat-admin-count').textContent = admins;
    document.getElementById('stat-verified-count').textContent = verified;
    const unverifiedEl = document.getElementById('stat-unverified-count');
    if (unverifiedEl) unverifiedEl.textContent = unverified;
}

function setupStatCardFilters() {
    const statCards = document.querySelectorAll('.admin-stat-clickable');
    statCards.forEach(card => {
        card.addEventListener('click', () => {
            const filter = card.getAttribute('data-filter');
            activeStatFilter = filter;
            // Update active state
            statCards.forEach(c => c.classList.remove('admin-stat-active'));
            card.classList.add('admin-stat-active');
            // Update title
            const titleEl = document.querySelector('#admin-user-list .page-card-title');
            const filterNames = { all: '👥 All Users', admin: '🛡️ Admins', verified: '✅ Verified Users', unverified: '⏳ Unverified Users' };
            if (titleEl) titleEl.textContent = filterNames[filter] || '👥 All Users';
            // Re-render with filter
            renderUsers(allUsers);
            // Scroll to user list
            document.getElementById('admin-user-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });
}

function getFilteredUsers(users) {
    return Object.entries(users).filter(([uid, u]) => {
        if (activeStatFilter === 'all') return true;
        if (activeStatFilter === 'admin') return u.role === 'admin';
        if (activeStatFilter === 'verified') return u.emailVerified === true;
        if (activeStatFilter === 'unverified') return !u.emailVerified;
        return true;
    });
}

function renderUsers(users, searchTerm = '') {
    const container = document.getElementById('user-list-container');
    let entries = getFilteredUsers(users);
    
    // Apply search filter
    if (searchTerm) {
        const term = searchTerm.toLowerCase();
        entries = entries.filter(([uid, u]) => {
            return (u.fullName || '').toLowerCase().includes(term) || 
                   (u.email || '').toLowerCase().includes(term) ||
                   String(u.roomNumber || '').includes(term);
        });
    }

    if (entries.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#6b7280; padding: 20px;">No users found.</p>';
        return;
    }

    container.innerHTML = entries.map(([uid, u]) => {
        const isAdmin = u.role === 'admin';
        const isSelf = uid === currentAdminUid;
        const roleBadge = isAdmin 
            ? '<span class="user-role-badge user-role-admin">ADMIN</span>' 
            : '<span class="user-role-badge user-role-member">MEMBER</span>';
        const verifiedBadge = u.emailVerified 
            ? '<span class="user-verified-badge">✅ Verified</span>' 
            : '<span class="user-unverified-badge">⏳ Unverified</span>';
        
        return `
            <div class="user-row" data-uid="${uid}">
                <div class="user-row-info">
                    <div class="user-row-avatar">${getInitials(u.fullName)}</div>
                    <div class="user-row-details">
                        <div class="user-row-name">
                            ${u.fullName || 'Unknown'} ${roleBadge} ${verifiedBadge}
                            ${isSelf ? '<span style="color:#6366f1; font-size:11px; font-weight:600;">(You)</span>' : ''}
                        </div>
                        <div class="user-row-meta">${u.email || ''} ${u.roomNumber ? '• Room ' + u.roomNumber : ''} ${u.department ? '• ' + u.department : ''}</div>
                        <div class="user-row-meta" style="font-size:11px; color:#9ca3af;">Joined: ${u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}</div>
                    </div>
                </div>
                <div class="user-row-actions">
                    ${!isSelf ? `
                        ${!u.emailVerified ? `
                            <button class="page-btn page-btn-sm page-btn-info" onclick="window._sendVerifyEmail('${uid}', '${(u.fullName || '').replace(/'/g, "\\'")}', '${(u.email || '').replace(/'/g, "\\'")}')">
                                📧 Send Verify Email
                            </button>
                        ` : ''}
                        <button class="page-btn page-btn-sm ${isAdmin ? 'page-btn-warning' : 'page-btn-success'}" onclick="window._toggleRole('${uid}', '${isAdmin ? 'member' : 'admin'}')">
                            ${isAdmin ? '👤 Make Member' : '🛡️ Make Admin'}
                        </button>
                        <button class="page-btn page-btn-sm page-btn-danger" onclick="window._deleteUser('${uid}', '${(u.fullName || '').replace(/'/g, "\\'")}')">
                            🗑️ Delete
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

function getInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

// Role toggle
window._toggleRole = async function(uid, newRole) {
    if (!confirm(`Are you sure you want to change this user's role to ${newRole.toUpperCase()}?`)) return;
    try {
        await update(ref(db, `users/${uid}`), { role: newRole });
        showToast(`User role changed to ${newRole}`, 'success');
    } catch (e) {
        showToast('Failed to update role: ' + e.message, 'error');
    }
};

// Delete user data
window._deleteUser = async function(uid, name) {
    if (!confirm(`Are you sure you want to delete user "${name}"? This will remove their data from the database.`)) return;
    try {
        await remove(ref(db, `users/${uid}`));
        await remove(ref(db, `activity_logs/${uid}`));
        await remove(ref(db, `fcm_tokens/${uid}`));
        showToast(`User "${name}" data deleted`, 'success');
    } catch (e) {
        showToast('Failed to delete user: ' + e.message, 'error');
    }
};

// Send verification email reminder to unverified user
window._sendVerifyEmail = async function(uid, name, email) {
    if (!confirm(`This will queue a verification email for ${name} (${email}).\n\nThe verification email will be automatically sent when the user next attempts to sign in.\n\nProceed?`)) return;
    try {
        await update(ref(db, `users/${uid}`), { pendingVerifyEmail: true });
        showToast(`Verification email queued for ${name}. It will be sent on their next login attempt.`, 'success', 5000);
    } catch(e) {
        showToast('Failed to queue verification: ' + e.message, 'error');
    }
};

// Search
const searchInput = document.getElementById('admin-user-search');
if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        renderUsers(allUsers, e.target.value);
    });
}

// Announcements
function setupAnnouncementForm() {
    const postBtn = document.getElementById('post-announcement-btn');
    postBtn.addEventListener('click', async () => {
        const message = document.getElementById('announcement-message').value.trim();
        const type = document.getElementById('announcement-type').value;
        if (!message) {
            showToast('Please write a message', 'warning');
            return;
        }
        try {
            const id = Date.now().toString();
            await set(ref(db, `announcements/${id}`), {
                message, type,
                createdAt: new Date().toISOString(),
                createdBy: currentAdminUid,
                active: true
            });
            document.getElementById('announcement-message').value = '';
            showToast('Announcement posted!', 'success');
        } catch(e) {
            showToast('Failed to post: ' + e.message, 'error');
        }
    });
}

function loadAnnouncements() {
    const announcementsRef = ref(db, 'announcements');
    onValue(announcementsRef, (snapshot) => {
        const data = snapshot.val() || {};
        const container = document.getElementById('active-announcements');
        const entries = Object.entries(data).sort((a, b) => b[0] - a[0]);
        if (entries.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:#9ca3af; padding:12px;">No announcements yet.</p>';
            return;
        }
        container.innerHTML = entries.map(([id, a]) => {
            const typeColors = { info: '#3b82f6', warning: '#f59e0b', success: '#10b981', danger: '#ef4444' };
            const color = typeColors[a.type] || typeColors.info;
            return `
                <div class="announcement-item" style="border-left: 4px solid ${color};">
                    <div style="display:flex; justify-content:space-between; align-items:start; gap:8px;">
                        <div>
                            <div style="color:#111827; font-size:13px; line-height:1.5;">${a.message}</div>
                            <div style="color:#9ca3af; font-size:11px; margin-top:6px;">${new Date(a.createdAt).toLocaleString()}</div>
                        </div>
                        <button class="page-btn page-btn-sm page-btn-danger" onclick="window._deleteAnnouncement('${id}')" style="flex-shrink:0;">🗑️</button>
                    </div>
                </div>
            `;
        }).join('');
    });
}

window._deleteAnnouncement = async function(id) {
    if (!confirm('Delete this announcement?')) return;
    try {
        await remove(ref(db, `announcements/${id}`));
        showToast('Announcement deleted', 'success');
    } catch(e) {
        showToast('Failed to delete: ' + e.message, 'error');
    }
};

// ===== Stats Counter: Total Views & Online Now =====
function initStatsCounter() {
    update(ref(db, 'stats'), { totalViews: increment(1) }).catch(() => {});
    onValue(ref(db, 'stats/totalViews'), (snapshot) => {
        const el = document.getElementById('stats-total-views');
        if (el) el.textContent = (snapshot.val() || 0).toLocaleString();
    });
    const sessionId = (currentAdminUid || 'anon') + '_' + Math.random().toString(36).substr(2, 9);
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
