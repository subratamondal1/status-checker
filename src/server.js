import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import { uploadToAzure } from './utils/azureStorage.js';
import User from './models/User.js';
import Enrollment from './models/Enrollment.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import enrollmentRoutes from './routes/enrollmentRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import { authenticateToken, validateToken } from './middleware/auth.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Multer configuration for handling file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Routes
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/admin', adminRoutes);

// Authentication middleware
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) throw new Error();

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) throw new Error();

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Please authenticate' });
  }
};

// Authentication Routes
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        username: user.username,
        role: user.role,
        giftedCount: user.giftedCount
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Search enrollment
app.get('/api/enrollments/search', auth, async (req, res) => {
  try {
    const { enrollmentNo } = req.query;
    const enrollment = await Enrollment.findOne({ enrollmentNo })
      .populate('giftedBy', 'username');
    
    if (!enrollment) {
      return res.status(404).json({ message: 'Enrollment not found' });
    }

    res.json(enrollment);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Mark as gifted
app.post('/api/enrollments/gift', auth, upload.single('cardImage'), async (req, res) => {
  try {
    const { enrollmentNo } = req.body;
    const enrollment = await Enrollment.findOne({ enrollmentNo });

    if (!enrollment) {
      return res.status(404).json({ message: 'Enrollment not found' });
    }

    if (enrollment.isGifted) {
      return res.status(400).json({ message: 'Already gifted' });
    }

    const imageUrl = await uploadToAzure(req.file);

    enrollment.isGifted = true;
    enrollment.giftedBy = req.user._id;
    enrollment.giftedAt = new Date();
    enrollment.cardImage = imageUrl;
    await enrollment.save();

    // Update user's gifted count
    await User.findByIdAndUpdate(req.user._id, { $inc: { giftedCount: 1 } });

    res.json({ message: 'Successfully marked as gifted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get statistics for admin
app.get('/api/admin/stats', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const users = await User.find({ role: 'user' }).select('username giftedCount');
    const totalGifted = await Enrollment.countDocuments({ isGifted: true });
    const totalEnrollments = await Enrollment.countDocuments();

    res.json({
      users,
      totalGifted,
      totalEnrollments
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Add token validation route
app.get('/api/validate-token', validateToken);

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
  });
