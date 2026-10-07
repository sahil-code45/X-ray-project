const express = require('express');
const router = express.Router();
const { User, DoctorProfile } = require('../models');
const { verifyToken } = require('../middlewares/auth');

router.get('/doctors', verifyToken, async (req, res) => {
    try {
        const doctors = await User.findAll({
            where: { role: 'doctor', status: 'approved' },
            attributes: ['id', 'email', 'status', 'createdAt'],
            include: [{ model: DoctorProfile, as: 'doctorProfile' }]
        });
        res.json(doctors);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
