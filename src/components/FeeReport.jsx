import React from 'react';
import './FeeReport.css';
import { FaDownload } from 'react-icons/fa';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

import logoImage from '../assets/logo.png';

const FeeReport = React.forwardRef(({ report }, ref) => {
  if (!report) return null;

  const downloadPDF = async () => {
    if (!ref.current) return;
    
    try {
      // Build a temporary paginated container so rows are not cut across pages
      const temp = document.createElement('div');
      temp.style.position = 'absolute';
      temp.style.left = '-99999px';
      temp.style.top = '0';
      document.body.appendChild(temp);

      const rows = report.students;
      const rowsPerPage = 20; // adjust if needed
      const pages = Math.max(1, Math.ceil(rows.length / rowsPerPage));

      const makePage = (sliceRows, pageIndex) => {
        const page = document.createElement('div');
        page.className = 'fee-report-container';
        page.style.width = '297mm';
        page.style.minHeight = '210mm';
        page.style.boxSizing = 'border-box';

        // Header
        const header = document.createElement('div');
        header.className = 'report-header';
        header.innerHTML = `
          <div class="report-title-group" style="display:flex;align-items:center;gap:12px">
            <img src="${logoImage}" alt="logo" style="width:32mm;height:32mm;object-fit:contain" />
            <div>
              <h1>VOTECH (S7) ACADEMY</h1>
              <h2>CLASS FEE STATISTICS</h2>
              <h3>Class: ${report.className}</h3>
            </div>
          </div>
          <div class="report-meta">
            <p><strong>Date:</strong> ${report.generatedAt}</p>
            <p><strong>Total Students:</strong> ${report.totalStudents}</p>
            <p><strong>Total Expected:</strong> XAF ${report.totalExpected.toLocaleString()}</p>
            <p><strong>Total Paid:</strong> XAF ${report.totalPaid.toLocaleString()}</p>
          </div>`;
        page.appendChild(header);

        // Table
        const section = document.createElement('div');
        section.className = 'report-section';
        const table = document.createElement('table');
        table.className = 'report-table';
        const thead = document.createElement('thead');
        thead.innerHTML = `
          <tr>
            <th>Student ID</th>
            <th>Student Name</th>
            <th>Expected Fees (XAF)</th>
            <th>Paid Fees (XAF)</th>
            <th>Owed Fees (XAF)</th>
            <th>% Paid</th>
          </tr>`;
        table.appendChild(thead);
        const tbody = document.createElement('tbody');
        sliceRows.forEach(stu => {
          const tr = document.createElement('tr');
          tr.style.breakInside = 'avoid';
          tr.style.pageBreakInside = 'avoid';
          const pct = stu.expectedFees > 0 ? Math.round((stu.paidFees / stu.expectedFees) * 100) : 0;
          tr.innerHTML = `
            <td>${stu.student_id}</td>
            <td>${stu.full_name}</td>
            <td>${stu.expectedFees.toLocaleString()}</td>
            <td>${stu.paidFees.toLocaleString()}</td>
            <td>${stu.owedFees.toLocaleString()}</td>
            <td>${pct}%</td>`;
          tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        section.appendChild(table);
        page.appendChild(section);

        temp.appendChild(page);
        return page;
      };

      const pdf = new jsPDF('l', 'mm', 'a4');
      for (let p = 0; p < pages; p += 1) {
        const start = p * rowsPerPage;
        const end = Math.min(rows.length, start + rowsPerPage);
        const pageEl = makePage(rows.slice(start, end), p);
        // Render this page only
        const canvas = await html2canvas(pageEl, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff'
        });
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = 297;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        if (p > 0) pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      }

      // Clean up
      document.body.removeChild(temp);

      const fileName = `fee_report_${report.className}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  return (
    <div className="fee-report-container" ref={ref}>
      <div className="report-header">
        <div className="report-title-group" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src={logoImage} alt="logo" style={{ width: '32mm', height: '32mm', objectFit: 'contain' }} />
          <div>
            <h1>VOTECH (S7) ACADEMY</h1>
            <h2>CLASS FEE STATISTICS</h2>
            <h3>Class: {report.className}</h3>
          </div>
        </div>
        <div className="report-meta">
          <p><strong>Date:</strong> {report.generatedAt}</p>
          <p><strong>Total Students:</strong> {report.totalStudents}</p>
          <p><strong>Total Expected:</strong> XAF {report.totalExpected.toLocaleString()}</p>
          <p><strong>Total Paid:</strong> XAF {report.totalPaid.toLocaleString()}</p>
        </div>
      </div>

      <div className="report-section">
        <h5>STUDENT FEE DETAILS</h5>
        <table className="report-table">
          <thead>
            <tr>
              <th>Student ID</th>
              <th>Student Name</th>
              <th>Expected Fees (XAF)</th>
              <th>Paid Fees (XAF)</th>
              <th>Owed Fees (XAF)</th>
              <th>% Paid</th>
            </tr>
          </thead>
          <tbody>
            {report.students.map(student => (
              <tr key={student.id}>
                <td>{student.student_id}</td>
                <td>{student.full_name}</td>
                <td>{student.expectedFees.toLocaleString()}</td>
                <td>{student.paidFees.toLocaleString()}</td>
                <td>{student.owedFees.toLocaleString()}</td>
                <td>{student.expectedFees > 0 ? Math.round((student.paidFees / student.expectedFees) * 100) : 0}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Minimal footer or none as requested */}

      <button className="download-pdf-btn" onClick={downloadPDF}>
        <FaDownload /> Download PDF
      </button>
    </div>
  );
});

export default FeeReport; 