import test from 'node:test';
import assert from 'node:assert/strict';

import {
  computeMutualMatches,
  calculateProfileCompletion,
} from '../utils/skillMatching.js';
import {
  validateRegistrationInput,
  validateSkillInput,
  validateRequestTransition,
  validateSessionInput,
  validateReviewEligibility,
  validateReviewInput,
} from '../utils/validation.js';
import {
  hashPassword,
  verifyPassword,
  signToken,
  verifyToken,
} from '../utils/crypto.js';

test('computeMutualMatches finds bidirectional pairs and excludes non-mutual or suspended users', () => {
  const users = [
    { _id: 'u1', name: 'Ahmed', university: 'U1', department: 'CS', semester: '6', role: 'student', status: 'active' },
    { _id: 'u2', name: 'Sara', university: 'U2', department: 'Design', semester: '5', role: 'student', status: 'active' },
    { _id: 'u3', name: 'OneWay', university: 'U3', department: 'Math', semester: '4', role: 'student', status: 'active' },
    { _id: 'u4', name: 'Suspended', university: 'U4', department: 'Art', semester: '3', role: 'student', status: 'suspended' },
    { _id: 'u5', name: 'Admin', university: 'U5', department: 'Staff', semester: 'Staff', role: 'admin', status: 'active' },
  ];

  const skills = [
    { _id: 's1', userId: 'u1', skillName: 'Python Programming', skillType: 'Teach', skillLevel: 'Advanced' },
    { _id: 's2', userId: 'u1', skillName: 'Graphic Design', skillType: 'Learn', skillLevel: 'Beginner' },
    { _id: 's3', userId: 'u2', skillName: 'Graphic Design', skillType: 'Teach', skillLevel: 'Advanced' },
    { _id: 's4', userId: 'u2', skillName: 'Python Programming', skillType: 'Learn', skillLevel: 'Beginner' },
    // u3 wants Python from u1, but teaches Biology which u1 doesn't want
    { _id: 's5', userId: 'u3', skillName: 'Biology', skillType: 'Teach', skillLevel: 'Advanced' },
    { _id: 's6', userId: 'u3', skillName: 'Python Programming', skillType: 'Learn', skillLevel: 'Beginner' },
    // u4 is mutual but suspended
    { _id: 's7', userId: 'u4', skillName: 'Graphic Design', skillType: 'Teach', skillLevel: 'Advanced' },
    { _id: 's8', userId: 'u4', skillName: 'Python Programming', skillType: 'Learn', skillLevel: 'Beginner' },
  ];

  const matches = computeMutualMatches({ currentUserId: 'u1', users, skills, reviews: [] });
  assert.equal(matches.length, 1);
  assert.equal(matches[0].user._id, 'u2');
  assert.equal(matches[0].iCanTeachThem[0].skillName, 'Python Programming');
  assert.equal(matches[0].theyCanTeachMe[0].skillName, 'Graphic Design');
  assert.ok(matches[0].compatibilityScore >= 80);
});

test('calculateProfileCompletion calculates exact completion percentage', () => {
  const user = {
    name: 'Ahmed',
    university: 'NUC',
    department: 'CS',
    semester: '6th',
    bio: 'Building Python systems and learning design.',
    profilePicture: '/img.jpg',
  };
  const skills = [
    { skillType: 'Teach', skillName: 'Python' },
    { skillType: 'Learn', skillName: 'UI/UX' },
  ];
  assert.equal(calculateProfileCompletion(user, skills), 100);
  assert.equal(calculateProfileCompletion(user, [{ skillType: 'Teach' }]), 85);
});

test('validateRequestTransition enforces valid sender/receiver state machine', () => {
  const pendingReq = {
    _id: 'r1',
    senderId: 'u1',
    receiverId: 'u2',
    status: 'Pending',
  };

  // Sender cannot accept own request
  assert.equal(
    validateRequestTransition({ request: pendingReq, nextStatus: 'Accepted', actorId: 'u1' }).allowed,
    false
  );
  // Receiver can accept
  assert.equal(
    validateRequestTransition({ request: pendingReq, nextStatus: 'Accepted', actorId: 'u2' }).allowed,
    true
  );
  // Sender can cancel pending
  assert.equal(
    validateRequestTransition({ request: pendingReq, nextStatus: 'Cancelled', actorId: 'u1' }).allowed,
    true
  );
  // Receiver cannot cancel sender's pending request
  assert.equal(
    validateRequestTransition({ request: pendingReq, nextStatus: 'Cancelled', actorId: 'u2' }).allowed,
    false
  );
  // Rejected request cannot become Accepted
  assert.equal(
    validateRequestTransition({
      request: { ...pendingReq, status: 'Rejected' },
      nextStatus: 'Accepted',
      actorId: 'u2',
    }).allowed,
    false
  );
});

test('validateReviewEligibility restricts reviews to completed sessions once per participant', () => {
  const scheduled = { _id: 'ses1', teacherId: 'u1', learnerId: 'u2', status: 'Scheduled' };
  const completed = { _id: 'ses2', teacherId: 'u1', learnerId: 'u2', status: 'Completed' };

  assert.equal(
    validateReviewEligibility({ session: scheduled, reviewerId: 'u1', existingReviews: [] }).allowed,
    false
  );
  const ok = validateReviewEligibility({ session: completed, reviewerId: 'u1', existingReviews: [] });
  assert.equal(ok.allowed, true);
  assert.equal(ok.reviewedUserId, 'u2');

  // Duplicate review blocked
  assert.equal(
    validateReviewEligibility({
      session: completed,
      reviewerId: 'u1',
      existingReviews: [{ sessionId: 'ses2', reviewerId: 'u1' }],
    }).allowed,
    false
  );
  // Non-participant blocked
  assert.equal(
    validateReviewEligibility({ session: completed, reviewerId: 'u3', existingReviews: [] }).allowed,
    false
  );
});

test('input validation helpers reject malformed payloads and accept valid ones', () => {
  assert.equal(validateRegistrationInput({ name: 'A', email: 'bad', password: '123' }).valid, false);
  assert.equal(
    validateRegistrationInput({
      name: 'Maya Lin',
      email: 'maya@uni.edu',
      password: 'Password123',
      university: 'Metro Uni',
      department: 'Data Science',
      semester: '4th',
    }).valid,
    true
  );

  assert.equal(validateSkillInput({ skillName: 'Python', skillType: 'Invalid', skillLevel: 'Beginner' }).valid, false);
  assert.equal(validateSkillInput({ skillName: 'Python', skillType: 'Teach', skillLevel: 'Advanced' }).valid, true);

  assert.equal(validateSessionInput({ requestId: 'r1', skillName: 'Python', sessionDate: '2026-12-01', sessionTime: '14:00', meetingType: 'Online' }).valid, true);
  assert.equal(validateReviewInput({ sessionId: 's1', rating: 6, comment: 'Great!' }).valid, false);
  assert.equal(validateReviewInput({ sessionId: 's1', rating: 5, comment: 'Clear examples and pacing.' }).valid, true);
});

test('crypto password hashing and JWT verification work end-to-end', () => {
  const hash = hashPassword('MySecret99!');
  assert.equal(verifyPassword('MySecret99!', hash), true);
  assert.equal(verifyPassword('WrongPass', hash), false);

  const token = signToken({ userId: 'u1', role: 'student' }, 300);
  const decoded = verifyToken(token);
  assert.equal(decoded.userId, 'u1');
  assert.equal(decoded.role, 'student');
  assert.equal(verifyToken(token + 'tampered'), null);
});
