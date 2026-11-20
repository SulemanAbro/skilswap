import { RequestModel } from '../models/Request.js';
import { UserModel } from '../models/User.js';
import { validateRequestTransition } from '../utils/validation.js';

function hydrateRequest(r) {
  const sender = UserModel.findById(r.senderId);
  const receiver = UserModel.findById(r.receiverId);
  return {
    ...r,
    sender: sender
      ? {
          _id: sender._id,
          name: sender.name,
          university: sender.university,
          department: sender.department,
          profilePicture: sender.profilePicture || '',
        }
      : null,
    receiver: receiver
      ? {
          _id: receiver._id,
          name: receiver.name,
          university: receiver.university,
          department: receiver.department,
          profilePicture: receiver.profilePicture || '',
        }
      : null,
  };
}

export function createRequest(req, res) {
  const receiverId = String(req.body?.receiverId || '').trim();
  const offeredSkill = String(req.body?.offeredSkill || '').trim();
  const requestedSkill = String(req.body?.requestedSkill || '').trim();
  const message = String(req.body?.message || '').trim();

  if (!receiverId || !offeredSkill || !requestedSkill) {
    return res.status(400).json({
      error: 'Target student, offered skill, and requested skill are required.',
    });
  }
  if (receiverId === req.user._id) {
    return res.status(400).json({
      error: 'You cannot send a skill-exchange request to yourself.',
    });
  }

  const receiver = UserModel.findById(receiverId);
  if (!receiver || receiver.status === 'suspended' || receiver.role === 'admin') {
    return res.status(404).json({ error: 'Target student account is unavailable.' });
  }

  const existingPending = RequestModel.findAll().find(
    (r) =>
      r.senderId === req.user._id &&
      r.receiverId === receiverId &&
      r.offeredSkill.toLowerCase() === offeredSkill.toLowerCase() &&
      r.requestedSkill.toLowerCase() === requestedSkill.toLowerCase() &&
      r.status === 'Pending'
  );
  if (existingPending) {
    return res.status(409).json({
      error: 'You already have a pending request with this student for those skills.',
    });
  }

  const created = RequestModel.create({
    senderId: req.user._id,
    receiverId,
    offeredSkill,
    requestedSkill,
    message,
  });

  return res.status(201).json({ request: hydrateRequest(created) });
}

export function getRequests(req, res) {
  const userRequests = RequestModel.findByUserId(req.user._id)
    .map(hydrateRequest)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return res.json({
    received: userRequests.filter((r) => r.receiverId === req.user._id),
    sent: userRequests.filter((r) => r.senderId === req.user._id),
    all: userRequests,
  });
}

export function updateRequestStatus(req, res) {
  const request = RequestModel.findById(req.params.id);
  const nextStatus = String(req.body?.status || '').trim();

  const check = validateRequestTransition({
    request,
    nextStatus,
    actorId: req.user._id,
  });

  if (!check.allowed) {
    return res.status(request ? 400 : 404).json({ error: check.reason });
  }

  const updated = RequestModel.updateById(request._id, { status: nextStatus });
  return res.json({ request: hydrateRequest(updated) });
}
