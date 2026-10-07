const { Payout, User, XrayCase, DoctorProfile } = require('../models');

exports.getAdminPayouts = async (req, res) => {
    try {
        const payouts = await Payout.findAll({
            include: [
                {
                    model: User,
                    as: 'doctor',
                    include: [
                        {
                            model: DoctorProfile,
                            as: 'doctorProfile'
                        }
                    ]
                },
                {
                    model: XrayCase,
                    as: 'xrayCase'
                }
            ],
            order: [['createdAt', 'DESC']]
        });
        res.json(payouts);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getAdminDoctorPayouts = async (req, res) => {
    try {
        const { doctorId } = req.params;
        const payouts = await Payout.findAll({
            where: { doctorId },
            include: [
                {
                    model: User,
                    as: 'doctor',
                    include: [
                        {
                            model: DoctorProfile,
                            as: 'doctorProfile'
                        }
                    ]
                },
                {
                    model: XrayCase,
                    as: 'xrayCase'
                }
            ],
            order: [['createdAt', 'DESC']]
        });
        res.json(payouts);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.markAsPaid = async (req, res) => {
    try {
        const { id } = req.params;
        const { transactionRef } = req.body;

        const payout = await Payout.findByPk(id);
        if (!payout) return res.status(404).json({ message: 'Payout not found' });

        payout.status = 'paid';
        payout.transactionRef = transactionRef;
        await payout.save();

        res.json({ message: 'Payout marked as paid successfully', payout });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getDoctorPayouts = async (req, res) => {
    try {
        const doctorId = req.user.id;
        const payouts = await Payout.findAll({
            where: { doctorId },
            include: [
                {
                    model: XrayCase,
                    as: 'xrayCase'
                }
            ],
            order: [['createdAt', 'DESC']]
        });

        const totalEarned = payouts.reduce((sum, p) => p.status === 'paid' ? sum + Number(p.amount) : sum, 0);
        const pendingDues = payouts.reduce((sum, p) => p.status === 'pending' ? sum + Number(p.amount) : sum, 0);

        res.json({ payouts, totalEarned, pendingDues });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
