const express = require('express');
const router = express.Router();
const caseController = require('../controllers/caseController');
const reportController = require('../controllers/reportController');
const { verifyToken, verifyRole } = require('../middlewares/auth');
const upload = require('../middlewares/upload');

// All routes require authentication
router.use(verifyToken);

// Center & Admin Routes for uploading and tracking cases
router.post('/upload', verifyRole('admin', 'center'), upload.single('dicomFile'), caseController.uploadCase);
router.get('/center/cases', verifyRole('admin', 'center'), caseController.getCenterCases);

// Doctor Routes
router.get('/available', verifyRole('doctor'), caseController.getAvailableCases);
router.get('/:id', verifyRole('doctor'), caseController.getCaseById);
router.post('/claim/:id', verifyRole('doctor'), caseController.claimCase);
router.get('/:id/dicom-metadata', verifyRole('doctor'), reportController.getDicomMetadata);
router.get('/:id/dicom-stream', verifyRole('doctor'), reportController.streamDicom);
router.post('/:id/report', verifyRole('doctor'), reportController.submitReport);

module.exports = router;
