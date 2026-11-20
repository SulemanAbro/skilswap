import {
  requireAuthenticatedWorkspace,
  apiFetch,
  escapeHTML,
  showToast,
} from './main.js';

document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuthenticatedWorkspace('skills', 'Manage Skills');
  if (!user) return;

  let allSkills = [];
  let activeFilter = 'All';

  const editDialog = document.getElementById('edit-skill-dialog');
  const addForm = document.getElementById('add-skill-form');
  const editForm = document.getElementById('edit-skill-form');

  async function loadSkills() {
    const res = await apiFetch('/api/skills');
    allSkills = res.skills || [];
    renderSkills();
  }

  function renderSkills() {
    const teachContainer = document.getElementById('teach-skills-list');
    const learnContainer = document.getElementById('learn-skills-list');
    const teachPanel = document.getElementById('teach-panel');
    const learnPanel = document.getElementById('learn-panel');

    const teachSkills = allSkills.filter((s) => s.skillType === 'Teach');
    const learnSkills = allSkills.filter((s) => s.skillType === 'Learn');

    teachPanel.classList.toggle('hidden', activeFilter === 'Learn');
    learnPanel.classList.toggle('hidden', activeFilter === 'Teach');

    const renderList = (items, emptyLabel) => {
      if (items.length === 0) {
        return `<li class="skill-row"><p style="color: var(--text-secondary); font-size: 14px;">${emptyLabel}</p></li>`;
      }
      return items
        .map(
          (s) => `
          <li class="skill-row">
            <div>
              <div class="skill-row-title">${escapeHTML(s.skillName)}</div>
              <div class="meta-line" style="margin-top: 2px;">
                <span>${escapeHTML(s.skillLevel)}</span>
                ${s.description ? `<span class="meta-sep">·</span><span>${escapeHTML(s.description)}</span>` : ''}
              </div>
            </div>
            <div style="display: flex; gap: 8px; flex-shrink: 0;">
              <button type="button" class="btn btn-secondary btn-sm" data-edit-skill="${escapeHTML(s._id)}" aria-label="Edit ${escapeHTML(s.skillName)}">Edit</button>
              <button type="button" class="btn btn-danger btn-sm" data-delete-skill="${escapeHTML(s._id)}" aria-label="Remove ${escapeHTML(s.skillName)}">Remove</button>
            </div>
          </li>`
        )
        .join('');
    };

    teachContainer.innerHTML = renderList(
      teachSkills,
      'No teaching skills listed yet. Add one using the form.'
    );
    learnContainer.innerHTML = renderList(
      learnSkills,
      'No learning goals listed yet. Add a skill you want to learn.'
    );

    document.querySelectorAll('[data-edit-skill]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const skill = allSkills.find((s) => s._id === btn.dataset.editSkill);
        if (!skill) return;
        document.getElementById('edit-skill-id').value = skill._id;
        document.getElementById('edit-skill-name').value = skill.skillName;
        document.getElementById('edit-skill-type').value = skill.skillType;
        document.getElementById('edit-skill-level').value = skill.skillLevel;
        document.getElementById('edit-skill-desc').value = skill.description || '';
        editDialog.showModal();
      });
    });

    document.querySelectorAll('[data-delete-skill]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        try {
          await apiFetch(`/api/skills/${encodeURIComponent(btn.dataset.deleteSkill)}`, {
            method: 'DELETE',
          });
          showToast('Skill removed.');
          await loadSkills();
        } catch (err) {
          showToast(err.message, true);
        }
      });
    });
  }

  document.querySelectorAll('[data-skill-filter]').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('[data-skill-filter]').forEach((b) => b.classList.remove('active'));
      tab.classList.add('active');
      activeFilter = tab.dataset.skillFilter;
      renderSkills();
    });
  });

  addForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const errBox = document.getElementById('add-skill-error');
    errBox.classList.add('hidden');

    const payload = {
      skillName: document.getElementById('skill-name').value.trim(),
      skillType: document.getElementById('skill-type').value,
      skillLevel: document.getElementById('skill-level').value,
      description: document.getElementById('skill-desc').value.trim(),
    };

    if (!payload.skillName) {
      errBox.textContent = 'Please enter a skill name.';
      errBox.classList.remove('hidden');
      return;
    }

    try {
      await apiFetch('/api/skills', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      addForm.reset();
      showToast('Skill added to your profile.');
      await loadSkills();
    } catch (err) {
      errBox.textContent = err.message;
      errBox.classList.remove('hidden');
    }
  });

  document.getElementById('close-skill-dialog').addEventListener('click', () => {
    editDialog.close();
  });

  editForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-skill-id').value;
    const payload = {
      skillName: document.getElementById('edit-skill-name').value.trim(),
      skillType: document.getElementById('edit-skill-type').value,
      skillLevel: document.getElementById('edit-skill-level').value,
      description: document.getElementById('edit-skill-desc').value.trim(),
    };
    try {
      await apiFetch(`/api/skills/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      editDialog.close();
      showToast('Skill updated.');
      await loadSkills();
    } catch (err) {
      showToast(err.message, true);
    }
  });

  await loadSkills();
});
