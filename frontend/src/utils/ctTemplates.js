export const CT_TEMPLATES = [
  {
    id: 1,
    name: "1. CT Head — non-contrast",
    findings: `<p><strong>Suggested clinical use:</strong> Acute head trauma, suspected hemorrhage, acute neurological deficit, headache or other indication. Adapt to trauma or stroke protocol.</p><br/>
<p><strong>TECHNIQUE</strong><br/>Non-contrast CT head from skull base through vertex with axial images and multiplanar reformats. State limitations from motion, beam-hardening or incomplete coverage. CT angiography/perfusion is a separate protocol and should be documented separately.</p><br/>
<p><strong>FINDINGS — structured checklist / copy-ready wording</strong></p>
<ul>
<li>☐ Brain parenchyma: [No acute focal abnormality / describe hypoattenuation, contusion, mass or edema].</li>
<li>☐ Hemorrhage: [No acute intracranial hemorrhage / describe compartment, location and extent].</li>
<li>☐ Mass effect: [No midline shift or herniation / describe shift, cisternal effacement or herniation].</li>
<li>☐ Ventricles and CSF spaces: [Normal caliber / describe hydrocephalus, volume loss or extra-axial collection].</li>
<li>☐ Gray-white differentiation: [Preserved / describe loss or early ischemic change where visible].</li>
<li>☐ Calvarium and skull base: [No acute fracture / describe fracture and extension].</li>
<li>☐ Paranasal sinuses, mastoids and orbits: [No significant finding / describe relevant abnormality].</li>
<li>☐ Scalp and extracranial soft tissues: [No significant swelling / describe hematoma or laceration].</li>
</ul>`,
    impression: `<ol>
<li>[No acute intracranial abnormality identified / specific hemorrhage, infarct-related change, mass effect or fracture].</li>
<li>[Important associated injury or limitation].</li>
</ol><br/>
<p><em>Illustrative abnormal wording (adapt to actual images)</em><br/>
Example: Acute subdural hematoma over the [right/left] cerebral convexity measuring up to [x] mm in thickness, with [degree] midline shift. Urgent communication made to [recipient] at [time] via [method], per local policy.</p><br/>
<p><strong>Region-specific cautions</strong></p>
<ul>
<li>A normal non-contrast CT does not exclude early ischemia or all causes of neurological symptoms.</li>
<li>For trauma, inspect bone windows and the skull base; add cervical spine imaging when indicated by the clinical pathway.</li>
<li>Do not use a negative CT report to imply no stroke when MRI/vascular imaging may be clinically indicated.</li>
</ul>`
  },
  {
    id: 2,
    name: "2. CT Head — trauma-focused",
    findings: `<p><strong>TECHNIQUE</strong><br/>Non-contrast CT head and facial bones optimized for trauma evaluation.</p><br/>
<p><strong>FINDINGS</strong></p>
<ul>
<li>☐ Fractures: [None / skull vault, skull base, facial bones].</li>
<li>☐ Extra-axial collection: [None / epidural, subdural, subarachnoid hemorrhage].</li>
<li>☐ Brain parenchyma: [No contusion or shearing injury / describe].</li>
<li>☐ Mass effect/Herniation: [None / describe].</li>
</ul>`,
    impression: `<ol><li>[No acute traumatic intracranial abnormality / describe findings].</li></ol>`
  },
  {
    id: 3,
    name: "3. CT Head / Neck Angiography",
    findings: `<p><strong>TECHNIQUE</strong><br/>CT Angiography of the head and neck from the aortic arch to the vertex following administration of IV contrast.</p><br/>
<p><strong>FINDINGS</strong></p>
<ul>
<li>☐ Aortic Arch and Great Vessels: [Patent, no significant stenosis].</li>
<li>☐ Carotid Arteries: [Patent bilaterally, no significant stenosis or dissection].</li>
<li>☐ Vertebral Arteries: [Patent bilaterally].</li>
<li>☐ Intracranial Arteries: [No aneurysm, occlusion, or significant stenosis].</li>
<li>☐ Venous Sinuses: [Patent, no thrombosis].</li>
</ul>`,
    impression: `<ol><li>[Normal CT Angiography of the head and neck / describe occlusions or aneurysms].</li></ol>`
  },
  {
    id: 4,
    name: "4. CT Chest — non-contrast",
    findings: `<p><strong>TECHNIQUE</strong><br/>Non-contrast CT of the chest.</p><br/>
<p><strong>FINDINGS</strong></p>
<ul>
<li>☐ Lungs: [Clear. No nodules, masses, or consolidations].</li>
<li>☐ Pleura: [No pleural effusion or pneumothorax].</li>
<li>☐ Heart and Mediastinum: [Heart size normal. No mediastinal or hilar lymphadenopathy].</li>
<li>☐ Bones: [No acute osseous abnormality].</li>
</ul>`,
    impression: `<ol><li>[No acute cardiopulmonary abnormality].</li></ol>`
  },
  {
    id: 5,
    name: "5. CT Chest — Pulmonary Embolism (PE) Protocol",
    findings: `<p><strong>TECHNIQUE</strong><br/>CT chest with IV contrast optimized for pulmonary vasculature.</p><br/>
<p><strong>FINDINGS</strong></p>
<ul>
<li>☐ Pulmonary Arteries: [No filling defect to suggest pulmonary embolism].</li>
<li>☐ Right Heart Strain: [None / RV dilation or septal bowing].</li>
<li>☐ Lungs and Pleura: [Clear].</li>
</ul>`,
    impression: `<ol><li>[Negative for pulmonary embolism].</li></ol>`
  },
  {
    id: 6,
    name: "6. CT Abdomen and Pelvis — non-contrast",
    findings: `<p><strong>TECHNIQUE</strong><br/>Non-contrast CT of the abdomen and pelvis (Stone protocol).</p><br/>
<p><strong>FINDINGS</strong></p>
<ul>
<li>☐ Kidneys and Ureters: [No radiopaque calculus or hydronephrosis].</li>
<li>☐ Bladder: [Normal].</li>
<li>☐ Appendix/Bowel: [No evidence of acute appendicitis or diverticulitis].</li>
</ul>`,
    impression: `<ol><li>[No obstructing calculus or acute abnormality].</li></ol>`
  },
  {
    id: 7,
    name: "7. CT Abdomen and Pelvis — with contrast",
    findings: `<p><strong>TECHNIQUE</strong><br/>CT of the abdomen and pelvis with IV and oral contrast.</p><br/>
<p><strong>FINDINGS</strong></p>
<ul>
<li>☐ Solid Organs: [Liver, spleen, pancreas, kidneys, and adrenal glands are unremarkable].</li>
<li>☐ Bowel: [Normal caliber, no wall thickening or obstruction].</li>
<li>☐ Lymph nodes: [No pathological lymphadenopathy].</li>
</ul>`,
    impression: `<ol><li>[No acute intra-abdominal or pelvic pathology].</li></ol>`
  },
  {
    id: 8,
    name: "8. CT Cervical Spine",
    findings: `<p><strong>TECHNIQUE</strong><br/>Non-contrast CT of the cervical spine with sagittal and coronal reformats.</p><br/>
<p><strong>FINDINGS</strong></p>
<ul>
<li>☐ Alignment: [Normal].</li>
<li>☐ Bones: [No acute fracture or dislocation. Normal vertebral body heights].</li>
<li>☐ Prevertebral Soft Tissues: [Within normal limits].</li>
</ul>`,
    impression: `<ol><li>[No acute cervical spine fracture or malalignment].</li></ol>`
  },
  {
    id: 9,
    name: "9. CT Lumbar Spine",
    findings: `<p><strong>TECHNIQUE</strong><br/>Non-contrast CT of the lumbar spine.</p><br/>
<p><strong>FINDINGS</strong></p>
<ul>
<li>☐ Alignment: [Normal].</li>
<li>☐ Bones: [No acute fracture. Mild degenerative changes].</li>
<li>☐ Disc spaces: [Preserved / describe severe narrowing].</li>
</ul>`,
    impression: `<ol><li>[No acute lumbar spine fracture].</li></ol>`
  },
  {
    id: 10,
    name: "10. CT Facial Bones / Sinuses",
    findings: `<p><strong>TECHNIQUE</strong><br/>Non-contrast CT of the facial bones and paranasal sinuses.</p><br/>
<p><strong>FINDINGS</strong></p>
<ul>
<li>☐ Sinuses: [Clear. No mucosal thickening or air-fluid levels].</li>
<li>☐ Facial Bones: [No acute fracture].</li>
<li>☐ Orbits: [Unremarkable].</li>
</ul>`,
    impression: `<ol><li>[Clear paranasal sinuses. No facial bone fracture].</li></ol>`
  },
  {
    id: 11,
    name: "11. CT Temporal Bones",
    findings: `<p><strong>TECHNIQUE</strong><br/>High-resolution non-contrast CT of the temporal bones.</p><br/>
<p><strong>FINDINGS</strong></p>
<ul>
<li>☐ Middle Ear: [Clear bilaterally. Ossicular chain intact].</li>
<li>☐ Mastoids: [Well aerated, no effusion].</li>
<li>☐ Inner Ear: [Normal cochlea, vestibule, and semicircular canals].</li>
</ul>`,
    impression: `<ol><li>[Normal CT of the temporal bones].</li></ol>`
  },
  {
    id: 12,
    name: "12. CT Urogram",
    findings: `<p><strong>TECHNIQUE</strong><br/>CT Abdomen and Pelvis without and with IV contrast, including delayed excretory phase.</p><br/>
<p><strong>FINDINGS</strong></p>
<ul>
<li>☐ Kidneys: [Normal enhancement. No mass or calculus].</li>
<li>☐ Ureters: [Normal opacification on delayed images, no stricture or filling defect].</li>
<li>☐ Bladder: [Normal filling].</li>
</ul>`,
    impression: `<ol><li>[Normal CT Urogram. No urolithiasis or urothelial lesions].</li></ol>`
  }
];

