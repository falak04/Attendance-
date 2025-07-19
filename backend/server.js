require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const userRoutes = require('./routes/userRoutes');
const subjectRoutes = require('./routes/subjectRoutes');
const attendanceRequestRoutes = require('./routes/attendanceRequestRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const path = require('path');
const app = express();
const PORT = process.env.PORT || 4001;

// Configure multer for in-memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// Make upload middleware available
app.use((req, res, next) => {
  req.upload = upload;
  next();
});

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected successfully');
    
    // Test the connection by counting users
    const User = require('./models/User');
    User.countDocuments().then(count => {
      console.log(`Database has ${count} users`);
    }).catch(err => {
      console.error('Error counting users:', err);
    });
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
  });

// Routes
app.use('/api/users', userRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/attendance-requests', attendanceRequestRoutes);
app.use('/api/notifications', notificationRoutes);
// Root route
app.get('/', (req, res) => {
  res.send('School Management API is running');
});

// Add better error handling to express
app.use((err, req, res, next) => {
  console.error('Express error:', err);
  res.status(500).json({ 
    message: 'Server error', 
    error: err.message, 
    stack: process.env.NODE_ENV === 'production' ? null : err.stack 
  });
});


// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
