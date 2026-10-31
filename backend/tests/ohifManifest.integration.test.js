process.env.USE_SQLITE = 'true';
process.env.JWT_SECRET = 'test-integration-secret-key-123';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { Writable } = require('stream');
const jwt = require('jsonwebtoken');

const { sequelize, User, XrayCase } = require('../models');
const reportController = require('../controllers/reportController');
const { createMockDicomBuffer } = require('./createMockDicom');

class MockResponse extends Writable {
  constructor() {
    super();
    this.statusCode = 200;
    this.headers = {};
    this.body = null;
    this.headersSent = false;
  }

  _write(chunk, encoding, callback) {
    if (callback) callback();
  }

  status(code) {
    this.statusCode = code;
    return this;
  }

  setHeader(name, value) {
    this.headers[name.toLowerCase()] = value;
    return this;
  }

  json(data) {
    this.body = data;
    this.headersSent = true;
    this.end(JSON.stringify(data));
    return this;
  }
}

async function runTests() {
  console.log('🧪 Starting OHIF Manifest Integration Tests...');

  await sequelize.sync({ force: true });

  const centerUser = await User.create({
    name: 'Apollo Center',
    email: 'apollo_center@test.com',
    password: 'password123',
    role: 'center',
    status: 'approved'
  });

  const otherCenterUser = await User.create({
    name: 'Other Center',
    email: 'other_center@test.com',
    password: 'password123',
    role: 'center',
    status: 'approved'
  });

  const doctorUser = await User.create({
    name: 'Dr. Mehta',
    email: 'dr_mehta@test.com',
    password: 'password123',
    role: 'doctor',
    status: 'approved'
  });

  const doctorToken = jwt.sign(
    { id: doctorUser.id, role: 'doctor', email: doctorUser.email },
    process.env.JWT_SECRET
  );

  const otherCenterToken = jwt.sign(
    { id: otherCenterUser.id, role: 'center', email: otherCenterUser.email },
    process.env.JWT_SECRET
  );

  const testUploadDir = path.resolve(__dirname, 'test_ohif_temp_upload');
  if (fs.existsSync(testUploadDir)) {
    fs.rmSync(testUploadDir, { recursive: true, force: true });
  }
  fs.mkdirSync(testUploadDir, { recursive: true });

  // Create 3 mock DICOM slices
  for (let i = 1; i <= 3; i++) {
    const dcmBuf = createMockDicomBuffer({
      patientName: 'Kavita Sharma',
      patientId: 'PT-OHIF-99',
      modality: 'CT',
      instanceNumber: i,
      studyInstanceUid: '1.2.840.113619.2.55.1234567',
      seriesInstanceUid: '1.2.840.113619.2.55.1234567.1'
    });
    fs.writeFileSync(path.join(testUploadDir, `slice_${i}.dcm`), dcmBuf);
  }

  const xrayCase = await XrayCase.create({
    patientName: 'Kavita Sharma',
    patientAge: 38,
    patientGender: 'Female',
    testName: 'CT Head Plain',
    modality: 'CT',
    centerId: centerUser.id,
    status: 'uploaded',
    dicomFileUrl: testUploadDir
  });

  let passed = 0;
  let total = 0;

  // Test 1: 404 for non-existent case
  total++;
  try {
    const req = {
      params: { id: 9999 },
      user: { id: doctorUser.id, role: 'doctor' },
      query: {},
      headers: {},
      get: () => 'localhost:8000',
      protocol: 'http'
    };
    const res = new MockResponse();
    await reportController.getOhifManifest(req, res);
    if (res.statusCode !== 404) console.log('DEBUG 1:', res.statusCode, res.body);
    assert.strictEqual(res.statusCode, 404);
    assert.strictEqual(res.body.message, 'Case not found');
    console.log('✅ Test 1: 404 returned correctly for non-existent case ID');
    passed++;
  } catch (err) {
    console.error('❌ Test 1 Failed:', err.message);
  }

  // Test 2: 403 for unauthorized center trying to access another center's case
  total++;
  try {
    const req = {
      params: { id: xrayCase.id },
      user: { id: otherCenterUser.id, role: 'center' },
      query: {},
      headers: {},
      get: () => 'localhost:8000',
      protocol: 'http'
    };
    const res = new MockResponse();
    await reportController.getOhifManifest(req, res);
    assert.strictEqual(res.statusCode, 403);
    console.log('✅ Test 2: 403 Forbidden for unauthorized center');
    passed++;
  } catch (err) {
    console.error('❌ Test 2 Failed:', err.message);
  }

  // Test 3: Doctor receives valid OHIF v3 DICOM JSON Manifest
  total++;
  try {
    const req = {
      params: { id: xrayCase.id },
      user: { id: doctorUser.id, role: 'doctor' },
      query: { token: doctorToken },
      headers: { authorization: `Bearer ${doctorToken}` },
      get: () => 'localhost:8000',
      protocol: 'http'
    };
    const res = new MockResponse();
    await reportController.getOhifManifest(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.ok(res.body, 'Response body should exist');
    assert.ok(Array.isArray(res.body.studies), 'studies array should exist');
    assert.strictEqual(res.body.studies.length, 1);

    const study = res.body.studies[0];
    assert.strictEqual(study.PatientName, 'Kavita Sharma');
    assert.strictEqual(study.PatientID, 'PT-OHIF-99');
    assert.ok(study.StudyInstanceUID, 'StudyInstanceUID must exist');
    assert.ok(Array.isArray(study.series), 'series array must exist for OHIF v3');
    assert.ok(Array.isArray(study.seriesList), 'seriesList must be an array for legacy viewers');
    assert.strictEqual(study.series.length, 1);
    assert.strictEqual(study.seriesList.length, 1);

    const series = study.series[0];
    assert.strictEqual(series.Modality, 'CT');
    assert.strictEqual(series.instances.length, 3, 'Should list 3 instances');

    for (let i = 0; i < series.instances.length; i++) {
      const inst = series.instances[i];
      assert.ok(inst.url.startsWith('dicomweb:'), 'Instance URL must start with dicomweb:');
      assert.ok(inst.url.includes(`slice=slice_${i + 1}.dcm`), 'Instance URL must point to slice');
      assert.strictEqual(inst.metadata.InstanceNumber, i + 1);
    }

    console.log('✅ Test 3: Valid OHIF v3 DICOM JSON Manifest generated with all slices and UIDs');
    passed++;
  } catch (err) {
    console.error('❌ Test 3 Failed:', err.message);
  }

  // Clean up
  try {
    if (fs.existsSync(testUploadDir)) {
      fs.rmSync(testUploadDir, { recursive: true, force: true });
    }
  } catch (e) {}

  console.log(`\n🎉 OHIF Manifest Tests Summary: ${passed}/${total} passed`);
  if (passed !== total) process.exit(1);
}

runTests().catch(err => {
  console.error('Fatal Test Error:', err);
  process.exit(1);
});
