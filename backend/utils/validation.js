export const VALID_SKILL_TYPES = ['Teach', 'Learn'];
export const VALID_SKILL_LEVELS = ['Beginner', 'Intermediate', 'Advanced'];
export const VALID_MEETING_TYPES = ['Online', 'In-person'];
export const VALID_REQUEST_STATUSES = [
  'Pending',
  'Accepted',
  'Rejected',
  'Cancelled',
  'Completed',
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateRegistrationInput(data) {
  const errors = [];
  const name = String(data?.name || '').trim();
  const email = String(data?.email || '').trim().toLowerCase();
  const password = String(data?.password || '');
  const university = String(data?.university || '').trim();
  const department = String(data?.department || '').trim();
  const semester = String(data?.semester || '').trim();

  if (name.length < 2) errors.push('Full name must be at least 2 characters.');
  if (!EMAIL_REGEX.test(email)) errors.push('Please enter a valid email address.');
  if (password.length < 6) errors.push('Password must be at least 6 characters.');
  if (university.length < 2) errors.push('University name is required.');
  if (department.length < 2) errors.push('Department is required.');
  if (semester.length < 1) errors.push('Semester is required.');

  return {
    valid: errors.length === 0,
    errors,
    sanitized: {
      name,
      email,
      password,
      university,
      department,
      semester,
      profilePicture: String(data?.profilePicture || '').trim(),
      bio: String(data?.bio || '').trim(),
    },
  };
}

export function validateSkillInput(data) {
  const errors = [];
  const skillName = String(data?.skillName || '').trim();
  const skillType = String(data?.skillType || '').trim();
  const skillLevel = String(data?.skillLevel || '').trim();
  const description = String(data?.description || '').trim();

  if (skillName.length < 2) errors.push('Skill name must be at least 2 characters.');
  if (!VALID_SKILL_TYPES.includes(skillType)) {
    errors.push('Skill type must be either Teach or Learn.');
  }
  if (!VALID_SKILL_LEVELS.includes(skillLevel)) {
    errors.push('Skill level must be Beginner, Intermediate, or Advanced.');
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitized: { skillName, skillType, skillLevel, description },
  };
}

/**
 * State machine for Exchange Requests:
 * - Pending -> Accepted (receiver only)
 * - Pending -> Rejected (receiver only)
 * - Pending -> Cancelled (sender only)
 * - Accepted -> Completed (either participant or via session completion)
 */
export function validateRequestTransition({ request, nextStatus, actorId }) {
  if (!request) {
    return { allowed: false, reason: 'Exchange request not found.' };
  }
  if (!VALID_REQUEST_STATUSES.includes(nextStatus)) {
    return { allowed: false, reason: 'Invalid request status.' };
  }
  const isSender = request.senderId === actorId;
  const isReceiver = request.receiverId === actorId;
  if (!isSender && !isReceiver) {
    return { allowed: false, reason: 'You are not a participant in this request.' };
  }

  const current = request.status;
  if (current === 'Pending') {
    if (nextStatus === 'Accepted' || nextStatus === 'Rejected') {
      if (!isReceiver) {
        return {
          allowed: false,
          reason: 'Only the receiving student can accept or reject a pending request.',
        };
      }
      return { allowed: true };
    }
    if (nextStatus === 'Cancelled') {
      if (!isSender) {
        return {
          allowed: false,
          reason: 'Only the sending student can cancel a pending request.',
        };
      }
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: `Cannot transition request from Pending to ${nextStatus}.`,
    };
  }

  if (current === 'Accepted' && nextStatus === 'Completed') {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: `Transition from ${current} to ${nextStatus} is not permitted.`,
  };
}

export function validateSessionInput(data) {
  const errors = [];
  const requestId = String(data?.requestId || '').trim();
  const skillName = String(data?.skillName || '').trim();
  const sessionDate = String(data?.sessionDate || '').trim();
  const sessionTime = String(data?.sessionTime || '').trim();
  const meetingType = String(data?.meetingType || '').trim();
  const description = String(data?.description || '').trim();

  if (!requestId) errors.push('An accepted exchange request is required.');
  if (skillName.length < 2) errors.push('Skill name is required.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(sessionDate)) {
    errors.push('Valid session date (YYYY-MM-DD) is required.');
  }
  if (!/^\d{2}:\d{2}$/.test(sessionTime)) {
    errors.push('Valid session time (HH:MM) is required.');
  }
  if (!VALID_MEETING_TYPES.includes(meetingType)) {
    errors.push('Meeting type must be Online or In-person.');
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitized: {
      requestId,
      skillName,
      exchangeSkill: String(data?.exchangeSkill || '').trim(),
      sessionDate,
      sessionTime,
      meetingType,
      description,
    },
  };
}

export function validateReviewEligibility({ session, reviewerId, existingReviews }) {
  if (!session) {
    return { allowed: false, reason: 'Learning session not found.' };
  }
  if (session.status !== 'Completed') {
    return {
      allowed: false,
      reason: 'Reviews are restricted to completed learning sessions.',
    };
  }
  const isParticipant =
    session.teacherId === reviewerId || session.learnerId === reviewerId;
  if (!isParticipant) {
    return {
      allowed: false,
      reason: 'Only participants of this session can submit a review.',
    };
  }
  const alreadyReviewed = existingReviews.some(
    (r) => r.sessionId === session._id && r.reviewerId === reviewerId
  );
  if (alreadyReviewed) {
    return {
      allowed: false,
      reason: 'You have already submitted feedback for this session.',
    };
  }
  return {
    allowed: true,
    reviewedUserId:
      session.teacherId === reviewerId ? session.learnerId : session.teacherId,
  };
}

export function validateReviewInput(data) {
  const errors = [];
  const rating = Number(data?.rating);
  const comment = String(data?.comment || '').trim();
  const sessionId = String(data?.sessionId || '').trim();

  if (!sessionId) errors.push('Session ID is required.');
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    errors.push('Rating must be a whole number from 1 to 5.');
  }
  if (comment.length < 5) {
    errors.push('Written review must be at least 5 characters.');
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitized: { sessionId, rating, comment },
  };
}
