const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadMiddleware');

const attendanceRequestController = require('../controllers/attendanceRequestController');

// @route   GET /api/attendance-requests
// @desc    Get all attendance requests
// @access  Protected - Admin, HOD, Teachers
router.get('/',  
  attendanceRequestController.getAllRequests
);



// @route   GET /api/attendance-requests/student/:studentId
// @desc    Get attendance requests by student ID
// @access  Protected - Own student or Admin/HOD/Teacher
router.get('/student/:studentId', 
  attendanceRequestController.getRequestsByStudentId
);

// @route   GET /api/attendance-requests/stats/:studentId
// @desc    Get attendance request stats for a student
// @access  Protected - Own student or Admin/HOD/Teacher
router.get('/stats/:studentId', 
  attendanceRequestController.getStudentRequestStats
);

// @route   GET /api/attendance-requests/:id
// @desc    Get attendance request by ID
// @access  Protected - Own student or Admin/HOD/Teacher
router.get('/:id', 
  attendanceRequestController.getRequestById
);

// @route   POST /api/attendance-requests
// @desc    Create new attendance request
// @access  Protected - Students
router.post('/', 
  upload.single('proof'), // Handle single file upload with field name 'proof'
  attendanceRequestController.createRequest
);

// @route   PUT /api/attendance-requests/:id
// @desc    Update attendance request
// @access  Protected - Own student if pending, or Admin/HOD/Teacher
router.put('/:id', 
  upload.single('proof'), // Add this middleware to handle file uploads
  attendanceRequestController.updateRequest
);

// @route   DELETE /api/attendance-requests/:id
// @desc    Delete attendance request
// @access  Protected - Own student if pending, or Admin
router.delete('/:id', 
  attendanceRequestController.deleteRequest
);

// @route   PUT /api/attendance-requests/:id/status
// @desc    Update request status (approve/reject)
// @access  Protected - HOD/Admin/Teacher
router.put('/:id/status', 
  attendanceRequestController.updateRequestStatus
);

module.exports = router;