import User from '../models/User.js';
import Enrollment from '../models/Enrollment.js';
import bcrypt from 'bcryptjs';

// Create a new user
export const createUser = async (req, res) => {
  try {
    const { username, password, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const user = new User({
      username,
      password: hashedPassword,
      role: role || 'user'
    });

    await user.save();

    res.status(201).json({ message: 'User created successfully', user: { 
      username: user.username, 
      role: user.role,
      giftedCount: user.giftedCount 
    }});
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get all users with their gift statistics
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({ role: 'user' }, '-password');
    
    // Get detailed gift information for each user
    const usersWithStats = await Promise.all(users.map(async (user) => {
      const giftedEnrollments = await Enrollment.find({ 
        giftedBy: user._id,
        isGifted: true 
      }).select('enrollment no name giftedAt');

      return {
        _id: user._id,
        username: user.username,
        role: user.role,
        giftedCount: giftedEnrollments.length,
        giftedEnrollments
      };
    }));

    res.json(usersWithStats);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get dashboard statistics
export const getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: 'user' });
    const totalEnrollments = await Enrollment.countDocuments();
    const totalGifted = await Enrollment.countDocuments({ isGifted: true });
    
    // Get gift distribution by user
    const userStats = await Enrollment.aggregate([
      { $match: { isGifted: true } },
      { $group: { 
        _id: '$giftedBy',
        count: { $sum: 1 }
      }},
      { $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user'
      }},
      { $unwind: '$user' },
      { $project: {
        username: '$user.username',
        count: 1
      }}
    ]);

    res.json({
      totalUsers,
      totalEnrollments,
      totalGifted,
      remainingToGift: totalEnrollments - totalGifted,
      giftDistribution: userStats
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
