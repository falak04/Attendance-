const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');

// Get all notifications for a teacher
router.get('/teacher/:teacherId', notificationController.getTeacherNotifications);

// Mark a notification as read
router.put('/:id/read', notificationController.markAsRead);

// Mark all notifications as read for a teacher
router.put('/teacher/:teacherId/read-all', notificationController.markAllAsRead);

// Get notifications by date range
router.get('/teacher/:teacherId/date-range', notificationController.getTeacherNotificationsByDateRange);

module.exports = router; 