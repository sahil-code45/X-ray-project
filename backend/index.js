require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.json());
app.use(cors());

const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const caseRoutes = require('./routes/caseRoutes');
const payoutRoutes = require('./routes/payoutRoutes');
const userRoutes = require('./routes/userRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/cases', caseRoutes);
app.use('/api/payouts', payoutRoutes);
app.use('/api/users', userRoutes);

app.get('/', (req, res) => {
  res.send('Tele-Radiology API is running...');
});

const PORT = process.env.PORT || 5000;

const { sequelize, User, DoctorProfile } = require('./models');
const bcrypt = require('bcrypt');

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  try {
    await sequelize.authenticate();
    console.log('Database connected successfully.');
    await sequelize.sync();

    // Ensure default admin exists
    const [adminUser, adminCreated] = await User.findOrCreate({
      where: { email: 'admin@teleradiology.com' },
      defaults: {
        password: await bcrypt.hash('admin123', 10),
        role: 'admin',
        status: 'approved'
      }
    });
    if (adminCreated) {
      console.log('Default admin seeded: admin@teleradiology.com / admin123');
    }

    // Ensure default doctor exists
    const [docUser, docCreated] = await User.findOrCreate({
      where: { email: 'doctor@teleradiology.com' },
      defaults: {
        password: await bcrypt.hash('doctor123', 10),
        role: 'doctor',
        status: 'approved'
      }
    });
    if (docCreated) {
      await DoctorProfile.create({
        userId: docUser.id,
        name: 'Dr. Sharma',
        age: 38,
        gender: 'Male',
        panCard: 'ABCDE1234F',
        aadhaarCard: '123456789012',
        degreeFileUrl: 'uploads/sample_degree.pdf',
        address: 'New Delhi',
        phoneNumber: '9876543210',
        reportFee: 500
      });
      console.log('Default doctor seeded: doctor@teleradiology.com / doctor123');
    }
  } catch (err) {
    console.error('Database connection / sync error:', err.message);
  }
});
