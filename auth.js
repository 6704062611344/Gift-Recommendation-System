/**
 * auth.js — Giver Gift Recommendation System
 * ─────────────────────────────────────────
 * Handles Login & Register functionality.
 * Connects to the Express/MongoDB backend at /api/auth/*
 */

const API_BASE = 'http://localhost:3000';

// ─── Tab Switcher ──────────────────────────────────────────────────────────────
function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.getElementById('tab-' + tab).classList.add('active');
    document.getElementById('panel-' + tab).classList.add('active');
    clearError('login-error');
    clearError('register-error');
}

// Auto-switch tab based on URL hash (#register opens register tab)
window.addEventListener('DOMContentLoaded', () => {
    if (window.location.hash === '#register') {
        switchTab('register');
    }
});

// ─── Quick Fill Demo Credentials ──────────────────────────────────────────────
function quickFill(email, password) {
    document.getElementById('login-email').value = email;
    document.getElementById('login-password').value = password;
    document.getElementById('login-email').focus();
}

// ─── Error Helpers ────────────────────────────────────────────────────────────
function showError(elementId, msg) {
    let el = document.getElementById(elementId);
    if (!el) {
        el = document.createElement('div');
        el.id = elementId;
        el.style.cssText =
            'background:#fdf0ee;border:1px solid #f0c4be;color:#c0392b;' +
            'font-size:.78rem;padding:10px 14px;border-radius:4px;' +
            'margin-bottom:16px;text-align:center;';

        const panelId = elementId === 'login-error' ? 'panel-login' : 'panel-register';
        const btn = document.querySelector('#' + panelId + ' .btn-submit');
        btn.parentNode.insertBefore(el, btn);
    }
    el.textContent = msg;
    el.style.display = 'block';
}

function showSuccess(elementId, msg) {
    let el = document.getElementById(elementId);
    if (!el) {
        el = document.createElement('div');
        el.id = elementId;
        el.style.cssText =
            'background:#edfaf1;border:1px solid #a3e4b7;color:#1e7e44;' +
            'font-size:.78rem;padding:10px 14px;border-radius:4px;' +
            'margin-bottom:16px;text-align:center;';

        const panelId = elementId === 'login-success' ? 'panel-login' : 'panel-register';
        const btn = document.querySelector('#' + panelId + ' .btn-submit');
        btn.parentNode.insertBefore(el, btn);
    }
    el.textContent = msg;
    el.style.display = 'block';
}

function clearError(elementId) {
    const el = document.getElementById(elementId);
    if (el) el.style.display = 'none';
}

// ─── Set Button Loading State ──────────────────────────────────────────────
function setLoading(btnId, isLoading, defaultText) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.disabled = isLoading;
    btn.textContent = isLoading ? 'Please wait…' : defaultText;
    btn.style.opacity = isLoading ? '0.7' : '1';
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
async function handleLogin() {
    clearError('login-error');
    const email    = document.getElementById('login-email').value.trim().toLowerCase();
    const password = document.getElementById('login-password').value;

    // Client-side validation
    if (!email || !password) {
        showError('login-error', 'Please fill in all fields.');
        return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showError('login-error', 'Please enter a valid email address.');
        return;
    }

    setLoading('btn-login', true, 'Login');

    try {
        const response = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            showError('login-error', data.message || 'Invalid email or password.');
            return;
        }

        // Store session
        sessionStorage.setItem('giver_user', JSON.stringify({
            name:     data.user.name,
            email:    data.user.email,
            role:     data.user.role,
            username: data.user.username
        }));

        showSuccess('login-success', `Welcome back, ${data.user.name}! Redirecting…`);

        setTimeout(() => {
            if (data.user.role === 'admin') {
                window.location.href = 'giver-dashboard.html';
            } else {
                window.location.href = 'user-home.html';
            }
        }, 800);

    } catch (err) {
        console.error('Login Error:', err);
        showError('login-error', 'Cannot connect to server. Please try again.');
    } finally {
        setLoading('btn-login', false, 'Login');
    }
}

// ─── REGISTER ─────────────────────────────────────────────────────────────────
async function handleRegister() {
    clearError('register-error');

    const name     = document.getElementById('reg-name').value.trim();
    const username = document.getElementById('reg-username').value.trim();
    const email    = document.getElementById('reg-email').value.trim().toLowerCase();
    const password = document.getElementById('reg-password').value;
    const confirm  = document.getElementById('reg-confirm').value;

    // Client-side validation
    if (!name || !username || !email || !password || !confirm) {
        showError('register-error', 'Please fill in all fields.');
        return;
    }
    if (name.length < 2) {
        showError('register-error', 'Name must be at least 2 characters.');
        return;
    }
    if (username.length < 3) {
        showError('register-error', 'Username must be at least 3 characters.');
        return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        showError('register-error', 'Username can only contain letters, numbers, and underscores.');
        return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showError('register-error', 'Please enter a valid email address.');
        return;
    }
    if (password.length < 6) {
        showError('register-error', 'Password must be at least 6 characters.');
        return;
    }
    if (password !== confirm) {
        showError('register-error', 'Passwords do not match.');
        return;
    }

    setLoading('btn-register', true, 'Register');

    try {
        const response = await fetch(`${API_BASE}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, username, email, password })
        });

        const data = await response.json();

        if (!response.ok) {
            showError('register-error', data.message || 'Registration failed. Please try again.');
            return;
        }

        // Clear form fields
        ['reg-name', 'reg-username', 'reg-email', 'reg-password', 'reg-confirm']
            .forEach(id => { document.getElementById(id).value = ''; });

        showSuccess('register-success', 'Registration successful! Switching to login…');

        setTimeout(() => {
            switchTab('login');
            // Pre-fill email for convenience
            document.getElementById('login-email').value = email;
            document.getElementById('login-password').focus();
        }, 1200);

    } catch (err) {
        console.error('Register Error:', err);
        showError('register-error', 'Cannot connect to server. Please try again.');
    } finally {
        setLoading('btn-register', false, 'Register');
    }
}

// ─── Enter key support ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    // Login panel — press Enter on password to submit
    document.getElementById('login-password')?.addEventListener('keydown', e => {
        if (e.key === 'Enter') handleLogin();
    });
    document.getElementById('login-email')?.addEventListener('keydown', e => {
        if (e.key === 'Enter') handleLogin();
    });

    // Register panel — press Enter on confirm password to submit
    document.getElementById('reg-confirm')?.addEventListener('keydown', e => {
        if (e.key === 'Enter') handleRegister();
    });
});
