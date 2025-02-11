import express from 'express';
import multer from 'multer';
import { searchEnrollment, updateGiftStatus, getAllEnrollments } from '../controllers/enrollmentController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Configure multer for image upload
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images are allowed'));
    }
  },
});

// Search enrollment by enrollment number
router.get('/search', authenticateToken, searchEnrollment);

// Update gift status and upload image
router.post('/gift', authenticateToken, upload.single('image'), updateGiftStatus);

// Get all enrollments (paginated)
router.get('/', authenticateToken, getAllEnrollments);



export default router;
