const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  attendance_request_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AttendanceRequest',
    required: true
  },
  teacher_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  student_ids: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  subject_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subject',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  isRead: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Notification', notificationSchema);