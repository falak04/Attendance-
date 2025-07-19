const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const multer = require('multer');
const User = require('../models/User');

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage });

// @route   GET /api/users
// @desc    Get all users
// @access  Public (should be protected in production)
router.get('/', userController.getUsers);

// @route   POST /api/auth/login
// @desc    Login user & get token
// @access  Public
router.post('/login', userController.login);

// @route   GET /api/users/search
// @desc    Search users
// @access  Public (should be protected in production)
router.get('/search', userController.searchUsers);

// @route   GET /api/users/teachers
// @desc    Get all teachers
// @access  Public (should be protected in production)
router.get('/teachers', userController.getAllTeachers);

// @route   POST /api/users/bulk/csv
// @desc    Bulk create users from CSV file
// @access  Public (should be protected in production)
router.post('/bulk/csv', upload.single('file'), userController.bulkCreateUsersFromCSV);

// @route   DELETE /api/users/bulk/:role
// @desc    Bulk delete users by role
// @access  Public (should be protected in production)
router.delete('/bulk/:role', async (req, res) => {
  try {
    const { role } = req.params;
    console.log('Received bulk delete request for role:', role);
    
    // Validate role
    const validRoles = ['student', 'teacher', 'hod'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid role. Must be one of: student, teacher, hod' 
      });
    }

    // Delete all users with the specified role
    const result = await User.deleteMany({ role });
    console.log('Delete result:', result);
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ 
        success: false, 
        message: `No ${role}s found to delete` 
      });
    }

    res.json({ 
      success: true, 
      message: `Successfully deleted ${result.deletedCount} ${role}s`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Error in bulk delete:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete users',
      error: error.message 
    });
  }
});

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Public (should be protected in production)
router.get('/:id', userController.getUserById);

// @route   POST /api/users
// @desc    Create a user
// @access  Public (should be protected in production)
router.post('/', userController.createUser);

// @route   PUT /api/users/:id
// @desc    Update a user
// @access  Public (should be protected in production)
router.put('/:id', userController.updateUser);

// @route   DELETE /api/users/:id
// @desc    Delete a user
// @access  Public (should be protected in production)
router.delete('/:id', userController.deleteUser);

module.exports = router; 