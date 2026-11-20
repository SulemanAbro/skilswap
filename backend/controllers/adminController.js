import { UserModel, sanitizeUser } from '../models/User.js';
import { SkillModel } from '../models/Skill.js';
import { RequestModel } from '../models/Request.js';
import { SessionModel } from '../models/Session.js';
import { ReviewModel } from '../models/Review.js';
import { ReportModel } from '../models/Report.js';

export function getAdminOverview(req, res) {
  const users = UserModel.findAll();
  const skills = SkillModel.findAll();
  const requests = RequestModel.findAll();
  const sessions = SessionModel.findAll();
  const reviews = ReviewModel.findAll();
  const reports = ReportModel.findAll();

  const studentUsers = users.filter((u) => u.role !== 'admin');

  // Popular skills count across Teach and Learn
  const skillCounter = new Map();
  for (const s of skills) {
    const key = s.skillName.trim();
    if (!skillCounter.has(key)) {
      skillCounter.set(key, { skillName: key, teachCount: 0, learnCount: 0, total: 0 });
    }
    const entry = skillCounter.get(key);
    if (s.skillType === 'Teach') entry.teachCount += 1;
    else entry.learnCount += 1;
    entry.total += 1;
  }

  const popularSkills = Array.from(skillCounter.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 8);

  const enrichedUsers = studentUsers.map((u) => {
    const userSkills = skills.filter((s) => s.userId === u._id);
    const userExchanges = sessions.filter(
      (s) =>
        s.status === 'Completed' &&
        (s.teacherId === u._id || s.learnerId === u._id)
    ).length;
    return {
      ...sanitizeUser(u),
      skillCount: userSkills.length,
      completedExchanges: userExchanges,
    };
  });

  const enrichedRequests = requests
    .map((r) => {
      const sender = UserModel.findById(r.senderId);
      const receiver = UserModel.findById(r.receiverId);
      return {
        ...r,
        senderName: sender ? sender.name : 'Student',
        receiverName: receiver ? receiver.name : 'Student',
      };
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const enrichedReports = reports
    .map((rep) => {
      const reporter = UserModel.findById(rep.reporterId);
      const reported = UserModel.findById(rep.reportedUserId);
      return {
        ...rep,
        reporterName: reporter ? reporter.name : 'Student',
        reportedName: reported ? reported.name : 'Student',
        reportedEmail: reported ? reported.email : '',
        reportedStatus: reported ? reported.status : 'active',
      };
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return res.json({
    metrics: {
      totalStudents: studentUsers.length,
      activeStudents: studentUsers.filter((u) => u.status !== 'suspended').length,
      totalSkills: skills.length,
      totalRequests: requests.length,
      completedExchanges: sessions.filter((s) => s.status === 'Completed').length,
      totalReviews: reviews.length,
      openReports: reports.filter((r) => r.status === 'Open').length,
    },
    popularSkills,
    students: enrichedUsers,
    requests: enrichedRequests,
    reports: enrichedReports,
  });
}

export function toggleUserStatus(req, res) {
  const user = UserModel.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'Student account not found.' });
  }
  if (user.role === 'admin') {
    return res.status(400).json({ error: 'Administrator accounts cannot be suspended.' });
  }

  const nextStatus =
    req.body?.status === 'suspended' || req.body?.status === 'active'
      ? req.body.status
      : user.status === 'suspended'
      ? 'active'
      : 'suspended';

  const updated = UserModel.updateById(user._id, { status: nextStatus });
  return res.json({ user: sanitizeUser(updated) });
}

export function updateReportStatus(req, res) {
  const report = ReportModel.findById(req.params.id);
  if (!report) {
    return res.status(404).json({ error: 'Report not found.' });
  }
  const nextStatus = String(req.body?.status || '').trim();
  if (!['Open', 'Resolved', 'Dismissed'].includes(nextStatus)) {
    return res.status(400).json({ error: 'Invalid report status.' });
  }
  const updated = ReportModel.updateById(report._id, { status: nextStatus });
  return res.json({ report: updated });
}
