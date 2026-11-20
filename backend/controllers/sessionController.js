import { SessionModel } from '../models/Session.js';
import { RequestModel } from '../models/Request.js';
import { UserModel } from '../models/User.js';
import { validateSessionInput } from '../utils/validation.js';

function hydrateSession(s) {
  const teacher = UserModel.findById(s.teacherId);
  const learner = UserModel.findById(s.learnerId);
  return {
    ...s,
    teacher: teacher
      ? {
          _id: teacher._id,
          name: teacher.name,
          university: teacher.university,
          profilePicture: teacher.profilePicture || '',
        }
      : null,
    learner: learner
      ? {
          _id: learner._id,
          name: learner.name,
          university: learner.university,
          profilePicture: learner.profilePicture || '',
        }
      : null,
  };
}

export function createSession(req, res) {
  const { valid, errors, sanitized } = validateSessionInput(req.body);
  if (!valid) {
    return res.status(400).json({ error: errors[0], errors });
  }

  const request = RequestModel.findById(sanitized.requestId);
  if (!request) {
    return res.status(404).json({ error: 'Exchange request not found.' });
  }
  if (
    request.senderId !== req.user._id &&
    request.receiverId !== req.user._id
  ) {
    return res.status(403).json({
      error: 'You are not a participant of this exchange request.',
    });
  }
  if (request.status !== 'Accepted') {
    return res.status(400).json({
      error: 'Learning sessions can only be scheduled from accepted exchange requests.',
    });
  }

  // Determine teacher & learner based on offered/requested skill or explicit role
  let teacherId = req.body.teacherId;
  let learnerId = req.body.learnerId;

  if (!teacherId || !learnerId) {
    if (
      sanitized.skillName.toLowerCase() === request.requestedSkill.toLowerCase()
    ) {
      teacherId = request.receiverId;
      learnerId = request.senderId;
    } else {
      teacherId = request.senderId;
      learnerId = request.receiverId;
    }
  }

  const created = SessionModel.create({
    requestId: request._id,
    teacherId,
    learnerId,
    skillName: sanitized.skillName,
    exchangeSkill:
      sanitized.exchangeSkill ||
      (teacherId === request.senderId
        ? request.requestedSkill
        : request.offeredSkill),
    sessionDate: sanitized.sessionDate,
    sessionTime: sanitized.sessionTime,
    meetingType: sanitized.meetingType,
    description: sanitized.description,
  });

  return res.status(201).json({ session: hydrateSession(created) });
}

export function getSessions(req, res) {
  const userSessions = SessionModel.findByUserId(req.user._id)
    .map(hydrateSession)
    .sort((a, b) => a.sessionDate.localeCompare(b.sessionDate));

  const acceptedRequests = RequestModel.findByUserId(req.user._id)
    .filter((r) => r.status === 'Accepted')
    .map((r) => {
      const sender = UserModel.findById(r.senderId);
      const receiver = UserModel.findById(r.receiverId);
      return {
        ...r,
        senderName: sender ? sender.name : 'Student',
        receiverName: receiver ? receiver.name : 'Student',
      };
    });

  return res.json({
    sessions: userSessions,
    acceptedRequests,
  });
}

export function updateSession(req, res) {
  const session = SessionModel.findById(req.params.id);
  if (!session) {
    return res.status(404).json({ error: 'Learning session not found.' });
  }
  if (
    session.teacherId !== req.user._id &&
    session.learnerId !== req.user._id
  ) {
    return res.status(403).json({
      error: 'Only session participants can update this session.',
    });
  }

  const updates = {};
  if (req.body.status !== undefined) {
    const nextStatus = String(req.body.status).trim();
    if (!['Scheduled', 'Completed', 'Cancelled'].includes(nextStatus)) {
      return res.status(400).json({ error: 'Invalid session status.' });
    }
    updates.status = nextStatus;

    // Also mark originating request Completed when session completes
    if (nextStatus === 'Completed' && session.requestId) {
      const originReq = RequestModel.findById(session.requestId);
      if (originReq && originReq.status === 'Accepted') {
        RequestModel.updateById(originReq._id, { status: 'Completed' });
      }
    }
  }

  if (req.body.sessionDate) updates.sessionDate = String(req.body.sessionDate).trim();
  if (req.body.sessionTime) updates.sessionTime = String(req.body.sessionTime).trim();
  if (req.body.meetingType) updates.meetingType = String(req.body.meetingType).trim();
  if (req.body.description !== undefined) {
    updates.description = String(req.body.description).trim();
  }

  const updated = SessionModel.updateById(session._id, updates);
  return res.json({ session: hydrateSession(updated) });
}
