import React from 'react';
import './InventoryReport.css';
import { FaDownload } from 'react-icons/fa';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const InventoryReport = React.forwardRef(({ report }, ref) => {
  if (!report) return null;

  const downloadPDF = async () => {
    if (!ref.current) return;
    
    try {
      const canvas = await html2canvas(ref.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const fileName = `inventory_report_${report.type}_${report.periodValue}_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  return (
    <div className="inventory-report-container" ref={ref}>
      <div className="report-header">
        <div className="report-title-group">
          <h1>VOTECH (S7)</h1>
          <h2>INVENTORY REPORT</h2>
          <h3>{report.type.toUpperCase()} - {report.periodValue}</h3>
        </div>
        <div className="report-meta">
          <p><strong>Generated:</strong> {report.generatedAt}</p>
          <p><strong>Report Type:</strong> {report.type}</p>
          <p><strong>Period:</strong> {report.periodValue}</p>
        </div>
      </div>

      {(report.type === 'full' || report.type === 'income') && (
        <div className="report-section">
          <h4>INCOME SUMMARY</h4>
          <div className="summary-stats">
            <div className="stat-item">
              <span className="stat-label">Total Income</span>
              <span className="stat-value">XAF {report.totalIncome.toLocaleString()}</span>
            </div>
            {report.type === 'full' && (
              <>
                <div className="stat-item">
                  <span className="stat-label">Total Expenditure</span>
                  <span className="stat-value">XAF {report.totalExpenditure.toLocaleString()}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Net Balance</span>
                  <span className={`stat-value ${report.netBalance >= 0 ? 'positive' : 'negative'}`}>
                    XAF {report.netBalance.toLocaleString()}
                  </span>
                </div>
              </>
            )}
          </div>

          <h5>INCOME ITEMS WITH DEPRECIATION</h5>
          <table className="report-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Item Name</th>
                <th>Department</th>
                <th>Quantity</th>
                <th>Cost (XAF)</th>
                <th>Depreciation Rate</th>
                <th>Monthly Depreciation</th>
                <th>Annual Depreciation</th>
              </tr>
            </thead>
            <tbody>
              {report.incomeItems.map(item => (
                <tr key={item.id}>
                  <td>{item.date}</td>
                  <td>{item.item_name}</td>
                  <td>{item.department}</td>
                  <td>{item.quantity}</td>
                  <td>{Number(item.estimated_cost).toLocaleString()}</td>
                  <td>{item.depreciation_rate || 0}%</td>
                  <td>{item.monthlyDepreciation.toFixed(2)}</td>
                  <td>{item.annualDepreciation.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(report.type === 'full' || report.type === 'expenditure') && (
        <div className="report-section">
          <h4>EXPENDITURE SUMMARY</h4>
          <div className="summary-stats">
            <div className="stat-item">
              <span className="stat-label">Total Expenditure</span>
              <span className="stat-value">XAF {report.totalExpenditure.toLocaleString()}</span>
            </div>
          </div>

          <h5>EXPENDITURE ITEMS</h5>
          <table className="report-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Item Name</th>
                <th>Department</th>
                <th>Quantity</th>
                <th>Cost (XAF)</th>
              </tr>
            </thead>
            <tbody>
              {report.expenditureItems.map(item => (
                <tr key={item.id}>
                  <td>{item.date}</td>
                  <td>{item.item_name}</td>
                  <td>{item.department}</td>
                  <td>{item.quantity}</td>
                  <td>{Number(item.estimated_cost).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="report-footer">
        <p>This report was generated automatically by the VOTECH Inventory Management System.</p>
        <div className="signature-area">
          <div className="signature-line"></div>
          <p>Authorized Signature</p>
        </div>
      </div>

      <button className="download-pdf-btn" onClick={downloadPDF}>
        <FaDownload /> Download PDF
      </button>
    </div>
  );
});

export default InventoryReport; 