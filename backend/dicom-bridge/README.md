# 🏥 MRI / CT Machine to Website Gateway Setup Guide

This guide explains how to connect any MRI or CT scanner (GE, Siemens, Philips, Canon/Toshiba, United Imaging) to your Tele-Radiology website portal.

---

## 🏗️ Architecture Overview

```
[MRI / CT Machine Operator Console]
                │
                │ 1. DICOM C-STORE push over Local Network (LAN)
                ▼
[Diagnostic Center PC (Orthanc PACS + Bridge)]
   - Receives DICOM files on Port 4242 (AE Title: ORTHANC)
   - center_machine_sync.js watches incoming studies
                │
                │ 2. Automated HTTPS sync to Cloud Portal
                ▼
[Aapki Hostinger / Cloud Website]
   - Doctor & Admin Dashboard shows new pending case instantly!
```

---

## 📋 Step 1: Install Local DICOM Server (Orthanc) on Center PC

1. Download **Orthanc for Windows** from [https://orthanc-server.com/download-windows.html](https://orthanc-server.com/download-windows.html).
2. Install with default settings.
3. Open `C:\Program Files\Orthanc Server\Configuration\Orthanc.json` and verify:
   - `"DicomAet": "ORTHANC"`
   - `"DicomPort": 4242`
4. Start Orthanc Service. The Orthanc web interface will be available at:
   `http://localhost:8042`

---

## ⚙️ Step 2: Configure MRI / CT Machine Console

Ask the machine service engineer or center technician to open **DICOM Network Settings** on the scanner workstation and add a **Destination / Storage Node**:

- **Node / Destination Name**: `ORTHANC`
- **Application Entity (AE) Title**: `ORTHANC`
- **IP Address**: IP address of the Center PC (e.g. `192.168.1.50`)
- **Port**: `4242`

> **Note**: Test the connection by pressing **Verify / C-ECHO**. When it shows "Success", the machine is successfully connected!

---

## 🚀 Step 3: Run the Auto-Sync Bridge

1. Copy the `backend/dicom-bridge` folder to the Center PC.
2. In `config.json`, enter your website URL and Center login credentials:
   ```json
   {
     "serverUrl": "https://your-domain.com",
     "centerEmail": "center@example.com",
     "centerPassword": "YourPassword123",
     "watchDirectory": "./incoming_scans",
     "pollIntervalSec": 10
   }
   ```
3. Test connection:
   ```bash
   node center_machine_sync.js --test
   ```
4. Start continuous auto-sync:
   ```bash
   node center_machine_sync.js
   ```

---

## 🎯 How Daily Operations Work:
1. Technician finishes MRI or CT scan on the scanner.
2. Selects the patient in the Patient List and clicks **"Send to ORTHANC"**.
3. Within 15-30 seconds, the case automatically appears in the Doctor's workspace on the website with all patient details, modality, and DICOM images ready for diagnosis!

