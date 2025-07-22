import React, { useEffect, useState } from 'react';
import SideTop from './SideTop';
import './Fee.css';
import './FeeReceipt.css';
import api from '../services/api';
import { useLocation, useNavigate } from 'react-router-dom';

export default function Fee() {
  const location = useLocation();
  const navigate = useNavigate();

  const [totalPaid, setTotalPaid] = useState(0);
  const [totalOwed, setTotalOwed] = useState(0);
  const [loadingTotals, setLoadingTotals] = useState(true);

  const [searchQuery, setSearchQuery] = React.useState('');
  const [searchResults, setSearchResults] = React.useState([]);
  const [searchLoading, setSearchLoading] = React.useState(false);
  const [searchError, setSearchError] = React.useState('');
  const searchTimeout = React.useRef();
  const [selectedStudent, setSelectedStudent] = React.useState(null);
  const [studentFeeStats, setStudentFeeStats] = React.useState(null);
  const [feeStatsLoading, setFeeStatsLoading] = React.useState(false);
  const [feeStatsError, setFeeStatsError] = React.useState('');
  const [paymentModalOpen, setPaymentModalOpen] = React.useState(false);
  const [receiptModalOpen, setReceiptModalOpen] = React.useState(false);
  const [feeStatsModalOpen, setFeeStatsModalOpen] = useState(false);
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedClassName, setSelectedClassName] = useState('');
  const [classStatsLoading, setClassStatsLoading] = useState(false);
  const [classStatsError, setClassStatsError] = useState('');
  const [classStats, setClassStats] = useState(null);
  const [proceedClicked, setProceedClicked] = useState(false);
  const printAreaRef = React.useRef();
  const [debugOpen, setDebugOpen] = useState(false);
  const [debugInfo, setDebugInfo] = useState({ className: '', classId: '', backendResponse: null });

  // Fetch and aggregate total paid/owed
  useEffect(() => {
    async function fetchTotals() {
      setLoadingTotals(true);
      try {
        const students = await api.getStudents();
        const classes = await api.getClasses();
        // Build a map of classId -> class total_fee
        const classMap = {};
        classes.forEach(cls => {
          classMap[cls.id] = parseFloat(cls.total_fee) || 0;
        });
        let paidSum = 0;
        let overallFee = 0;
        // Fetch all student fee stats in parallel
        const feeStatsArr = await Promise.all(students.map(async student => {
          try {
            const stats = await api.getStudentFeeStats(student.id);
            return { student, stats };
          } catch (e) {
            return { student, stats: null };
          }
        }));
        for (const { student, stats } of feeStatsArr) {
          const classTotalFee = classMap[student.class_id] || 0;
          overallFee += classTotalFee;
          let paid = 0;
          if (stats && stats.balance) {
            // Paid = class total fee - sum of balances
            const sumBalance = Object.values(stats.balance).reduce((a, b) => a + (b || 0), 0);
            paid = classTotalFee - sumBalance;
          }
          paidSum += paid;
        }
        setTotalPaid(paidSum);
        setTotalOwed(overallFee - paidSum);
      } catch (e) {
        setTotalPaid(0);
        setTotalOwed(0);
      }
      setLoadingTotals(false);
    }
    fetchTotals();
  }, []);

  // Fetch classes on mount for modal
  useEffect(() => {
    if (feeStatsModalOpen && classes.length === 0) {
      api.getClasses().then(setClasses).catch(() => setClasses([]));
    }
  }, [feeStatsModalOpen, classes.length]);

  // Fetch class stats when proceed is clicked
  useEffect(() => {
    if (proceedClicked && selectedClassName) {
      setClassStatsLoading(true);
      setClassStatsError('');
      // Find class_id by class name
      const foundClass = classes.find(c => c.name === selectedClassName);
      setDebugInfo(d => ({ ...d, className: selectedClassName, classId: foundClass ? foundClass.id : '' }));
      if (!foundClass) {
        setClassStatsError('Class not found.');
        setClassStatsLoading(false);
        setDebugInfo(d => ({ ...d, backendResponse: null }));
        return;
      }
      api.getClassFeeStats(foundClass.id)
        .then(data => {
          setClassStats(data);
          setClassStatsLoading(false);
          setDebugInfo(d => ({ ...d, backendResponse: data }));
        })
        .catch((err) => {
          setClassStatsError('Failed to fetch class fee statistics.');
          setClassStatsLoading(false);
          setDebugInfo(d => ({ ...d, backendResponse: err && err.message ? err.message : String(err) }));
        });
    }
  }, [proceedClicked, selectedClassName, classes]);

  // Print handler for statistics
  const handlePrintStats = () => {
    if (!printAreaRef.current) return;
    const printContents = printAreaRef.current.innerHTML;
    const win = window.open('', '', 'width=1200,height=900');
    win.document.write(`
      <html><head><title>Fee Statistics</title>
      <link rel="stylesheet" href="/FeeReceipt.css" />
      <style>
        @media print {@page { size: A4 landscape; margin: 10mm; } body { background: white !important; } .stats-print-area { width: 100vw !important; min-width: 0 !important; } }
        .stats-print-area { width: 100vw; min-width: 0; background: white; }
      </style>
      </head><body>` + printContents + '</body></html>');
    win.document.close();
    setTimeout(() => { win.print(); win.close(); }, 300);
  };

  // Debounced search
  React.useEffect(() => {
    if (!searchQuery) {
      setSearchResults([]);
      setSearchError('');
      return;
    }
    setSearchLoading(true);
    setSearchError('');
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
      try {
        // Use the API to search students by name or ID
        const res = await api.searchStudents(searchQuery);
        setSearchResults(res);
      } catch (err) {
        setSearchResults([]);
        setSearchError('No students found.');
      }
      setSearchLoading(false);
    }, 400);
    return () => clearTimeout(searchTimeout.current);
  }, [searchQuery]);

  // Fetch fee stats
  const handleStudentClick = (student) => {
    navigate(`/admin-fee/${student.id}`);
  };

  // Open payment modal
  const handlePayClick = () => {
    setPaymentModalOpen(true);
  };

  // Close payment modal and open receipt modal
  const handlePaymentSubmit = () => {
    setPaymentModalOpen(false);
    setReceiptModalOpen(true);
  };

  return (
    <SideTop>
      <div className="fee-main-content">
        <div className="fee-header">
          <h2>Fee Payment</h2>
        </div>
        <div className="fee-cards-row">
          <div className="fee-card paid">
            <div className="fee-card-title">Total Fees Paid</div>
            <div className="fee-card-value">{loadingTotals ? '...' : totalPaid.toLocaleString()} XAF</div>
          </div>
          <div className="fee-card owed">
            <div className="fee-card-title">Total Fees Owed</div>
            <div className="fee-card-value">{loadingTotals ? '...' : totalOwed.toLocaleString()} XAF</div>
          </div>
        </div>
        {/* Responsive search bar and Fee Statistics button */}
        <div style={{ margin: '32px 0 18px 0', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 18 }}>
          <input
            className="student-search-bar"
            type="text"
            placeholder="Search student by name or ID..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ width: '100%', maxWidth: 400, fontSize: 17, borderRadius: 8, border: '1.5px solid #1976d2', padding: '12px 16px' }}
          />
          <span
            className="fee-stats-btn-text"
            style={{ color: '#1976d2', fontWeight: 600, fontSize: 17, cursor: 'pointer', userSelect: 'none', borderBottom: '1.5px dashed #1976d2' }}
            onClick={() => { setFeeStatsModalOpen(true); setProceedClicked(false); setSelectedClassId(''); setClassStats(null); }}
          >
            Fee Statistics
          </span>
        </div>
        {searchLoading && <div style={{ textAlign: 'center', color: '#888', marginTop: 12 }}>Searching...</div>}
        {searchError && <div style={{ textAlign: 'center', color: '#e53e3e', marginTop: 12 }}>{searchError}</div>}
        <div className="student-search-grid">
          {searchResults.map(s => (
            <div
              key={s.id}
              className="student-search-result"
              onClick={() => handleStudentClick(s)}
            >
              {s.full_name} ({s.student_id})
            </div>
          ))}
        </div>
        {/* Fee Statistics Modal */}
        {feeStatsModalOpen && (
          <div className="fee-stats-modal-overlay" style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(32,64,128,0.13)',zIndex:2000,display:'flex',alignItems:'flex-start',justifyContent:'center',overflowY:'auto'}}>
            <div className="fee-stats-modal-content" style={{background:'#fff',borderRadius:16,boxShadow:'0 8px 40px rgba(32,64,128,0.18)',padding:'36px 28px 28px 28px',maxWidth:1200,width:'98vw',minWidth:0,position:'relative',marginTop:48,marginBottom:48}}>
              {/* Close button */}
              <button className="fee-stats-modal-close" style={{position:'absolute',top:16,right:22,background:'none',border:'none',color:'#222',fontSize:'1.5rem',fontWeight:200,lineHeight:1,cursor:'pointer',zIndex:1001,padding:'0 6px'}} onClick={()=>setFeeStatsModalOpen(false)} aria-label="Close">&#10005;</button>
              {/* Step 1: Select class */}
              {!proceedClicked && (
                <div className="fee-stats-select-step">
                  <div className="fee-stats-modal-header">
                    <img src={require('../assets/logo.png')} alt="VOTECH Logo" className="fee-stats-modal-logo" />
                    <div>
                      <h2 className="fee-stats-modal-title">Fee Statistics</h2>
                      <div className="fee-stats-modal-desc">View and print fee statistics for any class</div>
                    </div>
                  </div>
                  <label className="fee-stats-modal-label">Select Class</label>
                  <select
                    value={selectedClassName}
                    onChange={e => setSelectedClassName(e.target.value)}
                    className="fee-stats-modal-select"
                  >
                    <option value=''>-- Select Class --</option>
                    {classes.map(cls => <option key={cls.id} value={cls.name}>{cls.name}</option>)}
                  </select>
                  <button
                    className="fee-stats-proceed-btn"
                    disabled={!selectedClassName}
                    onClick={()=>setProceedClicked(true)}
                  >
                    Proceed
                  </button>
                </div>
              )}
              {/* Step 2: Show statistics table */}
              {proceedClicked && (
                <div className="fee-stats-table-step">
                  <div className="fee-stats-modal-header">
                    <img src={require('../assets/logo.png')} alt="VOTECH Logo" className="fee-stats-modal-logo" />
                    <div>
                      <h2 className="fee-stats-modal-title">Fee Statistics - {selectedClassName}</h2>
                      <div className="fee-stats-modal-desc">Academic Year: {(() => {const startYear=2025;const now=new Date();const start=new Date('2025-09-01');let diff=(now.getFullYear()-startYear)*12+(now.getMonth()-8);if(diff<0)diff=0;const period=Math.floor(diff/9);const year1=2025+period;const year2=year1+1;return `${year1}/${year2}`;})()}</div>
                    </div>
                  </div>
                  {/* Debug Panel */}
                  <div style={{margin:'8px 0 0 0',textAlign:'right'}}>
                    <button style={{background:'none',border:'none',color:'#1976d2',fontWeight:600,cursor:'pointer',fontSize:14}} onClick={()=>setDebugOpen(v=>!v)}>{debugOpen ? 'Hide' : 'Show'} Debug Info</button>
                  </div>
                  {debugOpen && (
                    <div style={{background:'#f7f8fa',border:'1.5px solid #b0c4de',borderRadius:8,padding:'12px 18px',margin:'10px 0 18px 0',fontSize:13,color:'#333',maxHeight:220,overflow:'auto'}}>
                      <div><b>Selected Class Name:</b> {debugInfo.className}</div>
                      <div><b>Resolved Class ID:</b> {debugInfo.classId}</div>
                      <div><b>Backend Response:</b></div>
                      <pre style={{whiteSpace:'pre-wrap',wordBreak:'break-all',background:'#f0f4fa',padding:'8px',borderRadius:6,marginTop:4,maxHeight:120,overflow:'auto'}}>{JSON.stringify(debugInfo.backendResponse, null, 2)}</pre>
                    </div>
                  )}
                  {classStatsLoading && <div className="fee-stats-loading">Loading...</div>}
                  {classStatsError && <div className="fee-stats-error">{classStatsError}</div>}
                  {classStats && Array.isArray(classStats) && (
                    <div className="fee-stats-table-wrapper">
                      <div ref={printAreaRef} className="stats-print-area fee-stats-print-area">
                        <table className="fee-stats-table-pro" style={{fontSize:15}}>
                          <thead>
                            <tr>
                              <th>S/N</th>
                              <th>Full Name</th>
                              <th>Student ID</th>
                              <th>Registration</th>
                              <th>Bus</th>
                              <th>Tuition</th>
                              <th>Internship</th>
                              <th>Remedial</th>
                              <th>PTA</th>
                              <th>Total Paid</th>
                              <th>Total Left</th>
                              <th>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {classStats
                              .slice()
                              .sort((a,b)=>a.name.localeCompare(b.name))
                              .map((s,idx)=>{
                                return (
                                  <tr key={s.name+idx}>
                                    <td>{idx+1}</td>
                                    <td>{s.name}</td>
                                    <td>{s.student_id || ''}</td>
                                    <td>{(s.Registration||0).toLocaleString()}</td>
                                    <td>{(s.Bus||0).toLocaleString()}</td>
                                    <td>{(s.Tuition||0).toLocaleString()}</td>
                                    <td>{(s.Internship||0).toLocaleString()}</td>
                                    <td>{(s.Remedial||0).toLocaleString()}</td>
                                    <td>{(s.PTA||0).toLocaleString()}</td>
                                    <td>{(s.Total||0).toLocaleString()}</td>
                                    <td>{(s.Balance||0).toLocaleString()}</td>
                                    <td style={{color:s.Status==='Paid'?'#2ecc71':'#e53e3e',fontWeight:700}}>{s.Status}</td>
                                  </tr>
                                );
                              })}
                          </tbody>
                        </table>
                      </div>
                      <div className="fee-stats-modal-actions">
                        <button className="print-button fee-stats-print-btn" onClick={handlePrintStats}>Print</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      {/* Modal/print styles */}
      <style>{`
        .fee-stats-modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(32,64,128,0.13); z-index: 2000; display: flex; align-items: flex-start; justify-content: center; overflow-y: auto; }
        .fee-stats-modal-content { background: #fff; border-radius: 18px; box-shadow: 0 8px 40px rgba(32,64,128,0.18); padding: 0; max-width: 1200px; width: 98vw; min-width: 0; position: relative; margin-top: 48px; margin-bottom: 48px; overflow: visible; }
        .fee-stats-modal-header { display: flex; align-items: center; gap: 22px; border-radius: 18px 18px 0 0; background: linear-gradient(90deg, #eaf6ff 0%, #f7f8fa 100%); padding: 32px 32px 18px 32px; border-bottom: 1.5px solid #e0eafc; }
        .fee-stats-modal-logo { width: 64px; height: 64px; border-radius: 12px; background: #fff; box-shadow: 0 2px 8px rgba(32,64,128,0.07); }
        .fee-stats-modal-title { font-size: 2rem; font-weight: 700; color: #204080; margin: 0; }
        .fee-stats-modal-desc { font-size: 1.1rem; color: #1976d2; margin-top: 4px; }
        .fee-stats-modal-label { font-weight: 600; color: #204080; margin: 32px 0 8px 32px; display: block; font-size: 1.08rem; }
        .fee-stats-modal-select { width: calc(100% - 64px); margin-left: 32px; padding: 12px 16px; border-radius: 7px; border: 1.5px solid #1976d2; font-size: 1.08rem; margin-bottom: 18px; background: #f7f8fa; }
        .fee-stats-proceed-btn { background: #1976d2; color: #fff; border: none; border-radius: 7px; padding: 12px 32px; font-size: 1.1rem; font-weight: 700; cursor: pointer; box-shadow: 0 2px 8px rgba(32,64,128,0.08); transition: background 0.15s; display: block; margin: 20px 32px 0 auto; }
        .fee-stats-proceed-btn:disabled { background: #b0c4de; cursor: not-allowed; }
        .fee-stats-table-step { padding: 0 0 32px 0; }
        .fee-stats-table-wrapper { width: 100%; overflow-x: auto; padding: 0 32px; }
        .fee-stats-table-pro { width: 100%; border-collapse: collapse; background: #fff; border-radius: 12px; box-shadow: 0 2px 12px rgba(32,64,128,0.07); min-width: 1100px; }
        .fee-stats-table-pro th, .fee-stats-table-pro td { padding: 14px 12px; border-bottom: 1px solid #e5e7eb; text-align: left; font-size: 1.05rem; }
        .fee-stats-table-pro th { background: #1976d2; color: #fff; font-weight: 700; position: sticky; top: 0; z-index: 2; }
        .fee-stats-table-pro tr:last-child td { border-bottom: none; }
        .fee-stats-modal-actions { display: flex; justify-content: flex-end; gap: 18px; margin: 24px 32px 0 0; }
        .fee-stats-print-btn { background: #204080; color: #fff; border: none; border-radius: 7px; padding: 12px 32px; font-size: 1.1rem; font-weight: 700; cursor: pointer; box-shadow: 0 2px 8px rgba(32,64,128,0.08); transition: background 0.15s; }
        .fee-stats-print-btn:hover { background: #388e3c; }
        .fee-stats-modal-close { position: absolute; top: 18px; right: 28px; background: none; border: none; color: #222; font-size: 1.7rem; font-weight: 200; line-height: 1; cursor: pointer; z-index: 1001; padding: 0 6px; }
        .fee-stats-modal-close:hover { color: #1976d2; }
        .fee-stats-loading { color: #888; margin: 18px 0; text-align: center; font-size: 1.1rem; }
        .fee-stats-error { color: #e53e3e; margin: 18px 0; text-align: center; font-size: 1.1rem; }
        @media (max-width: 900px) { .fee-stats-modal-header { flex-direction: column; align-items: flex-start; gap: 12px; padding: 24px 12px 12px 12px; } .fee-stats-modal-label, .fee-stats-modal-select { margin-left: 12px; width: calc(100% - 24px); } .fee-stats-table-wrapper { padding: 0 8px; } }
        @media (max-width: 600px) { .fee-stats-modal-content { max-width: 99vw; padding: 0; } .fee-stats-modal-header { padding: 16px 4px 8px 4px; } .fee-stats-modal-label, .fee-stats-modal-select { margin-left: 4px; width: calc(100% - 8px); } .fee-stats-table-pro th, .fee-stats-table-pro td { padding: 8px 4px; font-size: 0.98rem; } }
        @media print { @page { size: A4 landscape; margin: 10mm; } body, html { background: white !important; } .fee-stats-modal-overlay, .fee-stats-modal-content, .sidebar, .admin-header, .fee-main-content > *:not(.stats-print-area), .print-button, .fee-stats-modal-close { display: none !important; } .stats-print-area { display: block !important; width: 100vw !important; margin: 0 !important; padding: 0 !important; } }
      `}</style>
    </SideTop>
  );
} 