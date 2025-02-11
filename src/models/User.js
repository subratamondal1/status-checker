import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'user'],
    default: 'user'
  },
  giftedCount: {
    type: Number,
    default: 0
  },
  tokenNumber: {
    type: Number,
    default: null
  }
}, {
  timestamps: true
});

export default mongoose.model('User', userSchema);