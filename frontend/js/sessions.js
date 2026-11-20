import {
  requireAuthenticatedWorkspace,
  apiFetch,
  escapeHTML,
  statusClass,
  showToast,
} from './main.js';

document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuthenticatedWorkspace('sessions', 'Learning Sessions');
  if (!user) return;

  const params = new URLSearchParams(window.location.search);
  const preselectRequestId = params.get('requestId');

  const requestSelect = document.getElementById('session-request-id');
  const skillInput = document.getElementById('session-skill');
  const dateInput = document.getElementById('session-date');
  const form = document.getElementById('schedule-session-form');
  const errBox = document.getElementById('session-form-error');

  // Default date to tomorrow
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  if (dateInput && !dateInput.value) dateInput.value = tomorrow;

  let acceptedRequests = [];

  async function loadSessions() {
    const res = await apiFetch('/api/sessions');
    const sessions = res.sessions || [];
    acceptedRequests = res.acceptedRequests || [];

    if (acceptedRequests.length === 0) {
      requestSelect.innerHTML = `<option value="">No accepted requests available</option>`;
    } else {
      requestSelect.innerHTML = acceptedRequests
        .map(
          (r) =>
            `<option value="${escapeHTML(r._id)}">${escapeHTML(r.senderName)} ↔ ${escapeHTML(r.receiverName)} (${escapeHTML(r.offeredSkill)} / ${escapeHTML(r.requestedSkill)})</option>`
        )
        .join('');
      if (preselectRequestId) {
        requestSelect.value = preselectRequestId;
      }
      syncDefaultSkill();
    }

    const tbody = document.getElementById('sessions-tbody');
    const emptyBox = document.getElementById('sessions-empty');
    const tableWrap = document.getElementById('sessions-table-wrap');

    if (sessions.length === 0) {
      tableWrap.classList.add('hidden');
      emptyBox.classList.remove('hidden');
      return;
    }

    tableWrap.classList.remove('hidden');
    emptyBox.classList.add('hidden');

    tbody.innerHTML = sessions
      .map((s) => {
        const teacherName = s.teacher ? s.teacher.name : 'Student';
        const learnerName = s.learner ? s.learner.name : 'Student';
        const actionCell =
          s.status === 'Scheduled'
            ? `<button type="button" class="btn btn-primary btn-sm" data-complete-session="${escapeHTML(s._id)}">Mark Completed</button>`
            : `<a href="/reviews.html" class="btn btn-secondary btn-sm">Leave Review</a>`;

        return `
          <tr>
            <td>
              <strong>${escapeHTML(s.skillName)}</strong>
              ${s.exchangeSkill ? `<div style="font-size:12px; color:var(--text-muted);">Swap with ${escapeHTML(s.exchangeSkill)}</div>` : ''}
            </td>
            <td>${escapeHTML(teacherName)}</td>
            <td>${escapeHTML(learnerName)}</td>
            <td class="tabular-nums">${escapeHTML(s.sessionDate)} · ${escapeHTML(s.sessionTime)}</td>
            <td>${escapeHTML(s.meetingType)}</td>
            <td><span class="status-tag ${statusClass(s.status)}">${escapeHTML(s.status)}</span></td>
            <td>${actionCell}</td>
          </tr>`;
      })
      .join('');

    document.querySelectorAll('[data-complete-session]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        try {
          await apiFetch(`/api/sessions/${encodeURIComponent(btn.dataset.completeSession)}`, {
            method: 'PUT',
            body: JSON.stringify({ status: 'Completed' }),
          });
          showToast('Session marked as completed. You can now submit a review!');
          await loadSessions();
        } catch (err) {
          showToast(err.message, true);
        }
      });
    });
  }

  function syncDefaultSkill() {
    const selected = acceptedRequests.find((r) => r._id === requestSelect.value);
    if (selected && skillInput) {
      skillInput.value =
        selected.senderId === user._id ? selected.offeredSkill : selected.requestedSkill;
    }
  }

  requestSelect.addEventListener('change', syncDefaultSkill);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errBox.classList.add('hidden');

    const payload = {
      requestId: requestSelect.value,
      skillName: skillInput.value.trim(),
      sessionDate: dateInput.value,
      sessionTime: document.getElementById('session-time').value,
      meetingType: document.getElementById('session-type').value,
      description: document.getElementById('session-desc').value.trim(),
    };

    if (!payload.requestId) {
      errBox.textContent = 'You need an accepted exchange request before scheduling a session.';
      errBox.classList.remove('hidden');
      return;
    }

    try {
      await apiFetch('/api/sessions', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      document.getElementById('session-desc').value = '';
      showToast('Learning session scheduled!');
      await loadSessions();
    } catch (err) {
      errBox.textContent = err.message;
      errBox.classList.remove('hidden');
    }
  });

  await loadSessions();
});
