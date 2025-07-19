const User = require('../models/User');
const bcrypt = require('bcryptjs');

// Get all users
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get single user
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Create new user
exports.createUser = async (req, res) => {
  const { sap, name, email, password, className, role, isFirstLogin } = req.body;

  try {
    // Check if user already exists
    let user = await User.findOne({ $or: [{ email }, { sap }] });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Create new user
    user = new User({
      sap,
      name,
      email,
      password,
      className,
      role,
      isFirstLogin
    });

    await user.save();
    
    // Return user without password
    const userResponse = user.toObject();
    delete userResponse.password;
    
    res.status(201).json(userResponse);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update user
exports.updateUser = async (req, res) => {
  const { sap, name, email, className, role, isFirstLogin } = req.body;
  
  // Build user object
  const userFields = {};
  if (sap) userFields.sap = sap;
  if (name) userFields.name = name;
  if (email) userFields.email = email;
  if (className !== undefined) userFields.className = className;
  if (role) userFields.role = role;
  if (isFirstLogin !== undefined) userFields.isFirstLogin = isFirstLogin;

  try {
    let user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update user
    user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: userFields },
      { new: true }
    ).select('-password');
    
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete user
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await User.findByIdAndRemove(req.params.id);
    res.status(200).json({ message: 'User removed' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Search users
exports.searchUsers = async (req, res) => {
  try {
    const { query, role } = req.query;
    
    // Build search query
    const searchQuery = {};
    
    // Text search
    if (query) {
      searchQuery.$or = [
        { name: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
        { sap: { $regex: query, $options: 'i' } }
      ];
    }
    
    // Filter by role
    if (role && role !== 'all') {
      searchQuery.role = role;
    }
    
    const users = await User.find(searchQuery).select('-password');
    res.status(200).json(users);
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Add this new method to userController.js to handle CSV file uploads
exports.bulkCreateUsersFromCSV = async (req, res) => {
  try {
    // Check if we have a file in the request
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload a CSV file' });
    }
    
    // Parse the CSV file content
    const csvContent = req.file.buffer.toString('utf8');
    const lines = csvContent.split('\n');
    
    // Get headers from first line
    const headers = lines[0].split(',').map(header => header.trim());
    
    // Validate required headers
    const requiredFields = ['sap', 'name', 'email', 'password', 'role'];
    const missingFields = requiredFields.filter(field => !headers.includes(field));
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        message: `CSV file is missing required fields: ${missingFields.join(', ')}`
      });
    }
    
    // Process each line after headers
    const users = [];
    const errors = [];
    
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue; // Skip empty lines
      
      const values = lines[i].split(',').map(value => value.trim());
      if (values.length !== headers.length) {
        errors.push(`Line ${i+1} has invalid format`);
        continue;
      }
      
      // Create user object from headers and values
      const userData = {};
      headers.forEach((header, index) => {
        if (header === 'isFirstLogin') {
          userData[header] = values[index].toLowerCase() === 'true';
        } else {
          userData[header] = values[index];
        }
      });
      
      // Only add if required fields are present
      if (requiredFields.every(field => userData[field])) {
        users.push(userData);
      } else {
        errors.push(`Line ${i+1} is missing required fields`);
      }
    }
    
    if (users.length === 0) {
      return res.status(400).json({
        message: 'No valid user data found in the CSV file',
        errors
      });
    }
    
    // Process each user
    const createdUsers = [];
    const skippedUsers = [];
    
    for (const userData of users) {
      try {
        // Check if user already exists
        const existingUser = await User.findOne({ 
          $or: [{ email: userData.email }, { sap: userData.sap }] 
        });
        
        if (existingUser) {
          skippedUsers.push({
            user: userData,
            reason: `User with email ${userData.email} or SAP ${userData.sap} already exists`
          });
          continue;
        }
        
        // Create new user
        const newUser = new User({
          sap: userData.sap,
          name: userData.name,
          email: userData.email,
          password: userData.password,
          className: userData.className || '',
          role: userData.role,
          isFirstLogin: userData.isFirstLogin !== undefined ? userData.isFirstLogin : true
        });
        
        await newUser.save();
        
        // Add to created users without password
        const userResponse = newUser.toObject();
        delete userResponse.password;
        createdUsers.push(userResponse);
      } catch (err) {
        skippedUsers.push({
          user: userData,
          reason: err.message
        });
      }
    }
    
    res.status(201).json({
      message: `Created ${createdUsers.length} users successfully, skipped ${skippedUsers.length} users`,
      created: createdUsers,
      skipped: skippedUsers,
      errors
    });
  } catch (error) {
    console.error('Error in bulk upload:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all teachers
exports.getAllTeachers = async (req, res) => {
  try {
    console.log('Fetching teachers...');
    
    // Check if User model is properly defined
    if (!User) {
      console.error('User model is not defined');
      return res.status(500).json({ message: 'User model is not defined' });
    }
    
    // Try a simpler query first to test
    const teachers = await User.find({ role: 'teacher' }).lean();
    
    console.log(`Found ${teachers ? teachers.length : 0} teachers`);
    
    // Return an empty array if no teachers found instead of null
    return res.status(200).json(teachers || []);
  } catch (error) {
    console.error('Error in getAllTeachers:', error);
    return res.status(500).json({ 
      message: 'Server error fetching teachers', 
      error: error.message,
      stack: error.stack 
    });
  }
};

exports.login = async (req, res) => {
  const { identifier, password } = req.body;

  try {
    // Validate input
    if (!identifier || !password) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    // Find user by email or SAP
    const user = await User.findOne({
      $or: [{ email: identifier }, { sap: identifier }]
    });
    console.log(user);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Return user without password
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(200).json({
      user: userResponse
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
