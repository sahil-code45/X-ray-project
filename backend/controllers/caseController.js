const { XrayCase, sequelize } = require('../models');

const extract = require('extract-zip');
const fs = require('fs');
const path = require('path');

exports.uploadCase = async (req, res) => {
    console.log('--- Upload request received ---');
    try {
        const { patientId, patientName, patientAge, patientGender, studyNotes } = req.body;
        let dicomFileUrl = req.file ? req.file.path : null;
        console.log('File uploaded to multer:', dicomFileUrl);

        if (!dicomFileUrl) {
            return res.status(400).json({ message: 'DICOM/ZIP file is required' });
        }

        let status = 'uploaded';
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

        const newCase = await XrayCase.create({
            patientId: patientId ? patientId.trim() : null,
            patientName,
            patientAge,
            patientGender,
            studyNotes,
            dicomFileUrl,
            status,
            centerId: req.user?.id || null
        });

        res.status(201).json({ message: 'Case uploaded successfully', case: newCase });
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
            ? {} 
            : {
                [Op.or]: [
                    { centerId: centerId },
                    { centerId: null }
                ]
            };

        const cases = await XrayCase.findAll({
            where: whereClause,
            include: [
                {
                    model: User,
                    as: 'doctor',
                    attributes: ['id', 'email'],
                    include: [{ model: DoctorProfile, as: 'doctorProfile', attributes: ['name', 'phoneNumber'] }]
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

        const { Report } = require('../models');
        const completedCases = await XrayCase.findAll({
            where: { status: 'completed', assignedDoctorId: doctorId },
            include: [{ model: Report, as: 'report' }],
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
        const { Report } = require('../models');
        const xrayCase = await XrayCase.findByPk(id, {
            include: [{ model: Report, as: 'report' }]
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
