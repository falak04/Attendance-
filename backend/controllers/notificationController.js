const Notification = require('../models/Notification');
const AttendanceRequest = require('../models/AttendanceRequest');
const Subject = require('../models/Subject');
const User = require('../models/User');
const mongoose = require('mongoose');

// Create notifications for an approved attendance request
exports.createNotificationsForRequest = async (requestId) => {
  try {
    // Get the attendance request with populated data
    const request = await AttendanceRequest.findById(requestId)
      .populate('subject_dates.subject_id')
      .populate('student_id')
      .populate('student_ids');
    
    if (!request) {
      console.error(`Attendance request with ID ${requestId} not found`);
      return false;
    }
    
    // Only create notifications for approved requests
    if (request.status !== 'approved') {
      return false;
    }
    
    // Get all students involved
    const allStudentIds = [request.student_id._id];
    if (request.student_ids && request.student_ids.length > 0) {
      request.student_ids.forEach(student => {
        allStudentIds.push(student._id);
      });
    }
    
    const notifications = [];
    
    // Create a notification for each subject with its specific date
    for (const subjectDate of request.subject_dates) {
      const subject = subjectDate.subject_id;
      const teacherId = subject.teacher_id;
      
      // Skip if subject doesn't have a teacher assigned
      if (!teacherId) {
        console.warn(`Subject ${subject.name} has no teacher assigned. Skipping notification.`);
        continue;
      }
      
      const notification = new Notification({
        attendance_request_id: request._id,
        teacher_id: teacherId,
        student_ids: allStudentIds,
        subject_id: subject._id,
        date: subjectDate.date,  // Use the specific date for this subject
        isRead: false
      });
      
      await notification.save();
      notifications.push(notification);
    }
    
    return notifications;
  } catch (error) {
    console.error('Error creating notifications:', error);
    return false;
  }
};

// Get notifications for a teacher
exports.getTeacherNotifications = async (req, res) => {
  try {
    const teacherId = req.params.teacherId;
    const { startDate, endDate } = req.query;
    
    if (!mongoose.Types.ObjectId.isValid(teacherId)) {
      return res.status(400).json({ message: 'Invalid teacher ID format' });
    }
    
    let query = { teacher_id: teacherId };
    
    // Add date range filter if provided
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999); // Include the entire end day
      
      query.date = {
        $gte: start,
        $lte: end
      };
    }
    
    const notifications = await Notification.find(query)
      .populate('attendance_request_id')
      .populate('subject_id')
      .populate('student_ids', 'name sap email className')
      .sort({ date: 1, createdAt: -1 });
    
    res.status(200).json(notifications);
  } catch (error) {
    console.error('Error fetching teacher notifications:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Mark a notification as read
exports.markAsRead = async (req, res) => {
  try {
    const notificationId = req.params.id;
    
    if (!mongoose.Types.ObjectId.isValid(notificationId)) {
      return res.status(400).json({ message: 'Invalid notification ID format' });
    }
    
    const notification = await Notification.findByIdAndUpdate(
      notificationId,
      { isRead: true },
      { new: true }
    );
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    res.status(200).json(notification);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Mark all notifications as read for a teacher
exports.markAllAsRead = async (req, res) => {
  try {
    const teacherId = req.params.teacherId;
    
    if (!mongoose.Types.ObjectId.isValid(teacherId)) {
      return res.status(400).json({ message: 'Invalid teacher ID format' });
    }
    
    const result = await Notification.updateMany(
      { teacher_id: teacherId },
      { isRead: true }
    );
    
    res.status(200).json({ 
      message: `Marked ${result.modifiedCount} notifications as read`,
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Add a new endpoint for date range filtering
exports.getTeacherNotificationsByDateRange = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { startDate, endDate } = req.query;
    
    if (!mongoose.Types.ObjectId.isValid(teacherId)) {
      return res.status(400).json({ message: 'Invalid teacher ID format' });
    }
    
    let query = { teacher_id: teacherId };
    
    // Add date range filter if provided
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999); // Include the entire end day
      
      query.date = {
        $gte: start,
        $lte: end
      };
    }
    
    const notifications = await Notification.find(query)
      .populate('attendance_request_id')
      .populate('subject_id')
      .populate('student_ids', 'name sap email className')
      .sort({ date: 1, createdAt: -1 });
    
    res.status(200).json(notifications);
  } catch (error) {
    console.error('Error fetching teacher notifications by date range:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
