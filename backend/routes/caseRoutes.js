const express = require('express');
const router = express.Router();
const caseController = require('../controllers/caseController');
const reportController = require('../controllers/reportController');
const { verifyToken, verifyRole } = require('../middlewares/auth');
const upload = require('../middlewares/upload');

// All routes require authentication
router.use(verifyToken);

// Center & Admin Routes for uploading and tracking cases (Manual or Machine Sync)
router.post('/upload', verifyRole('admin', 'center'), upload.single('dicomFile'), caseController.uploadCase);
router.post('/machine-sync', verifyRole('admin', 'center'), upload.single('dicomFile'), caseController.uploadCase);
router.get('/center/cases', verifyRole('admin', 'center'), caseController.getCenterCases);
router.get('/center/drafts', verifyRole('admin', 'center'), caseController.getCenterDrafts);
router.post('/draft/:id/publish', verifyRole('admin', 'center'), upload.single('dicomFile'), caseController.publishDraft);
router.delete('/draft/:id', verifyRole('admin', 'center'), caseController.deleteDraft);

router.get('/available', verifyRole('doctor'), caseController.getAvailableCases);
router.get('/:id/download', verifyRole('doctor', 'admin', 'center'), caseController.downloadCaseFiles);
router.get('/:id', verifyRole('doctor', 'admin', 'center'), caseController.getCaseById);
router.post('/claim/:id', verifyRole('doctor'), caseController.claimCase);
router.get('/:id/dicom-metadata', verifyRole('doctor', 'admin', 'center'), reportController.getDicomMetadata);
router.get('/:id/dicom-stream', verifyRole('doctor', 'admin', 'center'), reportController.streamDicom);
router.post('/:id/report', verifyRole('doctor'), reportController.submitReport);
router.post('/:id/report-issue', verifyRole('doctor'), caseController.reportIssue);
router.post('/:id/reupload', verifyRole('admin', 'center'), upload.single('dicomFile'), caseController.reuploadCaseFile);
router.post('/:id/report-wrong-report', verifyRole('admin', 'center'), caseController.reportWrongReport);

module.exports = router;
