import { Router } from 'express';
import {
  createRequest,
  getRequests,
  updateRequestStatus,
} from '../controllers/requestController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/', requireAuth, createRequest);
router.get('/', requireAuth, getRequests);
router.put('/:id/status', requireAuth, updateRequestStatus);

export default router;
