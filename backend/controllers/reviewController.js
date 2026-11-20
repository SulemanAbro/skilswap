import { ReviewModel } from '../models/Review.js';
import { SessionModel } from '../models/Session.js';
import { UserModel } from '../models/User.js';
import {
  validateReviewEligibility,
  validateReviewInput,
} from '../utils/validation.js';

function hydrateReview(r) {
  const reviewer = UserModel.findById(r.reviewerId);
  const reviewed = UserModel.findById(r.reviewedUserId);
  const session = SessionModel.findById(r.sessionId);
  return {
    ...r,
    reviewerName: reviewer ? reviewer.name : 'Student',
    reviewerUniversity: reviewer ? reviewer.university : '',
    reviewerPicture: reviewer ? reviewer.profilePicture : '',
    reviewedName: reviewed ? reviewed.name : 'Student',
    reviewedPicture: reviewed ? reviewed.profilePicture : '',
    skillName: session ? session.skillName : '',
    sessionDate: session ? session.sessionDate : '',
  };
}

export function createReview(req, res) {
  const { valid, errors, sanitized } = validateReviewInput(req.body);
  if (!valid) {
    return res.status(400).json({ error: errors[0], errors });
  }

  const session = SessionModel.findById(sanitized.sessionId);
  const existingReviews = ReviewModel.findAll();

  const eligibility = validateReviewEligibility({
    session,
    reviewerId: req.user._id,
    existingReviews,
  });

  if (!eligibility.allowed) {
    return res.status(400).json({ error: eligibility.reason });
  }

  const review = ReviewModel.create({
    sessionId: session._id,
    reviewerId: req.user._id,
    reviewedUserId: eligibility.reviewedUserId,
    rating: sanitized.rating,
    comment: sanitized.comment,
  });

  return res.status(201).json({ review: hydrateReview(review) });
}

export function getReviewsByUser(req, res) {
  const userId = req.params.userId;
  const reviews = ReviewModel.findByReviewedUserId(userId)
    .map(hydrateReview)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const averageRating =
    reviews.length > 0
      ? Number(
          (
            reviews.reduce((acc, r) => acc + Number(r.rating), 0) / reviews.length
          ).toFixed(1)
        )
      : null;

  return res.json({ reviews, averageRating });
}

export function getMyReviewsAndEligible(req, res) {
  const userId = req.user._id;
  const allReviews = ReviewModel.findAll();
  const completedSessions = SessionModel.findByUserId(userId).filter(
    (s) => s.status === 'Completed'
  );

  const eligibleSessions = completedSessions
    .filter(
      (s) =>
        !allReviews.some(
          (r) => r.sessionId === s._id && r.reviewerId === userId
        )
    )
    .map((s) => {
      const partnerId = s.teacherId === userId ? s.learnerId : s.teacherId;
      const partner = UserModel.findById(partnerId);
      return {
        ...s,
        partnerId,
        partnerName: partner ? partner.name : 'Student',
        partnerUniversity: partner ? partner.university : '',
        partnerPicture: partner ? partner.profilePicture : '',
      };
    });

  const received = ReviewModel.findByReviewedUserId(userId)
    .map(hydrateReview)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const given = ReviewModel.findByReviewerId(userId)
    .map(hydrateReview)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return res.json({
    eligibleSessions,
    received,
    given,
  });
}
