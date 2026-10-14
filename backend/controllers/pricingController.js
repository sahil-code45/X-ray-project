const { DoctorTestPricing, User, DoctorProfile } = require('../models');

const STANDARD_TESTS = {
  CT: [
    '1. CT Head — non-contrast',
    '2. CT Head — trauma-focused',
    '3. CT Head / Neck Angiography',
    '4. CT Chest — non-contrast',
    '5. CT Chest — Pulmonary Embolism (PE) Protocol',
    '6. CT Abdomen and Pelvis — non-contrast',
    '7. CT Abdomen and Pelvis — with contrast',
    '8. CT Cervical Spine',
    '9. CT Lumbar Spine',
    '10. CT Facial Bones / Sinuses',
    '11. CT Temporal Bones',
    '12. CT Urogram'
  ],
  MRI: [
    '1. MRI Brain — Routine / Stroke Protocol',
    '2. MRI Brain — With & Without Contrast (Tumor / Infection)',
    '3. MRI Cervical Spine',
    '4. MRI Lumbar Spine',
    '5. MRI Thoracic Spine',
    '6. MRI Knee Joint',
    '7. MRI Shoulder Joint',
    '8. MRI Pelvis / Hip Joint (Avascular Necrosis / AVN Protocol)',
    '9. MRI Ankle & Foot',
    '10. MRI Abdomen / MRCP (Biliary & Pancreas Protocol)',
    '11. MRI Pelvis — Female (Uterus & Ovaries)',
    '12. MRI Pelvis — Prostate (PI-RADS Protocol)'
  ]
};

// GET /api/pricing/tests
exports.getStandardTests = async (req, res) => {
  try {
    res.json({ modalities: ['CT', 'MRI'], tests: STANDARD_TESTS });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/pricing
exports.getAllPricings = async (req, res) => {
  try {
    const { doctorId, modality } = req.query;
    const where = {};
    if (doctorId !== undefined && doctorId !== '' && doctorId !== 'all') {
      where.doctorId = parseInt(doctorId);
    }
    if (modality && modality !== 'all') {
      where.modality = modality;
    }

    const pricings = await DoctorTestPricing.findAll({
      where,
      include: [
        {
          model: User,
          as: 'doctor',
          attributes: ['id', 'email', 'role'],
          include: [
            {
              model: DoctorProfile,
              as: 'doctorProfile',
              attributes: ['id', 'name', 'phoneNumber', 'reportFee']
            }
          ]
        }
      ],
      order: [
        ['modality', 'ASC'],
        ['testName', 'ASC'],
        ['createdAt', 'DESC']
      ]
    });

    res.json(pricings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/pricing/doctor/:doctorId
exports.getDoctorPricings = async (req, res) => {
  try {
    const doctorId = parseInt(req.params.doctorId);

    // Fetch doctor-specific pricing
    const pricings = await DoctorTestPricing.findAll({
      where: { doctorId },
      order: [['testName', 'ASC']]
    });

    res.json(pricings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/pricing
exports.createOrUpdatePricing = async (req, res) => {
  try {
    const { doctorId, modality, testName, price } = req.body;

    if (!doctorId || doctorId === 'null' || doctorId === '') {
      return res.status(400).json({ message: 'Target doctor is required. Rates must be assigned to an approved doctor.' });
    }

    if (!modality || !testName || price === undefined || price === null || price === '') {
      return res.status(400).json({ message: 'Modality, Test Name, and Price are required.' });
    }

    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      return res.status(400).json({ message: 'Valid positive price amount is required.' });
    }

    const targetDocId = parseInt(doctorId);
    const docUser = await User.findByPk(targetDocId);
    if (!docUser || docUser.role !== 'doctor') {
      return res.status(400).json({ message: 'Selected user is not an approved doctor.' });
    }

    // Check if a pricing record for this doctor and test already exists
    let record = await DoctorTestPricing.findOne({
      where: {
        doctorId: targetDocId,
        testName: testName.trim()
      }
    });

    if (record) {
      record.price = parsedPrice;
      record.modality = modality.trim().toUpperCase();
      await record.save();
    } else {
      record = await DoctorTestPricing.create({
        doctorId: targetDocId,
        modality: modality.trim().toUpperCase(),
        testName: testName.trim(),
        price: parsedPrice
      });
    }

    // Return with included doctor info
    const fullRecord = await DoctorTestPricing.findByPk(record.id, {
      include: [
        {
          model: User,
          as: 'doctor',
          attributes: ['id', 'email', 'role'],
          include: [{ model: DoctorProfile, as: 'doctorProfile' }]
        }
      ]
    });

    res.status(200).json({
      message: 'Pricing saved successfully.',
      pricing: fullRecord
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/pricing/:id
exports.updatePricing = async (req, res) => {
  try {
    const { id } = req.params;
    const { price, modality, testName, doctorId } = req.body;

    const record = await DoctorTestPricing.findByPk(id);
    if (!record) return res.status(404).json({ message: 'Pricing record not found.' });

    if (doctorId !== undefined) {
      if (!doctorId || doctorId === 'null' || doctorId === '') {
        return res.status(400).json({ message: 'Target doctor is required.' });
      }
      const targetDocId = parseInt(doctorId);
      const docUser = await User.findByPk(targetDocId);
      if (!docUser || docUser.role !== 'doctor') {
        return res.status(400).json({ message: 'Selected user is not an approved doctor.' });
      }
      record.doctorId = targetDocId;
    }

    if (price !== undefined) {
      const parsedPrice = parseFloat(price);
      if (isNaN(parsedPrice) || parsedPrice < 0) {
        return res.status(400).json({ message: 'Invalid price value.' });
      }
      record.price = parsedPrice;
    }

    if (modality) record.modality = modality.trim().toUpperCase();
    if (testName) record.testName = testName.trim();

    await record.save();

    const fullRecord = await DoctorTestPricing.findByPk(record.id, {
      include: [
        {
          model: User,
          as: 'doctor',
          attributes: ['id', 'email'],
          include: [{ model: DoctorProfile, as: 'doctorProfile' }]
        }
      ]
    });

    res.json({ message: 'Price updated successfully.', pricing: fullRecord });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/pricing/:id
exports.deletePricing = async (req, res) => {
  try {
    const { id } = req.params;
    const record = await DoctorTestPricing.findByPk(id);
    if (!record) return res.status(404).json({ message: 'Pricing record not found.' });

    await record.destroy();
    res.json({ message: 'Pricing record deleted successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/pricing/seed-defaults
exports.seedDefaultPricings = async (req, res) => {
  try {
    const { ctPrice = 350, mriPrice = 600, doctorId } = req.body;
    if (!doctorId || doctorId === 'null') {
      return res.status(400).json({ message: 'Doctor ID is required to configure baseline rates for a doctor.' });
    }
    const targetDocId = parseInt(doctorId);
    const docUser = await User.findByPk(targetDocId);
    if (!docUser || docUser.role !== 'doctor') {
      return res.status(400).json({ message: 'Selected user is not an approved doctor.' });
    }

    let createdCount = 0;
    let updatedCount = 0;

    // Seed CT tests
    for (const testName of STANDARD_TESTS.CT) {
      const [record, created] = await DoctorTestPricing.findOrCreate({
        where: { doctorId: targetDocId, testName },
        defaults: { modality: 'CT', price: ctPrice }
      });
      if (created) {
        createdCount++;
      } else {
        record.price = ctPrice;
        await record.save();
        updatedCount++;
      }
    }

    // Seed MRI tests
    for (const testName of STANDARD_TESTS.MRI) {
      const [record, created] = await DoctorTestPricing.findOrCreate({
        where: { doctorId: targetDocId, testName },
        defaults: { modality: 'MRI', price: mriPrice }
      });
      if (created) {
        createdCount++;
      } else {
        record.price = mriPrice;
        await record.save();
        updatedCount++;
      }
    }

    res.json({
      message: `Setup completed: ${createdCount} tests created, ${updatedCount} updated for Doctor.`,
      createdCount,
      updatedCount
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

