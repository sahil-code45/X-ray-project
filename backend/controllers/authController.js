const { User, DoctorProfile, sequelize } = require('../models');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

exports.registerDoctor = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { email, password, name, age, gender, panCard, aadhaarCard, address, phoneNumber, reportFee, registrationNumber } = req.body;
        
        const mbbsFile = req.files?.mbbsDegreeFile?.[0] || req.files?.degreeFile?.[0] || req.file;
        const pgFile = req.files?.pgDegreeFile?.[0];
        const sigFile = req.files?.signatureFile?.[0];
        const regFile = req.files?.registrationFile?.[0] || req.files?.registrationCertificate?.[0];

        const toRelativeUrl = (file) => {
            if (!file) return null;
            if (file.filename) return `uploads/${file.filename}`;
            const normalized = file.path.replace(/\\/g, '/');
            const idx = normalized.indexOf('uploads/');
            return idx !== -1 ? normalized.substring(idx) : `uploads/${file.path}`;
        };

        const mbbsDegreeFileUrl = toRelativeUrl(mbbsFile);
        const pgDegreeFileUrl = toRelativeUrl(pgFile);
        const signatureFileUrl = toRelativeUrl(sigFile);
        const registrationFileUrl = toRelativeUrl(regFile);
        const degreeFileUrl = mbbsDegreeFileUrl;

        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            await t.rollback();
            return res.status(400).json({ message: 'Email already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({ email, password: hashedPassword, role: 'doctor', status: 'pending' }, { transaction: t });
        await DoctorProfile.create({ 
            userId: user.id, 
            name, 
            age, 
            gender, 
            panCard, 
            aadhaarCard, 
            registrationNumber: registrationNumber || '',
            registrationFileUrl,
            mbbsDegreeFileUrl,
            pgDegreeFileUrl,
            signatureFileUrl,
            degreeFileUrl, 
            address, 
            phoneNumber, 
            reportFee: (reportFee !== undefined && reportFee !== '' && reportFee !== null) ? Number(reportFee) : 0 
        }, { transaction: t });

        await t.commit();
        res.status(201).json({ message: 'Doctor registration submitted successfully.' });
    } catch (error) {
        await t.rollback();
        res.status(500).json({ error: error.message });
    }
};

exports.registerAdmin = async (req, res) => {
    return res.status(403).json({ message: 'Admin registration is disabled. Only the system administrator account can be used.' });
};

exports.registerCenter = async (req, res) => {
    try {
        const { email, password } = req.body;
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) return res.status(400).json({ message: 'Email already exists' });
        
        const hashedPassword = await bcrypt.hash(password, 10);
        await User.create({ email, password: hashedPassword, role: 'center', status: 'approved' });
        
        res.status(201).json({ message: 'Diagnostic Center registered successfully. You can now login.' });
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

        // Ensure only aman123@gmail.com can log in as admin
        if (user.role === 'admin' && user.email.toLowerCase() !== 'aman123@gmail.com') {
            return res.status(403).json({ message: 'Only authorized administrator (aman123@gmail.com) can sign in.' });
        }

        const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET || 'secretkey', { expiresIn: '1d' });
        res.json({ token, role: user.role });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
