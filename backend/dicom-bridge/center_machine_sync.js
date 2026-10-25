/**
 * Center Machine Sync Bridge (Tele-Radiology DICOM Gateway)
 * 
 * Runs on the Diagnostic Center PC connected to MRI / CT Machine or local Orthanc PACS.
 * Automatically picks up incoming DICOM studies and syncs them to the Web Platform.
 * 
 * Usage:
 *   node center_machine_sync.js
 *   node center_machine_sync.js --test
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const { ZipArchive } = require('archiver');

// Default Configuration (can be overridden by config.json or environment variables)
const DEFAULT_CONFIG = {
  serverUrl: process.env.SERVER_URL || 'http://localhost:8000',
  centerEmail: process.env.CENTER_EMAIL || '',
  centerPassword: process.env.CENTER_PASSWORD || '',
  watchDirectory: process.env.WATCH_DIR || path.join(__dirname, 'incoming_scans'),
  archiveDirectory: process.env.ARCHIVE_DIR || path.join(__dirname, 'synced_archive'),
  orthancUrl: process.env.ORTHANC_URL || '', // e.g. 'http://localhost:8042'
  pollIntervalSec: parseInt(process.env.POLL_INTERVAL_SEC || '10', 10)
};

// Load optional config.json
let config = { ...DEFAULT_CONFIG };
const configPath = path.join(__dirname, 'config.json');
if (fs.existsSync(configPath)) {
  try {
    const userCfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    config = { ...config, ...userCfg };
  } catch (e) {
    console.warn('[CONFIG] Warning: Could not parse config.json, using defaults.');
  }
}

// Ensure folders exist
if (!fs.existsSync(config.watchDirectory)) {
  fs.mkdirSync(config.watchDirectory, { recursive: true });
}
if (!fs.existsSync(config.archiveDirectory)) {
  fs.mkdirSync(config.archiveDirectory, { recursive: true });
}

let cachedToken = null;
let tokenExpiresAt = 0;

/**
 * Authenticate with the web platform
 */
async function getAuthToken() {
  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }

  if (!config.centerEmail || !config.centerPassword) {
    throw new Error('Center email and password must be configured in config.json or environment variables.');
  }

  const loginPayload = JSON.stringify({
    email: config.centerEmail,
    password: config.centerPassword
  });

  const res = await makeHttpRequest(`${config.serverUrl}/api/auth/login`, 'POST', {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(loginPayload)
  }, loginPayload);

  if (res.statusCode !== 200) {
    throw new Error(`Authentication failed with status ${res.statusCode}: ${res.body}`);
  }

  const data = JSON.parse(res.body);
  cachedToken = data.token;
  tokenExpiresAt = Date.now() + 12 * 60 * 60 * 1000; // 12 hours cache
  return cachedToken;
}

/**
 * Generic HTTP/HTTPS Request helper
 */
function makeHttpRequest(targetUrl, method, headers, data) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(targetUrl);
    const client = urlObj.protocol === 'https:' ? https : http;

    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: headers
    };

    const req = client.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers, body }));
    });

    req.on('error', (err) => reject(err));
    if (data) {
      if (Buffer.isBuffer(data) || typeof data === 'string') {
        req.write(data);
      } else if (data.pipe) {
        data.pipe(req);
        return;
      }
    }
    req.end();
  });
}

/**
 * Upload a study zip file to the platform
 */
async function uploadStudyZip(zipFilePath, token) {
  return new Promise((resolve, reject) => {
    const boundary = '----DicomBridgeBoundary' + Date.now();
    const urlObj = new URL(`${config.serverUrl}/api/cases/machine-sync`);
    const client = urlObj.protocol === 'https:' ? https : http;

    const stat = fs.statSync(zipFilePath);
    const filename = path.basename(zipFilePath);

    const header = Buffer.from(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="dicomFile"; filename="${filename}"\r\n` +
      `Content-Type: application/zip\r\n\r\n`
    );
    const footer = Buffer.from(`\r\n--${boundary}--\r\n`);
    const totalLength = header.length + stat.size + footer.length;

    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': totalLength
      }
    };

    const req = client.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            resolve({ raw: body });
          }
        } else {
          reject(new Error(`Server returned ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.write(header);

    const fileStream = fs.createReadStream(zipFilePath);
    fileStream.pipe(req, { end: false });
    fileStream.on('end', () => {
      req.write(footer);
      req.end();
    });
  });
}

/**
 * Create a zip file from a directory of DICOM files or single DCM file
 */
function createStudyZip(sourcePath, outputZipPath) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputZipPath);
    const archive = new ZipArchive({ zlib: { level: 1 } });

    output.on('close', () => resolve(outputZipPath));
    archive.on('error', err => reject(err));

    archive.pipe(output);

    const stat = fs.statSync(sourcePath);
    if (stat.isDirectory()) {
      archive.directory(sourcePath, false);
    } else {
      archive.file(sourcePath, { name: path.basename(sourcePath) });
    }

    archive.finalize();
  });
}

/**
 * Scan incoming watch folder for new DICOM folders or .dcm/.zip files
 */
async function processWatchFolder() {
  const items = fs.readdirSync(config.watchDirectory);
  if (items.length === 0) return;

  for (const item of items) {
    if (item.startsWith('.') || item.endsWith('.tmp')) continue;

    const fullPath = path.join(config.watchDirectory, item);
    const stat = fs.statSync(fullPath);

    // Skip recently modified files to ensure writing finished (wait 3 seconds)
    const ageSeconds = (Date.now() - stat.mtimeMs) / 1000;
    if (ageSeconds < 3) continue;

    console.log(`[BRIDGE] Detected incoming study: ${item}`);

    try {
      const token = await getAuthToken();
      let zipToUpload = null;
      let tempZip = false;

      if (stat.isFile() && item.toLowerCase().endsWith('.zip')) {
        zipToUpload = fullPath;
      } else {
        const tempZipPath = path.join(config.archiveDirectory, `temp_${Date.now()}_${item}.zip`);
        await createStudyZip(fullPath, tempZipPath);
        zipToUpload = tempZipPath;
        tempZip = true;
      }

      console.log(`[BRIDGE] Uploading ${item} to ${config.serverUrl}...`);
      const uploadRes = await uploadStudyZip(zipToUpload, token);
      console.log(`[SUCCESS] Synced Case #${uploadRes.case?.id}: ${uploadRes.case?.patientName} (${uploadRes.case?.modality || 'Study'})`);

      if (tempZip && fs.existsSync(zipToUpload)) {
        fs.unlinkSync(zipToUpload);
      }

      // Move processed original to archive folder
      const archiveDest = path.join(config.archiveDirectory, `${Date.now()}_${item}`);
      fs.renameSync(fullPath, archiveDest);
    } catch (err) {
      console.error(`[ERROR] Failed to process ${item}:`, err.message);
    }
  }
}

/**
 * Self-test connectivity with the portal
 */
async function runSelfTest() {
  console.log('====================================================');
  console.log('   Tele-Radiology Machine Gateway Bridge Test');
  console.log('====================================================');
  console.log('Target Server URL:', config.serverUrl);
  console.log('Watch Directory  :', config.watchDirectory);
  console.log('Archive Directory:', config.archiveDirectory);
  console.log('Center Email     :', config.centerEmail || '(Not Set)');

  try {
    console.log('\n[TEST 1] Pinging server...');
    const pingRes = await makeHttpRequest(`${config.serverUrl}/api/pricing/tests`, 'GET');
    console.log(`✓ Server reachable (HTTP ${pingRes.statusCode})`);

    if (config.centerEmail && config.centerPassword) {
      console.log('[TEST 2] Testing Center authentication...');
      const token = await getAuthToken();
      console.log('✓ Authentication successful! Token acquired.');
    } else {
      console.log('[TEST 2] Skipping authentication test (centerEmail/password not set in config.json)');
    }

    console.log('\n✓ Self-test completed successfully.');
    console.log('To run continuous background sync, execute: node center_machine_sync.js');
    console.log('====================================================');
  } catch (e) {
    console.error('✕ Self-test failed:', e.message);
    process.exit(1);
  }
}

// Main execution entry point
if (process.argv.includes('--test')) {
  runSelfTest();
} else {
  console.log('====================================================');
  console.log(' Tele-Radiology Machine Sync Gateway Bridge Running');
  console.log(` Watching: ${config.watchDirectory}`);
  console.log(` Syncing to: ${config.serverUrl}`);
  console.log(` Polling interval: every ${config.pollIntervalSec} seconds`);
  console.log('====================================================');

  // Initial run
  processWatchFolder().catch(err => console.error('[WATCH ERROR]', err));

  // Loop
  setInterval(() => {
    processWatchFolder().catch(err => console.error('[WATCH ERROR]', err));
  }, config.pollIntervalSec * 1000);
}

module.exports = {
  createStudyZip,
  formatPersonName: require('../utils/dicomHelper').formatPersonName
};

