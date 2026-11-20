import { UserModel, sanitizeUser } from '../models/User.js';
import { SkillModel } from '../models/Skill.js';
import { hashPassword, verifyPassword, signToken } from '../utils/crypto.js';
import { validateRegistrationInput } from '../utils/validation.js';
import { calculateProfileCompletion } from '../utils/skillMatching.js';

export function register(req, res) {
  const { valid, errors, sanitized } = validateRegistrationInput(req.body);
  if (!valid) {
    return res.status(400).json({ error: errors[0], errors });
  }

  const existing = UserModel.findByEmail(sanitized.email);
  if (existing) {
    return res.status(409).json({
      error: 'An account with this email address is already registered.',
    });
  }

  const passwordHash = hashPassword(sanitized.password);
  const newUser = UserModel.create({
    name: sanitized.name,
    email: sanitized.email,
    passwordHash,
    university: sanitized.university,
    department: sanitized.department,
    semester: sanitized.semester,
    profilePicture: sanitized.profilePicture,
    bio: sanitized.bio,
    role: 'student',
    status: 'active',
  });

  // Optionally create initial skills if provided during registration
  if (Array.isArray(req.body.initialSkills)) {
    for (const s of req.body.initialSkills) {
      if (s && s.skillName && (s.skillType === 'Teach' || s.skillType === 'Learn')) {
        SkillModel.create({
          userId: newUser._id,
          skillName: String(s.skillName).trim(),
          skillType: s.skillType,
          skillLevel: s.skillLevel || 'Intermediate',
          description: String(s.description || '').trim(),
        });
      }
    }
  }

  const token = signToken({ userId: newUser._id, role: newUser.role });
  return res.status(201).json({
    token,
    user: sanitizeUser(newUser),
  });
}

export function login(req, res) {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const user = UserModel.findByEmail(email);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid email address or password.' });
  }

  if (user.status === 'suspended') {
    return res.status(403).json({
      error: 'This account has been suspended. Please contact platform administration.',
    });
  }

  const token = signToken({ userId: user._id, role: user.role });
  return res.json({
    token,
    user: sanitizeUser(user),
  });
}

export function me(req, res) {
  const skills = SkillModel.findByUserId(req.user._id);
  const completion = calculateProfileCompletion(req.user, skills);
  return res.json({
    user: sanitizeUser(req.user),
    profileCompletion: completion,
  });
}
