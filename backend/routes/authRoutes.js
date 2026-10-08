const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const upload = require('../middlewares/upload');

router.post('/register/doctor', upload.single('degreeFile'), authController.registerDoctor);
router.post('/register/admin', authController.registerAdmin);
router.post('/register/center', authController.registerCenter);
router.post('/login', authController.login);

module.exports = router;
