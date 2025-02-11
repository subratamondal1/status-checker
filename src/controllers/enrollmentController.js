import Enrollment from '../models/Enrollment.js';
import User from '../models/User.js';
import { uploadToAzure } from '../utils/azureStorage.js';

// Search enrollment by enrollment number
export const searchEnrollment = async (req, res) => {
  try {
    const { enrollmentNo } = req.query;
    
    const enrollment = await Enrollment.findOne({ 'enrollment no': enrollmentNo })
      .populate('giftedBy', 'username');
    
    if (!enrollment) {
      return res.status(404).json({ message: 'Enrollment not found' });
    }

    res.json(enrollment);
  } catch (error) {
    console.error('Search enrollment error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Update gift status and upload image
// Update gift status and upload image
export const updateGiftStatus = async (req, res) => {
  try {
    const { enrollmentNo, tokenNumber } = req.body;
    const image = req.file;

    if (!image) {
      return res.status(400).json({ message: 'Image is required' });
    }

    // Find enrollment
    const enrollment = await Enrollment.findOne({ 'enrollment no': enrollmentNo });
    
    if (!enrollment) {
      return res.status(404).json({ message: 'Enrollment not found' });
    }

    if (enrollment.isGifted) {
      return res.status(400).json({ 
        message: 'Gift already distributed',
        giftedBy: enrollment.giftedBy ? await User.findById(enrollment.giftedBy).select('tokenNumber') : null,
        giftedAt: enrollment.giftedAt
      });
    }

    // Upload image to Azure Blob Storage
    const imageUrl = await uploadToAzure(image);

    // Update enrollment status
    enrollment.isGifted = true;
    enrollment.giftedBy = req.user._id;
    enrollment.giftedAt = new Date();
    enrollment.cardImage = imageUrl;
    enrollment.tokenNumber = tokenNumber; // Save token number

    await enrollment.save();

    // Update user's gifted count
    await User.findByIdAndUpdate(req.user._id, { $inc: { giftedCount: 1 } });

    res.json({ 
      message: 'Status updated successfully', 
      enrollment: {
        "enrollment no": enrollment["enrollment no"],
        name: enrollment.name,
        isGifted: enrollment.isGifted,
        tokenNumber, // Include token number in the response
        giftedAt: enrollment.giftedAt,
        cardImage: enrollment.cardImage
      }
    });
  } catch (error) {
    console.error('Updating status error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get all enrollments (paginated)
export const getAllEnrollments = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const enrollments = await Enrollment.find()
      .populate('giftedBy', 'username')
      .skip(skip)
      .limit(limit)
      .sort({ 'sl no': 1 });

    const total = await Enrollment.countDocuments();

    res.json({
      enrollments,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalEnrollments: total
    });
  } catch (error) {
    console.error('Get all enrollments error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
