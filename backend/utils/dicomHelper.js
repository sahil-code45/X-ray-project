const fs = require('fs');
const path = require('path');
const dicomParser = require('dicom-parser');

/**
 * Clean DICOM person name (e.g., "Doe^John^A" -> "John A Doe")
 */
function formatPersonName(rawName) {
  if (!rawName) return '';
  const cleaned = String(rawName).trim();
  if (cleaned.includes('^')) {
    const parts = cleaned.split('^').filter(Boolean);
    if (parts.length >= 2) {
      // Firstname Lastname
      return `${parts.slice(1).join(' ')} ${parts[0]}`.trim();
    }
    return parts[0] || cleaned;
  }
  return cleaned;
}

/**
 * Format age (e.g. "045Y" -> "45")
 */
function formatAge(rawAge) {
  if (!rawAge) return '';
  const match = String(rawAge).match(/(\d+)/);
  return match ? String(parseInt(match[1], 10)) : String(rawAge);
}

/**
 * Format sex/gender ('M' -> 'Male', 'F' -> 'Female')
 */
function formatGender(rawSex) {
  if (!rawSex) return '';
  const s = String(rawSex).trim().toUpperCase();
  if (s.startsWith('M')) return 'Male';
  if (s.startsWith('F')) return 'Female';
  if (s.startsWith('O')) return 'Other';
  return s;
}

/**
 * Standardize modality string ('MR' -> 'MRI', 'CT' -> 'CT')
 */
function formatModality(rawModality) {
  if (!rawModality) return '';
  const m = String(rawModality).trim().toUpperCase();
  if (m === 'MR' || m.includes('MRI')) return 'MRI';
  if (m === 'CT') return 'CT';
  if (m === 'CR' || m === 'DX' || m === 'XR') return 'X-Ray';
  return m;
}

/**
 * Format DICOM date YYYYMMDD -> YYYY-MM-DD
 */
function formatDate(rawDate) {
  if (!rawDate || String(rawDate).length < 8) return rawDate || '';
  const s = String(rawDate).trim();
  return `${s.substring(0, 4)}-${s.substring(4, 6)}-${s.substring(6, 8)}`;
}

/**
 * Check if a buffer starts with standard DICOM preamble / magic bytes
 */
function isDicomBuffer(buffer) {
  if (!buffer || buffer.length < 132) return false;
  // Offset 128 should be 'DICM'
  const magic = buffer.toString('ascii', 128, 132);
  return magic === 'DICM';
}

/**
 * Parse metadata from a DICOM Buffer
 */
function parseDicomBuffer(buffer) {
  try {
    const byteArray = new Uint8Array(buffer);
    const dataSet = dicomParser.parseDicom(byteArray);

    const rawPatientName = dataSet.string('x00100010');
    const rawPatientId = dataSet.string('x00100020');
    const rawPatientAge = dataSet.string('x00101010');
    const rawPatientSex = dataSet.string('x00100040');
    const rawModality = dataSet.string('x00080060');
    const studyDescription = dataSet.string('x00081030');
    const seriesDescription = dataSet.string('x0008103e');
    const studyDate = dataSet.string('x00080020');
    const manufacturer = dataSet.string('x00080070');
    const scannerModel = dataSet.string('x00081090');
    const sliceThickness = dataSet.string('x00180050');
    const instanceNumber = dataSet.intString ? dataSet.intString('x00200013') : parseInt(dataSet.string('x00200013') || '0', 10);
    const rows = dataSet.uint16 ? dataSet.uint16('x00280010') : null;
    const columns = dataSet.uint16 ? dataSet.uint16('x00280011') : null;
    const windowCenter = dataSet.string('x00281050');
    const windowWidth = dataSet.string('x00281051');
    const studyInstanceUid = dataSet.string('x0020000d');
    const seriesInstanceUid = dataSet.string('x0020000e');
    const sopInstanceUid = dataSet.string('x00080018');

    const modality = formatModality(rawModality);
    const testName = studyDescription || seriesDescription || (modality ? `${modality} Scan` : '');

    return {
      isValidDicom: true,
      patientName: formatPersonName(rawPatientName),
      patientId: rawPatientId ? String(rawPatientId).trim() : '',
      patientAge: formatAge(rawPatientAge),
      patientGender: formatGender(rawPatientSex),
      modality,
      testName,
      studyDescription: studyDescription || '',
      seriesDescription: seriesDescription || '',
      studyDate: formatDate(studyDate),
      manufacturer: manufacturer ? manufacturer.trim() : '',
      scannerModel: scannerModel ? scannerModel.trim() : '',
      sliceThickness: sliceThickness ? sliceThickness.trim() : '',
      instanceNumber: isNaN(instanceNumber) ? 0 : instanceNumber,
      rows: rows || 0,
      columns: columns || 0,
      windowCenter: windowCenter || '',
      windowWidth: windowWidth || '',
      studyInstanceUid: studyInstanceUid || '',
      seriesInstanceUid: seriesInstanceUid || '',
      sopInstanceUid: sopInstanceUid || ''
    };
  } catch (err) {
    return {
      isValidDicom: false,
      error: err.message
    };
  }
}

/**
 * Inspect a file path or directory and extract complete DICOM slice lists and metadata
 */
function inspectDicomPath(targetPath) {
  if (!fs.existsSync(targetPath)) {
    return {
      exists: false,
      isDicom: false,
      slices: [],
      metadata: null
    };
  }

  const stat = fs.statSync(targetPath);

  if (stat.isDirectory()) {
    // Collect all potential DICOM files recursively
    const getAllFiles = (dirPath) => {
      let results = [];
      const list = fs.readdirSync(dirPath);
      for (const file of list) {
        const full = path.join(dirPath, file);
        const fileStat = fs.statSync(full);
        if (fileStat.isDirectory()) {
          results = results.concat(getAllFiles(full));
        } else {
          const lower = file.toLowerCase();
          const baseName = path.basename(file);
          if (!baseName.startsWith('.') && !file.includes('__MACOSX') && !lower.endsWith('.zip') && !lower.endsWith('.pdf')) {
            results.push(full);
          }
        }
      }
      return results;
    };

    const allFiles = getAllFiles(targetPath);
    if (allFiles.length === 0) {
      return {
        exists: true,
        isDirectory: true,
        isDicom: false,
        slices: [],
        metadata: null
      };
    }

    // Sort slices naturally by instance number if possible, or by filename
    const sliceDetails = [];
    let firstValidMeta = null;

    for (const file of allFiles) {
      try {
        const fileStat = fs.statSync(file);
        const toRead = Math.min(fileStat.size, 131072); // Up to 128KB header
        const buf = Buffer.alloc(toRead);
        const fd = fs.openSync(file, 'r');
        fs.readSync(fd, buf, 0, toRead, 0);
        fs.closeSync(fd);

        if (isDicomBuffer(buf)) {
          // If file is small, pass full buffer; otherwise header buffer is fine
          const fullBuf = fileStat.size <= 262144 ? fs.readFileSync(file) : buf;
          const meta = parseDicomBuffer(fullBuf);
          if (meta.isValidDicom) {
            if (!firstValidMeta) firstValidMeta = meta;
            sliceDetails.push({
              fullPath: file,
              instanceNumber: meta.instanceNumber || 0,
              baseName: path.basename(file)
            });
            continue;
          }
        }
      } catch (e) {
        // Continue checking
      }

      // If file has .dcm extension, keep it as slice even if buffer partial
      if (file.toLowerCase().endsWith('.dcm')) {
        sliceDetails.push({
          fullPath: file,
          instanceNumber: 0,
          baseName: path.basename(file)
        });
      }
    }

    // Sort slices
    sliceDetails.sort((a, b) => {
      if (a.instanceNumber !== b.instanceNumber && a.instanceNumber > 0 && b.instanceNumber > 0) {
        return a.instanceNumber - b.instanceNumber;
      }
      return a.baseName.localeCompare(b.baseName, undefined, { numeric: true, sensitivity: 'base' });
    });

    const relSlices = sliceDetails.map(s => path.relative(targetPath, s.fullPath).replace(/\\/g, '/'));

    return {
      exists: true,
      isDirectory: true,
      isDicom: relSlices.length > 0,
      totalSlices: relSlices.length,
      slices: relSlices,
      metadata: firstValidMeta
    };
  } else {
    // Single file
    try {
      const buf = fs.readFileSync(targetPath);
      const meta = parseDicomBuffer(buf);
      const isDicom = meta.isValidDicom || isDicomBuffer(buf) || targetPath.toLowerCase().endsWith('.dcm');
      return {
        exists: true,
        isDirectory: false,
        isDicom,
        totalSlices: isDicom ? 1 : 0,
        slices: isDicom ? [path.basename(targetPath)] : [],
        metadata: meta.isValidDicom ? meta : null
      };
    } catch (e) {
      return {
        exists: true,
        isDirectory: false,
        isDicom: false,
        slices: [],
        metadata: null,
        error: e.message
      };
    }
  }
}

module.exports = {
  isDicomBuffer,
  parseDicomBuffer,
  inspectDicomPath,
  formatPersonName,
  formatAge,
  formatGender,
  formatModality,
  formatDate
};
