import { UserModel, sanitizeUser } from '../models/User.js';
import { SkillModel } from '../models/Skill.js';
import { RequestModel } from '../models/Request.js';
import { SessionModel } from '../models/Session.js';
import { ReviewModel } from '../models/Review.js';
import { ReportModel } from '../models/Report.js';
import {
  computeMutualMatches,
  calculateProfileCompletion,
} from '../utils/skillMatching.js';

export function getUsers(req, res) {
  const search = String(req.query.search || '').trim().toLowerCase();
  const department = String(req.query.department || '').trim().toLowerCase();
  const skillType = String(req.query.skillType || '').trim();

  const allSkills = SkillModel.findAll();
  const allReviews = ReviewModel.findAll();
  const allSessions = SessionModel.findAll();

  const students = UserModel.findAll()
    .filter((u) => u.role !== 'admin' && u.status !== 'suspended')
    .map((u) => {
      const userSkills = allSkills.filter((s) => s.userId === u._id);
      const userReviews = allReviews.filter((r) => r.reviewedUserId === u._id);
      const completedExchanges = allSessions.filter(
        (s) =>
          s.status === 'Completed' &&
          (s.teacherId === u._id || s.learnerId === u._id)
      ).length;

      const avgRating =
        userReviews.length > 0
          ? Number(
              (
                userReviews.reduce((sum, r) => sum + Number(r.rating), 0) /
                userReviews.length
              ).toFixed(1)
            )
          : null;

      return {
        ...sanitizeUser(u),
        teachSkills: userSkills.filter((s) => s.skillType === 'Teach'),
        learnSkills: userSkills.filter((s) => s.skillType === 'Learn'),
        averageRating: avgRating,
        reviewCount: userReviews.length,
        completedExchanges,
      };
    })
    .filter((student) => {
      if (department && student.department.toLowerCase() !== department) {
        return false;
      }
      if (search) {
        const inProfile =
          student.name.toLowerCase().includes(search) ||
          student.university.toLowerCase().includes(search) ||
          student.department.toLowerCase().includes(search) ||
          (student.bio || '').toLowerCase().includes(search);
        const inSkills = [...student.teachSkills, ...student.learnSkills].some(
          (s) =>
            s.skillName.toLowerCase().includes(search) &&
            (!skillType || s.skillType === skillType)
        );
        if (!inProfile && !inSkills) return false;
      } else if (skillType) {
        const hasType =
          skillType === 'Teach'
            ? student.teachSkills.length > 0
            : student.learnSkills.length > 0;
        if (!hasType) return false;
      }
      return true;
    });

  return res.json({ users: students });
}

export function getUserById(req, res) {
  const user = UserModel.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'Student profile not found.' });
  }

  const userSkills = SkillModel.findByUserId(user._id);
  const reviews = ReviewModel.findByReviewedUserId(user._id).map((r) => {
    const reviewer = UserModel.findById(r.reviewerId);
    return {
      ...r,
      reviewerName: reviewer ? reviewer.name : 'Student',
      reviewerUniversity: reviewer ? reviewer.university : '',
      reviewerPicture: reviewer ? reviewer.profilePicture : '',
    };
  });

  const completedSessions = SessionModel.findByUserId(user._id).filter(
    (s) => s.status === 'Completed'
  );

  const avgRating =
    reviews.length > 0
      ? Number(
          (
            reviews.reduce((sum, r) => sum + Number(r.rating), 0) / reviews.length
          ).toFixed(1)
        )
      : null;

  return res.json({
    user: sanitizeUser(user),
    teachSkills: userSkills.filter((s) => s.skillType === 'Teach'),
    learnSkills: userSkills.filter((s) => s.skillType === 'Learn'),
    completedExchanges: completedSessions.length,
    averageRating: avgRating,
    reviews,
    profileCompletion: calculateProfileCompletion(user, userSkills),
  });
}

export function updateProfile(req, res) {
  const allowedFields = ['name', 'university', 'department', 'semester', 'bio', 'profilePicture'];
  const updates = {};

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updates[field] = String(req.body[field]).trim();
    }
  }

  if (updates.name !== undefined && updates.name.length < 2) {
    return res.status(400).json({ error: 'Name must be at least 2 characters.' });
  }
  if (updates.university !== undefined && updates.university.length < 2) {
    return res.status(400).json({ error: 'University is required.' });
  }
  if (updates.department !== undefined && updates.department.length < 2) {
    return res.status(400).json({ error: 'Department is required.' });
  }

  const updated = UserModel.updateById(req.user._id, updates);
  const skills = SkillModel.findByUserId(req.user._id);

  return res.json({
    user: sanitizeUser(updated),
    profileCompletion: calculateProfileCompletion(updated, skills),
  });
}

export function getDashboard(req, res) {
  const userId = req.user._id;
  const allUsers = UserModel.findAll();
  const allSkills = SkillModel.findAll();
  const allReviews = ReviewModel.findAll();
  const userSkills = allSkills.filter((s) => s.userId === userId);
  const userRequests = RequestModel.findByUserId(userId);
  const userSessions = SessionModel.findByUserId(userId);

  const matches = computeMutualMatches({
    currentUserId: userId,
    users: allUsers,
    skills: allSkills,
    reviews: allReviews,
  });

  const pendingIncoming = userRequests.filter(
    (r) => r.receiverId === userId && r.status === 'Pending'
  );
  const pendingOutgoing = userRequests.filter(
    (r) => r.senderId === userId && r.status === 'Pending'
  );

  const upcomingSessions = userSessions
    .filter((s) => s.status === 'Scheduled')
    .map((s) => {
      const partnerId = s.teacherId === userId ? s.learnerId : s.teacherId;
      const partner = UserModel.findById(partnerId);
      return {
        ...s,
        partnerName: partner ? partner.name : 'Student',
        partnerPicture: partner ? partner.profilePicture : '',
        roleInSession: s.teacherId === userId ? 'Teaching' : 'Learning',
      };
    });

  const completedSessions = userSessions.filter((s) => s.status === 'Completed');

  // Build chronological recent activity feed from requests, sessions, and reviews
  const recentActivity = [];
  for (const r of userRequests) {
    const otherId = r.senderId === userId ? r.receiverId : r.senderId;
    const other = UserModel.findById(otherId);
    const direction = r.senderId === userId ? 'Sent to' : 'Received from';
    recentActivity.push({
      type: 'request',
      title: `${direction} ${other ? other.name : 'Student'}: ${r.offeredSkill} ↔ ${r.requestedSkill}`,
      status: r.status,
      timestamp: r.createdAt,
    });
  }
  for (const s of userSessions) {
    const otherId = s.teacherId === userId ? s.learnerId : s.teacherId;
    const other = UserModel.findById(otherId);
    recentActivity.push({
      type: 'session',
      title: `Session with ${other ? other.name : 'Student'} on ${s.skillName} (${s.sessionDate})`,
      status: s.status,
      timestamp: s.createdAt,
    });
  }
  recentActivity.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return res.json({
    user: sanitizeUser(req.user),
    profileCompletion: calculateProfileCompletion(req.user, userSkills),
    teachSkills: userSkills.filter((s) => s.skillType === 'Teach'),
    learnSkills: userSkills.filter((s) => s.skillType === 'Learn'),
    suggestedMatches: matches.slice(0, 4),
    totalMatches: matches.length,
    pendingRequestsCount: pendingIncoming.length + pendingOutgoing.length,
    pendingIncomingCount: pendingIncoming.length,
    upcomingSessions,
    completedExchangesCount: completedSessions.length,
    recentActivity: recentActivity.slice(0, 6),
  });
}

export function submitReport(req, res) {
  const reportedUserId = String(req.body?.reportedUserId || '').trim();
  const reason = String(req.body?.reason || '').trim();
  const details = String(req.body?.details || '').trim();

  if (!reportedUserId || reason.length < 3) {
    return res.status(400).json({ error: 'Target student and report reason are required.' });
  }
  if (reportedUserId === req.user._id) {
    return res.status(400).json({ error: 'You cannot report your own account.' });
  }
  const target = UserModel.findById(reportedUserId);
  if (!target) {
    return res.status(404).json({ error: 'Reported account not found.' });
  }

  const report = ReportModel.create({
    reporterId: req.user._id,
    reportedUserId,
    reason,
    details,
  });

  return res.status(201).json({ report });
}
