import React from 'react';
import './FeeReport.css';
import { FaDownload } from 'react-icons/fa';
import jsPDF from 'jspdf';

import logoImage from '../assets/logo.png';

const FeeReport = React.forwardRef(({ report }, ref) => {
  if (!report) return null;

  const downloadPDF = () => {
    try {
      const pdf = new jsPDF('l', 'mm', 'a4');
      const pageWidth = 297;
      const pageHeight = 210;
      const margin = 15;
      const rowHeight = 7;
      const headerRowHeight = 8;
      let yPos = 0;
      let currentPage = 1;

      // Helper to add header on each page
      const addHeader = (pdf) => {
        yPos = margin;
        
        // Draw header background
        pdf.setFillColor(245, 247, 250);
        pdf.rect(0, 0, pageWidth, 35, 'F');
        
        // Add title and info
        pdf.setFontSize(18);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(25, 118, 210);
        pdf.text('VOTECH (S7) ACADEMY', margin, yPos + 6);
        
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(51, 51, 51);
        pdf.text('CLASS FEE STATISTICS', margin, yPos + 12);
        
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Class: ${report.className}`, margin, yPos + 18);
        
        // Right side meta info
        pdf.setFontSize(9);
        pdf.setTextColor(102, 102, 102);
        const rightX = pageWidth - margin;
        pdf.text(`Date: ${report.generatedAt}`, rightX, yPos + 6, { align: 'right' });
        pdf.text(`Total Students: ${report.totalStudents}`, rightX, yPos + 11, { align: 'right' });
        pdf.text(`Total Expected: XAF ${report.totalExpected.toLocaleString()}`, rightX, yPos + 16, { align: 'right' });
        pdf.text(`Total Paid: XAF ${report.totalPaid.toLocaleString()}`, rightX, yPos + 21, { align: 'right' });
        
        // Draw separator line
        pdf.setDrawColor(200, 200, 200);
        pdf.setLineWidth(0.5);
        pdf.line(margin, yPos + 28, pageWidth - margin, yPos + 28);
        
        yPos = margin + 35;
      };

      // Column widths (7 columns: S/N, ID, Name, Expected, Paid, Owed, %)
      const colWidths = [15, 28, 65, 42, 42, 42, 22];
      const tableStartX = margin;
      const tableWidth = pageWidth - (margin * 2);
      const totalColWidth = colWidths.reduce((sum, w) => sum + w, 0);
      
      // Adjust if needed to fit page
      if (totalColWidth > tableWidth) {
        const scale = tableWidth / totalColWidth;
        colWidths.forEach((w, i) => colWidths[i] = w * scale);
      }

      // Calculate column X positions
      const colPositions = [];
      let xPos = tableStartX;
      colWidths.forEach((width) => {
        colPositions.push(xPos);
        xPos += width;
      });

      // Helper to check if we need a new page
      const checkPageBreak = (pdf, requiredHeight) => {
        if (yPos + requiredHeight > pageHeight - margin) {
          currentPage++;
          pdf.addPage();
          addHeader(pdf);
          return true;
        }
        return false;
      };

      // Helper to draw a table row
      const drawRow = (pdf, rowData, isHeader = false, fillColor = null) => {
        const rowH = isHeader ? headerRowHeight : rowHeight;
        
        // Check if we need a new page
        checkPageBreak(pdf, rowH);
        
        // Draw row background if needed
        if (fillColor) {
          pdf.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
          pdf.rect(tableStartX, yPos, tableWidth, rowH, 'F');
        } else if (isHeader) {
          // Header background
          pdf.setFillColor(25, 118, 210);
          pdf.rect(tableStartX, yPos, tableWidth, rowH, 'F');
        }

        // Draw borders
        pdf.setDrawColor(180, 180, 180);
        pdf.setLineWidth(0.2);
        
        // Draw cell borders
        for (let i = 0; i <= colWidths.length; i++) {
          const x = i === 0 ? tableStartX : colPositions[i - 1] + colWidths[i - 1];
          pdf.line(x, yPos, x, yPos + rowH);
        }
        // Top and bottom borders
        pdf.line(tableStartX, yPos, tableStartX + tableWidth, yPos);
        pdf.line(tableStartX, yPos + rowH, tableStartX + tableWidth, yPos + rowH);

        // Draw text
        pdf.setFontSize(isHeader ? 9 : 8);
        pdf.setFont('helvetica', isHeader ? 'bold' : 'normal');
        pdf.setTextColor(isHeader ? 255 : 0, isHeader ? 255 : 0, isHeader ? 255 : 0);

        rowData.forEach((text, colIndex) => {
          const x = colPositions[colIndex] + 3;
          const maxWidth = colWidths[colIndex] - 6;
          const textStr = String(text);
          
          // Center align for S/N and percentage columns
          const align = (colIndex === 0 || colIndex === 6) ? 'center' : 'left';
          
          // Truncate long text if needed
          let displayText = textStr;
          pdf.setFontSize(isHeader ? 9 : 8);
          const textWidth = pdf.getTextWidth(textStr);
          if (textWidth > maxWidth) {
            // Calculate how many characters fit
            const charWidth = textWidth / textStr.length;
            const maxChars = Math.floor((maxWidth / charWidth) * 0.9);
            displayText = textStr.substring(0, maxChars) + '...';
          }
          
          const textY = yPos + (rowH / 2) + 2.5;
          if (align === 'center') {
            const textW = pdf.getTextWidth(displayText);
            pdf.text(displayText, colPositions[colIndex] + (colWidths[colIndex] / 2), textY, { align: 'center' });
          } else {
            pdf.text(displayText, x, textY, { maxWidth });
          }
        });

        yPos += rowH;
      };

      // Add first page header
      addHeader(pdf);

      // Draw table header
      drawRow(pdf, ['S/N', 'Student ID', 'Student Name', 'Expected Fees (XAF)', 'Paid Fees (XAF)', 'Owed Fees (XAF)', '% Paid'], true);

      // Draw table rows
      report.students.forEach((student, index) => {
        const rowData = [
          index + 1,
          student.student_id || 'N/A',
          student.full_name || 'Unknown',
          student.expectedFees.toLocaleString(),
          student.paidFees.toLocaleString(),
          student.owedFees.toLocaleString(),
          student.expectedFees > 0 ? `${Math.round((student.paidFees / student.expectedFees) * 100)}%` : '0%'
        ];
        
        // Alternate row colors for better readability
        const fillColor = index % 2 === 0 ? null : [250, 250, 250];
        drawRow(pdf, rowData, false, fillColor);
      });

      // Add footer with page numbers if multiple pages
      if (currentPage > 1) {
        for (let p = 1; p <= currentPage; p++) {
          pdf.setPage(p);
          pdf.setFontSize(8);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(150, 150, 150);
          pdf.text(`Page ${p} of ${currentPage}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
        }
      }

      const fileName = `fee_report_${report.className.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert(`Error generating PDF: ${error.message}. Please try again.`);
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
              <th>S/N</th>
              <th>Student ID</th>
              <th>Student Name</th>
              <th>Expected Fees (XAF)</th>
              <th>Paid Fees (XAF)</th>
              <th>Owed Fees (XAF)</th>
              <th>% Paid</th>
            </tr>
          </thead>
          <tbody>
            {report.students.map((student, index) => (
              <tr key={student.id} className="report-table-row">
                <td>{index + 1}</td>
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