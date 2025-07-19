const Subject = require('../models/Subject');
const User = require('../models/User');

// Get all subjects
exports.getAllSubjects = async (req, res) => {
  try {
    const subjects = await Subject.find()
      .populate('teacher_id', 'name -_id')
      .exec();
    
    // Transform data to match frontend format
    const formattedSubjects = subjects.map(subject => ({
      id: subject._id,
      start_time: subject.start_time,
      end_time: subject.end_time,
      teacher_name: subject.teacher_id ? subject.teacher_id.name : 'Unknown Teacher',
      name: subject.name,
      class_name: subject.class_name,
      day: subject.day
    }));
    
    res.status(200).json(formattedSubjects);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get subjects by class
exports.getSubjectsByClass = async (req, res) => {
  try {
    const { className } = req.params;
    
    const subjects = await Subject.find({ class_name: className })
      .populate('teacher_id', 'name -_id')
      .exec();
    
    // Transform data to match frontend format
    const formattedSubjects = subjects.map(subject => ({
      id: subject._id,
      start_time: subject.start_time,
      end_time: subject.end_time,
      teacher_name: subject.teacher_id ? subject.teacher_id.name : 'Unknown Teacher',
      name: subject.name,
      class_name: subject.class_name,
      day: subject.day
    }));
    
    res.status(200).json(formattedSubjects);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get a single subject
exports.getSubjectById = async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id)
      .populate('teacher_id', 'name -_id')
      .exec();
    
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }
    
    // Format the response
    const formattedSubject = {
      id: subject._id,
      start_time: subject.start_time,
      end_time: subject.end_time,
      teacher_name: subject.teacher_id ? subject.teacher_id.name : 'Unknown Teacher',
      name: subject.name,
      class_name: subject.class_name,
      day: subject.day
    };
    
    res.status(200).json(formattedSubject);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Create new subject
exports.createSubject = async (req, res) => {
  try {
    const { name, start_time, end_time, teacher_id, class_name, day } = req.body;
    
    // Validate that teacher_id is provided
    if (!teacher_id) {
      return res.status(400).json({ message: 'Teacher ID is required' });
    }
    
    // Find the teacher to get the name (for response)
    let teacher;
    try {
      teacher = await User.findById(teacher_id);
      if (!teacher) {
        return res.status(400).json({ message: `Teacher with ID ${teacher_id} not found` });
      }
    } catch (error) {
      return res.status(400).json({ message: `Invalid teacher ID: ${error.message}` });
    }
    
    // Create new subject with the provided teacher_id
    const newSubject = new Subject({
      name,
      start_time,
      end_time,
      teacher_id,
      class_name,
      day
    });
    
    await newSubject.save();
    
    // Return the created subject with teacher name
    const createdSubject = {
      id: newSubject._id,
      start_time: newSubject.start_time,
      end_time: newSubject.end_time,
      teacher_name: teacher.name, // Include teacher name for the frontend
      teacher_id: teacher_id,    // Include teacher ID for reference
      name: newSubject.name,
      class_name: newSubject.class_name,
      day: newSubject.day
    };
    
    res.status(201).json(createdSubject);
  } catch (error) {
    console.error('Error creating subject:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Update subject
exports.updateSubject = async (req, res) => {
  try {
    const { name, start_time, end_time, teacher_id, class_name, day } = req.body;
    
    // Validate that teacher_id is provided
    if (!teacher_id) {
      return res.status(400).json({ message: 'Teacher ID is required' });
    }
    
    // Find the teacher to get the name
    let teacher;
    try {
      teacher = await User.findById(teacher_id);
      if (!teacher) {
        return res.status(400).json({ message: `Teacher with ID ${teacher_id} not found` });
      }
    } catch (error) {
      return res.status(400).json({ message: `Invalid teacher ID: ${error.message}` });
    }
    
    // Check if the subject exists
    let subject = await Subject.findById(req.params.id);
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }
    
    // Update fields
    subject.name = name;
    subject.start_time = start_time;
    subject.end_time = end_time;
    subject.teacher_id = teacher_id;
    subject.class_name = class_name;
    subject.day = day;
    
    await subject.save();
    
    // Return the updated subject with teacher name
    const updatedSubject = {
      id: subject._id,
      start_time: subject.start_time,
      end_time: subject.end_time,
      teacher_name: teacher.name,
      teacher_id: teacher_id,
      name: subject.name,
      class_name: subject.class_name,
      day: subject.day
    };
    
    res.status(200).json(updatedSubject);
  } catch (error) {
    console.error('Error updating subject:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete subject
exports.deleteSubject = async (req, res) => {
  try {
    const subject = await Subject.findById(req.params.id);
    
    if (!subject) {
      return res.status(404).json({ message: 'Subject not found' });
    }
    
    await Subject.findByIdAndRemove(req.params.id);
    res.status(200).json({ message: 'Subject removed' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Import subjects from CSV
exports.importSubjectsFromCSV = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload a CSV file' });
    }
    
    const csvContent = req.file.buffer.toString('utf8');
    const lines = csvContent.split('\n');
    const headers = lines[0].split(',').map(header => header.trim());
    
    // Validate required headers
    const requiredFields = ['name', 'start_time', 'end_time', 'teacher_name', 'class_name', 'day'];
    const missingFields = requiredFields.filter(field => !headers.includes(field));
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        message: `CSV file is missing required fields: ${missingFields.join(', ')}`
      });
    }
    
    // Process each line
    const subjectsToCreate = [];
    const errors = [];
    
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      
      const values = lines[i].split(',').map(value => value.trim());
      if (values.length !== headers.length) {
        errors.push(`Line ${i+1} has invalid format`);
        continue;
      }
      
      const subjectData = {};
      headers.forEach((header, index) => {
        subjectData[header] = values[index];
      });
      
      // Validate required fields
      if (requiredFields.every(field => subjectData[field])) {
        subjectsToCreate.push(subjectData);
      } else {
        errors.push(`Line ${i+1} is missing required fields`);
      }
    }
    
    if (subjectsToCreate.length === 0) {
      return res.status(400).json({
        message: 'No valid subject data found in the CSV file',
        errors
      });
    }
    
    // Process each subject
    const createdSubjects = [];
    const skippedSubjects = [];
    
    for (const subjectData of subjectsToCreate) {
      try {
        // Find the teacher
        let teacher = await User.findOne({ 
          name: subjectData.teacher_name,
          role: 'teacher'
        });
        
        if (!teacher) {
          skippedSubjects.push({
            subject: subjectData,
            reason: `Teacher "${subjectData.teacher_name}" not found`
          });
          continue;
        }
        
        // Create new subject
        const newSubject = new Subject({
          name: subjectData.name,
          start_time: subjectData.start_time,
          end_time: subjectData.end_time,
          teacher_id: teacher._id,
          class_name: subjectData.class_name,
          day: subjectData.day
        });
        
        await newSubject.save();
        
        createdSubjects.push({
          id: newSubject._id,
          start_time: newSubject.start_time,
          end_time: newSubject.end_time,
          teacher_name: subjectData.teacher_name,
          name: newSubject.name,
          class_name: newSubject.class_name,
          day: newSubject.day
        });
      } catch (error) {
        skippedSubjects.push({
          subject: subjectData,
          reason: error.message
        });
      }
    }
    
    res.status(201).json({
      message: `Imported ${createdSubjects.length} subjects successfully, skipped ${skippedSubjects.length} subjects`,
      created: createdSubjects,
      skipped: skippedSubjects,
      errors
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
}; 