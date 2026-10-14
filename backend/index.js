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
const pricingRoutes = require('./routes/pricingRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/cases', caseRoutes);
app.use('/api/payouts', payoutRoutes);
app.use('/api/users', userRoutes);
app.use('/api/pricing', pricingRoutes);

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

    // Ensure admin aman123@gmail.com exists with password Aman@1020
    const adminHashedPassword = await bcrypt.hash('Aman@1020', 10);
    const [adminUser, adminCreated] = await User.findOrCreate({
      where: { email: 'aman123@gmail.com' },
      defaults: {
        password: adminHashedPassword,
        role: 'admin',
        status: 'approved'
      }
    });
    if (!adminCreated) {
      await adminUser.update({
        password: adminHashedPassword,
        role: 'admin',
        status: 'approved'
      });
      console.log('Admin aman123@gmail.com verified and updated.');
    } else {
      console.log('Admin seeded: aman123@gmail.com / Aman@1020');
    }

    // Cleanup old default admin account so only aman123@gmail.com can log in as admin
    try {
      await User.destroy({ where: { email: 'admin@teleradiology.com' } });
    } catch (e) {
      try {
        await User.update({ role: 'inactive', status: 'rejected' }, { where: { email: 'admin@teleradiology.com' } });
      } catch (err) {}
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
      await sequelize.query(`ALTER TABLE "DoctorProfiles" ADD COLUMN IF NOT EXISTS "registrationFileUrl" VARCHAR(255);`);
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
    try {
      await sequelize.query(`ALTER TABLE "DoctorProfiles" ALTER COLUMN "reportFee" DROP NOT NULL;`);
    } catch (e) {}
    try {
      await sequelize.query(`ALTER TABLE "DoctorProfiles" ALTER COLUMN "reportFee" SET DEFAULT 0;`);
    } catch (e) {}

    // DoctorTestPricings table and test columns
    try {
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS "DoctorTestPricings" (
          "id" SERIAL PRIMARY KEY,
          "doctorId" INTEGER REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
          "modality" VARCHAR(255) NOT NULL,
          "testName" VARCHAR(255) NOT NULL,
          "price" DECIMAL(10, 2) NOT NULL,
          "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
        );
      `);
    } catch (e) {}
    try {
      await sequelize.query(`ALTER TABLE "Payouts" ADD COLUMN IF NOT EXISTS "testName" VARCHAR(255);`);
    } catch (e) {}
    try {
      await sequelize.query(`ALTER TABLE "Payouts" ADD COLUMN IF NOT EXISTS "modality" VARCHAR(255);`);
    } catch (e) {}
    try {
      await sequelize.query(`ALTER TABLE "XrayCases" ADD COLUMN IF NOT EXISTS "testName" VARCHAR(255);`);
    } catch (e) {}
    try {
      await sequelize.query(`ALTER TABLE "XrayCases" ADD COLUMN IF NOT EXISTS "modality" VARCHAR(255);`);
    } catch (e) {}
    try {
      await sequelize.query(`ALTER TABLE "Reports" ADD COLUMN IF NOT EXISTS "testName" VARCHAR(255);`);
    } catch (e) {}
    try {
      await sequelize.query(`ALTER TABLE "Reports" ADD COLUMN IF NOT EXISTS "modality" VARCHAR(255);`);
    } catch (e) {}


    // Normalize any existing DoctorProfile file paths to relative 'uploads/filename'
    try {
      const allDocs = await DoctorProfile.findAll();
      for (const d of allDocs) {
        let changed = false;
        ['mbbsDegreeFileUrl', 'pgDegreeFileUrl', 'signatureFileUrl', 'degreeFileUrl', 'registrationFileUrl'].forEach(col => {
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
  } catch (err) {
    console.error('Database connection / sync error:', err.message);
  }
});
