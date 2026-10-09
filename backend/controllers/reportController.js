const { XrayCase, Report, Payout, DoctorProfile, sequelize } = require('../models');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

exports.getDicomMetadata = async (req, res) => {
    try {
        const { id } = req.params;
        const doctorId = req.user.id;

        const xrayCase = await XrayCase.findOne({ where: { id, assignedDoctorId: doctorId } });
        if (!xrayCase) return res.status(403).json({ message: 'Unauthorized or case not found' });

        const filePath = path.resolve(xrayCase.dicomFileUrl);
        if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'DICOM file/folder not found' });

        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            // Function to get all files recursively
            const getAllFiles = (dirPath, arrayOfFiles) => {
                const files = fs.readdirSync(dirPath);
                let currentFiles = arrayOfFiles || [];
                files.forEach((file) => {
                    const fullPath = path.join(dirPath, file);
                    if (fs.statSync(fullPath).isDirectory()) {
                        currentFiles = getAllFiles(fullPath, currentFiles);
                    } else {
                        currentFiles.push(fullPath);
                    }
                });
                return currentFiles;
            };

            const allFiles = getAllFiles(filePath);
            
            // Filter for DCM files, ignoring .zip or other random files
            let dcmFiles = allFiles.filter(f => {
                const lowerF = f.toLowerCase();
                const baseName = path.basename(f);
                if (f.includes('__MACOSX') || baseName.startsWith('.')) return false;
                // Check if it's a dicom file or an extensionless file
                return lowerF.endsWith('.dcm') || lowerF.endsWith('.img') || (!baseName.includes('.') && !lowerF.endsWith('.zip'));
            }).sort();
            
            // Map absolute paths back to relative slices (from the base filePath)
            const slices = dcmFiles.map(f => path.relative(filePath, f).replace(/\\/g, '/'));
            
            return res.json({ isDirectory: true, slices: slices });
        } else {
            if (filePath.toLowerCase().endsWith('.zip') || filePath.toLowerCase().endsWith('.pdf')) {
                return res.json({ isDirectory: false, slices: [] }); 
            }
            return res.json({ isDirectory: false, slices: [path.basename(filePath)] });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.streamDicom = async (req, res) => {
    try {
        const { id } = req.params;
        const doctorId = req.user.id;
        const slice = req.query.slice;

        const xrayCase = await XrayCase.findOne({ where: { id, assignedDoctorId: doctorId } });
        if (!xrayCase) return res.status(403).json({ message: 'Unauthorized' });

        let filePath = path.resolve(xrayCase.dicomFileUrl);
        if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'File not found' });

        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            if (!slice) {
                // If they want to download the directory, zip it on the fly and send
                const { ZipArchive } = require('archiver');
                res.writeHead(200, {
                    'Content-Type': 'application/zip',
                    'Content-Disposition': `attachment; filename="case_${id}_files.zip"`
                });
                
                const archive = new ZipArchive({ zlib: { level: 1 } }); // level 1 for speed
                archive.on('error', function(err) {
                    console.error('Archive error:', err);
                    if (!res.headersSent) {
                        res.status(500).json({error: err.message});
                    }
                });
                
                archive.pipe(res);
                archive.directory(filePath, false); // false means don't include the root folder itself
                return archive.finalize();
            } else {
                filePath = path.join(filePath, slice);
                if (!fs.existsSync(filePath)) return res.status(404).json({ message: 'Slice not found' });
            }
        }

        const fileStat = fs.statSync(filePath);
        if (fileStat.isDirectory()) {
            return res.status(400).json({ message: 'Requested path is a directory, cannot stream' });
        }
        
        const fileSize = fileStat.size;
        const range = req.headers.range;

        if (range) {
            const parts = range.replace(/bytes=/, "").split("-");
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            const chunksize = (end - start) + 1;
            const file = fs.createReadStream(filePath, { start, end });
            const head = {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': 'application/dicom',
            };
            res.writeHead(206, head);
            file.pipe(res);
        } else {
            const head = {
                'Content-Length': fileSize,
                'Content-Type': 'application/dicom',
            };
            res.writeHead(200, head);
            fs.createReadStream(filePath).pipe(res);
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.submitReport = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params; // Case ID
        const doctorId = req.user.id;
        const { clinicalFindings, impression, recommendations } = req.body;
        const { Op } = require('sequelize');

        const xrayCase = await XrayCase.findOne({ 
            where: { 
                id, 
                assignedDoctorId: doctorId, 
                status: { [Op.in]: ['in_progress', 'completed'] } 
            }, 
            transaction: t 
        });

        if (!xrayCase) {
            await t.rollback();
            return res.status(404).json({ message: 'Case not found or unauthorized' });
        }

        const doctorProfile = await DoctorProfile.findOne({ where: { userId: doctorId }, transaction: t });

        // Helper to strip HTML tags for clean PDFKit output
        const stripHtml = (html) => (html ? html.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ').trim() : '');

        // Generate PDF
        const pdfFileName = `report_${id}_${Date.now()}.pdf`;
        const pdfPath = path.join(__dirname, '..', 'uploads', pdfFileName);
        const doc = new PDFDocument({ margin: 50 });
        
        doc.pipe(fs.createWriteStream(pdfPath));
        
        // Hospital Branding & Doctor Details
        doc.fontSize(20).text('Tele-Radiology Diagnosis Report', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Doctor: ${doctorProfile ? doctorProfile.name : 'Radiologist'} | Reg No: ${doctorProfile ? doctorProfile.panCard : 'N/A'}`);
        const patientIdLabel = xrayCase.patientId ? ` | ID: ${xrayCase.patientId}` : '';
        doc.text(`Patient: ${xrayCase.patientName}${patientIdLabel} | Age: ${xrayCase.patientAge} | Gender: ${xrayCase.patientGender}`);
        doc.moveDown();
        
        doc.fontSize(14).text('Clinical Findings:', { underline: true });
        doc.fontSize(12).text(stripHtml(clinicalFindings) || 'No findings recorded');
        doc.moveDown();
        
        doc.fontSize(14).text('Impression:', { underline: true });
        doc.fontSize(12).text(stripHtml(impression) || 'No impression recorded');
        doc.moveDown();

        doc.fontSize(14).text('Recommendations:', { underline: true });
        doc.fontSize(12).text(stripHtml(recommendations) || 'No recommendations recorded');
        doc.moveDown(2);
        
        doc.fontSize(10).text('Electronically signed via Tele-Radiology Platform', { align: 'center', italic: true });
        doc.end();

        const pdfUrl = `uploads/${pdfFileName}`;

        // Check if report already exists for this case (Editing Mode)
        let existingReport = await Report.findOne({ where: { caseId: id }, transaction: t });

        if (existingReport) {
            existingReport.clinicalFindings = clinicalFindings;
            existingReport.impression = impression;
            existingReport.recommendations = recommendations;
            existingReport.pdfUrl = pdfUrl;
            await existingReport.save({ transaction: t });
        } else {
            // Create Report Record
            await Report.create({
                caseId: id, doctorId, clinicalFindings, impression, recommendations, pdfUrl
            }, { transaction: t });
        }

        // Only transition to completed and create payout if it was in_progress
        if (xrayCase.status === 'in_progress') {
            xrayCase.status = 'completed';
            await xrayCase.save({ transaction: t });

            // Automated Payout Generation
            if (doctorProfile && doctorProfile.reportFee) {
                await Payout.create({
                    doctorId,
                    caseId: id,
                    amount: doctorProfile.reportFee,
                    status: 'pending'
                }, { transaction: t });
            }
        }

        await t.commit();
        res.json({ 
            message: existingReport ? 'Report updated successfully' : 'Report submitted successfully', 
            pdfUrl 
        });
    } catch (error) {
        await t.rollback();
        res.status(500).json({ error: error.message });
    }
};
