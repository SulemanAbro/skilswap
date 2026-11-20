import { Router } from 'express';
import {
  getAdminOverview,
  toggleUserStatus,
  updateReportStatus,
} from '../controllers/adminController.js';
import { requireAuth, requireAdmin } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/overview', requireAuth, requireAdmin, getAdminOverview);
router.put('/users/:id/status', requireAuth, requireAdmin, toggleUserStatus);
router.put('/reports/:id', requireAuth, requireAdmin, updateReportStatus);

export default router;
