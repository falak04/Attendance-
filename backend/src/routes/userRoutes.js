const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Get all users
router.get('/', async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Search users
router.get('/search', async (req, res) => {
  try {
    const { query, role } = req.query;
    let searchQuery = {};

    if (query) {
      searchQuery = {
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { email: { $regex: query, $options: 'i' } },
          { sap: { $regex: query, $options: 'i' } }
        ]
      };
    }

    if (role && role !== 'all') {
      searchQuery.role = role;
    }

    const users = await User.find(searchQuery).select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Bulk delete users by role
router.delete('/bulk/:role', async (req, res) => {
  try {
    const { role } = req.params;
    
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

module.exports = router; 