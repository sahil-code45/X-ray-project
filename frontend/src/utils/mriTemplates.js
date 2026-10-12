export const MRI_TEMPLATES = [
  {
    id: 1,
    name: "1. MRI Brain — Routine / Stroke Protocol",
    findings: `<p><strong>Suggested clinical use:</strong> Headache, altered mental status, suspected ischemic stroke, seizure, or focal neurological deficit.</p><br/>
<p><strong>TECHNIQUE</strong><br/>Multiplanar, multisequence MRI of the brain including axial T1, T2, FLAIR, DWI/ADC, and SWI/GRE sequences without intravenous contrast.</p><br/>
<p><strong>FINDINGS — structured checklist / copy-ready wording</strong></p>
<ul>
<li>☐ Brain parenchyma: [No acute territorial infarction, contusion, or space-occupying mass lesion].</li>
<li>☐ Diffusion (DWI/ADC): [No restricted diffusion to suggest acute ischemic stroke].</li>
<li>☐ Hemorrhage / Microbleeds: [No susceptibility artifact on SWI/GRE to indicate acute or chronic intracranial hemorrhage].</li>
<li>☐ Ventricles & CSF spaces: [Normal ventricular caliber and sulcal prominence for age. No hydrocephalus].</li>
<li>☐ Midline structures: [No midline shift, mass effect, or herniation].</li>
<li>☐ Vascular flow voids: [Major intracranial arterial flow voids at the skull base are preserved].</li>
<li>☐ Sella & Craniovertebral junction: [Normal pituitary gland. Cerebellar tonsils appropriately positioned above the foramen magnum].</li>
<li>☐ Calvarium & Orbits: [Unremarkable calvarium, paranasal sinuses, and mastoid air cells].</li>
</ul>`,
    impression: `<ol>
<li>[No acute intracranial infarction, hemorrhage, or mass effect identified].</li>
<li>[Age-appropriate minor periventricular/subcortical white matter hyperintensities, likely representing chronic microvascular ischemic changes].</li>
</ol><br/>
<p><strong>Region-specific cautions</strong></p>
<ul>
<li>Early hyperacute stroke (&lt; 30 mins) may rarely demonstrate subtle or false-negative diffusion changes; correlate with clinical NIHSS.</li>
<li>Ensure adequate evaluation of vascular flow voids on T2/FLAIR or recommend dedicated MRA if vessel occlusion is suspected.</li>
</ul>`
  },
  {
    id: 2,
    name: "2. MRI Brain — With & Without Contrast (Tumor / Infection)",
    findings: `<p><strong>TECHNIQUE</strong><br/>Multiplanar MRI of the brain performed before and following intravenous administration of Gadolinium contrast.</p><br/>
<p><strong>FINDINGS</strong></p>
<ul>
<li>☐ Parenchymal signal: [No abnormal T2/FLAIR hyperintensity or mass effect].</li>
<li>☐ Contrast enhancement: [No pathological parenchymal, nodular, ring, or leptomeningeal enhancement].</li>
<li>☐ Ventricles & Basal cisterns: [Symmetrical, normal size. No cistern obliteration].</li>
<li>☐ Meninges: [No dural thickening or abnormal enhancement].</li>
<li>☐ Orbits & Skull base: [Unremarkable].</li>
</ul>`,
    impression: `<ol>
<li>[No abnormal intra-axial or extra-axial contrast enhancement identified].</li>
<li>[No findings suggestive of primary neoplasm, metastasis, or intracranial infection].</li>
</ol>`
  },
  {
    id: 3,
    name: "3. MRI Cervical Spine",
    findings: `<p><strong>Suggested clinical use:</strong> Cervical radiculopathy, myelopathy, trauma, neck pain, or paresthesias.</p><br/>
<p><strong>TECHNIQUE</strong><br/>Sagittal T1, T2, STIR, and axial T2-weighted MRI of the cervical spine from skull base through upper thoracic level without contrast.</p><br/>
<p><strong>FINDINGS — structured checklist</strong></p>
<ul>
<li>☐ Alignment: [Normal cervical lordosis. No subluxation, spondylolisthesis, or kyphotic deformity].</li>
<li>☐ Vertebral bodies: [Normal heights and marrow signal. No fracture, marrow replacement, or edema].</li>
<li>☐ Spinal cord: [Normal caliber and homogeneous cord signal. No intramedullary edema, syrinx, or myelomalacia].</li>
<li>☐ C2-C3: [No significant disc bulge. Neural foramina and central canal patent].</li>
<li>☐ C3-C4: [No significant disc bulge. Neural foramina and central canal patent].</li>
<li>☐ C4-C5: [Mild disc bulge without significant canal or foraminal stenosis].</li>
<li>☐ C5-C6: [Mild broad-based disc osteophyte complex. Mild bilateral neural foraminal narrowing].</li>
<li>☐ C6-C7: [No significant disc herniation. Neural foramina widely patent].</li>
<li>☐ C7-T1: [Unremarkable].</li>
<li>☐ Paraspinal soft tissues: [Symmetrical, within normal limits].</li>
</ul>`,
    impression: `<ol>
<li>[No evidence of cervical cord compression, signal abnormality, or acute fracture].</li>
<li>[Mild cervical spondylodisco-degenerative changes as detailed by level above].</li>
</ol>`
  },
  {
    id: 4,
    name: "4. MRI Lumbar Spine",
    findings: `<p><strong>Suggested clinical use:</strong> Low back pain, lumbar radiculopathy, sciatica, or suspected spinal stenosis.</p><br/>
<p><strong>TECHNIQUE</strong><br/>Sagittal T1, T2, STIR and axial T2-weighted images of the lumbar spine from L1 through S1.</p><br/>
<p><strong>FINDINGS</strong></p>
<ul>
<li>☐ Alignment & Curvature: [Preserved lumbar lordosis. No spondylolisthesis or scoliosis].</li>
<li>☐ Vertebral bodies: [Vertebral body heights preserved. No marrow edema, modic changes, or compression fracture].</li>
<li>☐ Conus medullaris: [Normal caliber, terminates at L1-L2 level. Cauda equina nerve roots unremarkable].</li>
<li>☐ L1-L2: [Normal disc height and signal. Canal and foramina patent].</li>
<li>☐ L2-L3: [Normal disc height and signal. Canal and foramina patent].</li>
<li>☐ L3-L4: [Mild diffuse disc bulge. No significant spinal canal or neural foraminal stenosis].</li>
<li>☐ L4-L5: [Mild-to-moderate broad-based disc bulge with mild facet arthropathy. Mild canal narrowing without nerve root impingement].</li>
<li>☐ L5-S1: [Desiccated disc with mild disc bulge. Bilateral neural foramina patent].</li>
<li>☐ Paraspinal musculature: [Within normal limits].</li>
</ul>`,
    impression: `<ol>
<li>[No high-grade central spinal canal or neural foraminal stenosis].</li>
<li>[Mild degenerative disc disease at L4-L5 and L5-S1 as detailed above].</li>
<li>[No compression fracture or cord/cauda equina compromise].</li>
</ol>`
  },
  {
    id: 5,
    name: "5. MRI Thoracic Spine",
    findings: `<p><strong>TECHNIQUE</strong><br/>Sagittal T1, T2, STIR and axial T2 images of the thoracic spine.</p><br/>
<p><strong>FINDINGS</strong></p>
<ul>
<li>☐ Alignment: [Normal thoracic kyphosis. No listhesis].</li>
<li>☐ Vertebrae: [Normal heights and signal intensity. No acute fracture or bone edema].</li>
<li>☐ Thoracic cord: [Normal caliber and signal throughout. No intramedullary lesion].</li>
<li>☐ Intervertebral discs: [No significant disc herniation, canal stenosis, or cord indentation].</li>
</ul>`,
    impression: `<ol><li>[Normal MRI of the thoracic spine. No acute osseous or cord abnormality].</li></ol>`
  },
  {
    id: 6,
    name: "6. MRI Knee Joint",
    findings: `<p><strong>Suggested clinical use:</strong> Ligamentous injury, meniscal tear, joint effusion, or knee pain.</p><br/>
<p><strong>TECHNIQUE</strong><br/>Multiplanar T1, Proton Density (PD), and T2 fat-suppressed (FS) sequences of the knee joint.</p><br/>
<p><strong>FINDINGS — structured checklist</strong></p>
<ul>
<li>☐ Medial Meniscus: [Intact anterior horn, body, and posterior horn. No tear or displacement].</li>
<li>☐ Lateral Meniscus: [Intact. Normal morphology and signal intensity].</li>
<li>☐ Anterior Cruciate Ligament (ACL): [Intact fibers with normal low signal intensity and orientation. No tear].</li>
<li>☐ Posterior Cruciate Ligament (PCL): [Intact. Smooth contour and low signal].</li>
<li>☐ Collateral Ligaments: [MCL and LCL intact without sprain or disruption].</li>
<li>☐ Extensor Mechanism: [Patellar and quadriceps tendons intact. Retinacula intact].</li>
<li>☐ Articular Cartilage: [Normal thickness and contour across medial, lateral, and patellofemoral compartments].</li>
<li>☐ Joint effusion / Baker's cyst: [No significant joint effusion or popliteal cyst].</li>
<li>☐ Bone marrow: [No contusion, occult fracture, or osteochondral defect].</li>
</ul>`,
    impression: `<ol>
<li>[No evidence of cruciate ligament (ACL/PCL) or meniscal tear].</li>
<li>[No joint effusion or acute osseous injury].</li>
</ol>`
  },
  {
    id: 7,
    name: "7. MRI Shoulder Joint",
    findings: `<p><strong>Suggested clinical use:</strong> Shoulder pain, rotator cuff injury, instability, or impingement.</p><br/>
<p><strong>TECHNIQUE</strong><br/>Coronal oblique T1, PD FS, T2 FS, sagittal oblique, and axial PD FS MRI of the shoulder joint.</p><br/>
<p><strong>FINDINGS</strong></p>
<ul>
<li>☐ Supraspinatus tendon: [Intact from musculotendinous junction to footprint. No full-thickness or partial tear].</li>
<li>☐ Infraspinatus & Teres Minor: [Normal thickness and signal. Intact].</li>
<li>☐ Subscapularis tendon: [Intact fibers. No tear or subluxation].</li>
<li>☐ Long Head of Biceps: [Normal caliber, centered within the bicipital groove].</li>
<li>☐ Glenoid Labrum: [No anterior, posterior, or SLAP labral tear identified].</li>
<li>☐ AC Joint: [Normal alignment. No hypertrophic arthropathy].</li>
<li>☐ Subacromial-subdeltoid bursa: [No significant bursitis or fluid accumulation].</li>
<li>☐ Glenohumeral joint: [Normal cartilage. No joint effusion or Hill-Sachs lesion].</li>
</ul>`,
    impression: `<ol>
<li>[Intact rotator cuff tendons without evidence of partial or complete tear].</li>
<li>[No labral tear or joint effusion].</li>
</ol>`
  },
  {
    id: 8,
    name: "8. MRI Pelvis / Hip Joint (Avascular Necrosis / AVN Protocol)",
    findings: `<p><strong>TECHNIQUE</strong><br/>Coronal and axial T1, T2 fat-suppressed, and STIR sequences of bilateral hip joints and pelvis.</p><br/>
<p><strong>FINDINGS</strong></p>
<ul>
<li>☐ Femoral Heads: [Symmetrical, smooth spherical contour. Normal marrow signal bilaterally without serpentine bands, double-line sign, or flattening to indicate avascular necrosis (AVN)].</li>
<li>☐ Acetabular Labrum: [Normal bilaterally. No tear].</li>
<li>☐ Joint Space & Effusion: [Preserved joint space bilaterally. No joint effusion].</li>
<li>☐ Pelvic Bones: [No sacroiliitis, marrow edema, or occult stress fracture].</li>
<li>☐ Surrounding Musculature: [Iliopsoas, gluteal, and adductor muscles unremarkable].</li>
</ul>`,
    impression: `<ol><li>[No evidence of avascular necrosis (AVN) of bilateral femoral heads. No occult fracture or labral tear].</li></ol>`
  },
  {
    id: 9,
    name: "9. MRI Ankle & Foot",
    findings: `<p><strong>TECHNIQUE</strong><br/>Multiplanar T1, T2, and STIR images of the ankle and hindfoot.</p><br/>
<p><strong>FINDINGS</strong></p>
<ul>
<li>☐ Achilles Tendon: [Normal caliber and low signal intensity throughout. No tendonitis, retrocalcaneal bursitis, or tear].</li>
<li>☐ Plantar Fascia: [Normal thickness at calcaneal insertion. No fasciitis].</li>
<li>☐ Lateral Ligaments (ATFL, CFL): [Intact without discontinuity or sprain].</li>
<li>☐ Medial Ligaments (Deltoid): [Intact].</li>
<li>☐ Tendons (Tibialis posterior, Peroneal, Flexor/Extensor): [Intact within sheaths].</li>
<li>☐ Talar Dome & Bones: [No osteochondral lesion or marrow edema].</li>
</ul>`,
    impression: `<ol><li>[Intact Achilles tendon, collateral ligaments, and plantar fascia. No osteochondral defect].</li></ol>`
  },
  {
    id: 10,
    name: "10. MRI Abdomen / MRCP (Biliary & Pancreas Protocol)",
    findings: `<p><strong>TECHNIQUE</strong><br/>Multiplanar T1, T2, in-phase/out-of-phase, fat-suppressed, and 3D thick/thin slab MRCP sequences of the upper abdomen.</p><br/>
<p><strong>FINDINGS</strong></p>
<ul>
<li>☐ Liver: [Normal size and contour. No focal hepatic mass or steatosis].</li>
<li>☐ Gallbladder: [Normally distended. No wall thickening, cholecystitis, or intraluminal calculi].</li>
<li>☐ Biliary Tree (CBD & Intrahepatic Ducts): [Common bile duct is of normal caliber (measuring up to [x] mm). No intraductal calculus, stricture, or dilatation].</li>
<li>☐ Pancreas & Pancreatic Duct: [Normal pancreatic parenchyma. Main pancreatic duct is non-dilated and smooth in contour].</li>
<li>☐ Spleen & Kidneys: [Unremarkable].</li>
</ul>`,
    impression: `<ol><li>[Normal MRCP examination. No biliary dilatation, choledocholithiasis, or pancreatic abnormality].</li></ol>`
  },
  {
    id: 11,
    name: "11. MRI Pelvis — Female (Uterus & Ovaries)",
    findings: `<p><strong>TECHNIQUE</strong><br/>High-resolution sagittal, axial, and coronal T2 and T1 fat-suppressed MRI of the female pelvis.</p><br/>
<p><strong>FINDINGS</strong></p>
<ul>
<li>☐ Uterus: [Normal anteverted/retroverted position and size. Myometrium demonstrates homogeneous signal. No leiomyoma].</li>
<li>☐ Junctional Zone: [Preserved, normal thickness (&lt; 12 mm). No adenomyosis].</li>
<li>☐ Endometrium: [Normal thickness ([x] mm) and signal intensity for menstrual status. Clear endometrial-myometrial interface].</li>
<li>☐ Ovaries & Adnexa: [Both ovaries are normal in size with physiologic follicles. No complex adnexal mass, endometrioma, or dermoid].</li>
<li>☐ Free Fluid: [No pathological pelvic free fluid or lymphadenopathy].</li>
</ul>`,
    impression: `<ol><li>[Normal MRI study of the female pelvis. No uterine leiomyoma, adenomyosis, or adnexal mass lesion].</li></ol>`
  },
  {
    id: 12,
    name: "12. MRI Pelvis — Prostate (PI-RADS Protocol)",
    findings: `<p><strong>TECHNIQUE</strong><br/>High-resolution multiplanar T2-weighted, Diffusion-Weighted Imaging (DWI) with high b-value (b=1500), ADC map, and pre/post-contrast dynamic imaging according to PI-RADS v2.1 guidelines.</p><br/>
<p><strong>FINDINGS</strong></p>
<ul>
<li>☐ Prostate Gland Volume: [Volume approximately [x] cc. Normal capsular contour].</li>
<li>☐ Peripheral Zone (PZ): [Homogeneous high T2 signal. No focal nodular T2 hypointensity or restricted diffusion (PI-RADS 1/2)].</li>
<li>☐ Transition Zone (TZ): [Typical benign prostatic hyperplasia (BPH) nodular stromal and glandular changes (PI-RADS 1/2)].</li>
<li>☐ Seminal Vesicles: [Symmetrical, normal fluid signal. No evidence of seminal vesicle invasion].</li>
<li>☐ Neurovascular Bundles: [Symmetrical, intact bilaterally].</li>
<li>☐ Lymph Nodes & Bones: [No suspicious pelvic lymphadenopathy or osseous metastatic lesions].</li>
</ul>`,
    impression: `<ol>
<li>[PI-RADS Assessment Category: PI-RADS 2 — Clinically significant prostate cancer is highly unlikely].</li>
<li>[Benign Prostatic Hyperplasia (BPH) changes in the transition zone].</li>
</ol>`
  }
];

