const { XrayCase, Report, Payout, DoctorProfile, DoctorTestPricing, sequelize } = require('../models');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

/*
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
*/

exports.submitReport = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { id } = req.params; // Case ID
        const doctorId = req.user.id;
        const { clinicalFindings, impression, recommendations, testName, modality } = req.body;
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
        const docRegNo = (doctorProfile && doctorProfile.registrationNumber) || (doctorProfile ? doctorProfile.panCard : 'N/A');
        doc.fontSize(12).text(`Doctor: ${doctorProfile ? doctorProfile.name : 'Radiologist'} | Reg No: ${docRegNo}`);
        const patientIdLabel = xrayCase.patientId ? ` | ID: ${xrayCase.patientId}` : '';
        doc.text(`Patient: ${xrayCase.patientName}${patientIdLabel} | Age: ${xrayCase.patientAge} | Gender: ${xrayCase.patientGender}`);
        if (testName) {
            doc.text(`Study / Test: ${testName}${modality ? ` (${modality})` : ''}`);
        }
        doc.moveDown();
        
        doc.fontSize(14).text('Clinical Findings:', { underline: true });
        doc.fontSize(12).text(stripHtml(clinicalFindings) || 'No findings recorded');
        doc.moveDown();
        
        doc.fontSize(14).text('Impression:', { underline: true });
        doc.fontSize(12).text(stripHtml(impression) || 'No impression recorded');
        doc.moveDown();

        doc.fontSize(14).text('Recommendations:', { underline: true });
        doc.fontSize(12).text(stripHtml(recommendations) || 'No recommendations recorded');
        doc.moveDown(1.5);
        
        // If doctor has an uploaded signature image, include it in the report
        if (doctorProfile && doctorProfile.signatureFileUrl) {
            try {
                const sigFullPath = path.resolve(doctorProfile.signatureFileUrl);
                if (fs.existsSync(sigFullPath)) {
                    // Check if it's an image file
                    const ext = path.extname(sigFullPath).toLowerCase();
                    if (['.png', '.jpg', '.jpeg'].includes(ext)) {
                        doc.image(sigFullPath, { fit: [140, 50], align: 'center' });
                        doc.moveDown(0.3);
                    }
                }
            } catch (sigErr) {
                console.error("Signature image rendering error in PDF:", sigErr);
            }
        }

        doc.fontSize(10).text('Electronically signed via Tele-Radiology Platform', { align: 'center', italic: true });
        doc.end();

        const pdfUrl = `uploads/${pdfFileName}`;
        const resolvedModality = modality || (testName && testName.includes('MRI') ? 'MRI' : (testName && testName.includes('CT') ? 'CT' : 'General'));

        // Check if report already exists for this case (Editing Mode)
        let existingReport = await Report.findOne({ where: { caseId: id }, transaction: t });

        if (existingReport) {
            existingReport.clinicalFindings = clinicalFindings;
            existingReport.impression = impression;
            existingReport.recommendations = recommendations;
            existingReport.pdfUrl = pdfUrl;
            if (testName) existingReport.testName = testName;
            if (resolvedModality) existingReport.modality = resolvedModality;
            await existingReport.save({ transaction: t });
        } else {
            // Create Report Record
            await Report.create({
                caseId: id, 
                doctorId, 
                clinicalFindings, 
                impression, 
                recommendations, 
                pdfUrl,
                testName: testName || null,
                modality: resolvedModality || null
            }, { transaction: t });
        }

        // Only transition to completed and create payout if it was in_progress
        if (xrayCase.status === 'in_progress') {
            xrayCase.status = 'completed';
            xrayCase.isReportWrong = false;
            xrayCase.reportIssueDescription = null;
            if (testName) xrayCase.testName = testName;
            if (resolvedModality) xrayCase.modality = resolvedModality;
            await xrayCase.save({ transaction: t });

            // Automated Payout Generation with Doctor Test Pricing setup
            const existingPayout = await Payout.findOne({ where: { caseId: id }, transaction: t });
            if (!existingPayout) {
                let payoutAmount = null;

                // 1. Look for doctor-specific price for this test
                if (testName) {
                    const docSpecific = await DoctorTestPricing.findOne({
                        where: { doctorId, testName: testName.trim() },
                        transaction: t
                    });
                    if (docSpecific && Number(docSpecific.price) > 0) {
                        payoutAmount = Number(docSpecific.price);
                    } else {
                        // 2. Look for default price across all doctors (doctorId: null)
                        const defaultPrice = await DoctorTestPricing.findOne({
                            where: { doctorId: null, testName: testName.trim() },
                            transaction: t
                        });
                        if (defaultPrice && Number(defaultPrice.price) > 0) {
                            payoutAmount = Number(defaultPrice.price);
                        }
                    }
                }

                // 3. Fallback to doctor's configured reportFee or standard default
                if (!payoutAmount || payoutAmount <= 0) {
                    payoutAmount = (doctorProfile && doctorProfile.reportFee) ? Number(doctorProfile.reportFee) : 500;
                }

                await Payout.create({
                    doctorId,
                    caseId: id,
                    amount: payoutAmount,
                    testName: testName || `${resolvedModality} Report`,
                    modality: resolvedModality,
                    status: 'pending'
                }, { transaction: t });
            }
        } else {
            xrayCase.isReportWrong = false;
            xrayCase.reportIssueDescription = null;
            if (testName) xrayCase.testName = testName;
            if (resolvedModality) xrayCase.modality = resolvedModality;
            await xrayCase.save({ transaction: t });
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
