import React from 'react';
import SideTop from './SideTop';
import './Fee.css';
import api from '../services/api';

export default function Fee() {
  // Dummy values for now
  const totalPaid = 0;
  const totalOwed = 0;

  const [searchQuery, setSearchQuery] = React.useState('');
  const [searchResults, setSearchResults] = React.useState([]);
  const [searchLoading, setSearchLoading] = React.useState(false);
  const [searchError, setSearchError] = React.useState('');
  const searchTimeout = React.useRef();
  const [feeModalOpen, setFeeModalOpen] = React.useState(false);
  const [selectedStudent, setSelectedStudent] = React.useState(null);
  const [studentFeeStats, setStudentFeeStats] = React.useState(null);
  const [feeStatsLoading, setFeeStatsLoading] = React.useState(false);
  const [feeStatsError, setFeeStatsError] = React.useState('');

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

  // Open modal and fetch fee stats
  const handleStudentClick = async (student) => {
    setSelectedStudent(student);
    setFeeModalOpen(true);
    setFeeStatsLoading(true);
    setFeeStatsError('');
    setStudentFeeStats(null);
    try {
      const stats = await api.getStudentFeeStats(student.id);
      setStudentFeeStats(stats);
    } catch (err) {
      setFeeStatsError('Failed to fetch fee statistics.');
    }
    setFeeStatsLoading(false);
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
            <div className="fee-card-value">{totalPaid.toLocaleString()} XAF</div>
          </div>
          <div className="fee-card owed">
            <div className="fee-card-title">Total Fees Owed</div>
            <div className="fee-card-value">{totalOwed.toLocaleString()} XAF</div>
          </div>
        </div>
        {/* Responsive search bar */}
        <div style={{ margin: '32px 0 18px 0', display: 'flex', justifyContent: 'center' }}>
          <input
            className="student-search-bar"
            type="text"
            placeholder="Search student by name or ID..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ width: '100%', maxWidth: 400, fontSize: 17, borderRadius: 8, border: '1.5px solid #1976d2', padding: '12px 16px' }}
          />
        </div>
        {searchLoading && <div style={{ textAlign: 'center', color: '#888', marginTop: 12 }}>Searching...</div>}
        {searchError && <div style={{ textAlign: 'center', color: '#e53e3e', marginTop: 12 }}>{searchError}</div>}
        <div className="student-search-grid">
          {searchResults.map(s => (
            <button
              key={s.id}
              className="student-search-result-btn"
              onClick={() => handleStudentClick(s)}
            >
              {s.full_name} ({s.student_id})
            </button>
          ))}
        </div>
        {/* Fee Modal */}
        {feeModalOpen && (
          <div className="modal-overlay" onClick={() => setFeeModalOpen(false)}>
            <div className="modal-content" style={{ maxWidth: 480, width: '98vw', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
              <button className="modal-close" onClick={() => setFeeModalOpen(false)}>&times;</button>
              <h2 className="form-title">{selectedStudent?.full_name} ({selectedStudent?.student_id})</h2>
              {feeStatsLoading && <div style={{ margin: '18px 0' }}>Loading fee statistics...</div>}
              {feeStatsError && <div className="error-message">{feeStatsError}</div>}
              {studentFeeStats && studentFeeStats.student && (
                <table className="fee-table" style={{ margin: '18px auto', width: '100%' }}>
                  <thead>
                    <tr>
                      <th>Fee Type</th>
                      <th>Amount</th>
                      <th>Paid</th>
                      <th>Balance</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(studentFeeStats.balance).map(([feeType, balance]) => {
                      const feeAmount = parseFloat(studentFeeStats.student[feeType.toLowerCase().replace(/ & | /g, '_')]) || 0;
                      const paid = feeAmount - balance;
                      return (
                        <tr key={feeType}>
                          <td>{feeType}</td>
                          <td>{feeAmount.toLocaleString()} XAF</td>
                          <td>{paid.toLocaleString()} XAF</td>
                          <td>{balance.toLocaleString()} XAF</td>
                          <td>
                            <button
                              className="fee-pay-row-btn"
                              disabled={balance <= 0}
                              style={{ opacity: balance <= 0 ? 0.5 : 1 }}
                              onClick={() => {/* stub: open pay modal */}}
                            >
                              Pay
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </SideTop>
  );
} 