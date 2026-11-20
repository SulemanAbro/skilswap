/* SkillSwap Shared Core Utilities & Workspace Shell */
const TOKEN_KEY = 'skillswap_token';
const USER_KEY = 'skillswap_user';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setAuthSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuthSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function escapeHTML(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function getInitials(name) {
  const parts = String(name || 'S').trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function renderAvatar(user, sizeClass = '') {
  const name = user?.name || 'Student';
  const initials = escapeHTML(getInitials(name));
  const pic = user?.profilePicture ? String(user.profilePicture).trim() : '';
  if (pic) {
    return `<div class="avatar ${sizeClass}" data-initials="${initials}">
      <img src="${escapeHTML(pic)}" alt="${escapeHTML(name)} portrait" referrerpolicy="no-referrer" onerror="this.parentElement.textContent=this.parentElement.dataset.initials" />
    </div>`;
  }
  return `<div class="avatar ${sizeClass}" aria-label="${escapeHTML(name)}">${initials}</div>`;
}

export function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function statusClass(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'pending' || s === 'open') return 'status-pending';
  if (s === 'accepted' || s === 'scheduled') return 'status-accepted';
  if (s === 'completed' || s === 'active' || s === 'resolved') return 'status-completed';
  return 'status-rejected';
}

export function showToast(message, isError = false) {
  let region = document.getElementById('toast-region');
  if (!region) {
    region = document.createElement('div');
    region.id = 'toast-region';
    region.setAttribute('aria-live', 'polite');
    document.body.appendChild(region);
  }
  const el = document.createElement('div');
  el.className = `toast ${isError ? 'toast-error' : ''}`;
  el.textContent = message;
  region.appendChild(el);
  setTimeout(() => {
    el.remove();
  }, 3600);
}

export async function apiFetch(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && !endpoint.includes('/api/auth/login')) {
      clearAuthSession();
      window.location.href = '/login.html';
    }
    throw new Error(data.error || `Request failed (${response.status})`);
  }
  return data;
}

export async function requireAuthenticatedWorkspace(activeKey, pageTitle) {
  const token = getToken();
  if (!token) {
    window.location.href = '/login.html';
    return null;
  }

  let user = getStoredUser();
  try {
    const me = await apiFetch('/api/auth/me');
    user = me.user;
    setAuthSession(token, user);
  } catch {
    clearAuthSession();
    window.location.href = '/login.html';
    return null;
  }

  hydrateWorkspaceShell(user, activeKey, pageTitle);
  return user;
}

function hydrateWorkspaceShell(user, activeKey, pageTitle) {
  const navItems = [
    { key: 'dashboard', label: 'Dashboard', href: '/dashboard.html' },
    { key: 'matches', label: 'Skill Matches', href: '/matches.html' },
    { key: 'discover', label: 'Discover Students', href: '/discover.html' },
    { key: 'skills', label: 'Manage Skills', href: '/skills.html' },
    { key: 'requests', label: 'Exchange Requests', href: '/requests.html' },
    { key: 'sessions', label: 'Learning Sessions', href: '/sessions.html' },
    { key: 'reviews', label: 'Reviews', href: '/reviews.html' },
    { key: 'profile', label: 'My Profile', href: '/profile.html' },
  ];

  if (user.role === 'admin') {
    navItems.push({ key: 'admin', label: 'Admin Console', href: '/admin.html' });
  }

  const sidebarEl = document.getElementById('workspace-sidebar');
  if (sidebarEl) {
    sidebarEl.innerHTML = `
      <div>
        <a href="/index.html" class="sidebar-brand">SkillSwap</a>
        <nav class="sidebar-nav" aria-label="Workspace navigation">
          ${navItems
            .map(
              (item) =>
                `<a href="${item.href}" class="nav-link ${
                  item.key === activeKey ? 'active' : ''
                }">${escapeHTML(item.label)}</a>`
            )
            .join('')}
        </nav>
      </div>
      <div class="sidebar-user">
        <div class="sidebar-user-row">
          ${renderAvatar(user)}
          <div class="sidebar-user-meta">
            <div class="sidebar-user-name">${escapeHTML(user.name)}</div>
            <div class="sidebar-user-role">${escapeHTML(user.department)}</div>
          </div>
        </div>
        <button type="button" id="logout-btn" class="btn btn-ghost-dark btn-sm" style="width: 100%;">Sign Out</button>
      </div>
    `;

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        clearAuthSession();
        window.location.href = '/login.html';
      });
    }
  }

  const topbarTitle = document.getElementById('topbar-breadcrumb');
  if (topbarTitle) {
    topbarTitle.innerHTML = `<span>SkillSwap /</span> ${escapeHTML(pageTitle)}`;
  }

  const menuBtn = document.getElementById('mobile-menu-toggle');
  if (menuBtn && sidebarEl) {
    menuBtn.addEventListener('click', () => {
      sidebarEl.classList.toggle('open');
    });
  }
}
