const { User, DoctorProfile, sequelize } = require('../models');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// Setup Nodemailer for Gmail
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

exports.getPendingUsers = async (req, res) => {
    try {
        const users = await User.findAll({
            where: { status: 'pending', role: 'doctor' },
            include: [
                { model: DoctorProfile, as: 'doctorProfile' }
            ]
        });
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getApprovedDoctors = async (req, res) => {
    try {
        const users = await User.findAll({
            where: { status: 'approved', role: 'doctor' },
            include: [
                { model: DoctorProfile, as: 'doctorProfile' }
            ]
        });
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getAdminStats = async (req, res) => {
    try {
        const { Payout, XrayCase } = require('../models');
        const { Op } = require('sequelize');
        
        const totalDoctors = await User.count({ where: { role: 'doctor', status: 'approved' } });
        
        // Count all cases pending doctor diagnosis/completion ('uploaded' open pool or 'in_progress')
        const pendingCases = await XrayCase.count({ 
            where: { 
                status: { [Op.in]: ['uploaded', 'in_progress'] } 
            } 
        });
        const completedCases = await XrayCase.count({ where: { status: 'completed' } });
        
        const payouts = await Payout.findAll();
        const totalPaid = payouts.reduce((sum, p) => p.status === 'paid' ? sum + Number(p.amount) : sum, 0);
        const pendingDues = payouts.reduce((sum, p) => p.status === 'pending' ? sum + Number(p.amount) : sum, 0);
        
        res.json({
            totalDoctors,
            pendingCases,
            completedCases,
            totalPaid,
            pendingDues
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getAllCases = async (req, res) => {
    try {
        const { XrayCase, User, DoctorProfile, Report } = require('../models');
        const cases = await XrayCase.findAll({
            include: [
                {
                    model: User,
                    as: 'doctor',
                    attributes: ['id', 'email'],
                    include: [{ model: DoctorProfile, as: 'doctorProfile', attributes: ['name'] }]
                },
                {
                    model: Report,
                    as: 'report'
                }
            ],
            order: [['createdAt', 'DESC']]
        });
        res.json(cases);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.approveUser = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const userId = req.params.id;
        const user = await User.findByPk(userId);
        
        if (!user || user.status !== 'pending') {
            await t.rollback();
            return res.status(404).json({ message: 'Pending user not found' });
        }

        user.status = 'approved';
        await user.save({ transaction: t });

        // Send Email
        const mailOptions = {
            from: '"Tele-Radiology Admin" <admin@teleradiology.com>',
            to: user.email,
            subject: 'Account Approved - Tele-Radiology Platform',
            text: `Hello,\n\nYour account has been approved by the Admin.\n\nYou can now login to the portal using the email and password you created during registration.\n\nBest Regards,\nTele-Radiology Team`
        };

        try {
            await transporter.sendMail(mailOptions);
            console.log(`Sent approval email to ${user.email}`);
        } catch (emailError) {
            console.error('Email failed to send. Check .env config.', emailError);
        }

        await t.commit();
        res.json({ message: 'User approved and email sent.' });
    } catch (error) {
        await t.rollback();
        res.status(500).json({ error: error.message });
    }
};

exports.rejectUser = async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await User.findByPk(userId);
        if (!user || user.status !== 'pending') return res.status(404).json({ message: 'Pending user not found' });

        user.status = 'rejected';
        await user.save();

        res.json({ message: 'User rejected.' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
