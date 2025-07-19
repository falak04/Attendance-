const AttendanceRequest = require('../models/AttendanceRequest');
const User = require('../models/User');
const Subject = require('../models/Subject');
const mongoose = require('mongoose');
const path = require('path');

// Get all attendance requests
exports.getAllRequests = async (req, res) => {
  try {
    const requests = await AttendanceRequest.find()
      .populate('subject_ids', 'name start_time end_time day class_name teacher_id')
      .populate({
        path: 'subject_ids',
        populate: {
          path: 'teacher_id',
          select: 'name'
        }
      })
      .populate('student_id', 'name sap email className')
      .populate('student_ids', 'name sap email className');
    
    res.status(200).json(requests);
  } catch (error) {
    console.error('Error fetching requests:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get requests by student ID
exports.getRequestsByStudentId = async (req, res) => {
  try {
    const studentId = req.params.studentId;
    
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ message: 'Invalid student ID format' });
    }
    
    // Find requests where the student is either the primary requester or included in student_ids
    const requests = await AttendanceRequest.find({ 
      $or: [
        { student_id: studentId },
        { student_ids: studentId }
      ]
    })
      .populate({
        path: 'subject_dates.subject_id',
        select: 'name start_time end_time day class_name teacher_id',
        populate: {
          path: 'teacher_id',
          select: 'name'
        }
      })
      .populate('student_id', 'name sap email className')
      .populate('student_ids', 'name sap email className')
      .sort({ createdAt: -1 });
    
    res.status(200).json(requests);
  } catch (error) {
    console.error('Error fetching student requests:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get request by ID
exports.getRequestById = async (req, res) => {
  try {
    const requestId = req.params.id;
    
    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      return res.status(400).json({ message: 'Invalid request ID format' });
    }
    
    const request = await AttendanceRequest.findById(requestId)
      .populate('subject_ids', 'name start_time end_time day class_name teacher_id')
      .populate({
        path: 'subject_ids',
        populate: {
          path: 'teacher_id',
          select: 'name'
        }
      })
      .populate('student_id', 'name sap email className')
      .populate('student_ids', 'name sap email className');
    
    if (!request) {
      return res.status(404).json({ message: 'Attendance request not found' });
    }
    
    res.status(200).json(request);
  } catch (error) {
    console.error('Error fetching request:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Create new attendance request
exports.createRequest = async (req, res) => {
  try {
    // Extract basic request data
    const { name, reason, student_id } = req.body;
    let { student_ids = [], subject_ids = [], date } = req.body; 
    
    // Extract date information
    const requestDate = new Date(date);
    
    // Validate required fields
    if (!name || !reason || !student_id || !subject_ids.length || !date) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    // Process file upload if present
    let proofUrl = null;
    if (req.file) {
      proofUrl = `/uploads/${req.file.filename}`;
    }
    
    // Convert subject IDs to array if needed
    if (!Array.isArray(subject_ids)) {
      subject_ids = [subject_ids];
    }
    
    // Convert student IDs to array if needed
    if (!Array.isArray(student_ids)) {
      student_ids = student_ids ? [student_ids] : [];
    }
    
    // Get subject details to determine day of week
    const subjects = await Subject.find({ _id: { $in: subject_ids } });
    
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
    
    // Create subject_dates array by finding the correct date for each subject
    const subject_dates = [];
    
    // Calculate date for each subject based on day of week and the request date
    subjects.forEach(subject => {
      const subjectDay = dayMap[subject.day];
      if (subjectDay === undefined) {
        console.error(`Unknown day: ${subject.day}`);
        return;
      }
      
      // Find the next occurrence of this day of week from the request date
      const subjectDate = new Date(requestDate);
      const requestDayOfWeek = requestDate.getDay();
      
      // Calculate days to add to get to the subject day
      let daysToAdd = (subjectDay - requestDayOfWeek + 7) % 7;
      if (daysToAdd === 0 && subject.start_time) {
        // If it's the same day, check if the class time is already past
        const now = new Date();
        const [hours, minutes] = subject.start_time.split(':').map(Number);
        const classTime = new Date(now);
        classTime.setHours(hours, minutes, 0, 0);
        
        // If class time is already past, move to next week
        if (now > classTime) {
          daysToAdd = 7;
        }
      }
      
      // Add the days to the request date
      subjectDate.setDate(requestDate.getDate() + daysToAdd);
      
      subject_dates.push({
        subject_id: subject._id,
        date: subjectDate
      });
    });
    
    // Create the attendance request
    const attendanceRequest = new AttendanceRequest({
      name,
      reason,
      proof: proofUrl,
      subject_dates: subject_dates,
      student_id,
      student_ids,
      date: requestDate // Use the original date for backward compatibility
    });
    
    // Save the request
    await attendanceRequest.save();
    
    // Populate the request with referenced data before sending response
    const populatedRequest = await AttendanceRequest.findById(attendanceRequest._id)
      .populate({
        path: 'subject_dates.subject_id',
        select: 'name start_time end_time day class_name teacher_id',
        populate: {
          path: 'teacher_id',
          select: 'name'
        }
      })
      .populate('student_id', 'name sap email className')
      .populate('student_ids', 'name sap email className');
    
    // Format the response to include subject_ids for backward compatibility
    const response = populatedRequest.toObject({ virtuals: true });
    response.subject_ids = populatedRequest.subject_dates.map(sd => sd.subject_id);
    
    res.status(201).json(response);
  } catch (error) {
    console.error('Error creating attendance request:', error);
    res.status(500).json({ 
      message: 'Server error creating attendance request',
      error: error.message 
    });
  }
};

// Update an attendance request
exports.updateRequest = async (req, res) => {
  try {
    const requestId = req.params.id;
    let { name, reason, subject_ids, student_ids, status } = req.body;
    
    console.log('Update request body:', req.body);
    
    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      return res.status(400).json({ message: 'Invalid request ID format' });
    }
    
    // Get the current request
    const request = await AttendanceRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ message: 'Attendance request not found' });
    }
    
    // Only allow updates if status is pending or user is admin/teacher
    // NOTE: For now, skipping auth check for development
    // const isAdmin = req.user && (req.user.role === 'admin' || req.user.role === 'teacher' || req.user.role === 'hod');
    // if (request.status !== 'pending' && !isAdmin) {
    //   return res.status(403).json({ 
    //     message: 'Cannot update request that is not pending unless you are admin/teacher' 
    //   });
    // }
    
    // Process subject_ids
    let validSubjectIds = undefined;
    
    if (subject_ids) {
      validSubjectIds = [];
      // Handle different formats that subject_ids might come in
      if (Array.isArray(subject_ids)) {
        // If it's already an array
        validSubjectIds = subject_ids.filter(id => 
          id && mongoose.Types.ObjectId.isValid(id.toString())
        ).map(id => id.toString());
      } else if (typeof subject_ids === 'string') {
        // If it's a string that might contain multiple IDs
        try {
          // Try to parse it as JSON
          const parsed = JSON.parse(subject_ids);
          if (Array.isArray(parsed)) {
            validSubjectIds = parsed.filter(id => 
              id && mongoose.Types.ObjectId.isValid(id.toString())
            ).map(id => id.toString());
          } else if (mongoose.Types.ObjectId.isValid(parsed.toString())) {
            validSubjectIds = [parsed.toString()];
          }
        } catch (e) {
          // If it's not valid JSON, check if it's a valid ObjectId
          if (mongoose.Types.ObjectId.isValid(subject_ids)) {
            validSubjectIds = [subject_ids];
          }
        }
      }
      
      // If no valid subject IDs, return error
      if (validSubjectIds.length === 0) {
        return res.status(400).json({ 
          message: 'No valid subject IDs provided. Please select at least one subject.' 
        });
      }
    }
    
    // Process student IDs similarly
    let validStudentIds = undefined;
    if (student_ids) {
      validStudentIds = [];
      if (Array.isArray(student_ids)) {
        validStudentIds = student_ids.filter(id => 
          id && mongoose.Types.ObjectId.isValid(id.toString())
        ).map(id => id.toString());
      } else if (typeof student_ids === 'string') {
        try {
          const parsed = JSON.parse(student_ids);
          if (Array.isArray(parsed)) {
            validStudentIds = parsed.filter(id => 
              id && mongoose.Types.ObjectId.isValid(id.toString())
            ).map(id => id.toString());
          } else if (mongoose.Types.ObjectId.isValid(parsed.toString())) {
            validStudentIds = [parsed.toString()];
          }
        } catch (e) {
          if (mongoose.Types.ObjectId.isValid(student_ids)) {
            validStudentIds = [student_ids];
          }
        }
      }
    }
    
    // Build update object
    const updateFields = {};
    if (name) updateFields.name = name;
    if (reason) updateFields.reason = reason;
    if (validSubjectIds && validSubjectIds.length > 0) updateFields.subject_ids = validSubjectIds;
    if (validStudentIds && validStudentIds.length > 0) updateFields.student_ids = validStudentIds;
    if (status && ['pending', 'approved', 'rejected'].includes(status)) updateFields.status = status;
    
    // Add proof file path if uploaded
    if (req.file) {
      // Create URL to access the file
      const host = req.get('host');
      const protocol = req.protocol;
      updateFields.proof = `${protocol}://${host}/uploads/${req.file.filename}`;
    }
    
    console.log('Updating request with fields:', JSON.stringify(updateFields, null, 2));
    
    // Update the request
    const updatedRequest = await AttendanceRequest.findByIdAndUpdate(
      requestId,
      { $set: updateFields },
      { new: true }
    )
      .populate('subject_ids', 'name start_time end_time day class_name teacher_id')
      .populate({
        path: 'subject_ids',
        populate: {
          path: 'teacher_id',
          select: 'name'
        }
      })
      .populate('student_id', 'name sap email className')
      .populate('student_ids', 'name sap email className');
    
    res.status(200).json(updatedRequest);
  } catch (error) {
    console.error('Error updating request:', error);
    res.status(500).json({ 
      message: 'Server error updating attendance request',
      error: error.message 
    });
  }
};

// Delete an attendance request
exports.deleteRequest = async (req, res) => {
  try {
    const requestId = req.params.id;
    
    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      return res.status(400).json({ message: 'Invalid request ID format' });
    }
    
    const request = await AttendanceRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ message: 'Attendance request not found' });
    }
    
    // Only allow deletion if status is pending or user is admin
    const isAdmin = req.user && req.user.role === 'admin';
    if (request.status !== 'pending' && !isAdmin) {
      return res.status(403).json({ 
        message: 'Cannot delete request that is not pending unless you are an admin' 
      });
    }
    
    // Students can only delete their own requests
    const isStudent = req.user && req.user.role === 'student';
    if (isStudent && request.student_id.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You can only delete your own requests' });
    }
    
    await AttendanceRequest.findByIdAndDelete(requestId);
    
    res.status(200).json({ message: 'Attendance request deleted successfully' });
  } catch (error) {
    console.error('Error deleting request:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get request stats for a student
exports.getStudentRequestStats = async (req, res) => {
  try {
    const studentId = req.params.studentId;
    
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ message: 'Invalid student ID format' });
    }
    
    // Create a proper ObjectId instance
    const objectId = new mongoose.Types.ObjectId(studentId);
    
    // First check if the student exists
    const studentExists = await User.findById(studentId);
    if (!studentExists) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    // Count requests where student is either primary requester or in student_ids
    const pendingQuery = { 
      $or: [
        { student_id: objectId }, 
        { student_ids: objectId }
      ],
      status: 'pending' 
    };
    
    const approvedQuery = { 
      $or: [
        { student_id: objectId }, 
        { student_ids: objectId }
      ],
      status: 'approved' 
    };
    
    const rejectedQuery = { 
      $or: [
        { student_id: objectId }, 
        { student_ids: objectId }
      ],
      status: 'rejected' 
    };
    
    const pending = await AttendanceRequest.countDocuments(pendingQuery);
    const approved = await AttendanceRequest.countDocuments(approvedQuery);
    const rejected = await AttendanceRequest.countDocuments(rejectedQuery);
    
    const total = pending + approved + rejected;
    
    // Format the response
    const result = {
      total,
      pending,
      approved,
      rejected
    };
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching request stats:', error);
    res.status(500).json({ 
      message: 'Server error fetching attendance request stats', 
      error: error.message,
      stack: process.env.NODE_ENV === 'production' ? null : error.stack
    });
  }
};

// Update the status of a request (approve/reject)
exports.updateRequestStatus = async (req, res) => {
  try {
    const requestId = req.params.id;
    const { status, feedbackNote } = req.body;
    
    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      return res.status(400).json({ message: 'Invalid request ID format' });
    }
    
    // Validate status
    if (!status || !['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }
    
    // Get the current request
    const request = await AttendanceRequest.findById(requestId)
      .populate('subject_dates.subject_id');
      
    if (!request) {
      return res.status(404).json({ message: 'Attendance request not found' });
    }
    
    // For rejections, require a feedback note
    if (status === 'rejected' && !feedbackNote) {
      return res.status(400).json({ message: 'Feedback note is required when rejecting a request' });
    }
    
    // Update fields
    const updateFields = { status };
    if (feedbackNote) {
      updateFields.feedbackNote = feedbackNote;
    }
    
    // Update the request
    const updatedRequest = await AttendanceRequest.findByIdAndUpdate(
      requestId,
      { $set: updateFields },
      { new: true }
    )
      .populate({
        path: 'subject_dates.subject_id',
        select: 'name start_time end_time day class_name teacher_id',
        populate: {
          path: 'teacher_id',
          select: 'name'
        }
      })
      .populate('student_id', 'name sap email className')
      .populate('student_ids', 'name sap email className');
    
    // If the request was approved, create notifications for each subject's teacher with the correct date
    if (status === 'approved') {
      try {
        const notificationController = require('./notificationController');
        await notificationController.createNotificationsForRequest(requestId);
      } catch (notificationError) {
        console.error('Error creating notifications:', notificationError);
        // Continue with the response even if notifications failed
      }
    }
    
    res.status(200).json(updatedRequest);
  } catch (error) {
    console.error('Error updating request status:', error);
    res.status(500).json({ 
      message: 'Server error updating attendance request status',
      error: error.message 
    });
  }
};

// Get requests for a specific student
exports.getStudentRequests = async (req, res) => {
  try {
    const studentId = req.params.studentId;
    
    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({ message: 'Invalid student ID format' });
    }
    
    // Find requests where the user is either the primary requester or in student_ids
    const requests = await AttendanceRequest.find({
      $or: [
        { student_id: studentId },
        { student_ids: studentId }
      ]
    })
      .populate({
        path: 'subject_dates.subject_id',
        select: 'name start_time end_time day class_name teacher_id',
        populate: {
          path: 'teacher_id',
          select: 'name'
        }
      })
      .populate('student_id', 'name sap email className')
      .populate('student_ids', 'name sap email className')
      .sort({ createdAt: -1 });
    
    // Process requests to include subject_ids array for backward compatibility
    const processedRequests = requests.map(request => {
      const req = request.toObject({ virtuals: true });
      
      // Make sure subject_ids is an array with subjects from subject_dates
      req.subject_ids = request.subject_dates.map(sd => sd.subject_id);
      
      return req;
    });
    
    res.status(200).json(processedRequests);
  } catch (error) {
    console.error('Error fetching student requests:', error);
    res.status(500).json({ 
      message: 'Server error fetching attendance requests', 
      error: error.message 
    });
  }
};