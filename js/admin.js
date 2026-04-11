import { initializeApp, getApp, deleteApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getDatabase, ref, set, onValue, update, get, remove, increment, onDisconnect } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-database.js";
import { 
    getAuth, onAuthStateChanged, createUserWithEmailAndPassword, sendEmailVerification, updateProfile, signOut
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
let roomUpdates = [];
let updateFilters = { date: '', user: '', room: '', floor: '' };
const filterLabels = {
    all: '👥 All Users',
    admin: '🛡️ Admins',
    verified: '✅ Verified Users',
    unverified: '⏳ Unverified Users'
};
const queryFilter = new URLSearchParams(window.location.search).get('filter');
let activeStatFilter = queryFilter || document.body?.dataset?.adminFilter || 'all';
if (!filterLabels[activeStatFilter]) activeStatFilter = 'all';

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

document.body.style.overflow = 'hidden'; // Lock scroll during loader

function hidePreloader() {
    document.body.style.overflow = ''; document.documentElement.style.overflow = ''; document.documentElement.style.touchAction = ''; // Unlock scroll
    const loader = document.getElementById('page-loader');
    const appEl = document.getElementById('app');
    if (loader) { loader.classList.add('loaded'); setTimeout(() => loader.style.display = 'none', 500); }
    if (appEl) appEl.style.opacity = '1';
}

function showSection(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('hidden');
    return el;
}

function showAccessDenied() {
    const accessDenied = document.getElementById('access-denied');
    if (accessDenied) accessDenied.classList.remove('hidden');
}

function applyUserListTitle() {
    if (!document.getElementById('user-list-container')) return;
    const titleEl = document.querySelector('#admin-user-list .page-card-title');
    if (titleEl) titleEl.textContent = filterLabels[activeStatFilter] || filterLabels.all;
    const subtitleEl = document.querySelector('.navbar-subtitle');
    if (subtitleEl) subtitleEl.textContent = filterLabels[activeStatFilter] || subtitleEl.textContent;
}

// Check auth + admin
onAuthStateChanged(auth, async (user) => {
    hidePreloader();
    if (!user || !user.emailVerified) {
        showAccessDenied();
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
                    window.location.href = '/index.html';
                } catch(e) { alert('Logout failed'); }
            }
        });
    }

    try {
        const userRef = ref(db, `users/${user.uid}`);
        const snap = await get(userRef);
        if (!snap.exists() || snap.val().role !== 'admin') {
            showAccessDenied();
            return;
        }
        // Set My Floor link
        const adminData = snap.val();
        const myFloorLink = document.getElementById('mobile-menu-myfloor');
        if (myFloorLink && adminData.roomNumber) {
            const floor = Math.floor(parseInt(adminData.roomNumber) / 100);
            if (floor >= 1 && floor <= 6) {
                myFloorLink.href = `/pages/floor.html?floor=${floor}`;
                myFloorLink.style.display = 'flex';
            }
        }
    } catch(e) {
        showAccessDenied();
        return;
    }
    const statsSection = showSection('admin-stats');
    const addUserSection = showSection('admin-add-user');
    const announcementsSection = showSection('admin-announcements');
    const updatesSection = showSection('admin-room-updates');
    showSection('admin-modules');
    const userListSection = showSection('admin-user-list');

    const shouldLoadUsers = Boolean(document.getElementById('user-list-container') || statsSection);
    if (shouldLoadUsers) {
        applyUserListTitle();
        loadUsers();
    }
    if (announcementsSection) {
        loadAnnouncements();
        setupAnnouncementForm();
    }
    if (updatesSection) {
        loadRoomUpdates();
        setupRoomUpdatesFilters();
    }
    if (addUserSection) {
        setupAddMemberForm();
    }
    if (statsSection && userListSection) {
        setupStatCardFilters();
    }
});

// Load all users
function loadUsers() {
    if (!document.getElementById('user-list-container') && !document.getElementById('admin-stats')) return;
    const usersRef = ref(db, 'users');
    onValue(usersRef, (snapshot) => {
        allUsers = snapshot.val() || {};
        renderUsers(allUsers);
        updateStats(allUsers);
        applyUserListTitle();
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
    const totalEl = document.getElementById('stat-total-users');
    if (totalEl) totalEl.textContent = total;
    const adminEl = document.getElementById('stat-admin-count');
    if (adminEl) adminEl.textContent = admins;
    const verifiedEl = document.getElementById('stat-verified-count');
    if (verifiedEl) verifiedEl.textContent = verified;
    const unverifiedEl = document.getElementById('stat-unverified-count');
    if (unverifiedEl) unverifiedEl.textContent = unverified;
}

function setupStatCardFilters() {
    const statCards = document.querySelectorAll('.admin-stat-clickable');
    if (statCards.length === 0) return;
    const hasUserList = Boolean(document.getElementById('user-list-container'));
    statCards.forEach(card => {
        card.addEventListener('click', () => {
            const filter = card.getAttribute('data-filter');
            if (!hasUserList) {
                const targetMap = {
                    all: 'users.html?filter=all',
                    admin: 'allAdmin.html',
                    verified: 'users.html?filter=verified',
                    unverified: 'users.html?filter=unverified'
                };
                window.location.href = targetMap[filter] || 'users.html';
                return;
            }
            activeStatFilter = filter;
            // Update active state
            statCards.forEach(c => c.classList.remove('admin-stat-active'));
            card.classList.add('admin-stat-active');
            // Update title
            applyUserListTitle();
            // Re-render with filter
            renderUsers(allUsers);
            // Scroll to user list
            document.getElementById('admin-user-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });
    const activeCard = document.querySelector(`.admin-stat-clickable[data-filter="${activeStatFilter}"]`);
    if (activeCard) activeCard.classList.add('admin-stat-active');
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
    if (!container) return;
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

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function isGmailEmail(email) {
    return email.toLowerCase().endsWith('@gmail.com');
}

function isValidRoomNumber(roomNumber) {
    const room = parseInt(roomNumber, 10);
    if (isNaN(room) || room < 102 || room > 617) return false;
    const excludedRooms = [
        102, 103, 104, 105, 106, 116,
        203,
        502, 503, 504, 505,
        602, 603, 604, 605
    ];
    return !excludedRooms.includes(room);
}

function getSecondaryAuth() {
    let secondaryApp;
    try {
        secondaryApp = getApp('secondary');
    } catch (e) {
        secondaryApp = initializeApp(firebaseConfig, 'secondary');
    }
    const secondaryAuth = getAuth(secondaryApp);
    return { secondaryApp, secondaryAuth };
}

function setupAddMemberForm() {
    const form = document.getElementById('admin-add-user-form');
    if (!form) return;
    const nameInput = document.getElementById('admin-add-name');
    const emailInput = document.getElementById('admin-add-email');
    const roomInput = document.getElementById('admin-add-room');
    const genderInput = document.getElementById('admin-add-gender');
    const passwordInput = document.getElementById('admin-add-password');
    const submitBtn = document.getElementById('admin-add-user-btn');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = nameInput?.value.trim();
        const email = emailInput?.value.trim();
        const roomNumber = roomInput?.value.trim();
        const gender = genderInput?.value || 'Male';
        const password = passwordInput?.value || '';

        if (!name) {
            showToast('Full name is required.', 'warning');
            return;
        }
        if (!isValidEmail(email)) {
            showToast('Please enter a valid email address.', 'warning');
            return;
        }
        if (!isGmailEmail(email)) {
            showToast('Only @gmail.com emails are allowed.', 'warning');
            return;
        }
        if (!isValidRoomNumber(roomNumber)) {
            showToast('Please enter a valid room number.', 'warning');
            return;
        }
        if (password.length < 6) {
            showToast('Password must be at least 6 characters.', 'warning');
            return;
        }

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Creating...';
        }

        let secondaryApp;
        try {
            const secondary = getSecondaryAuth();
            secondaryApp = secondary.secondaryApp;
            const secondaryAuth = secondary.secondaryAuth;

            const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
            await updateProfile(userCredential.user, { displayName: name });
            await set(ref(db, `users/${userCredential.user.uid}`), {
                fullName: name,
                email: email,
                roomNumber: parseInt(roomNumber, 10),
                role: 'member',
                gender: gender,
                emailVerified: false,
                createdAt: new Date().toISOString()
            });
            await sendEmailVerification(userCredential.user);
            await signOut(secondaryAuth);

            showToast(`Member ${name} created. Verification email sent.`, 'success', 5000);
            form.reset();
        } catch (e) {
            let errorMessage = 'Failed to create member. Please try again.';
            if (e.code === 'auth/email-already-in-use') {
                errorMessage = 'An account with this email already exists.';
            } else if (e.code === 'auth/invalid-email') {
                errorMessage = 'Invalid email address.';
            } else if (e.code === 'auth/weak-password') {
                errorMessage = 'Password is too weak.';
            }
            showToast(errorMessage, 'error');
        } finally {
            if (secondaryApp) {
                deleteApp(secondaryApp).catch(() => {});
            }
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Create Member';
            }
        }
    });
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
    if (!confirm(`Are you sure you want to delete user "${name}"? This will remove all their data and queue their auth account for deletion.`)) return;
    try {
        // Remove all user data from database
        await remove(ref(db, `users/${uid}`));
        await remove(ref(db, `activity_logs/${uid}`));
        await remove(ref(db, `fcm_tokens/${uid}`));
        
        // Queue Firebase Auth account deletion
        // This marks the account for deletion; when the user tries to login,
        // they will be blocked since their user data no longer exists
        await set(ref(db, `pending_deletions/${uid}`), {
            deletedBy: currentAdminUid,
            deletedAt: new Date().toISOString(),
            userName: name
        });
        
        showToast(`User "${name}" fully deleted from Firebase`, 'success');
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
    if (!postBtn) return;
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
    if (!document.getElementById('active-announcements')) return;
    const announcementsRef = ref(db, 'announcements');
    onValue(announcementsRef, (snapshot) => {
        const data = snapshot.val() || {};
        const container = document.getElementById('active-announcements');
        if (!container) return;
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

function setupRoomUpdatesFilters() {
    const dateInput = document.getElementById('admin-updates-date');
    const userSelect = document.getElementById('admin-updates-user');
    const roomInput = document.getElementById('admin-updates-room');
    const floorSelect = document.getElementById('admin-updates-floor');

    if (!dateInput && !userSelect && !roomInput && !floorSelect) return;

    updateFilters.date = dateInput?.value || '';
    updateFilters.user = userSelect?.value || '';
    updateFilters.room = roomInput?.value || '';
    updateFilters.floor = floorSelect?.value || '';

    dateInput?.addEventListener('change', () => {
        updateFilters.date = dateInput.value || '';
        renderRoomUpdates();
    });
    userSelect?.addEventListener('change', () => {
        updateFilters.user = userSelect.value || '';
        renderRoomUpdates();
    });
    roomInput?.addEventListener('input', () => {
        updateFilters.room = roomInput.value || '';
        renderRoomUpdates();
    });
    floorSelect?.addEventListener('change', () => {
        updateFilters.floor = floorSelect.value || '';
        renderRoomUpdates();
    });
}

function loadRoomUpdates() {
    if (!document.getElementById('admin-updates-list')) return;
    const updatesRef = ref(db, 'room_updates');
    onValue(updatesRef, (snapshot) => {
        const data = snapshot.val() || {};
        roomUpdates = Object.entries(data).map(([id, u]) => {
            const timestampMs = parseInt(id, 10) || Date.parse(u.timestamp) || 0;
            return { id, ...u, timestampMs };
        }).sort((a, b) => b.timestampMs - a.timestampMs);
        updateRoomUpdatesUserOptions();
        renderRoomUpdates();
    });
}

function updateRoomUpdatesUserOptions() {
    const userSelect = document.getElementById('admin-updates-user');
    if (!userSelect) return;
    const current = userSelect.value;
    const unique = new Map();

    roomUpdates.forEach((u) => {
        const email = u.email || '';
        const name = u.name || email || 'Unknown';
        const key = email || u.user_id || u.name || 'unknown';
        if (!unique.has(key)) {
            const label = email ? `${name} (${email})` : name;
            unique.set(key, { value: email || key, label });
        }
    });

    const options = Array.from(unique.values()).sort((a, b) => a.label.localeCompare(b.label));
    userSelect.innerHTML = '<option value="">All Users</option>' + options.map(opt => (
        `<option value="${opt.value}">${opt.label}</option>`
    )).join('');

    if (current) {
        userSelect.value = current;
        updateFilters.user = current;
    }
}

function renderRoomUpdates() {
    const listEl = document.getElementById('admin-updates-list');
    const countEl = document.getElementById('admin-updates-count');
    if (!listEl) return;

    const filtered = roomUpdates.filter((u) => {
        const dateKey = u.date || (u.timestamp ? u.timestamp.slice(0, 10) : '');
        if (updateFilters.date && dateKey !== updateFilters.date) return false;

        if (updateFilters.user) {
            const matchesUser = u.email === updateFilters.user || u.user_id === updateFilters.user || u.name === updateFilters.user;
            if (!matchesUser) return false;
        }

        if (updateFilters.room) {
            const roomText = String(u.room || '');
            if (!roomText.includes(String(updateFilters.room))) return false;
        }

        if (updateFilters.floor && String(u.floor || '') !== String(updateFilters.floor)) return false;

        return true;
    });

    const limited = filtered.slice(0, 200);
    if (countEl) {
        const totalText = filtered.length === limited.length ? `${limited.length}` : `${limited.length} of ${filtered.length}`;
        countEl.textContent = `Showing ${totalText}`;
    }

    if (limited.length === 0) {
        listEl.innerHTML = '<p style="text-align:center; color:#9ca3af; padding: 16px;">No updates found.</p>';
        return;
    }

    listEl.innerHTML = limited.map((u) => {
        const name = u.name || 'Unknown';
        const email = u.email || 'N/A';
        const room = u.room ? `Room ${u.room}` : 'Room N/A';
        const floor = u.floor ? `Floor ${u.floor}` : 'Floor N/A';
        const time = u.timestamp ? new Date(u.timestamp).toLocaleString() : 'Unknown time';
        const countClass = u.count === 0 ? 'admin-update-count admin-update-count-empty' : 'admin-update-count';
        const countText = u.count === 0 ? '0' : String(u.count ?? '-');
        return `
            <div class="admin-update-item">
                <div class="admin-update-main">
                    <div class="admin-update-title">${room} • ${floor}</div>
                    <div class="admin-update-meta">Updated by ${name} (${email})</div>
                </div>
                <div class="admin-update-right">
                    <div class="${countClass}">${countText}</div>
                    <div class="admin-update-time">${time}</div>
                </div>
            </div>
        `;
    }).join('');
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
