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
    // Only fetch "user" role, or remove $match if you want all
    const users = await User.aggregate([
      { $match: { role: 'user' } },
      {
        $lookup: {
          from: 'enrollments',            // collection name in Mongo
          let: { userId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$giftedBy', '$$userId'] },
                    { $eq: ['$isGifted', true] }
                  ]
                }
              }
            }
          ],
          as: 'giftedEnrollments'
        }
      },
      {
        $project: {
          username: 1,
          role: 1,
          giftedCount: 1,
          // Now select only fields you want from giftedEnrollments
          'giftedEnrollments.enrollment no': 1,
          'giftedEnrollments.name': 1,
          'giftedEnrollments.cardImage': 1,
          'giftedEnrollments.giftedAt': 1,
          'giftedEnrollments.tokenNumber': 1,
        }
      }
    ]);

    res.json(users);
  } catch (error) {
    console.error('Get all users error:', error);
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
