import {
  requireAuthenticatedWorkspace,
  apiFetch,
  escapeHTML,
  renderAvatar,
  formatDate,
  statusClass,
  showToast,
} from './main.js';

document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuthenticatedWorkspace('requests', 'Exchange Requests');
  if (!user) return;

  let activeTab = 'received';
  let data = { received: [], sent: [] };

  async function loadRequests() {
    data = await apiFetch('/api/requests');
    document.getElementById('count-received').textContent = String(data.received.length);
    document.getElementById('count-sent').textContent = String(data.sent.length);
    renderRequests();
  }

  function renderRequests() {
    const listEl = document.getElementById('requests-list');
    const items = activeTab === 'received' ? data.received : data.sent;

    if (items.length === 0) {
      listEl.innerHTML = `
        <div class="empty-state">
          <h3>No ${activeTab} exchange requests</h3>
          <p>${
            activeTab === 'received'
              ? 'When peers propose a skill exchange with you, their requests will appear here.'
              : 'Browse your Smart Matches to send your first skill-exchange request.'
          }</p>
          <a href="/matches.html" class="btn btn-primary btn-sm">View Skill Matches</a>
        </div>`;
      return;
    }

    listEl.innerHTML = items
      .map((r) => {
        const peer = activeTab === 'received' ? r.sender : r.receiver;
        const peerName = peer ? peer.name : 'Student';
        const peerMeta = peer ? `${peer.university} · ${peer.department}` : '';

        let actionButtons = '';
        if (activeTab === 'received' && r.status === 'Pending') {
          actionButtons = `
            <button type="button" class="btn btn-primary btn-sm" data-status-id="${escapeHTML(r._id)}" data-next-status="Accepted">Accept Request</button>
            <button type="button" class="btn btn-danger btn-sm" data-status-id="${escapeHTML(r._id)}" data-next-status="Rejected">Decline</button>
          `;
        } else if (activeTab === 'sent' && r.status === 'Pending') {
          actionButtons = `
            <button type="button" class="btn btn-secondary btn-sm" data-status-id="${escapeHTML(r._id)}" data-next-status="Cancelled">Cancel Request</button>
          `;
        } else if (r.status === 'Accepted') {
          actionButtons = `
            <a href="/sessions.html?requestId=${encodeURIComponent(r._id)}" class="btn btn-primary btn-sm">Schedule Learning Session</a>
          `;
        }

        return `
          <article class="match-card" style="margin-bottom: 16px;">
            <div class="match-card-top">
              <div class="match-person">
                ${renderAvatar(peer)}
                <div>
                  <strong style="font-size: 16px;">${escapeHTML(peerName)}</strong>
                  <div class="meta-line">
                    <span>${escapeHTML(peerMeta)}</span>
                    <span class="meta-sep">·</span>
                    <span>${formatDate(r.createdAt)}</span>
                  </div>
                </div>
              </div>
              <span class="status-tag ${statusClass(r.status)}">${escapeHTML(r.status)}</span>
            </div>
            <div class="exchange-flow">
              <div>
                <div class="exchange-col-label">${activeTab === 'received' ? 'They Offer' : 'You Offer'}</div>
                <div class="exchange-skill-item">${escapeHTML(r.offeredSkill)}</div>
              </div>
              <div>
                <div class="exchange-col-label">${activeTab === 'received' ? 'They Want to Learn' : 'You Want to Learn'}</div>
                <div class="exchange-skill-item">${escapeHTML(r.requestedSkill)}</div>
              </div>
            </div>
            ${r.message ? `<p style="font-size: 14px; color: var(--text-secondary);">"${escapeHTML(r.message)}"</p>` : ''}
            <div class="card-actions">
              ${actionButtons}
              ${peer ? `<a href="/profile.html?id=${encodeURIComponent(peer._id)}" class="btn btn-secondary btn-sm">View Profile</a>` : ''}
            </div>
          </article>`;
      })
      .join('');

    document.querySelectorAll('[data-status-id]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        try {
          await apiFetch(`/api/requests/${encodeURIComponent(btn.dataset.statusId)}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status: btn.dataset.nextStatus }),
          });
          showToast(`Request marked as ${btn.dataset.nextStatus}.`);
          await loadRequests();
        } catch (err) {
          showToast(err.message, true);
        }
      });
    });
  }

  document.querySelectorAll('[data-req-tab]').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('[data-req-tab]').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      activeTab = tab.dataset.reqTab;
      renderRequests();
    });
  });

  await loadRequests();
});
