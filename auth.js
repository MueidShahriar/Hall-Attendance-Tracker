import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signInWithPopup, 
    GoogleAuthProvider,
    sendPasswordResetEmail,
    sendEmailVerification,
    updateProfile,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { 
    getDatabase, 
    ref, 
    set, 
    get,
    update 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-database.js";
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
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const googleProvider = new GoogleAuthProvider();
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const forgotForm = document.getElementById('forgot-form');
const loginTabBtn = document.getElementById('login-tab-btn');
const registerTabBtn = document.getElementById('register-tab-btn');
const alertBox = document.getElementById('alert-box');
const forgotPasswordLink = document.getElementById('forgot-password-link');
const backToLoginBtn = document.getElementById('back-to-login');
const tabContainer = document.querySelector('.tab-container');
onAuthStateChanged(auth, (user) => {
    if (user && user.emailVerified) {
        window.location.href = 'index.html';
    }
});
function switchTab(tab) {
    hideAlert();
    loginForm.classList.remove('active');
    registerForm.classList.remove('active');
    forgotForm.classList.remove('active');
    if (tab === 'login') {
        loginTabBtn.classList.add('active');
        registerTabBtn.classList.remove('active');
        loginForm.classList.add('active');
        tabContainer.style.display = 'flex';
    } else if (tab === 'register') {
        loginTabBtn.classList.remove('active');
        registerTabBtn.classList.add('active');
        registerForm.classList.add('active');
        tabContainer.style.display = 'flex';
    } else if (tab === 'forgot') {
        forgotForm.classList.add('active');
        tabContainer.style.display = 'none';
    }
}
loginTabBtn.addEventListener('click', () => switchTab('login'));
registerTabBtn.addEventListener('click', () => switchTab('register'));
forgotPasswordLink.addEventListener('click', (e) => {
    e.preventDefault();
    switchTab('forgot');
});
backToLoginBtn.addEventListener('click', () => switchTab('login'));
function showAlert(message, type) {
    alertBox.textContent = message;
    alertBox.className = `alert show alert-${type}`;
}
function hideAlert() {
    alertBox.className = 'alert';
}
document.querySelectorAll('.password-toggle').forEach(btn => {
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
function setButtonLoading(button, loading) {
    const btnText = button.querySelector('.btn-text');
    if (loading) {
        button.disabled = true;
        btnText.innerHTML = '<span class="loading-spinner"></span>';
    } else {
        button.disabled = false;
        btnText.textContent = button.id.includes('login') ? 'Login' : 
                              button.id.includes('register') ? 'Create Account' : 
                              'Send Reset Link';
    }
}
function clearFormErrors(form) {
    form.querySelectorAll('.auth-input').forEach(input => {
        input.classList.remove('error');
    });
    form.querySelectorAll('.error-message').forEach(msg => {
        msg.classList.remove('show');
    });
}
function showFieldError(inputId, errorId) {
    document.getElementById(inputId).classList.add('error');
    document.getElementById(errorId).classList.add('show');
}
async function saveUserToDatabase(userId, userData) {
    try {
        const userRef = ref(db, `users/${userId}`);
        await set(userRef, {
            ...userData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
        return true;
    } catch (error) {
        return false;
    }
}
async function getUserFromDatabase(userId) {
    try {
        const userRef = ref(db, `users/${userId}`);
        const snapshot = await get(userRef);
        if (snapshot.exists()) {
            return snapshot.val();
        }
        return null;
    } catch (error) {
        return null;
    }
}
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFormErrors(loginForm);
    hideAlert();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    if (!isValidEmail(email)) {
        showFieldError('login-email', 'login-email-error');
        return;
    }
    if (!password) {
        showFieldError('login-password', 'login-password-error');
        return;
    }
    const loginBtn = document.getElementById('login-btn');
    setButtonLoading(loginBtn, true);
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        if (!user.emailVerified) {
            await sendEmailVerification(user);
            showAlert('Please verify your email first. A verification email has been sent.', 'error');
            setButtonLoading(loginBtn, false);
            return;
        }
        const userRefUpdate = ref(db, `users/${user.uid}`);
        await update(userRefUpdate, { emailVerified: true });
        localStorage.setItem('userEmail', user.email);
        localStorage.setItem('userId', user.uid);
        localStorage.setItem('userName', user.displayName || 'User');
        showAlert('Login successful! Redirecting...', 'success');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    } catch (error) {
        let errorMessage = 'Login failed. Please try again.';
        switch (error.code) {
            case 'auth/user-not-found':
                errorMessage = 'No account found with this email.';
                break;
            case 'auth/wrong-password':
                errorMessage = 'Incorrect password.';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Invalid email address.';
                break;
            case 'auth/too-many-requests':
                errorMessage = 'Too many failed attempts. Please try again later.';
                break;
            case 'auth/invalid-credential':
                errorMessage = 'Invalid email or password.';
                break;
        }
        showAlert(errorMessage, 'error');
        setButtonLoading(loginBtn, false);
    }
});
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFormErrors(registerForm);
    hideAlert();
    const name = document.getElementById('register-name').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const room = document.getElementById('register-room').value.trim();
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm-password').value;
    let hasError = false;
    if (!name) {
        showFieldError('register-name', 'register-name-error');
        hasError = true;
    }
    if (!isValidEmail(email)) {
        showFieldError('register-email', 'register-email-error');
        hasError = true;
    } else if (!isGmailEmail(email)) {
        showFieldError('register-email', 'register-email-error');
        document.getElementById('register-email-error').textContent = 'Only @gmail.com emails are allowed';
        hasError = true;
    }
    if (!isValidRoomNumber(room)) {
        showFieldError('register-room', 'register-room-error');
        document.getElementById('register-room-error').textContent = 'Please enter a valid room number';
        hasError = true;
    }
    if (password.length < 6) {
        showFieldError('register-password', 'register-password-error');
        hasError = true;
    }
    if (password !== confirmPassword) {
        showFieldError('register-confirm-password', 'register-confirm-password-error');
        hasError = true;
    }
    if (hasError) return;
    const registerBtn = document.getElementById('register-btn');
    setButtonLoading(registerBtn, true);
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        await updateProfile(user, {
            displayName: name
        });
        await saveUserToDatabase(user.uid, {
            fullName: name,
            email: email,
            roomNumber: parseInt(room),
            role: 'member',
            emailVerified: false,
            address: '',
            parentsName: '',
            department: '',
            batch: ''
        });
        await sendEmailVerification(user);
        showAlert('Registration successful! Please check your email to verify your account.', 'success');
        registerForm.reset();
        setTimeout(() => {
            switchTab('login');
        }, 3000);
    } catch (error) {
        let errorMessage = 'Registration failed. Please try again.';
        switch (error.code) {
            case 'auth/email-already-in-use':
                errorMessage = 'An account with this email already exists.';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Invalid email address.';
                break;
            case 'auth/weak-password':
                errorMessage = 'Password is too weak. Use at least 6 characters.';
                break;
        }
        showAlert(errorMessage, 'error');
    }
    setButtonLoading(registerBtn, false);
});
forgotForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFormErrors(forgotForm);
    hideAlert();
    const email = document.getElementById('forgot-email').value.trim();
    if (!isValidEmail(email)) {
        showFieldError('forgot-email', 'forgot-email-error');
        return;
    }
    const forgotBtn = document.getElementById('forgot-btn');
    setButtonLoading(forgotBtn, true);
    try {
        await sendPasswordResetEmail(auth, email);
        showAlert('Password reset email sent! Check your inbox.', 'success');
        forgotForm.reset();
    } catch (error) {
        let errorMessage = 'Failed to send reset email. Please try again.';
        switch (error.code) {
            case 'auth/user-not-found':
                errorMessage = 'No account found with this email.';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Invalid email address.';
                break;
        }
        showAlert(errorMessage, 'error');
    }
    setButtonLoading(forgotBtn, false);
});
async function handleGoogleSignIn(isRegistration = false) {
    hideAlert();
    try {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;
        const existingUser = await getUserFromDatabase(user.uid);
        if (!existingUser) {
            await saveUserToDatabase(user.uid, {
                fullName: user.displayName || 'User',
                email: user.email,
                roomNumber: 0,
                role: 'member',
                emailVerified: true,
                address: '',
                parentsName: '',
                department: '',
                batch: ''
            });
            localStorage.setItem('userEmail', user.email);
            localStorage.setItem('userId', user.uid);
            localStorage.setItem('userName', user.displayName || 'User');
            showAlert('Please complete your profile with room number.', 'warning');
            setTimeout(() => {
                window.location.href = 'profile.html?setup=true';
            }, 1500);
        } else if (!existingUser.roomNumber || existingUser.roomNumber === 0) {
            await update(ref(db, `users/${user.uid}`), { emailVerified: true });
            localStorage.setItem('userEmail', user.email);
            localStorage.setItem('userId', user.uid);
            localStorage.setItem('userName', user.displayName || 'User');
            showAlert('Please set your room number to continue.', 'warning');
            setTimeout(() => {
                window.location.href = 'profile.html?setup=true';
            }, 1500);
        } else {
            await update(ref(db, `users/${user.uid}`), { emailVerified: true });
            localStorage.setItem('userEmail', user.email);
            localStorage.setItem('userId', user.uid);
            localStorage.setItem('userName', existingUser.fullName || user.displayName || 'User');
            localStorage.setItem('userRoom', existingUser.roomNumber);
            showAlert('Login successful! Redirecting...', 'success');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
        }
    } catch (error) {
        let errorMessage = 'Google sign-in failed. Please try again.';
        if (error.code === 'auth/popup-closed-by-user') {
            errorMessage = 'Sign-in popup was closed. Please try again.';
        } else if (error.code === 'auth/popup-blocked') {
            errorMessage = 'Popup was blocked. Please allow popups for this site.';
        }
        showAlert(errorMessage, 'error');
    }
}
document.getElementById('google-login-btn').addEventListener('click', () => handleGoogleSignIn(false));
document.getElementById('google-register-btn').addEventListener('click', () => handleGoogleSignIn(true));
