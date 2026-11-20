import {
  requireAuthenticatedWorkspace,
  apiFetch,
  escapeHTML,
  renderAvatar,
  showToast,
} from './main.js';

document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuthenticatedWorkspace('matches', 'Smart Skill Matches');
  if (!user) return;

  const dialog = document.getElementById('request-dialog');
  const form = document.getElementById('send-request-form');
  let currentMatches = [];

  function renderMatchGraph(matches) {
    const svg = document.getElementById('match-graph-svg');
    if (!svg) return;

    if (matches.length === 0) {
      svg.innerHTML = `<text x="50%" y="50%" text-anchor="middle" fill="#94a3b8" font-size="14">Add complementary Teach and Learn skills to visualize mutual match connections.</text>`;
      return;
    }

    const top = matches.slice(0, 4);
    const width = 920;
    const height = Math.max(210, top.length * 56 + 32);
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    svg.style.height = `${height}px`;

    const centerY = height / 2;
    let markup = `
      <defs>
        <linearGradient id="arcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#3b82f6" />
          <stop offset="100%" stop-color="#8b5cf6" />
        </linearGradient>
      </defs>
      <rect x="24" y="${centerY - 34}" width="210" height="68" rx="10" fill="#18223d" stroke="#3b82f6" stroke-width="1.5" />
      <text x="42" y="${centerY - 6}" fill="#ffffff" font-size="14" font-weight="700">${escapeHTML(user.name)}</text>
      <text x="42" y="${centerY + 14}" fill="#93c5fd" font-size="12">Your Skill Profile</text>
    `;

    top.forEach((m, index) => {
      const targetY = 38 + index * 54;
      const teachLabel = m.iCanTeachThem[0]?.skillName || '';
      const learnLabel = m.theyCanTeachMe[0]?.skillName || '';
      const pairText = `${teachLabel} ↔ ${learnLabel}`;
      const boxW = Math.max(190, pairText.length * 6.8 + 28);
      const boxX = 450 - boxW / 2;
      const cp1x = 370;
      const cp2x = 530;

      markup += `
        <path d="M 234 ${centerY} C ${cp1x} ${centerY}, ${cp2x} ${targetY}, 660 ${targetY}" fill="none" stroke="url(#arcGrad)" stroke-width="2" opacity="0.88" />
        <rect x="${boxX}" y="${(centerY + targetY) / 2 - 12}" width="${boxW}" height="24" rx="4" fill="#0b101e" stroke="rgba(148,163,184,0.34)" />
        <text x="450" y="${(centerY + targetY) / 2 + 4}" text-anchor="middle" fill="#e2e8f0" font-size="11">${escapeHTML(pairText)}</text>
        <rect x="660" y="${targetY - 22}" width="236" height="44" rx="8" fill="#18223d" stroke="rgba(148,163,184,0.28)" />
        <text x="674" y="${targetY - 3}" fill="#ffffff" font-size="13" font-weight="600">${escapeHTML(m.user.name)}</text>
        <text x="674" y="${targetY + 13}" fill="#94a3b8" font-size="11">${m.compatibilityScore}% Match · ${escapeHTML(m.user.department)}</text>
      `;
    });

    svg.innerHTML = markup;
  }

  async function loadMatches() {
    const container = document.getElementById('matches-grid');
    try {
      const data = await apiFetch('/api/matches');
      currentMatches = data.matches || [];
      renderMatchGraph(currentMatches);

      document.getElementById('matches-summary').textContent = `${currentMatches.length} mutual peer matches found based on ${data.myTeachCount} teach & ${data.myLearnCount} learn skills`;

      if (currentMatches.length === 0) {
        container.innerHTML = `
          <div class="empty-state" style="grid-column: 1 / -1;">
            <h3>No mutual skill matches yet</h3>
            <p>Mutual matches require both you and another student to teach a skill the other wants to learn. Update your skill list to connect.</p>
            <a href="/skills.html" class="btn btn-primary btn-sm">Update Your Skills</a>
          </div>`;
        return;
      }

      container.innerHTML = currentMatches
        .map((m) => {
          const ratingText =
            m.user.averageRating !== null
              ? `${m.user.averageRating} ★ (${m.user.reviewCount})`
              : 'New peer';
          const actionBtn =
            m.existingRequestStatus === 'Pending' || m.existingRequestStatus === 'Accepted'
              ? `<a href="/requests.html" class="btn btn-secondary btn-sm">Request ${escapeHTML(m.existingRequestStatus)}</a>`
              : `<button type="button" class="btn btn-primary btn-sm" data-open-request="${escapeHTML(m.user._id)}">Send Exchange Request</button>`;

          return `
            <article class="match-card">
              <div class="match-card-top">
                <div class="match-person">
                  ${renderAvatar(m.user)}
                  <div>
                    <strong style="font-size: 16px;">${escapeHTML(m.user.name)}</strong>
                    <div class="meta-line">
                      <span>${escapeHTML(m.user.university)}</span>
                      <span class="meta-sep">·</span>
                      <span>${escapeHTML(m.user.department)}</span>
                      <span class="meta-sep">·</span>
                      <span>${ratingText}</span>
                    </div>
                  </div>
                </div>
                <span class="match-score tabular-nums">${m.compatibilityScore}% Match</span>
              </div>
              <p style="font-size: 13.5px; color: var(--text-secondary);">${escapeHTML(m.user.bio || 'Ready for peer skill collaboration.')}</p>
              <div class="exchange-flow">
                <div>
                  <div class="exchange-col-label">You Can Teach</div>
                  ${m.iCanTeachThem
                    .map(
                      (s) =>
                        `<div class="exchange-skill-item">${escapeHTML(s.skillName)} <span style="font-weight:400; color:var(--text-muted); font-size:12px;">(${escapeHTML(s.myLevel)})</span></div>`
                    )
                    .join('')}
                </div>
                <div>
                  <div class="exchange-col-label">They Can Teach You</div>
                  ${m.theyCanTeachMe
                    .map(
                      (s) =>
                        `<div class="exchange-skill-item">${escapeHTML(s.skillName)} <span style="font-weight:400; color:var(--text-muted); font-size:12px;">(${escapeHTML(s.theirLevel)})</span></div>`
                    )
                    .join('')}
                </div>
              </div>
              <div class="card-actions">
                ${actionBtn}
                <a href="/profile.html?id=${encodeURIComponent(m.user._id)}" class="btn btn-secondary btn-sm">View Profile</a>
              </div>
            </article>`;
        })
        .join('');

      document.querySelectorAll('[data-open-request]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const match = currentMatches.find((x) => x.user._id === btn.dataset.openRequest);
          if (!match) return;
          document.getElementById('req-receiver-id').value = match.user._id;
          document.getElementById('req-peer-name').textContent = match.user.name;

          const offeredSel = document.getElementById('req-offered-skill');
          offeredSel.innerHTML = match.iCanTeachThem
            .map((s) => `<option value="${escapeHTML(s.skillName)}">${escapeHTML(s.skillName)}</option>`)
            .join('');

          const requestedSel = document.getElementById('req-requested-skill');
          requestedSel.innerHTML = match.theyCanTeachMe
            .map((s) => `<option value="${escapeHTML(s.skillName)}">${escapeHTML(s.skillName)}</option>`)
            .join('');

          document.getElementById('req-message').value = `Hi ${match.user.name.split(' ')[0]}, I saw we have a mutual skill match! Would you like to swap ${match.iCanTeachThem[0]?.skillName} for ${match.theyCanTeachMe[0]?.skillName}?`;
          document.getElementById('req-error').classList.add('hidden');
          dialog.showModal();
        });
      });
    } catch (err) {
      showToast(err.message, true);
    }
  }

  document.getElementById('close-request-dialog').addEventListener('click', () => dialog.close());

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errBox = document.getElementById('req-error');
    errBox.classList.add('hidden');

    const payload = {
      receiverId: document.getElementById('req-receiver-id').value,
      offeredSkill: document.getElementById('req-offered-skill').value,
      requestedSkill: document.getElementById('req-requested-skill').value,
      message: document.getElementById('req-message').value.trim(),
    };

    try {
      await apiFetch('/api/requests', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      dialog.close();
      showToast('Skill-exchange request sent!');
      await loadMatches();
    } catch (err) {
      errBox.textContent = err.message;
      errBox.classList.remove('hidden');
    }
  });

  await loadMatches();
});
