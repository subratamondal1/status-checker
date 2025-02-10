import express from 'express';
import { createUser, getAllUsers, getDashboardStats } from '../controllers/adminController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Middleware to check if user is admin
const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. Admin only.' });
  }
  next();
};

// Admin routes
router.post('/users', authenticateToken, isAdmin, createUser);
router.get('/users', authenticateToken, isAdmin, getAllUsers);
router.get('/dashboard', authenticateToken, isAdmin, getDashboardStats);

export default router;
