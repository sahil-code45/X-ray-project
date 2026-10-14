const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const upload = require('../middlewares/upload');

router.post('/register/doctor', upload.fields([
  { name: 'registrationFile', maxCount: 1 },
  { name: 'registrationCertificate', maxCount: 1 },
  { name: 'mbbsDegreeFile', maxCount: 1 },
  { name: 'pgDegreeFile', maxCount: 1 },
  { name: 'signatureFile', maxCount: 1 },
  { name: 'degreeFile', maxCount: 1 }
]), authController.registerDoctor);
router.post('/register/admin', authController.registerAdmin);
router.post('/register/center', authController.registerCenter);
router.post('/login', authController.login);

module.exports = router;
