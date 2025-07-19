const mongoose = require('mongoose');

const SubjectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  start_time: {
    type: String,
    required: true,
    // Time format validation (HH:MM)
    validate: {
      validator: function(v) {
        return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
      },
      message: props => `${props.value} is not a valid time format! Use HH:MM`
    }
  },
  end_time: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(v);
      },
      message: props => `${props.value} is not a valid time format! Use HH:MM`
    }
  },
  teacher_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  class_name: {
    type: String,
    required: true,
    trim: true
    },
    day: {
      type: String,
      required: true,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Custom validation to ensure end_time is after start_time
SubjectSchema.pre('save', function(next) {
  const startTimeArray = this.start_time.split(':').map(Number);
  const endTimeArray = this.end_time.split(':').map(Number);
  
  const startMinutes = startTimeArray[0] * 60 + startTimeArray[1];
  const endMinutes = endTimeArray[0] * 60 + endTimeArray[1];
  
  if (endMinutes <= startMinutes) {
    return next(new Error('End time must be after start time'));
  }
  
  next();
});

module.exports = mongoose.model('Subject', SubjectSchema); 