# Tele-Radiology Platform — Project Memory & Architecture Context

This document preserves the complete system architecture, workflows, credentials, and feature status for the Tele-Radiology platform so that any new or compacted session immediately has full context.

---

## 1. Credentials & Configuration
- **Admin Login**: `aman123@gmail.com` | Password: `Aman@1020` (Single authorized system administrator).
- **PostgreSQL Database**:
  - DB Name: `xray_db` | User: `postgres` | Port: `5432`
  - Connection configured via `backend/.env` (`DB_PASSWORD=Sahil@100`) to keep `config.json` safe from public exposure on Git.
- **Port Allocations**:
  - Frontend (Vite + React): Port `3000` (`http://localhost:3000`)
  - Backend (Express + Sequelize): Port `8000` (`http://localhost:8000`)

---

## 2. Core Modules & User Journeys

### A. Diagnostic Center Portal
- **Case Upload** (`/center/upload` / `CenterUpload.jsx`):
  - Manual upload of DICOM (`.dcm`) or multi-slice `.zip`.
  - Auto-extracts Patient Name, ID, Age, Gender, Modality, Test Name from DICOM header.
- **Machine Ingest & Drafts** (`/center/drafts` / `CenterDrafts.jsx`):
  - Receives automatic scan pushes from CT/MRI machines via LAN bridge.
  - Initial status: `draft` (doctors cannot view until reviewed by center).
  - Center reviews scan details with 1 click ➔ pre-fills form ➔ publishes to radiologist pool (`status: uploaded`).
  - Real-time pending draft badge displayed in sidebar.
- **Cases & Reports Directory** (`/center/cases` / `CenterCases.jsx`):
  - Tracks live diagnostic status (`uploaded`, `in_progress`, `completed`).
  - View finalized radiologist reports, download stamped PDF, or request report revisions.

### B. MRI & CT Machine LAN Connection Bridge
- Located in `backend/dicom-bridge/`:
  - `center_machine_sync.js`: Sync gateway running on center PC.
  - Receives studies from Orthanc PACS (AE Title: `ORTHANC`, Port: `4242`) on the local network.
  - Automatically packages and syncs scans via `POST /api/cases/machine-sync`.

### C. Doctor Workspace & Interactive DICOM Viewer
- Route: `/doctor/workspace/:id` (`DoctorWorkspace.jsx`):
  - Interactive multi-slice Cornerstone DICOM viewer.
  - Medical tools: WW/WC (Window/Level Contrast), Zoom, Pan, Calibrated Measurement Tool (mm), Invert, Reset.
  - Slice slider and keyboard arrow navigation.
  - View Switcher: `🖼️ Viewer Only`, `🌓 Split Screen`, `📝 Report Only`.
  - Direct 1-Click Study Download: `📥 Download (RadiAnt / MicroDicom)`.
  - Diagnostic reporting form (Clinical Findings, Impression, Recommendations) + PDF generation.

### D. Doctor KYC, Pricing & Admin Management
- Doctor registration collects MBBS degree, PG degree, signature, registration certificate (`RegisterDoctor.jsx`).
- Admin KYC verification and approval pipeline (`AdminDashboard.jsx`).
- Dynamic test pricing management per doctor & modality (`AdminPricing.jsx`).
- Automated doctor payouts on completed reports (`AdminPayouts.jsx`).

---

## 3. Automated Tests (Verified & Passing)
- **Unit Tests** (`backend/tests/dicomHelper.unit.test.js`): 11/11 passed (DICOM parsing, tag formatting, directory inspection).
- **Integration Tests** (`backend/tests/machineSync.integration.test.js`): 10/10 passed (Machine sync ingest, draft publishing, slice streaming, HTTP 206 range requests, desktop zip download, multi-tenant isolation, draft deletion).

