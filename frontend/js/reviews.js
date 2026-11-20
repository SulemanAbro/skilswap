import {
  requireAuthenticatedWorkspace,
  apiFetch,
  escapeHTML,
  formatDate,
  showToast,
} from './main.js';

document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuthenticatedWorkspace('reviews', 'Ratings & Reviews');
  if (!user) return;

  let selectedRating = 5;
  const ratingInput = document.getElementById('review-rating-value');
  const sessionSelect = document.getElementById('review-session-id');
  const form = document.getElementById('submit-review-form');
  const errBox = document.getElementById('review-error');

  document.querySelectorAll('.star-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      selectedRating = Number(btn.dataset.star);
      ratingInput.value = String(selectedRating);
      document.querySelectorAll('.star-btn').forEach((b) => {
        b.classList.toggle('active', Number(b.dataset.star) === selectedRating);
      });
    });
  });

  async function loadReviews() {
    const data = await apiFetch('/api/reviews/me');
    const eligible = data.eligibleSessions || [];
    const received = data.received || [];
    const given = data.given || [];

    const submitPanel = document.getElementById('review-submit-panel');
    const noEligibleBox = document.getElementById('no-eligible-sessions');

    if (eligible.length === 0) {
      form.classList.add('hidden');
      noEligibleBox.classList.remove('hidden');
    } else {
      form.classList.remove('hidden');
      noEligibleBox.classList.add('hidden');
      sessionSelect.innerHTML = eligible
        .map(
          (s) =>
            `<option value="${escapeHTML(s._id)}">${escapeHTML(s.partnerName)} — ${escapeHTML(s.skillName)} (${escapeHTML(s.sessionDate)})</option>`
        )
        .join('');
    }

    const renderList = (items, emptyText, isGiven) => {
      if (items.length === 0) {
        return `<p style="color: var(--text-secondary); font-size: 14px;">${emptyText}</p>`;
      }
      return items
        .map(
          (r) => `
          <article class="review-card">
            <div class="review-head">
              <div>
                <strong>${escapeHTML(isGiven ? `To ${r.reviewedName}` : r.reviewerName)}</strong>
                <div class="meta-line">
                  <span>${escapeHTML(r.skillName || 'Skill Exchange')}</span>
                  <span class="meta-sep">·</span>
                  <span>${formatDate(r.createdAt)}</span>
                </div>
              </div>
              <span class="star-rating tabular-nums">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)} (${r.rating}.0)</span>
            </div>
            <p style="font-size: 14px; color: var(--text-secondary);">${escapeHTML(r.comment)}</p>
          </article>`
        )
        .join('');
    };

    document.getElementById('reviews-received-list').innerHTML = renderList(
      received,
      'You have not received any peer reviews yet.',
      false
    );
    document.getElementById('reviews-given-list').innerHTML = renderList(
      given,
      'You have not submitted any reviews yet.',
      true
    );
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errBox.classList.add('hidden');

    const payload = {
      sessionId: sessionSelect.value,
      rating: Number(ratingInput.value),
      comment: document.getElementById('review-comment').value.trim(),
    };

    try {
      await apiFetch('/api/reviews', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      document.getElementById('review-comment').value = '';
      showToast('Review submitted!');
      await loadReviews();
    } catch (err) {
      errBox.textContent = err.message;
      errBox.classList.remove('hidden');
    }
  });

  await loadReviews();
});
