import mongoose from 'mongoose';

const enrollmentSchema = new mongoose.Schema({
  "sl no": {
    type: Number,
    required: true
  },
  "pm no": {
    type: String,
    required: true
  },
  "enrollment no": {
    type: String,
    required: true,
    unique: true
  },
  "name": {
    type: String,
    required: true
  },
  "phone no 1": {
    type: String,
    default: null
  },
  "phone no 2": {
    type: String,
    default: null
  },
  "phone no 3": {
    type: String,
    default: null
  },
  "phone no 4": {
    type: String,
    default: null
  },
  "address": {
    type: String,
    required: true
  },
  isGifted: {
    type: Boolean,
    default: false
  },
  giftedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  giftedAt: {
    type: Date,
    default: null
  },
  cardImage: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

const Enrollment = mongoose.model('enrollment', enrollmentSchema);

export default Enrollment;
