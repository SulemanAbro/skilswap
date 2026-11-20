import { Router } from 'express';
import {
  createSession,
  getSessions,
  updateSession,
} from '../controllers/sessionController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/', requireAuth, createSession);
router.get('/', requireAuth, getSessions);
router.put('/:id', requireAuth, updateSession);

export default router;
