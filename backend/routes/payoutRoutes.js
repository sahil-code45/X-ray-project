const express = require('express');
const router = express.Router();
const payoutController = require('../controllers/payoutController');
const { verifyToken, verifyRole } = require('../middlewares/auth');

router.use(verifyToken);

// Admin Payout Routes
router.get('/admin', verifyRole('admin'), payoutController.getAdminPayouts);
router.get('/admin/doctor/:doctorId', verifyRole('admin'), payoutController.getAdminDoctorPayouts);
router.put('/admin/:id/pay', verifyRole('admin'), payoutController.markAsPaid);

// Doctor Payout Routes
router.get('/doctor', verifyRole('doctor'), payoutController.getDoctorPayouts);

module.exports = router;
