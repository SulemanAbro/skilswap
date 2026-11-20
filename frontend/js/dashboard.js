import {
  requireAuthenticatedWorkspace,
  apiFetch,
  escapeHTML,
  renderAvatar,
  formatDate,
  statusClass,
} from './main.js';

document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuthenticatedWorkspace('dashboard', 'Dashboard');
  if (!user) return;

  try {
    const data = await apiFetch('/api/users/dashboard');

    const welcomeEl = document.getElementById('dashboard-welcome');
    if (welcomeEl) {
      welcomeEl.textContent = `Welcome back, ${data.user.name}`;
    }

    const subtitleEl = document.getElementById('dashboard-subtitle');
    if (subtitleEl) {
      subtitleEl.textContent = `${data.user.university} · ${data.user.department} · ${data.user.semester}`;
    }

    // KPI counts
    document.getElementById('kpi-matches').textContent = String(data.totalMatches);
    document.getElementById('kpi-pending').textContent = String(data.pendingRequestsCount);
    document.getElementById('kpi-upcoming').textContent = String(data.upcomingSessions.length);
    document.getElementById('kpi-completed').textContent = String(data.completedExchangesCount);

    // Profile Completion SVG ring
    const pct = data.profileCompletion || 0;
    document.getElementById('completion-pct').textContent = `${pct}%`;
    const circle = document.getElementById('completion-circle');
    if (circle) {
      const circumference = 2 * Math.PI * 26;
      const offset = circumference - (pct / 100) * circumference;
      circle.style.strokeDasharray = `${circumference}`;
      circle.style.strokeDashoffset = `${offset}`;
    }

    // Skills lists
    const teachList = document.getElementById('dash-teach-list');
    if (data.teachSkills.length === 0) {
      teachList.innerHTML = `<li class="skill-row"><div><div class="skill-row-title">No teaching skills yet</div><div class="skill-row-desc"><a href="/skills.html" style="color: var(--accent-blue); font-weight: 600;">Add a skill you can teach</a> to unlock mutual matches.</div></div></li>`;
    } else {
      teachList.innerHTML = data.teachSkills
        .map(
          (s) => `
          <li class="skill-row">
            <div>
              <div class="skill-row-title">${escapeHTML(s.skillName)}</div>
              <div class="skill-row-desc">${escapeHTML(s.description || 'Ready to mentor peers')}</div>
            </div>
            <span class="meta-line tabular-nums">${escapeHTML(s.skillLevel)}</span>
          </li>`
        )
        .join('');
    }

    const learnList = document.getElementById('dash-learn-list');
    if (data.learnSkills.length === 0) {
      learnList.innerHTML = `<li class="skill-row"><div><div class="skill-row-title">No learning goals yet</div><div class="skill-row-desc"><a href="/skills.html" style="color: var(--accent-blue); font-weight: 600;">Add a skill you want to learn</a>.</div></div></li>`;
    } else {
      learnList.innerHTML = data.learnSkills
        .map(
          (s) => `
          <li class="skill-row">
            <div>
              <div class="skill-row-title">${escapeHTML(s.skillName)}</div>
              <div class="skill-row-desc">${escapeHTML(s.description || 'Seeking peer mentorship')}</div>
            </div>
            <span class="meta-line tabular-nums">${escapeHTML(s.skillLevel)}</span>
          </li>`
        )
        .join('');
    }

    // Suggested Matches
    const matchesContainer = document.getElementById('dash-matches');
    if (data.suggestedMatches.length === 0) {
      matchesContainer.innerHTML = `
        <div class="empty-state">
          <h3>No mutual matches found yet</h3>
          <p>Add both teaching and learning skills so SkillSwap can identify complementary peers.</p>
          <a href="/skills.html" class="btn btn-primary btn-sm">Manage Skills</a>
        </div>`;
    } else {
      matchesContainer.innerHTML = data.suggestedMatches
        .map(
          (m) => `
          <article class="match-card">
            <div class="match-card-top">
              <div class="match-person">
                ${renderAvatar(m.user)}
                <div>
                  <strong>${escapeHTML(m.user.name)}</strong>
                  <div class="meta-line">${escapeHTML(m.user.department)} <span class="meta-sep">·</span> ${escapeHTML(m.user.university)}</div>
                </div>
              </div>
              <span class="match-score tabular-nums">${m.compatibilityScore}% Match</span>
            </div>
            <div class="exchange-flow">
              <div>
                <div class="exchange-col-label">You Teach</div>
                <div class="exchange-skill-item">${escapeHTML(m.iCanTeachThem.map((x) => x.skillName).join(', '))}</div>
              </div>
              <div>
                <div class="exchange-col-label">You Learn</div>
                <div class="exchange-skill-item">${escapeHTML(m.theyCanTeachMe.map((x) => x.skillName).join(', '))}</div>
              </div>
            </div>
            <div class="card-actions">
              <a href="/matches.html" class="btn btn-primary btn-sm">Request Exchange</a>
              <a href="/profile.html?id=${encodeURIComponent(m.user._id)}" class="btn btn-secondary btn-sm">View Profile</a>
            </div>
          </article>`
        )
        .join('');
    }

    // Upcoming Sessions
    const sessionsEl = document.getElementById('dash-sessions');
    if (data.upcomingSessions.length === 0) {
      sessionsEl.innerHTML = `<p style="color: var(--text-secondary); font-size: 14px;">No upcoming sessions scheduled. Accept an exchange request to arrange a session.</p>`;
    } else {
      sessionsEl.innerHTML = `<ul class="activity-list">
        ${data.upcomingSessions
          .map(
            (s) => `
            <li class="activity-item">
              <div>
                <div class="activity-title">${escapeHTML(s.skillName)} with ${escapeHTML(s.partnerName)}</div>
                <div class="activity-time tabular-nums">${escapeHTML(s.sessionDate)} at ${escapeHTML(s.sessionTime)} · ${escapeHTML(s.meetingType)} (${escapeHTML(s.roleInSession)})</div>
              </div>
              <span class="status-tag ${statusClass(s.status)}">${escapeHTML(s.status)}</span>
            </li>`
          )
          .join('')}
      </ul>`;
    }

    // Recent Activity
    const activityEl = document.getElementById('dash-activity');
    if (data.recentActivity.length === 0) {
      activityEl.innerHTML = `<p style="color: var(--text-secondary); font-size: 14px;">No recent activity recorded yet.</p>`;
    } else {
      activityEl.innerHTML = `<ul class="activity-list">
        ${data.recentActivity
          .map(
            (item) => `
            <li class="activity-item">
              <div>
                <div class="activity-title">${escapeHTML(item.title)}</div>
                <div class="activity-time">${formatDate(item.timestamp)}</div>
              </div>
              <span class="status-tag ${statusClass(item.status)}">${escapeHTML(item.status)}</span>
            </li>`
          )
          .join('')}
      </ul>`;
    }
  } catch (err) {
    document.getElementById('dashboard-welcome').textContent = 'Unable to load dashboard';
    console.error(err);
  }
});
