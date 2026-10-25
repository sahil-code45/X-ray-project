process.env.USE_SQLITE = 'true';
process.env.JWT_SECRET = 'test-integration-secret-key-123';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { Writable } = require('stream');
const jwt = require('jsonwebtoken');
const { ZipArchive } = require('archiver');

const { sequelize, User, XrayCase } = require('../models');
const caseController = require('../controllers/caseController');
const reportController = require('../controllers/reportController');
const { createMockDicomBuffer } = require('./createMockDicom');

class MockResponse extends Writable {
  constructor() {
    super();
    this.statusCode = 200;
    this.headers = {};
    this.body = null;
    this.chunks = [];
    this.headersSent = false;
  }

  status(code) {
    this.statusCode = code;
    return this;
  }

  setHeader(name, value) {
    this.headers[name.toLowerCase()] = value;
    return this;
  }

  getHeader(name) {
    return this.headers[name.toLowerCase()];
  }

  writeHead(status, headers = {}) {
    this.statusCode = status;
    for (const [k, v] of Object.entries(headers)) {
      this.headers[k.toLowerCase()] = v;
    }
    this.headersSent = true;
    return this;
  }

  json(data) {
    this.body = data;
    this.headersSent = true;
    this.end(JSON.stringify(data));
    return this;
  }

  send(data) {
    this.body = data;
    this.headersSent = true;
    this.end(data);
    return this;
  }

  download(filePath, filename) {
    const fn = filename || path.basename(filePath);
    this.setHeader('content-disposition', `attachment; filename="${fn}"`);
    const content = fs.readFileSync(filePath);
    this.headersSent = true;
    this.end(content);
  }

  _write(chunk, encoding, callback) {
    this.chunks.push(Buffer.from(chunk));
    callback();
  }

  get buffer() {
    return Buffer.concat(this.chunks);
  }
}

function createZipArchive(filesMap, outZipPath) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outZipPath);
    const archive = new ZipArchive({ zlib: { level: 1 } });
    output.on('close', () => resolve(outZipPath));
    archive.on('error', (err) => reject(err));
    archive.pipe(output);

    for (const [fileName, fileBuf] of Object.entries(filesMap)) {
      archive.append(fileBuf, { name: fileName });
    }
    archive.finalize();
  });
}

async function runIntegrationTests() {
  console.log('=== Running Integration Tests: MRI / CT Machine Sync & DICOM Platform ===\n');
  let passed = 0;
  let total = 0;

  async function test(name, fn) {
    total++;
    try {
      await fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✕ ${name}`);
      console.error(err);
    }
  }

  // 1. Sync in-memory SQLite database
  await sequelize.sync({ force: true });

  // 2. Seed test actors
  const centerUser = await User.create({
    id: 101,
    email: 'center1@imaging.test',
    role: 'center',
    status: 'approved'
  });

  const doctorUser = await User.create({
    id: 202,
    email: 'doctor@telerad.test',
    role: 'doctor',
    status: 'approved'
  });

  const otherCenter = await User.create({
    id: 303,
    email: 'other@center.test',
    role: 'center',
    status: 'approved'
  });

  const centerToken = jwt.sign({ id: centerUser.id, role: centerUser.role }, process.env.JWT_SECRET);
  const doctorToken = jwt.sign({ id: doctorUser.id, role: doctorUser.role }, process.env.JWT_SECRET);
  const otherCenterToken = jwt.sign({ id: otherCenter.id, role: otherCenter.role }, process.env.JWT_SECRET);

  const testTempDir = path.join(__dirname, 'temp_integration');
  if (!fs.existsSync(testTempDir)) fs.mkdirSync(testTempDir, { recursive: true });

  let uploadedMriCaseId = null;
  let mriSlice1Buf = null;
  let mriZipPath = null;
  let uploadedCtCaseId = null;
  let singleCtDcmPath = null;

  // TEST 1: Automated Machine Sync Ingest (MRI Multi-Slice ZIP)
  await test('POST /api/cases/machine-sync ingests multi-slice MRI ZIP and auto-extracts all metadata', async () => {
    // Generate 3 mock DICOM slices
    mriSlice1Buf = createMockDicomBuffer({
      patientName: 'Verma^Sunil',
      patientId: 'MR-2026-9901',
      patientAge: '042Y',
      patientGender: 'M',
      modality: 'MR',
      studyDescription: '1. MRI Brain - Routine',
      manufacturer: 'GE MEDICAL SYSTEMS',
      scannerModel: 'Signa Explorer 1.5T',
      sliceThickness: '4.0',
      instanceNumber: 1
    });

    const mriSlice2Buf = createMockDicomBuffer({
      patientName: 'Verma^Sunil',
      patientId: 'MR-2026-9901',
      modality: 'MR',
      studyDescription: '1. MRI Brain - Routine',
      sliceThickness: '4.0',
      instanceNumber: 2
    });

    const mriSlice3Buf = createMockDicomBuffer({
      patientName: 'Verma^Sunil',
      patientId: 'MR-2026-9901',
      modality: 'MR',
      studyDescription: '1. MRI Brain - Routine',
      sliceThickness: '4.0',
      instanceNumber: 3
    });

    mriZipPath = path.join(testTempDir, 'study_mri_sunil.zip');
    await createZipArchive({
      'slice_0001.dcm': mriSlice1Buf,
      'slice_0002.dcm': mriSlice2Buf,
      'slice_0003.dcm': mriSlice3Buf
    }, mriZipPath);

    // Mock incoming request from machine gateway bridge:
    // Notice: req.body is intentionally empty to test 100% automated metadata extraction from DICOM
    const req = {
      path: '/api/cases/machine-sync',
      body: {},
      file: { path: mriZipPath },
      user: { id: centerUser.id, role: 'center' }
    };
    const res = new MockResponse();

    await caseController.uploadCase(req, res);

    assert.strictEqual(res.statusCode, 201, `Expected status 201, got ${res.statusCode}`);
    assert.ok(res.body && res.body.case, 'Expected case in response');

    const created = res.body.case;
    uploadedMriCaseId = created.id;

    assert.strictEqual(created.patientName, 'Sunil Verma', 'Patient name should be auto-extracted');
    assert.strictEqual(created.patientId, 'MR-2026-9901', 'Patient ID should be auto-extracted');
    assert.strictEqual(created.patientAge, 42, 'Patient age should be parsed as integer');
    assert.strictEqual(created.patientGender, 'Male', 'Patient gender M should map to Male');
    assert.strictEqual(created.modality, 'MRI', 'MR should standardize to MRI');
    assert.strictEqual(created.testName, '1. MRI Brain - Routine', 'Test name should match study description');
    assert.strictEqual(created.centerId, 101, 'Center ID should match authenticated center');
    assert.strictEqual(created.status, 'draft', 'Machine synced case should default to draft status');
    assert.strictEqual(res.body.dicomInfo.isDicom, true);
    assert.strictEqual(res.body.dicomInfo.totalSlices, 3, 'Should detect 3 slices in extracted directory');
  });

  // TEST 1B: Center Drafts Retrieval & Publishing to Doctor Pool
  await test('GET /api/cases/center/drafts and POST /api/cases/draft/:id/publish transitions draft to doctor pool', async () => {
    // 1. Fetch drafts
    const reqDrafts = {
      user: { id: centerUser.id, role: 'center' }
    };
    const resDrafts = new MockResponse();
    await caseController.getCenterDrafts(reqDrafts, resDrafts);
    assert.strictEqual(resDrafts.statusCode, 200);
    assert.ok(Array.isArray(resDrafts.body) && resDrafts.body.length >= 1, 'Should return draft cases list');
    const myDraft = resDrafts.body.find(d => d.id === uploadedMriCaseId);
    assert.ok(myDraft, 'Draft case must be present in center drafts');
    assert.strictEqual(myDraft.status, 'draft');
    assert.strictEqual(myDraft.dicomInfo?.totalSlices, 3);

    // 2. Publish draft (Center reviews, adds clinical note, submits)
    const reqPublish = {
      params: { id: uploadedMriCaseId },
      body: {
        patientName: 'Sunil Verma',
        studyNotes: 'Patient has severe migraine with nausea for 3 days. Urgently report.',
        modality: 'MRI'
      },
      user: { id: centerUser.id, role: 'center' }
    };
    const resPublish = new MockResponse();
    await caseController.publishDraft(reqPublish, resPublish);
    assert.strictEqual(resPublish.statusCode, 200);
    assert.strictEqual(resPublish.body.case.status, 'uploaded', 'Status must transition to uploaded');
    assert.strictEqual(resPublish.body.case.studyNotes, 'Patient has severe migraine with nausea for 3 days. Urgently report.');

    // 3. Verify doctor now sees it in available pool
    const reqDocPool = {
      user: { id: doctorUser.id, role: 'doctor' }
    };
    const resDocPool = new MockResponse();
    await caseController.getAvailableCases(reqDocPool, resDocPool);
    const available = resDocPool.body.availableCases || [];
    assert.ok(available.some(c => c.id === uploadedMriCaseId), 'Published draft must appear in doctor pool');
  });

  // TEST 2: DICOM Metadata Inspection Endpoint
  await test('GET /api/cases/:id/dicom-metadata returns complete study tags and slice inventory', async () => {
    const req = {
      params: { id: uploadedMriCaseId },
      user: { id: doctorUser.id, role: 'doctor' },
      query: {}
    };
    const res = new MockResponse();

    await reportController.getDicomMetadata(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.caseId, uploadedMriCaseId);
    assert.strictEqual(res.body.patientName, 'Sunil Verma');
    assert.strictEqual(res.body.modality, 'MRI');
    assert.strictEqual(res.body.isDirectory, true);
    assert.strictEqual(res.body.totalSlices, 3);
    assert.ok(Array.isArray(res.body.slices) && res.body.slices.length === 3);
    assert.strictEqual(res.body.metadata.manufacturer, 'GE MEDICAL SYSTEMS');
    assert.strictEqual(res.body.metadata.scannerModel, 'Signa Explorer 1.5T');
    assert.strictEqual(res.body.metadata.sliceThickness, '4.0');
  });

  // TEST 3: Cornerstone WADO Slice Streaming
  await test('GET /api/cases/:id/dicom-stream?slice=... streams individual DICOM slice binary', async () => {
    const req = {
      params: { id: uploadedMriCaseId },
      query: { slice: 'slice_0001.dcm' },
      headers: {},
      user: { id: doctorUser.id, role: 'doctor' }
    };
    const res = new MockResponse();

    await reportController.streamDicom(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.headers['content-type'], 'application/dicom');
    assert.strictEqual(res.headers['access-control-allow-origin'], '*');
    
    // Binary check: streamed bytes must match mock slice 1
    const streamedBuf = res.buffer;
    assert.strictEqual(streamedBuf.length, mriSlice1Buf.length);
    assert.strictEqual(streamedBuf.slice(128, 132).toString('ascii'), 'DICM');
  });

  // TEST 4: HTTP 206 Partial Content / Range Request Streaming
  await test('GET /api/cases/:id/dicom-stream supports HTTP Range headers for fast chunked loading', async () => {
    const req = {
      params: { id: uploadedMriCaseId },
      query: { slice: 'slice_0001.dcm' },
      headers: { range: 'bytes=0-131' }, // Request preamble + DICM magic (132 bytes)
      user: { id: doctorUser.id, role: 'doctor' }
    };
    const res = new MockResponse();

    await reportController.streamDicom(req, res);

    assert.strictEqual(res.statusCode, 206, 'Should return HTTP 206 Partial Content');
    assert.strictEqual(res.headers['content-type'], 'application/dicom');
    assert.ok(res.headers['content-range'].startsWith('bytes 0-131/'));
    assert.strictEqual(res.buffer.length, 132);
    assert.strictEqual(res.buffer.slice(128, 132).toString('ascii'), 'DICM');
  });

  // TEST 5: Complete Study Download for RadiAnt / MicroDicom
  await test('GET /api/cases/:id/download packages extracted study directory into zip for desktop viewers', async () => {
    const req = {
      params: { id: uploadedMriCaseId },
      user: { id: doctorUser.id, role: 'doctor' }
    };
    const res = new MockResponse();

    await caseController.downloadCaseFiles(req, res);

    assert.strictEqual(res.headers['content-type'], 'application/zip');
    assert.ok(res.headers['content-disposition'].includes('case_'));
    assert.ok(res.buffer.length > 0, 'Zipped download should contain binary data');
    // Zip files start with PK (0x50, 0x4B)
    assert.strictEqual(res.buffer[0], 0x50);
    assert.strictEqual(res.buffer[1], 0x4B);
  });

  // TEST 6: Multi-Tenant Access Control & Security
  await test('Rejects unauthorized center from accessing other center\'s DICOM metadata or streams', async () => {
    const reqMeta = {
      params: { id: uploadedMriCaseId },
      user: { id: otherCenter.id, role: 'center' },
      query: {}
    };
    const resMeta = new MockResponse();
    await reportController.getDicomMetadata(reqMeta, resMeta);
    assert.strictEqual(resMeta.statusCode, 403, 'Other center must receive 403 on metadata');

    const reqStream = {
      params: { id: uploadedMriCaseId },
      query: { slice: 'slice_0001.dcm' },
      headers: {},
      user: { id: otherCenter.id, role: 'center' }
    };
    const resStream = new MockResponse();
    await reportController.streamDicom(reqStream, resStream);
    assert.strictEqual(resStream.statusCode, 403, 'Other center must receive 403 on slice stream');
  });

  // TEST 7: Path Traversal Prevention
  await test('Sanitizes malicious slice query params attempting directory traversal', async () => {
    const req = {
      params: { id: uploadedMriCaseId },
      query: { slice: '../../package.json' },
      headers: {},
      user: { id: doctorUser.id, role: 'doctor' }
    };
    const res = new MockResponse();

    await reportController.streamDicom(req, res);

    assert.strictEqual(res.statusCode, 404, 'Traversal slice should result in 404');
    assert.strictEqual(res.body.message, 'Slice not found');
  });

  // TEST 8: Single-file Raw CT Ingest
  await test('POST /api/cases/machine-sync handles direct single .dcm CT file upload without zip', async () => {
    const ctSliceBuf = createMockDicomBuffer({
      patientName: 'Kaur^Simran',
      patientId: 'CT-2026-4411',
      patientAge: '029Y',
      patientGender: 'F',
      modality: 'CT',
      studyDescription: '1. CT Head - non-contrast',
      manufacturer: 'SIEMENS',
      scannerModel: 'SOMATOM go.Top'
    });

    singleCtDcmPath = path.join(testTempDir, 'ct_simran.dcm');
    fs.writeFileSync(singleCtDcmPath, ctSliceBuf);

    const req = {
      body: {},
      file: { path: singleCtDcmPath },
      user: { id: centerUser.id, role: 'center' }
    };
    const res = new MockResponse();

    await caseController.uploadCase(req, res);

    assert.strictEqual(res.statusCode, 201);
    const created = res.body.case;
    uploadedCtCaseId = created.id;

    assert.strictEqual(created.patientName, 'Simran Kaur');
    assert.strictEqual(created.patientId, 'CT-2026-4411');
    assert.strictEqual(created.patientAge, 29);
    assert.strictEqual(created.patientGender, 'Female');
    assert.strictEqual(created.modality, 'CT');
    assert.strictEqual(created.testName, '1. CT Head - non-contrast');

    // Single-file metadata check
    const reqMeta = {
      params: { id: uploadedCtCaseId },
      user: { id: doctorUser.id, role: 'doctor' },
      query: {}
    };
    const resMeta = new MockResponse();
    await reportController.getDicomMetadata(reqMeta, resMeta);
    assert.strictEqual(resMeta.statusCode, 200);
    assert.strictEqual(resMeta.body.isDirectory, false);
    assert.strictEqual(resMeta.body.totalSlices, 1);
    assert.strictEqual(resMeta.body.metadata.scannerModel, 'SOMATOM go.Top');
  });

  // TEST 9: Delete draft
  await test('DELETE /api/cases/draft/:id removes draft case from center drafts', async () => {
    const draftCase = await XrayCase.create({
      patientName: 'Test Draft To Delete',
      centerId: centerUser.id,
      status: 'draft',
      dicomFileUrl: singleCtDcmPath
    });

    const reqDel = {
      params: { id: draftCase.id },
      user: { id: centerUser.id, role: 'center' }
    };
    const resDel = new MockResponse();
    await caseController.deleteDraft(reqDel, resDel);
    assert.strictEqual(resDel.statusCode, 200);

    const check = await XrayCase.findByPk(draftCase.id);
    assert.strictEqual(check, null, 'Draft should be deleted from DB');
  });

  // Cleanup test files
  try {
    if (fs.existsSync(testTempDir)) {
      fs.rmSync(testTempDir, { recursive: true, force: true });
    }
  } catch (e) {}

  console.log(`\nIntegration Tests Finished: ${passed}/${total} passed.\n`);
  if (passed !== total) {
    process.exit(1);
  }
}

runIntegrationTests().catch((err) => {
  console.error('Fatal integration test failure:', err);
  process.exit(1);
});

