import React from 'react';

export default function ReportViewer({ reportData }) {
  if (!reportData || !reportData.report) return null;

  const { patientId, patientName, patientAge, patientGender, id, doctor, report } = reportData;
  const createdAt = new Date(report.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });

  return (
    <div id="report-viewer-content" className="bg-white text-black p-8 font-sans max-w-4xl mx-auto border shadow-sm">
      {/* Top Patient Details Table */}
      <div className="border border-gray-400 rounded-lg overflow-hidden mb-8">
        <table className="w-full text-sm text-left">
          <tbody>
            <tr className="border-b border-gray-400">
              <td className="px-4 py-2 border-r border-gray-400 italic text-gray-700 w-1/4">Patient Name</td>
              <td className="px-4 py-2 border-r border-gray-400 font-bold uppercase w-1/4">{patientName} {patientAge}/{patientGender?.charAt(0)}</td>
              <td className="px-4 py-2 border-r border-gray-400 italic text-gray-700 w-1/4">Patient ID</td>
              <td className="px-4 py-2 font-bold w-1/4">{patientId || id || 'N/A'}</td>
            </tr>
            <tr className="border-b border-gray-400">
              <td className="px-4 py-2 border-r border-gray-400 italic text-gray-700">Age/D.O.B</td>
              <td className="px-4 py-2 border-r border-gray-400 font-bold uppercase">{patientAge}</td>
              <td className="px-4 py-2 border-r border-gray-400 italic text-gray-700">Gender</td>
              <td className="px-4 py-2 font-bold uppercase">{patientGender?.charAt(0)}</td>
            </tr>
            <tr>
              <td className="px-4 py-2 border-r border-gray-400 italic text-gray-700">Referring Doctor</td>
              <td className="px-4 py-2 border-r border-gray-400 font-bold uppercase">NA</td>
              <td className="px-4 py-2 border-r border-gray-400 italic text-gray-700">Date</td>
              <td className="px-4 py-2 font-bold uppercase">{createdAt}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 className="text-center font-bold text-2xl uppercase mb-10 tracking-wider">RADIOLOGY REPORT</h2>

      <div className="space-y-8 min-h-[300px]">
        {/* Observations -> maps to clinicalFindings */}
        {report.clinicalFindings && (
          <div>
            <h3 className="font-bold text-lg border-b border-gray-300 pb-1 mb-3">Observations</h3>
            <div className="prose max-w-none text-sm text-gray-800" dangerouslySetInnerHTML={{ __html: report.clinicalFindings }} />
          </div>
        )}

        {/* Impression */}
        {report.impression && (
          <div>
            <h3 className="font-bold text-lg border-b border-gray-300 pb-1 mb-3">Impression</h3>
            <div className="prose max-w-none text-sm text-gray-800" dangerouslySetInnerHTML={{ __html: report.impression }} />
          </div>
        )}

        {/* Recommendations */}
        {report.recommendations && (
          <div>
            <h3 className="font-bold text-lg border-b border-gray-300 pb-1 mb-3">Recommendations</h3>
            <div className="prose max-w-none text-sm text-gray-800" dangerouslySetInnerHTML={{ __html: report.recommendations }} />
          </div>
        )}
      </div>

      {/* Footer Details */}
      <div className="mt-16 pt-4">
        <p className="font-bold italic text-sm mb-8">Please correlate clinically.</p>
        
        <div className="flex justify-between items-end mb-8">
          <div className="text-center">
            <div className="text-sm mb-2 text-gray-700">Scan to know your report</div>
            {/* Dummy QR Code Image */}
            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=Patient_${id}_Report`} alt="QR Code" className="w-24 h-24 mx-auto mb-1 opacity-90"/>
            <div className="text-xs text-gray-500">Bionic Report eXplainer</div>
          </div>
          
          <div className="text-right flex flex-col items-end">
            <div className="text-sm mb-1 text-gray-700">Reported By,</div>
            {/* Dummy Signature Image */}
            <img src="https://upload.wikimedia.org/wikipedia/commons/f/fa/Signature_of_John_Hancock.svg" alt="Signature" className="h-14 object-contain opacity-70 mb-2"/>
            <div className="font-bold text-lg text-gray-900">{doctor?.doctorProfile?.name || doctor?.email || 'Dr. Signature'}</div>
            <div className="text-sm text-gray-700">MBBS, MD</div>
            <div className="text-sm text-gray-700">Consultant Radiologist</div>
            <div className="text-sm text-gray-700">MCI - 16033</div>
          </div>
        </div>

        <div className="text-[10px] text-gray-500 text-justify mb-4 leading-tight">
          Disclaimer: This medical diagnostic report is generated based on the image and patient information obtained from the source of origin. 5C Network assumes no responsibility for errors or omission of or in the image, or in the contents of the report, which are a direct interpretation of the image sent from source. In no event shall 5C Network be liable for any special, direct, indirect, consequential, or incidental damages or any damages whatsoever, whether in an action of negligence or other tort, arising out of or in connection with the use of the 5C Network Service or the contents of the Service. This report does not replace professional medical advice, additional diagnoses, or treatment.
        </div>
        
        <div className="flex justify-between items-center border-t border-gray-300 pt-3">
          <div>
            <p className="font-bold text-sm text-gray-900">Kindly call Help Desk (+91-95872 74858) for any report related query.</p>
            <p className="text-[10px] text-gray-500 mt-0.5">Powered by 5C Network. All Rights Reserved.</p>
          </div>
          <div className="flex items-center space-x-1">
            <div className="text-red-600 font-black text-2xl">5C</div>
            <div className="text-blue-600 font-bold text-[10px] leading-none flex flex-col tracking-tight">
              <span>BORDERLESS</span>
              <span>RADIOLOGY</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
