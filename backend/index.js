require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const path = require('path');
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  }
}));

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

    // Ensure database columns & enum for center
    try {
      await sequelize.query(`ALTER TYPE "enum_Users_role" ADD VALUE IF NOT EXISTS 'center';`);
    } catch (e) {}
    try {
      await sequelize.query(`ALTER TABLE "XrayCases" ADD COLUMN IF NOT EXISTS "centerId" INTEGER;`);
    } catch (e) {}
    try {
      await sequelize.query(`ALTER TABLE "XrayCases" ADD COLUMN IF NOT EXISTS "issueDescription" TEXT;`);
    } catch (e) {}
    try {
      await sequelize.query(`ALTER TABLE "XrayCases" ADD COLUMN IF NOT EXISTS "isModified" BOOLEAN DEFAULT FALSE;`);
    } catch (e) {}
    try {
      await sequelize.query(`ALTER TABLE "XrayCases" ADD COLUMN IF NOT EXISTS "reportIssueDescription" TEXT;`);
    } catch (e) {}
    try {
      await sequelize.query(`ALTER TABLE "XrayCases" ADD COLUMN IF NOT EXISTS "isReportWrong" BOOLEAN DEFAULT FALSE;`);
    } catch (e) {}
    try {
      await sequelize.query(`ALTER TABLE "DoctorProfiles" ADD COLUMN IF NOT EXISTS "registrationNumber" VARCHAR(255);`);
    } catch (e) {}
    try {
      await sequelize.query(`ALTER TABLE "DoctorProfiles" ADD COLUMN IF NOT EXISTS "mbbsDegreeFileUrl" VARCHAR(255);`);
    } catch (e) {}
    try {
      await sequelize.query(`ALTER TABLE "DoctorProfiles" ADD COLUMN IF NOT EXISTS "pgDegreeFileUrl" VARCHAR(255);`);
    } catch (e) {}
    try {
      await sequelize.query(`ALTER TABLE "DoctorProfiles" ADD COLUMN IF NOT EXISTS "signatureFileUrl" VARCHAR(255);`);
    } catch (e) {}
    try {
      await sequelize.query(`ALTER TABLE "DoctorProfiles" ALTER COLUMN "degreeFileUrl" DROP NOT NULL;`);
    } catch (e) {}

    // Normalize any existing DoctorProfile file paths to relative 'uploads/filename'
    try {
      const allDocs = await DoctorProfile.findAll();
      for (const d of allDocs) {
        let changed = false;
        ['mbbsDegreeFileUrl', 'pgDegreeFileUrl', 'signatureFileUrl', 'degreeFileUrl'].forEach(col => {
          if (d[col]) {
            const norm = d[col].replace(/\\/g, '/');
            const idx = norm.toLowerCase().indexOf('uploads/');
            if (idx !== -1) {
              const rel = norm.substring(idx);
              if (d[col] !== rel) {
                d[col] = rel;
                changed = true;
              }
            }
          }
        });
        if (changed) {
          await d.save();
        }
      }
    } catch (e) {
      console.warn('Doc profile path cleanup warning:', e.message);
    }

    // Ensure default Diagnostic Center exists
    const [centerUser, centerCreated] = await User.findOrCreate({
      where: { email: 'center@teleradiology.com' },
      defaults: {
        password: await bcrypt.hash('center123', 10),
        role: 'center',
        status: 'approved'
      }
    });
    if (centerCreated) {
      console.log('Default center seeded: center@teleradiology.com / center123');
    }
  } catch (err) {
    console.error('Database connection / sync error:', err.message);
  }
});
