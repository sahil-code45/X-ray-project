const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  isDicomBuffer,
  parseDicomBuffer,
  inspectDicomPath,
  formatPersonName,
  formatAge,
  formatGender,
  formatModality,
  formatDate
} = require('../utils/dicomHelper');
const { createMockDicomBuffer } = require('./createMockDicom');

async function runUnitTests() {
  console.log('=== Running Unit Tests: DICOM Helper ===');
  let passed = 0;
  let total = 0;

  function test(desc, fn) {
    total++;
    try {
      fn();
      console.log(`  ✓ ${desc}`);
      passed++;
    } catch (err) {
      console.error(`  ✕ ${desc}`);
      console.error(`    ${err.message}`);
    }
  }

  // 1. String formatters
  test('formatPersonName normalizes DICOM "LastName^FirstName" to "FirstName LastName"', () => {
    assert.strictEqual(formatPersonName('Sharma^Rahul'), 'Rahul Sharma');
    assert.strictEqual(formatPersonName('Doe^Jane^M'), 'Jane M Doe');
    assert.strictEqual(formatPersonName('SingleName'), 'SingleName');
    assert.strictEqual(formatPersonName(''), '');
  });

  test('formatAge extracts numeric digits from DICOM age string', () => {
    assert.strictEqual(formatAge('045Y'), '45');
    assert.strictEqual(formatAge('008M'), '8');
    assert.strictEqual(formatAge('52'), '52');
    assert.strictEqual(formatAge(''), '');
  });

  test('formatGender maps M/F/O to Male/Female/Other', () => {
    assert.strictEqual(formatGender('M'), 'Male');
    assert.strictEqual(formatGender('F'), 'Female');
    assert.strictEqual(formatGender('O'), 'Other');
    assert.strictEqual(formatGender(''), '');
  });

  test('formatModality standardizes MR to MRI and preserves CT', () => {
    assert.strictEqual(formatModality('MR'), 'MRI');
    assert.strictEqual(formatModality('MRI'), 'MRI');
    assert.strictEqual(formatModality('CT'), 'CT');
    assert.strictEqual(formatModality('CR'), 'X-Ray');
    assert.strictEqual(formatModality('DX'), 'X-Ray');
  });

  test('formatDate converts YYYYMMDD to YYYY-MM-DD', () => {
    assert.strictEqual(formatDate('20261024'), '2026-10-24');
    assert.strictEqual(formatDate(''), '');
  });

  // 2. Buffer inspection
  test('isDicomBuffer identifies valid DICOM preamble and magic bytes', () => {
    const validDicom = createMockDicomBuffer({ modality: 'MR' });
    assert.strictEqual(isDicomBuffer(validDicom), true);

    const nonDicom = Buffer.from('This is a plain text file, not DICOM');
    assert.strictEqual(isDicomBuffer(nonDicom), false);

    assert.strictEqual(isDicomBuffer(Buffer.alloc(50)), false);
  });

  // 3. Metadata parser
  test('parseDicomBuffer correctly extracts rich metadata from MRI scan', () => {
    const mriBuf = createMockDicomBuffer({
      patientName: 'Gupta^Amit',
      patientId: 'PAT-MR-5001',
      patientAge: '032Y',
      patientGender: 'M',
      modality: 'MR',
      studyDescription: '1. MRI Brain - Routine / Stroke Protocol',
      manufacturer: 'SIEMENS',
      scannerModel: 'MAGNETOM Vida 3T',
      sliceThickness: '3.5',
      instanceNumber: 12
    });

    const parsed = parseDicomBuffer(mriBuf);
    assert.strictEqual(parsed.isValidDicom, true);
    assert.strictEqual(parsed.patientName, 'Amit Gupta');
    assert.strictEqual(parsed.patientId, 'PAT-MR-5001');
    assert.strictEqual(parsed.patientAge, '32');
    assert.strictEqual(parsed.patientGender, 'Male');
    assert.strictEqual(parsed.modality, 'MRI');
    assert.strictEqual(parsed.testName, '1. MRI Brain - Routine / Stroke Protocol');
    assert.strictEqual(parsed.manufacturer, 'SIEMENS');
    assert.strictEqual(parsed.scannerModel, 'MAGNETOM Vida 3T');
    assert.strictEqual(parsed.sliceThickness, '3.5');
    assert.strictEqual(parsed.instanceNumber, 12);
  });

  test('parseDicomBuffer correctly extracts rich metadata from CT scan', () => {
    const ctBuf = createMockDicomBuffer({
      patientName: 'Verma^Pooja',
      patientId: 'PAT-CT-2002',
      patientAge: '028Y',
      patientGender: 'F',
      modality: 'CT',
      studyDescription: '1. CT Head - non-contrast',
      manufacturer: 'GE MEDICAL SYSTEMS',
      scannerModel: 'Revolution Maxima'
    });

    const parsed = parseDicomBuffer(ctBuf);
    assert.strictEqual(parsed.isValidDicom, true);
    assert.strictEqual(parsed.patientName, 'Pooja Verma');
    assert.strictEqual(parsed.patientId, 'PAT-CT-2002');
    assert.strictEqual(parsed.patientAge, '28');
    assert.strictEqual(parsed.patientGender, 'Female');
    assert.strictEqual(parsed.modality, 'CT');
    assert.strictEqual(parsed.testName, '1. CT Head - non-contrast');
    assert.strictEqual(parsed.manufacturer, 'GE MEDICAL SYSTEMS');
  });

  test('parseDicomBuffer handles corrupted buffers gracefully without throwing', () => {
    const corrupted = Buffer.concat([Buffer.alloc(128, 0), Buffer.from('DICM'), Buffer.from('random corrupted garbage bytes')]);
    const parsed = parseDicomBuffer(corrupted);
    assert.strictEqual(parsed.isValidDicom, false);
    assert(parsed.error);
  });

  // 4. File and directory inspection
  test('inspectDicomPath correctly sorts and parses multi-slice directory', () => {
    const tempDir = path.join(__dirname, 'temp_study_test');
    if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
    fs.mkdirSync(tempDir, { recursive: true });

    // Create 3 slices with instance numbers out of order
    fs.writeFileSync(path.join(tempDir, 'slice_3.dcm'), createMockDicomBuffer({ instanceNumber: 3, modality: 'CT' }));
    fs.writeFileSync(path.join(tempDir, 'slice_1.dcm'), createMockDicomBuffer({ instanceNumber: 1, modality: 'CT' }));
    fs.writeFileSync(path.join(tempDir, 'slice_2.dcm'), createMockDicomBuffer({ instanceNumber: 2, modality: 'CT' }));

    const result = inspectDicomPath(tempDir);
    assert.strictEqual(result.exists, true);
    assert.strictEqual(result.isDirectory, true);
    assert.strictEqual(result.isDicom, true);
    assert.strictEqual(result.totalSlices, 3);
    assert.strictEqual(result.slices[0], 'slice_1.dcm');
    assert.strictEqual(result.slices[1], 'slice_2.dcm');
    assert.strictEqual(result.slices[2], 'slice_3.dcm');
    assert.strictEqual(result.metadata.modality, 'CT');

    // Clean up
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('inspectDicomPath returns exists: false for non-existent path', () => {
    const result = inspectDicomPath('D:/non_existent_path_xyz');
    assert.strictEqual(result.exists, false);
    assert.strictEqual(result.isDicom, false);
  });

  console.log(`\nUnit Tests Finished: ${passed}/${total} passed.\n`);
  if (passed !== total) process.exit(1);
}

runUnitTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
