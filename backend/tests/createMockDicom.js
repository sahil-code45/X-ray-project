const fs = require('fs');
const path = require('path');

function writeTag(chunks, group, element, vr, valueStr) {
  const tagBuf = Buffer.alloc(8);
  tagBuf.writeUInt16LE(group, 0);
  tagBuf.writeUInt16LE(element, 2);
  tagBuf.write(vr, 4, 2, 'ascii');
  const valBuf = Buffer.from(String(valueStr || ''), 'utf8');
  const padded = valBuf.length % 2 === 1 ? Buffer.concat([valBuf, Buffer.from(' ')]) : valBuf;
  tagBuf.writeUInt16LE(padded.length, 6);
  chunks.push(tagBuf);
  chunks.push(padded);
}

function createMockDicomBuffer(options = {}) {
  const {
    patientName = 'Doe^John',
    patientId = 'PID-1234',
    patientAge = '045Y',
    patientGender = 'M',
    modality = 'MR',
    studyDescription = 'MRI Brain Routine',
    manufacturer = 'GE MEDICAL SYSTEMS',
    scannerModel = 'Signa Explorer 1.5T',
    sliceThickness = '5.0',
    instanceNumber = 1,
    studyDate = '20261024'
  } = options;

  const preamble = Buffer.alloc(128, 0);
  const magic = Buffer.from('DICM', 'ascii');
  const chunks = [preamble, magic];

  // DICOM Meta Header
  writeTag(chunks, 0x0002, 0x0002, 'UI', '1.2.840.10008.5.1.4.1.1.4'); // SOP Class UID
  writeTag(chunks, 0x0002, 0x0003, 'UI', `1.2.840.10008.1.1.1.${instanceNumber}`); // SOP Instance UID
  writeTag(chunks, 0x0002, 0x0010, 'UI', '1.2.840.10008.1.2.1'); // Transfer Syntax (Explicit VR Little Endian)

  // Dataset tags
  writeTag(chunks, 0x0008, 0x0020, 'DA', studyDate);
  writeTag(chunks, 0x0008, 0x0060, 'CS', modality);
  writeTag(chunks, 0x0008, 0x0070, 'LO', manufacturer);
  writeTag(chunks, 0x0008, 0x1030, 'LO', studyDescription);
  writeTag(chunks, 0x0008, 0x1090, 'LO', scannerModel);
  writeTag(chunks, 0x0010, 0x0010, 'PN', patientName);
  writeTag(chunks, 0x0010, 0x0020, 'LO', patientId);
  writeTag(chunks, 0x0010, 0x0040, 'CS', patientGender);
  writeTag(chunks, 0x0010, 0x1010, 'AS', patientAge);
  writeTag(chunks, 0x0018, 0x0050, 'DS', sliceThickness);
  writeTag(chunks, 0x0020, 0x0013, 'IS', String(instanceNumber));

  return Buffer.concat(chunks);
}

module.exports = {
  createMockDicomBuffer
};
