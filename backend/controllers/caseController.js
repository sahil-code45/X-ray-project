const { XrayCase, sequelize } = require('../models');

const extract = require('extract-zip');
const fs = require('fs');
const path = require('path');
const { inspectDicomPath } = require('../utils/dicomHelper');

exports.uploadCase = async (req, res) => {
    console.log('--- Upload request received ---');
    try {
        const { patientId, patientName, patientAge, patientGender, studyNotes, modality, testName } = req.body;
        let dicomFileUrl = req.file ? req.file.path : null;
        console.log('File uploaded to multer:', dicomFileUrl);

        if (!dicomFileUrl) {
            return res.status(400).json({ message: 'DICOM/ZIP file is required' });
        }

        let status = req.body.status || (req.path && req.path.includes('machine-sync') ? 'draft' : 'uploaded');
        let extractedDir = null;

        // If it's a zip file, extract it safely using streams (extract-zip) to avoid out-of-memory errors
        if (dicomFileUrl.toLowerCase().endsWith('.zip')) {
            extractedDir = path.join(__dirname, '..', 'uploads', `extracted_${Date.now()}`);
            console.log('Starting extraction to:', extractedDir);
            await extract(path.resolve(dicomFileUrl), { dir: path.resolve(extractedDir) });
            
            // Recursively extract any nested zip files
            const extractAllZips = async (dir) => {
                const files = fs.readdirSync(dir);
                for (const file of files) {
                    const fullPath = path.join(dir, file);
                    if (fs.statSync(fullPath).isDirectory()) {
                        await extractAllZips(fullPath);
                    } else if (file.toLowerCase().endsWith('.zip')) {
                        const dest = path.join(dir, file.substring(0, file.length - 4));
                        try {
                            await extract(fullPath, { dir: dest });
                            fs.unlinkSync(fullPath);
                            await extractAllZips(dest);
                        } catch (err) {
                            console.error('Failed to extract nested zip:', err);
                        }
                    }
                }
            };
            await extractAllZips(extractedDir);
            console.log('Extraction complete');
            dicomFileUrl = extractedDir; // Save directory path instead of zip path
        }

        // Auto-inspect DICOM header for automated machine sync or fallback
        let dicomInspection = null;
        try {
            dicomInspection = inspectDicomPath(path.resolve(dicomFileUrl));
        } catch (e) {
            console.warn('DICOM inspection warning:', e.message);
        }

        const resolvedMeta = dicomInspection?.metadata || {};

        const finalPatientName = (patientName && patientName.trim()) 
            ? patientName.trim() 
            : (resolvedMeta.patientName || 'Patient');

        const finalPatientId = (patientId && patientId.trim()) 
            ? patientId.trim() 
            : (resolvedMeta.patientId || null);

        let finalPatientAge = null;
        if (patientAge && !isNaN(parseInt(patientAge, 10))) {
            finalPatientAge = parseInt(patientAge, 10);
        } else if (resolvedMeta.patientAge && !isNaN(parseInt(resolvedMeta.patientAge, 10))) {
            finalPatientAge = parseInt(resolvedMeta.patientAge, 10);
        }

        const finalPatientGender = patientGender 
            ? patientGender 
            : (resolvedMeta.patientGender || 'Other');

        const finalModality = modality 
            ? modality 
            : (resolvedMeta.modality || (testName?.includes('MRI') ? 'MRI' : (testName?.includes('CT') ? 'CT' : null)));

        const finalTestName = testName 
            ? testName 
            : (resolvedMeta.testName || (finalModality ? `${finalModality} Scan` : null));

        const finalNotes = (studyNotes && studyNotes.trim()) 
            ? studyNotes.trim() 
            : (resolvedMeta.studyDescription || (resolvedMeta.scannerModel ? `Acquired on ${resolvedMeta.scannerModel}` : 'Direct machine acquisition'));

        const newCase = await XrayCase.create({
            patientId: finalPatientId,
            patientName: finalPatientName,
            patientAge: finalPatientAge,
            patientGender: finalPatientGender,
            studyNotes: finalNotes,
            dicomFileUrl,
            status,
            centerId: req.user?.id || null,
            modality: finalModality,
            testName: finalTestName
        });

        res.status(201).json({ 
            message: 'Case uploaded successfully', 
            case: newCase,
            dicomInfo: dicomInspection ? {
                isDicom: dicomInspection.isDicom,
                totalSlices: dicomInspection.totalSlices,
                metadata: dicomInspection.metadata
            } : null
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getCenterCases = async (req, res) => {
    try {
        const { Op } = require('sequelize');
        const { Report, User, DoctorProfile } = require('../models');
        const centerId = req.user.id;
        const role = req.user.role;

        const whereClause = role === 'admin' 
            ? { status: { [Op.ne]: 'draft' } } 
            : {
                [Op.or]: [
                    { centerId: centerId },
                    { centerId: null }
                ],
                status: { [Op.ne]: 'draft' }
            };

        const cases = await XrayCase.findAll({
            where: whereClause,
            include: [
                {
                    model: User,
                    as: 'doctor',
                    attributes: ['id', 'email'],
                    include: [{ model: DoctorProfile, as: 'doctorProfile' }]
                },
                {
                    model: Report,
                    as: 'report'
                }
            ],
            order: [['createdAt', 'DESC']]
        });
        res.json(cases);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getCenterDrafts = async (req, res) => {
    try {
        const { Op } = require('sequelize');
        const centerId = req.user.id;
        const role = req.user.role;

        const whereClause = role === 'admin'
            ? { status: 'draft' }
            : {
                [Op.or]: [
                    { centerId: centerId },
                    { centerId: null }
                ],
                status: 'draft'
            };

        const drafts = await XrayCase.findAll({
            where: whereClause,
            order: [['createdAt', 'DESC']]
        });

        // Enrich drafts with DICOM inspection info (slices count, scanner, etc.)
        const enriched = drafts.map(c => {
            const caseData = c.toJSON();
            try {
                if (caseData.dicomFileUrl && fs.existsSync(path.resolve(caseData.dicomFileUrl))) {
                    const inspection = inspectDicomPath(path.resolve(caseData.dicomFileUrl));
                    caseData.dicomInfo = {
                        isDicom: inspection.isDicom,
                        totalSlices: inspection.totalSlices,
                        metadata: inspection.metadata
                    };
                }
            } catch (e) {
                // Ignore inspection failure
            }
            return caseData;
        });

        res.json(enriched);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.publishDraft = async (req, res) => {
    try {
        const { id } = req.params;
        const xrayCase = await XrayCase.findByPk(id);
        if (!xrayCase) return res.status(404).json({ message: 'Draft case not found' });

        if (req.user.role === 'center' && xrayCase.centerId && xrayCase.centerId !== req.user.id) {
            return res.status(403).json({ message: 'Unauthorized for this draft case' });
        }

        const { patientId, patientName, patientAge, patientGender, studyNotes, modality, testName } = req.body;
        let dicomFileUrl = xrayCase.dicomFileUrl;

        // If a replacement file was uploaded
        if (req.file) {
            dicomFileUrl = req.file.path;
            if (dicomFileUrl.toLowerCase().endsWith('.zip')) {
                const extractedDir = path.join(__dirname, '..', 'uploads', `extracted_${Date.now()}`);
                await extract(path.resolve(dicomFileUrl), { dir: path.resolve(extractedDir) });
                dicomFileUrl = extractedDir;
            }
        }

        // Auto inspect if file or metadata needed
        let inspection = null;
        try {
            if (dicomFileUrl && fs.existsSync(path.resolve(dicomFileUrl))) {
                inspection = inspectDicomPath(path.resolve(dicomFileUrl));
            }
        } catch (e) {}

        const meta = inspection?.metadata || {};

        xrayCase.patientId = (patientId && patientId.trim()) ? patientId.trim() : (xrayCase.patientId || meta.patientId || null);
        xrayCase.patientName = (patientName && patientName.trim()) ? patientName.trim() : (xrayCase.patientName || meta.patientName || 'Patient');
        
        if (patientAge !== undefined && !isNaN(parseInt(patientAge, 10))) {
            xrayCase.patientAge = parseInt(patientAge, 10);
        }
        
        xrayCase.patientGender = patientGender || xrayCase.patientGender || meta.patientGender || 'Other';
        xrayCase.studyNotes = (studyNotes && studyNotes.trim()) ? studyNotes.trim() : (xrayCase.studyNotes || meta.studyDescription);
        xrayCase.modality = modality || xrayCase.modality || meta.modality;
        xrayCase.testName = testName || xrayCase.testName || meta.testName;
        xrayCase.dicomFileUrl = dicomFileUrl;
        xrayCase.status = 'uploaded'; // Published to doctor pool!

        await xrayCase.save();

        res.json({ message: 'Draft published to doctor pool successfully', case: xrayCase });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.deleteDraft = async (req, res) => {
    try {
        const { id } = req.params;
        const xrayCase = await XrayCase.findByPk(id);
        if (!xrayCase) return res.status(404).json({ message: 'Draft not found' });

        if (req.user.role === 'center' && xrayCase.centerId && xrayCase.centerId !== req.user.id) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        if (xrayCase.status !== 'draft') {
            return res.status(400).json({ message: 'Only draft cases can be deleted' });
        }

        await xrayCase.destroy();
        res.json({ message: 'Draft deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getAvailableCases = async (req, res) => {
    try {
        const doctorId = req.user.id;
        
        const availableCases = await XrayCase.findAll({
            where: { status: 'uploaded' },
            order: [['createdAt', 'DESC']]
        });
        
        const myCases = await XrayCase.findAll({
            where: { status: 'in_progress', assignedDoctorId: doctorId },
            order: [['updatedAt', 'DESC']]
        });

        const { Report, User, DoctorProfile } = require('../models');
        const completedCases = await XrayCase.findAll({
            where: { status: 'completed', assignedDoctorId: doctorId },
            include: [
                { model: Report, as: 'report' },
                {
                    model: User,
                    as: 'doctor',
                    attributes: ['id', 'email'],
                    include: [{ model: DoctorProfile, as: 'doctorProfile' }]
                }
            ],
            order: [['updatedAt', 'DESC']]
        });

        const totalCompleted = completedCases.length;

        res.json({ availableCases, myCases, completedCases, totalCompleted });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getCaseById = async (req, res) => {
    try {
        const { id } = req.params;
        const { Report, User, DoctorProfile } = require('../models');
        const xrayCase = await XrayCase.findByPk(id, {
            include: [
                { model: Report, as: 'report' },
                {
                    model: User,
                    as: 'doctor',
                    attributes: ['id', 'email'],
                    include: [{ model: DoctorProfile, as: 'doctorProfile' }]
                }
            ]
        });
        if (!xrayCase) return res.status(404).json({ message: 'Case not found' });
        res.json(xrayCase);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.claimCase = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params;
        const doctorId = req.user.id; // From verifyToken

        // Atomic row-level lock
        const xrayCase = await XrayCase.findOne({
            where: { id, status: 'uploaded' },
            transaction: t,
            lock: t.LOCK.UPDATE
        });

        if (!xrayCase) {
            await t.rollback();
            return res.status(409).json({ message: 'Case already claimed or not found' }); // Return HTTP 409 Conflict
        }

        xrayCase.assignedDoctorId = doctorId;
        xrayCase.status = 'in_progress';
        xrayCase.lockedAt = new Date();
        
        await xrayCase.save({ transaction: t });
        await t.commit();

        res.json({ message: 'Case claimed successfully', caseId: xrayCase.id });
    } catch (error) {
        await t.rollback();
        res.status(500).json({ error: error.message });
    }
};

exports.downloadCaseFiles = async (req, res) => {
    try {
        const { id } = req.params;
        const xrayCase = await XrayCase.findByPk(id);
        if (!xrayCase) return res.status(404).json({ message: 'Case not found' });
        
        const fs = require('fs');
        const path = require('path');
        const filePath = path.resolve(xrayCase.dicomFileUrl);
        
        if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'Files not found on server' });
        
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            const { ZipArchive } = require('archiver');
            const archive = new ZipArchive({ zlib: { level: 1 } });
            
            res.setHeader('Content-Type', 'application/zip');
            res.setHeader('Content-Disposition', `attachment; filename="case_${id}_files.zip"`);
            
            archive.on('error', function(err) {
                console.error('Archive error:', err);
                if (!res.headersSent) res.status(500).send({ error: 'Failed to create zip' });
            });
            
            archive.pipe(res);
            archive.directory(filePath, false);
            await archive.finalize();
        } else {
            res.download(filePath);
        }
    } catch (error) {
        console.error('Download error:', error);
        if (!res.headersSent) res.status(500).json({ error: error.message });
    }
};

exports.reportIssue = async (req, res) => {
    try {
        const { id } = req.params;
        const { issueDescription } = req.body;

        if (!issueDescription || !issueDescription.trim()) {
            return res.status(400).json({ message: 'Issue description is required' });
        }

        const xrayCase = await XrayCase.findByPk(id);
        if (!xrayCase) {
            return res.status(404).json({ message: 'Case not found' });
        }

        xrayCase.status = 'something_wrong';
        xrayCase.issueDescription = issueDescription.trim();
        await xrayCase.save();

        res.json({ message: 'Issue reported to center successfully', case: xrayCase });
    } catch (error) {
        console.error('Error reporting issue:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.reuploadCaseFile = async (req, res) => {
    console.log('--- Reupload request received for case:', req.params.id);
    try {
        const { id } = req.params;
        const xrayCase = await XrayCase.findByPk(id);
        if (!xrayCase) {
            return res.status(404).json({ message: 'Case not found' });
        }

        const { patientName, patientId, patientAge, patientGender, studyNotes } = req.body;

        if (patientName && patientName.trim()) {
            xrayCase.patientName = patientName.trim();
        }
        if (patientId !== undefined) {
            xrayCase.patientId = patientId ? patientId.trim() : null;
        }
        if (patientAge !== undefined && patientAge !== '') {
            xrayCase.patientAge = parseInt(patientAge) || xrayCase.patientAge;
        }
        if (patientGender && patientGender.trim()) {
            xrayCase.patientGender = patientGender.trim();
        }
        if (studyNotes !== undefined) {
            xrayCase.studyNotes = studyNotes;
        }

        let dicomFileUrl = req.file ? req.file.path : null;
        if (dicomFileUrl) {
            let extractedDir = null;
            if (dicomFileUrl.toLowerCase().endsWith('.zip')) {
                extractedDir = path.join(__dirname, '..', 'uploads', `extracted_${Date.now()}`);
                console.log('Starting extraction to:', extractedDir);
                await extract(path.resolve(dicomFileUrl), { dir: path.resolve(extractedDir) });

                const extractAllZips = async (dir) => {
                    const files = fs.readdirSync(dir);
                    for (const file of files) {
                        const fullPath = path.join(dir, file);
                        if (fs.statSync(fullPath).isDirectory()) {
                            await extractAllZips(fullPath);
                        } else if (file.toLowerCase().endsWith('.zip')) {
                            const dest = path.join(dir, file.substring(0, file.length - 4));
                            try {
                                await extract(fullPath, { dir: dest });
                                fs.unlinkSync(fullPath);
                                await extractAllZips(dest);
                            } catch (err) {
                                console.error('Failed to extract nested zip:', err);
                            }
                        }
                    }
                };
                await extractAllZips(extractedDir);
                dicomFileUrl = extractedDir;
            }
            xrayCase.dicomFileUrl = dicomFileUrl;
        }

        xrayCase.status = 'uploaded';
        xrayCase.isModified = true;
        xrayCase.assignedDoctorId = null;
        xrayCase.lockedAt = null;
        await xrayCase.save();

        res.json({ message: 'Corrected study and patient details updated successfully', case: xrayCase });
    } catch (error) {
        console.error('Re-upload error:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.reportWrongReport = async (req, res) => {
    try {
        const { id } = req.params;
        const { issueDescription } = req.body;

        if (!issueDescription || !issueDescription.trim()) {
            return res.status(400).json({ message: 'Problem description is required' });
        }

        const xrayCase = await XrayCase.findByPk(id);
        if (!xrayCase) {
            return res.status(404).json({ message: 'Case not found' });
        }

        xrayCase.isReportWrong = true;
        xrayCase.reportIssueDescription = issueDescription.trim();
        xrayCase.status = 'in_progress';
        await xrayCase.save();

        res.json({ message: 'Report issue reported to doctor successfully', case: xrayCase });
    } catch (error) {
        console.error('Error reporting wrong report:', error);
        res.status(500).json({ error: error.message });
    }
};

