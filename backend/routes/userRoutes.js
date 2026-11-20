import { Router } from 'express';
import {
  getUsers,
  getUserById,
  updateProfile,
  getDashboard,
  submitReport,
} from '../controllers/userController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/dashboard', requireAuth, getDashboard);
router.put('/profile', requireAuth, updateProfile);
router.post('/report', requireAuth, submitReport);
router.get('/', requireAuth, getUsers);
router.get('/:id', requireAuth, getUserById);

export default router;
