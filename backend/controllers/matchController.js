import { UserModel } from '../models/User.js';
import { SkillModel } from '../models/Skill.js';
import { ReviewModel } from '../models/Review.js';
import { RequestModel } from '../models/Request.js';
import { computeMutualMatches } from '../utils/skillMatching.js';

export function getMatches(req, res) {
  const users = UserModel.findAll();
  const skills = SkillModel.findAll();
  const reviews = ReviewModel.findAll();
  const myRequests = RequestModel.findByUserId(req.user._id);

  const matches = computeMutualMatches({
    currentUserId: req.user._id,
    users,
    skills,
    reviews,
  }).map((m) => {
    const activeRequest = myRequests.find(
      (r) =>
        ((r.senderId === req.user._id && r.receiverId === m.user._id) ||
          (r.receiverId === req.user._id && r.senderId === m.user._id)) &&
        (r.status === 'Pending' || r.status === 'Accepted')
    );
    return {
      ...m,
      existingRequestStatus: activeRequest ? activeRequest.status : null,
      existingRequestId: activeRequest ? activeRequest._id : null,
    };
  });

  const myTeach = skills.filter(
    (s) => s.userId === req.user._id && s.skillType === 'Teach'
  );
  const myLearn = skills.filter(
    (s) => s.userId === req.user._id && s.skillType === 'Learn'
  );

  return res.json({
    matches,
    myTeachCount: myTeach.length,
    myLearnCount: myLearn.length,
  });
}
