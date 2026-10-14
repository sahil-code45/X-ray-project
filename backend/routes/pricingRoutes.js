const express = require('express');
const router = express.Router();
const pricingController = require('../controllers/pricingController');
const { verifyToken, verifyRole } = require('../middlewares/auth');

// Public/authenticated test list lookup
router.get('/tests', verifyToken, pricingController.getStandardTests);

// Doctor test pricing lookup
router.get('/doctor/:doctorId', verifyToken, pricingController.getDoctorPricings);

// Admin pricing management endpoints
router.get('/', verifyToken, verifyRole('admin'), pricingController.getAllPricings);
router.post('/', verifyToken, verifyRole('admin'), pricingController.createOrUpdatePricing);
router.put('/:id', verifyToken, verifyRole('admin'), pricingController.updatePricing);
router.delete('/:id', verifyToken, verifyRole('admin'), pricingController.deletePricing);
router.post('/seed-defaults', verifyToken, verifyRole('admin'), pricingController.seedDefaultPricings);

module.exports = router;

