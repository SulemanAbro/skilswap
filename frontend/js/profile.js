import {
  requireAuthenticatedWorkspace,
  apiFetch,
  escapeHTML,
  renderAvatar,
  formatDate,
  setAuthSession,
  getToken,
  showToast,
} from './main.js';

document.addEventListener('DOMContentLoaded', async () => {
  const currentUser = await requireAuthenticatedWorkspace('profile', 'Student Profile');
  if (!currentUser) return;

  const params = new URLSearchParams(window.location.search);
  const viewUserId = params.get('id') || currentUser._id;
  const isOwnProfile = viewUserId === currentUser._id;

  const editPanel = document.getElementById('edit-profile-panel');
  const reportBtn = document.getElementById('open-report-btn');
  const reportDialog = document.getElementById('report-dialog');

  async function loadProfile() {
    try {
      const data = await apiFetch(`/api/users/${encodeURIComponent(viewUserId)}`);
      const u = data.user;

      document.getElementById('profile-avatar-slot').innerHTML = renderAvatar(u, 'avatar-lg');
      document.getElementById('profile-name').textContent = u.name;
      document.getElementById('profile-meta').innerHTML = `
        <span>${escapeHTML(u.university)}</span>
        <span class="meta-sep">·</span>
        <span>${escapeHTML(u.department)}</span>
        <span class="meta-sep">·</span>
        <span>${escapeHTML(u.semester)}</span>
      `;
      document.getElementById('profile-bio').textContent =
        u.bio || 'No personal introduction added yet.';

      document.getElementById('stat-exchanges').textContent = String(data.completedExchanges);
      document.getElementById('stat-rating').textContent =
        data.averageRating !== null ? `${data.averageRating} / 5` : 'New';
      document.getElementById('stat-reviews').textContent = String(data.reviews.length);

      // Teach skills
      const teachEl = document.getElementById('profile-teach-skills');
      teachEl.innerHTML =
        data.teachSkills.length === 0
          ? `<li class="skill-row"><span style="color: var(--text-muted);">No teaching skills listed.</span></li>`
          : data.teachSkills
              .map(
                (s) => `
                <li class="skill-row">
                  <div>
                    <div class="skill-row-title">${escapeHTML(s.skillName)}</div>
                    <div class="skill-row-desc">${escapeHTML(s.description || 'Peer mentorship available')}</div>
                  </div>
                  <span class="meta-line tabular-nums">${escapeHTML(s.skillLevel)}</span>
                </li>`
              )
              .join('');

      // Learn skills
      const learnEl = document.getElementById('profile-learn-skills');
      learnEl.innerHTML =
        data.learnSkills.length === 0
          ? `<li class="skill-row"><span style="color: var(--text-muted);">No learning interests listed.</span></li>`
          : data.learnSkills
              .map(
                (s) => `
                <li class="skill-row">
                  <div>
                    <div class="skill-row-title">${escapeHTML(s.skillName)}</div>
                    <div class="skill-row-desc">${escapeHTML(s.description || 'Interested in peer learning')}</div>
                  </div>
                  <span class="meta-line tabular-nums">${escapeHTML(s.skillLevel)}</span>
                </li>`
              )
              .join('');

      // Reviews
      const reviewsEl = document.getElementById('profile-reviews-list');
      if (data.reviews.length === 0) {
        reviewsEl.innerHTML = `<p style="color: var(--text-secondary); font-size: 14px;">No peer reviews yet. Reviews unlock after completing an exchange session.</p>`;
      } else {
        reviewsEl.innerHTML = data.reviews
          .map(
            (r) => `
            <article class="review-card">
              <div class="review-head">
                <div>
                  <strong>${escapeHTML(r.reviewerName)}</strong>
                  <span class="meta-line">${escapeHTML(r.reviewerUniversity)} · ${formatDate(r.createdAt)}</span>
                </div>
                <span class="star-rating tabular-nums">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)} (${r.rating}.0)</span>
              </div>
              <p style="font-size: 14px; color: var(--text-secondary);">${escapeHTML(r.comment)}</p>
            </article>`
          )
          .join('');
      }

      if (isOwnProfile) {
        editPanel.classList.remove('hidden');
        reportBtn.classList.add('hidden');
        document.getElementById('edit-name').value = u.name || '';
        document.getElementById('edit-university').value = u.university || '';
        document.getElementById('edit-department').value = u.department || '';
        document.getElementById('edit-semester').value = u.semester || '';
        document.getElementById('edit-avatar').value = u.profilePicture || '';
        document.getElementById('edit-bio').value = u.bio || '';
      } else {
        editPanel.classList.add('hidden');
        reportBtn.classList.remove('hidden');
      }
    } catch (err) {
      showToast(err.message, true);
    }
  }

  await loadProfile();

  const editForm = document.getElementById('edit-profile-form');
  if (editForm && isOwnProfile) {
    editForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const errBox = document.getElementById('profile-form-error');
      errBox.classList.add('hidden');

      const payload = {
        name: document.getElementById('edit-name').value.trim(),
        university: document.getElementById('edit-university').value.trim(),
        department: document.getElementById('edit-department').value.trim(),
        semester: document.getElementById('edit-semester').value.trim(),
        profilePicture: document.getElementById('edit-avatar').value.trim(),
        bio: document.getElementById('edit-bio').value.trim(),
      };

      try {
        const res = await apiFetch('/api/users/profile', {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        setAuthSession(getToken(), res.user);
        showToast('Profile updated successfully.');
        await loadProfile();
      } catch (err) {
        errBox.textContent = err.message;
        errBox.classList.remove('hidden');
      }
    });
  }

  if (reportBtn && reportDialog) {
    reportBtn.addEventListener('click', () => reportDialog.showModal());
    document.getElementById('close-report-dialog').addEventListener('click', () => reportDialog.close());

    document.getElementById('report-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await apiFetch('/api/users/report', {
          method: 'POST',
          body: JSON.stringify({
            reportedUserId: viewUserId,
            reason: document.getElementById('report-reason').value.trim(),
            details: document.getElementById('report-details').value.trim(),
          }),
        });
        reportDialog.close();
        showToast('Report submitted to platform administrators.');
      } catch (err) {
        showToast(err.message, true);
      }
    });
  }
});
