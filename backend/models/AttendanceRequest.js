const mongoose = require('mongoose');

const AttendanceRequestSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  reason: {
    type: String,
    required: true,
    trim: true
  },
  proof: {
    type: String, // URL to uploaded proof document
  },
  subject_dates: [{
    subject_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: true
    },
    date: {
      type: Date,
      required: true
    }
  }],
  student_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  student_ids: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  date: {
    type: Date,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  feedbackNote: {
    type: String,
    default: ''
  }
});

// Update the updatedAt timestamp on save
AttendanceRequestSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Validate date is within one week from now
AttendanceRequestSchema.path('date').validate(function(value) {
  const now = new Date();
  const oneWeekFromNow = new Date();
  oneWeekFromNow.setDate(now.getDate() + 7);
  
  // Check if date is in the future
  if (value < now) {
    return false;
  }
  
  // Check if date is within one week
  if (value > oneWeekFromNow) {
    return false;
  }
  
  return true;
}, 'Attendance requests must be for dates within the next 7 days');

// Define a proper virtual for subject_ids that can be populated
AttendanceRequestSchema.virtual('subject_ids', {
  ref: 'Subject', 
  localField: 'subject_dates.subject_id',
  foreignField: '_id',
  justOne: false
});

// Make sure virtuals are included in JSON
AttendanceRequestSchema.set('toJSON', { virtuals: true });
AttendanceRequestSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('AttendanceRequest', AttendanceRequestSchema);