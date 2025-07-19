const mongoose = require('mongoose');
const AttendanceRequest = require('../models/AttendanceRequest');
const Subject = require('../models/Subject');
require('dotenv').config();

// Map days of the week to numeric representation (0=Sunday, 1=Monday, etc.)
const dayMap = {
  'Sunday': 0,
  'Monday': 1, 
  'Tuesday': 2, 
  'Wednesday': 3, 
  'Thursday': 4, 
  'Friday': 5, 
  'Saturday': 6
};

const migrateAttendanceRequests = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('Connected to MongoDB');
    
    // Get all attendance requests
    const attendanceRequests = await AttendanceRequest.find({}).populate('subject_ids');
    
    console.log(`Found ${attendanceRequests.length} attendance requests to migrate`);
    
    // Process each request
    for (const request of attendanceRequests) {
      // Skip if already migrated
      if (request.subject_dates && request.subject_dates.length > 0) {
        console.log(`Request ${request._id} already migrated, skipping`);
        continue;
      }
      
      console.log(`Migrating request ${request._id}`);
      
      // Create subject_dates array
      const subject_dates = [];
      
      // For each subject, calculate the appropriate date
      for (const subject of request.subject_ids) {
        const subjectDay = dayMap[subject.day];
        
        if (subjectDay === undefined) {
          console.error(`Unknown day: ${subject.day} for subject ${subject._id}`);
          continue;
        }
        
        // Find the appropriate date for this subject based on day of week
        const requestDate = new Date(request.date);
        const startOfWeek = new Date(requestDate);
        startOfWeek.setDate(requestDate.getDate() - requestDate.getDay() + (subjectDay === 0 ? 7 : subjectDay));
        
        // If the calculated date is before the request date, move to next week
        const subjectDate = startOfWeek < requestDate ? 
          new Date(startOfWeek.setDate(startOfWeek.getDate() + 7)) : 
          startOfWeek;
        
        subject_dates.push({
          subject_id: subject._id,
          date: subjectDate
        });
      }
      
      // Update the request with new fields
      await AttendanceRequest.updateOne(
        { _id: request._id },
        { 
          $set: {
            subject_dates: subject_dates,
            start_date: request.date,
            end_date: request.date
          }
        }
      );
      
      console.log(`Migrated request ${request._id}`);
    }
    
    console.log('Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

migrateAttendanceRequests(); 