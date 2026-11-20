import {
  requireAuthenticatedWorkspace,
  apiFetch,
  escapeHTML,
  renderAvatar,
  showToast,
} from './main.js';

document.addEventListener('DOMContentLoaded', async () => {
  const currentUser = await requireAuthenticatedWorkspace('discover', 'Discover Students');
  if (!currentUser) return;

  const searchInput = document.getElementById('discover-search');
  const deptSelect = document.getElementById('discover-department');
  const typeSelect = document.getElementById('discover-type');
  const grid = document.getElementById('discover-grid');
  const dialog = document.getElementById('discover-request-dialog');
  const reqForm = document.getElementById('discover-request-form');

  let myTeachSkills = [];
  let loadedStudents = [];

  async function loadMyTeachSkills() {
    const res = await apiFetch('/api/skills?type=Teach');
    myTeachSkills = res.skills || [];
  }

  async function loadStudents() {
    const params = new URLSearchParams();
    if (searchInput.value.trim()) params.set('search', searchInput.value.trim());
    if (deptSelect.value) params.set('department', deptSelect.value);
    if (typeSelect.value) params.set('skillType', typeSelect.value);

    const res = await apiFetch(`/api/users?${params.toString()}`);
    loadedStudents = (res.users || []).filter((u) => u._id !== currentUser._id);

    // Populate department filter options once
    if (deptSelect.options.length <= 1) {
      const depts = [...new Set(loadedStudents.map((u) => u.department))].sort();
      for (const d of depts) {
        const opt = document.createElement('option');
        opt.value = d;
        opt.textContent = d;
        deptSelect.appendChild(opt);
      }
    }

    if (loadedStudents.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <h3>No matching students found</h3>
          <p>Try clearing your search or choosing another academic department.</p>
        </div>`;
      return;
    }

    grid.innerHTML = loadedStudents
      .map((s) => {
        const teachSummary =
          s.teachSkills.length > 0
            ? s.teachSkills.map((sk) => sk.skillName).join(', ')
            : 'None listed';
        const learnSummary =
          s.learnSkills.length > 0
            ? s.learnSkills.map((sk) => sk.skillName).join(', ')
            : 'None listed';
        const rating =
          s.averageRating !== null
            ? `${s.averageRating} ★ (${s.reviewCount})`
            : 'New';

        return `
          <article class="match-card">
            <div class="match-card-top">
              <div class="match-person">
                ${renderAvatar(s)}
                <div>
                  <strong style="font-size: 16px;">${escapeHTML(s.name)}</strong>
                  <div class="meta-line">
                    <span>${escapeHTML(s.university)}</span>
                    <span class="meta-sep">·</span>
                    <span>${escapeHTML(s.department)}</span>
                    <span class="meta-sep">·</span>
                    <span>${escapeHTML(s.semester)}</span>
                  </div>
                </div>
              </div>
              <span class="meta-line tabular-nums">${rating}</span>
            </div>
            <p style="font-size: 13.5px; color: var(--text-secondary);">${escapeHTML(s.bio || 'Student open to skill collaboration.')}</p>
            <div class="exchange-flow">
              <div>
                <div class="exchange-col-label">Can Teach</div>
                <div class="exchange-skill-item">${escapeHTML(teachSummary)}</div>
              </div>
              <div>
                <div class="exchange-col-label">Wants to Learn</div>
                <div class="exchange-skill-item">${escapeHTML(learnSummary)}</div>
              </div>
            </div>
            <div class="card-actions">
              <button type="button" class="btn btn-primary btn-sm" data-propose-id="${escapeHTML(s._id)}">Request Exchange</button>
              <a href="/profile.html?id=${encodeURIComponent(s._id)}" class="btn btn-secondary btn-sm">View Profile</a>
            </div>
          </article>`;
      })
      .join('');

    document.querySelectorAll('[data-propose-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = loadedStudents.find((x) => x._id === btn.dataset.proposeId);
        if (!target) return;
        document.getElementById('disc-receiver-id').value = target._id;
        document.getElementById('disc-peer-name').textContent = target.name;

        const offeredSel = document.getElementById('disc-offered-skill');
        if (myTeachSkills.length > 0) {
          offeredSel.innerHTML = myTeachSkills
            .map((sk) => `<option value="${escapeHTML(sk.skillName)}">${escapeHTML(sk.skillName)}</option>`)
            .join('');
        } else {
          offeredSel.innerHTML = `<option value="General Peer Mentoring">General Peer Mentoring</option>`;
        }

        const requestedSel = document.getElementById('disc-requested-skill');
        if (target.teachSkills.length > 0) {
          requestedSel.innerHTML = target.teachSkills
            .map((sk) => `<option value="${escapeHTML(sk.skillName)}">${escapeHTML(sk.skillName)}</option>`)
            .join('');
        } else {
          requestedSel.innerHTML = `<option value="Peer Study Session">Peer Study Session</option>`;
        }

        document.getElementById('disc-message').value = `Hi ${target.name.split(' ')[0]}, I'd love to exchange skills with you on SkillSwap.`;
        dialog.showModal();
      });
    });
  }

  document.getElementById('close-discover-dialog').addEventListener('click', () => dialog.close());

  reqForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await apiFetch('/api/requests', {
        method: 'POST',
        body: JSON.stringify({
          receiverId: document.getElementById('disc-receiver-id').value,
          offeredSkill: document.getElementById('disc-offered-skill').value,
          requestedSkill: document.getElementById('disc-requested-skill').value,
          message: document.getElementById('disc-message').value.trim(),
        }),
      });
      dialog.close();
      showToast('Exchange request sent!');
    } catch (err) {
      showToast(err.message, true);
    }
  });

  searchInput.addEventListener('input', () => loadStudents());
  deptSelect.addEventListener('change', () => loadStudents());
  typeSelect.addEventListener('change', () => loadStudents());

  await loadMyTeachSkills();
  await loadStudents();
});
