import { SkillModel } from '../models/Skill.js';
import { validateSkillInput } from '../utils/validation.js';

export function getSkills(req, res) {
  const targetUserId = req.query.userId ? String(req.query.userId) : req.user._id;
  const typeFilter = req.query.type ? String(req.query.type) : '';

  let skills = SkillModel.findByUserId(targetUserId);
  if (typeFilter === 'Teach' || typeFilter === 'Learn') {
    skills = skills.filter((s) => s.skillType === typeFilter);
  }
  return res.json({ skills });
}

export function createSkill(req, res) {
  const { valid, errors, sanitized } = validateSkillInput(req.body);
  if (!valid) {
    return res.status(400).json({ error: errors[0], errors });
  }

  const existing = SkillModel.findByUserId(req.user._id).find(
    (s) =>
      s.skillType === sanitized.skillType &&
      s.skillName.toLowerCase() === sanitized.skillName.toLowerCase()
  );
  if (existing) {
    return res.status(409).json({
      error: `You already listed "${sanitized.skillName}" under ${sanitized.skillType} skills.`,
    });
  }

  const skill = SkillModel.create({
    userId: req.user._id,
    ...sanitized,
  });

  return res.status(201).json({ skill });
}

export function updateSkill(req, res) {
  const skill = SkillModel.findById(req.params.id);
  if (!skill) {
    return res.status(404).json({ error: 'Skill not found.' });
  }
  if (skill.userId !== req.user._id) {
    return res.status(403).json({ error: 'You can only manage your own skills.' });
  }

  const { valid, errors, sanitized } = validateSkillInput({
    skillName: req.body.skillName ?? skill.skillName,
    skillType: req.body.skillType ?? skill.skillType,
    skillLevel: req.body.skillLevel ?? skill.skillLevel,
    description: req.body.description ?? skill.description,
  });
  if (!valid) {
    return res.status(400).json({ error: errors[0], errors });
  }

  const updated = SkillModel.updateById(skill._id, sanitized);
  return res.json({ skill: updated });
}

export function deleteSkill(req, res) {
  const skill = SkillModel.findById(req.params.id);
  if (!skill) {
    return res.status(404).json({ error: 'Skill not found.' });
  }
  if (skill.userId !== req.user._id) {
    return res.status(403).json({ error: 'You can only remove your own skills.' });
  }

  SkillModel.deleteById(skill._id);
  return res.json({ message: 'Skill removed successfully.' });
}
