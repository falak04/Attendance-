const express = require('express');
const router = express.Router();
const subjectController = require('../controllers/subjectController');
const multer = require('multer');

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage });

// @route   GET /api/subjects
// @desc    Get all subjects
// @access  Public (should be protected in production)
router.get('/', subjectController.getAllSubjects);

// @route   GET /api/subjects/class/:className
// @desc    Get subjects by class
// @access  Public (should be protected in production)
router.get('/class/:className', subjectController.getSubjectsByClass);

// @route   GET /api/subjects/:id
// @desc    Get subject by ID
// @access  Public (should be protected in production)
router.get('/:id', subjectController.getSubjectById);

// @route   POST /api/subjects
// @desc    Create a subject
// @access  Public (should be protected in production)
router.post('/', subjectController.createSubject);

// @route   PUT /api/subjects/:id
// @desc    Update a subject
// @access  Public (should be protected in production)
router.put('/:id', subjectController.updateSubject);

// @route   DELETE /api/subjects/:id
// @desc    Delete a subject
// @access  Public (should be protected in production)
router.delete('/:id', subjectController.deleteSubject);

// @route   POST /api/subjects/import/csv
// @desc    Import subjects from CSV
// @access  Public (should be protected in production)
router.post('/import/csv', upload.single('file'), subjectController.importSubjectsFromCSV);

module.exports = router; 