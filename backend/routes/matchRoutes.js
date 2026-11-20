import { Router } from 'express';
import { getMatches } from '../controllers/matchController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', requireAuth, getMatches);

export default router;
