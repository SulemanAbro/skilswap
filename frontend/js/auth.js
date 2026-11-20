import { apiFetch, setAuthSession, getToken, getStoredUser } from './main.js';

document.addEventListener('DOMContentLoaded', () => {
  const existingToken = getToken();
  const existingUser = getStoredUser();

  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');

  // If already signed in on login/register, offer redirect or navigate
  if (existingToken && existingUser && (loginForm || registerForm)) {
    const notice = document.getElementById('already-signed-in');
    if (notice) {
      notice.classList.remove('hidden');
      const link = document.getElementById('continue-dashboard-link');
      if (link) {
        link.href = existingUser.role === 'admin' ? '/admin.html' : '/dashboard.html';
      }
    }
  }

  if (loginForm) {
    const errBox = document.getElementById('login-error');
    const emailInput = document.getElementById('login-email');
    const passInput = document.getElementById('login-password');

    document.querySelectorAll('[data-demo-email]').forEach((btn) => {
      btn.addEventListener('click', () => {
        emailInput.value = btn.dataset.demoEmail;
        passInput.value = btn.dataset.demoPassword;
        errBox.classList.add('hidden');
      });
    });

    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      errBox.classList.add('hidden');

      const email = emailInput.value.trim();
      const password = passInput.value;

      if (!email || !password) {
        errBox.textContent = 'Please enter both email address and password.';
        errBox.classList.remove('hidden');
        return;
      }

      try {
        const res = await apiFetch('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
        setAuthSession(res.token, res.user);
        window.location.href =
          res.user.role === 'admin' ? '/admin.html' : '/dashboard.html';
      } catch (err) {
        errBox.textContent = err.message;
        errBox.classList.remove('hidden');
      }
    });
  }

  if (registerForm) {
    const errBox = document.getElementById('register-error');
    const avatarInput = document.getElementById('reg-avatar');
    const avatarButtons = document.querySelectorAll('.avatar-option');

    avatarButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        avatarButtons.forEach((b) => b.classList.remove('selected'));
        btn.classList.add('selected');
        avatarInput.value = btn.dataset.avatarPath || '';
      });
    });

    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      errBox.classList.add('hidden');

      const payload = {
        name: document.getElementById('reg-name').value.trim(),
        email: document.getElementById('reg-email').value.trim(),
        password: document.getElementById('reg-password').value,
        university: document.getElementById('reg-university').value.trim(),
        department: document.getElementById('reg-department').value.trim(),
        semester: document.getElementById('reg-semester').value.trim(),
        profilePicture: avatarInput.value.trim(),
        bio: document.getElementById('reg-bio').value.trim(),
      };

      const initialTeach = document.getElementById('reg-teach-skill').value.trim();
      const initialLearn = document.getElementById('reg-learn-skill').value.trim();
      const initialSkills = [];
      if (initialTeach) {
        initialSkills.push({
          skillName: initialTeach,
          skillType: 'Teach',
          skillLevel: 'Intermediate',
          description: 'Added during registration',
        });
      }
      if (initialLearn) {
        initialSkills.push({
          skillName: initialLearn,
          skillType: 'Learn',
          skillLevel: 'Beginner',
          description: 'Added during registration',
        });
      }
      payload.initialSkills = initialSkills;

      if (!payload.name || !payload.email || !payload.password || !payload.university || !payload.department || !payload.semester) {
        errBox.textContent = 'Please complete all required academic and account fields.';
        errBox.classList.remove('hidden');
        return;
      }

      if (payload.password.length < 6) {
        errBox.textContent = 'Password must be at least 6 characters long.';
        errBox.classList.remove('hidden');
        return;
      }

      try {
        const res = await apiFetch('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setAuthSession(res.token, res.user);
        window.location.href = '/dashboard.html';
      } catch (err) {
        errBox.textContent = err.message;
        errBox.classList.remove('hidden');
      }
    });
  }
});
