import { Router } from 'express';
import {
  createReview,
  getReviewsByUser,
  getMyReviewsAndEligible,
} from '../controllers/reviewController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/me', requireAuth, getMyReviewsAndEligible);
router.post('/', requireAuth, createReview);
router.get('/:userId', requireAuth, getReviewsByUser);

export default router;
