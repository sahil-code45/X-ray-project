const { User, DoctorProfile, sequelize } = require('../models');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

exports.registerDoctor = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { email, password, name, age, gender, panCard, aadhaarCard, address, phoneNumber, reportFee } = req.body;
        const degreeFileUrl = req.file ? req.file.path : null;

        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            await t.rollback();
            return res.status(400).json({ message: 'Email already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({ email, password: hashedPassword, role: 'doctor', status: 'pending' }, { transaction: t });
        await DoctorProfile.create({ userId: user.id, name, age, gender, panCard, aadhaarCard, degreeFileUrl, address, phoneNumber, reportFee }, { transaction: t });

        await t.commit();
        res.status(201).json({ message: 'Doctor registration submitted successfully.' });
    } catch (error) {
        await t.rollback();
        res.status(500).json({ error: error.message });
    }
};

exports.registerAdmin = async (req, res) => {
    try {
        const { email, password } = req.body;
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) return res.status(400).json({ message: 'Email already exists' });
        
        const hashedPassword = await bcrypt.hash(password, 10);
        await User.create({ email, password: hashedPassword, role: 'admin', status: 'approved' });
        
        res.status(201).json({ message: 'Admin registered successfully.' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ where: { email } });
        if (!user || user.status !== 'approved' || !user.password) {
            return res.status(401).json({ message: 'Invalid credentials or account not approved' });
        }
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(401).json({ message: 'Invalid credentials' });

        const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET || 'secretkey', { expiresIn: '1d' });
        res.json({ token, role: user.role });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
