import {
  requireAuthenticatedWorkspace,
  apiFetch,
  escapeHTML,
  formatDate,
  statusClass,
  showToast,
} from './main.js';

document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuthenticatedWorkspace('admin', 'Admin Console');
  if (!user) return;

  if (user.role !== 'admin') {
    document.getElementById('admin-guard').classList.remove('hidden');
    document.getElementById('admin-content').classList.add('hidden');
    return;
  }

  async function loadOverview() {
    try {
      const data = await apiFetch('/api/admin/overview');
      const m = data.metrics;

      document.getElementById('adm-students').textContent = String(m.totalStudents);
      document.getElementById('adm-skills').textContent = String(m.totalSkills);
      document.getElementById('adm-requests').textContent = String(m.totalRequests);
      document.getElementById('adm-completed').textContent = String(m.completedExchanges);

      // Popular Skills Chart
      const maxTotal = Math.max(1, ...(data.popularSkills || []).map((s) => s.total));
      document.getElementById('popular-skills-chart').innerHTML = (data.popularSkills || [])
        .map((s) => {
          const pct = Math.round((s.total / maxTotal) * 100);
          return `
            <div class="skill-bar-row">
              <div>
                <div style="font-size: 13.5px; font-weight: 600;">${escapeHTML(s.skillName)}</div>
                <div style="font-size: 12px; color: var(--text-muted);">${s.teachCount} Teach · ${s.learnCount} Learn</div>
              </div>
              <div class="skill-bar-track">
                <div class="skill-bar-fill" style="width: ${pct}%;"></div>
              </div>
              <div class="tabular-nums" style="text-align: right; font-weight: 600;">${s.total}</div>
            </div>`;
        })
        .join('');

      // Students Directory Table
      document.getElementById('adm-users-tbody').innerHTML = (data.students || [])
        .map(
          (u) => `
          <tr>
            <td>
              <strong>${escapeHTML(u.name)}</strong>
              <div style="font-size: 12px; color: var(--text-muted);">${escapeHTML(u.email)}</div>
            </td>
            <td>${escapeHTML(u.university)} · ${escapeHTML(u.department)}</td>
            <td class="tabular-nums">${u.skillCount}</td>
            <td class="tabular-nums">${u.completedExchanges}</td>
            <td><span class="status-tag ${statusClass(u.status)}">${escapeHTML(u.status)}</span></td>
            <td>
              <button type="button" class="btn btn-sm ${
                u.status === 'suspended' ? 'btn-primary' : 'btn-danger'
              }" data-toggle-user="${escapeHTML(u._id)}" data-next-status="${
            u.status === 'suspended' ? 'active' : 'suspended'
          }">
                ${u.status === 'suspended' ? 'Reactivate' : 'Suspend'}
              </button>
            </td>
          </tr>`
        )
        .join('');

      document.querySelectorAll('[data-toggle-user]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          try {
            await apiFetch(
              `/api/admin/users/${encodeURIComponent(btn.dataset.toggleUser)}/status`,
              {
                method: 'PUT',
                body: JSON.stringify({ status: btn.dataset.nextStatus }),
              }
            );
            showToast(`Account updated to ${btn.dataset.nextStatus}.`);
            await loadOverview();
          } catch (err) {
            showToast(err.message, true);
          }
        });
      });

      // Exchange Requests Monitor
      document.getElementById('adm-requests-tbody').innerHTML = (data.requests || [])
        .map(
          (r) => `
          <tr>
            <td>${escapeHTML(r.senderName)} → ${escapeHTML(r.receiverName)}</td>
            <td>${escapeHTML(r.offeredSkill)} ↔ ${escapeHTML(r.requestedSkill)}</td>
            <td class="tabular-nums">${formatDate(r.createdAt)}</td>
            <td><span class="status-tag ${statusClass(r.status)}">${escapeHTML(r.status)}</span></td>
          </tr>`
        )
        .join('');

      // Reported Accounts Table
      document.getElementById('adm-reports-tbody').innerHTML = (data.reports || []).length === 0
        ? `<tr><td colspan="5" style="color: var(--text-muted);">No reported accounts or content.</td></tr>`
        : (data.reports || [])
            .map(
              (rep) => `
              <tr>
                <td>
                  <strong>${escapeHTML(rep.reportedName)}</strong>
                  <div style="font-size: 12px; color: var(--text-muted);">Reported by ${escapeHTML(rep.reporterName)}</div>
                </td>
                <td>
                  <strong>${escapeHTML(rep.reason)}</strong>
                  <div style="font-size: 12px; color: var(--text-secondary);">${escapeHTML(rep.details)}</div>
                </td>
                <td><span class="status-tag ${statusClass(rep.status)}">${escapeHTML(rep.status)}</span></td>
                <td>
                  ${
                    rep.status === 'Open'
                      ? `<div style="display:flex; gap:8px;">
                          <button type="button" class="btn btn-primary btn-sm" data-report-id="${escapeHTML(rep._id)}" data-report-status="Resolved">Resolve</button>
                          <button type="button" class="btn btn-secondary btn-sm" data-report-id="${escapeHTML(rep._id)}" data-report-status="Dismissed">Dismiss</button>
                        </div>`
                      : `<span style="font-size:12px; color:var(--text-muted);">Reviewed</span>`
                  }
                </td>
              </tr>`
            )
            .join('');

      document.querySelectorAll('[data-report-id]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          try {
            await apiFetch(`/api/admin/reports/${encodeURIComponent(btn.dataset.reportId)}`, {
              method: 'PUT',
              body: JSON.stringify({ status: btn.dataset.reportStatus }),
            });
            showToast(`Report marked as ${btn.dataset.reportStatus}.`);
            await loadOverview();
          } catch (err) {
            showToast(err.message, true);
          }
        });
      });
    } catch (err) {
      showToast(err.message, true);
    }
  }

  await loadOverview();
});
