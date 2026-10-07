const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyToken, verifyRole } = require('../middlewares/auth');

router.use(verifyToken);
router.use(verifyRole('admin'));

router.get('/stats', adminController.getAdminStats);
router.get('/cases', adminController.getAllCases);
router.get('/pending-users', adminController.getPendingUsers);
router.get('/approved-users', adminController.getApprovedDoctors);
router.put('/approve/:id', adminController.approveUser);
router.put('/reject/:id', adminController.rejectUser);

module.exports = router;
