import React, { useState, useEffect } from 'react';
import SideTop from './SideTop';
import { FaUpload, FaDownload, FaEdit, FaTrash, FaPlus, FaTimes, FaCheck, FaFileExcel } from 'react-icons/fa';
import * as XLSX from 'xlsx';
import api from '../services/api';
import './Marks.css';

export default function Marks() {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSequence, setSelectedSequence] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [uploadedMarks, setUploadedMarks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [currentStep, setCurrentStep] = useState(1); // 1: class, 2: sequence, 3: download, 4: upload
  const [excelFile, setExcelFile] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMarks, setEditingMarks] = useState(null);
  const [editingMarksData, setEditingMarksData] = useState([]);
  const [savingMarks, setSavingMarks] = useState(false);
  
  const authUser = JSON.parse(sessionStorage.getItem('authUser'));
  const isAdmin2 = authUser?.role === 'Admin2';
  const isAdmin4 = authUser?.role === 'Admin4';
  const isTeacher = authUser?.role === 'Teacher';
  const isAdmin3 = authUser?.role === 'Admin3';
  
  const canUploadMarks = isAdmin2 || isAdmin4 || isTeacher;
  const canViewMarks = isAdmin3;
  const canEditMarks = isAdmin3; // Only Admin3 can edit marks

  const sequences = [
    { id: 1, name: 'Sequence 1' },
    { id: 2, name: 'Sequence 2' },
    { id: 3, name: 'Sequence 3' },
    { id: 4, name: 'Sequence 4' },
    { id: 5, name: 'Sequence 5' },
    { id: 6, name: 'Sequence 6' }
  ];

  useEffect(() => {
    fetchClasses();
    fetchUploadedMarks();
  }, []);

  const fetchClasses = async () => {
    try {
      const data = await api.getClasses();
      setClasses(data);
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchUploadedMarks = async () => {
    try {
      const data = await api.getUploadedMarks();
      setUploadedMarks(data);
    } catch (error) {
      console.error('Error fetching uploaded marks:', error);
    }
  };

  // Get user's own uploaded marks (for non-Admin3 users)
  const getUserUploadedMarks = () => {
    if (isAdmin3) {
      return uploadedMarks; // Admin3 sees all marks
    } else {
      // Other users only see their own uploaded marks
      return uploadedMarks.filter(mark => mark.uploaded_by === authUser.id);
    }
  };

  const userMarks = getUserUploadedMarks();

  const handleUploadMarks = () => {
    setShowModal(true);
    setCurrentStep(1);
    setSelectedClass('');
    setSelectedSequence('');
    setExcelFile(null);
  };

  const handleClassSelect = (classId) => {
    setSelectedClass(classId);
    setCurrentStep(2);
  };

  const handleSequenceSelect = (sequenceId) => {
    setSelectedSequence(sequenceId);
    setCurrentStep(3);
  };

  const downloadExcelTemplate = async () => {
    const selectedClassName = classes.find(c => c.id === selectedClass)?.name || 'Class';
    const selectedSequenceName = sequences.find(s => s.id === selectedSequence)?.name || 'Sequence';
    
    setDownloading(true);
    setError('');
    
    try {
      // Fetch students for the selected class
      const students = await api.getStudentsByClass(selectedClass);
      
      // Create workbook and worksheet
      const wb = XLSX.utils.book_new();
      
      // Create headers
      const headers = ['S/N', 'FULL NAMES', 'Marks/20'];
      
      // Create rows with student data
      let data = [];
      if (students && students.length > 0) {
        data = students.map((student, index) => [
          index + 1, // S/N
          student.full_name || 'N/A', // FULL NAMES
          '' // Empty marks column
        ]);
      }
      
      // Add empty rows if less than 20 students or no students
      while (data.length < 20) {
        data.push([data.length + 1, '', '']);
      }
      
      // Combine headers and data
      const wsData = [headers, ...data];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      
      // Set column widths
      ws['!cols'] = [
        { width: 8 },  // S/N
        { width: 30 }, // FULL NAMES
        { width: 15 }  // Marks/20
      ];
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Marks');
      
      // Generate filename
      const filename = `${selectedClassName}_${selectedSequenceName}_Marks.xlsx`;
      
      // Download file
      XLSX.writeFile(wb, filename);
      
      setSuccess(`Excel template downloaded successfully with ${students.length} students!`);
      setCurrentStep(4);
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error fetching students:', error);
      setError('Failed to fetch student data. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setExcelFile(file);
    }
  };

  const uploadMarks = async () => {
    if (!excelFile) {
      setError('Please select an Excel file');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('marksFile', excelFile);
      formData.append('classId', selectedClass);
      formData.append('sequenceId', selectedSequence);

      await api.uploadMarks(formData);
      
      setSuccess('Marks uploaded successfully!');
      setShowModal(false);
      fetchUploadedMarks();
      
      // Reset form
      setSelectedClass('');
      setSelectedSequence('');
      setExcelFile(null);
      setCurrentStep(1);
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      setError('Failed to upload marks. Please check your file format.');
    } finally {
      setLoading(false);
    }
  };

  const deleteMarks = async (marksId) => {
    // Only Admin3 can delete marks
    if (!isAdmin3) {
      setError('You do not have permission to delete marks');
      return;
    }

    if (window.confirm('Are you sure you want to delete these marks?')) {
      try {
        await api.deleteMarks(marksId);
        setSuccess('Marks deleted successfully!');
        fetchUploadedMarks();
        setTimeout(() => setSuccess(''), 3000);
      } catch (error) {
        setError('Failed to delete marks');
      }
    }
  };

  const editMarks = async (marksId) => {
    try {
      // Only Admin3 can edit marks
      if (!isAdmin3) {
        setError('You do not have permission to edit marks');
        return;
      }

      // Find the marks record
      const mark = uploadedMarks.find(m => m.id === marksId);
      if (!mark) {
        setError('Marks not found');
        return;
      }

      // Fetch the marks data
      const marksData = await api.getMarksByClassAndSequence(mark.class_id, mark.sequence_id);
      
      if (!marksData.student_data) {
        setError('No student data found for these marks');
        return;
      }

      // Parse the student data and add editing capabilities
      const editableData = marksData.student_data.map((row, index) => ({
        id: index,
        serialNumber: row[0] || index + 1,
        fullName: row[1] || '',
        marks: row[2] || '',
        originalMarks: row[2] || ''
      }));

      setEditingMarks(mark);
      setEditingMarksData(editableData);
      setShowEditModal(true);
      setError('');
    } catch (error) {
      console.error('Error editing marks:', error);
      setError('Failed to load marks for editing');
    }
  };

  const updateMarkValue = (index, value) => {
    const updatedData = [...editingMarksData];
    updatedData[index].marks = value;
    setEditingMarksData(updatedData);
  };

  const saveEditedMarks = async () => {
    setSavingMarks(true);
    setError('');

    try {
      // Convert back to the format expected by the backend
      const studentData = editingMarksData.map(row => [
        row.serialNumber,
        row.fullName,
        row.marks
      ]);

      // Create a new Excel file with the updated data
      const wb = XLSX.utils.book_new();
      const headers = ['S/N', 'FULL NAMES', 'Marks/20'];
      const wsData = [headers, ...studentData];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      
      // Set column widths
      ws['!cols'] = [
        { width: 8 },  // S/N
        { width: 30 }, // FULL NAMES
        { width: 15 }  // Marks/20
      ];
      
      XLSX.utils.book_append_sheet(wb, ws, 'Marks');
      
      // Convert to blob
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      // Create file from blob
      const file = new File([blob], `updated_marks_${editingMarks.class_name}_${editingMarks.sequence_name}.xlsx`, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      // Create FormData and update marks
      const formData = new FormData();
      formData.append('marksFile', file);
      formData.append('classId', editingMarks.class_id);
      formData.append('sequenceId', editingMarks.sequence_id);

      await api.updateMarks(editingMarks.id, formData);
      
      setSuccess('Marks updated successfully!');
      setShowEditModal(false);
      fetchUploadedMarks();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error saving marks:', error);
      setError('Failed to save marks. Please try again.');
    } finally {
      setSavingMarks(false);
    }
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingMarks(null);
    setEditingMarksData([]);
    setError('');
  };

  const closeModal = () => {
    setShowModal(false);
    setCurrentStep(1);
    setSelectedClass('');
    setSelectedSequence('');
    setExcelFile(null);
  };

  const getStats = () => {
    if (isAdmin3) {
      // Admin3 sees all marks statistics
      const totalClasses = classes.length;
      const submittedClasses = uploadedMarks.length;
      const pendingClasses = totalClasses - submittedClasses;
      
      return {
        totalClasses,
        submittedClasses,
        pendingClasses,
        status: submittedClasses > 0 ? 'Active' : 'No submissions'
      };
    } else {
      // Other roles see upload-focused statistics
      const userMarks = uploadedMarks.filter(mark => mark.uploaded_by === authUser.id);
      const uniqueClassesUploaded = new Set(userMarks.map(mark => mark.class_id)).size;
      
      return {
        totalClasses: classes.length,
        submittedClasses: uniqueClassesUploaded, // Count unique classes uploaded
        pendingClasses: classes.length - uniqueClassesUploaded,
        status: uniqueClassesUploaded > 0 ? `${uniqueClassesUploaded} class(es) uploaded` : 'Upload marks to get started'
      };
    }
  };

  const stats = getStats();

  return (
    <SideTop>
      <div className="marks-container">
        {/* Header */}
        <div className="marks-header">
          <h1>Marks Management</h1>
          {canUploadMarks && (
            <button className="upload-marks-btn" onClick={handleUploadMarks}>
              <FaUpload /> Upload Marks
            </button>
          )}
        </div>

        {/* Stats Cards */}
        <div className="stats-cards">
          <div className="stat-card">
            <div className="stat-icon">
              <FaFileExcel />
            </div>
            <div className="stat-content">
              <h3>{stats.submittedClasses}</h3>
              <p>{isAdmin3 ? 'Number of classes submitted' : 'Different classes uploaded'}</p>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon status">
              <FaCheck />
            </div>
            <div className="stat-content">
              <h3>{stats.status}</h3>
              <p>Status</p>
            </div>
          </div>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="success-message">
            {success}
          </div>
        )}
        
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {/* Uploaded Marks Table - Only visible to Admin3 */}
        {isAdmin3 && uploadedMarks.length > 0 && (
          <div className="marks-table-container">
            <h2>Uploaded Marks</h2>
            <div className="marks-table">
              <table>
                <thead>
                  <tr>
                    <th>Class</th>
                    <th>Sequence</th>
                    <th>Uploaded By</th>
                    <th>Upload Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {uploadedMarks.map((mark) => (
                    <tr key={mark.id}>
                      <td>{mark.class_name}</td>
                      <td>{mark.sequence_name}</td>
                      <td>{mark.uploaded_by_name}</td>
                      <td>{new Date(mark.upload_date).toLocaleDateString()}</td>
                      <td>
                        <div className="action-buttons">
                          {canEditMarks && (
                            <button 
                              className="edit-btn" 
                              onClick={() => editMarks(mark.id)}
                              title="Edit"
                            >
                              <FaEdit />
                            </button>
                          )}
                          {canEditMarks && (
                            <button 
                              className="delete-btn" 
                              onClick={() => deleteMarks(mark.id)}
                              title="Delete"
                            >
                              <FaTrash />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* User's Own Uploaded Marks - For non-Admin3 users */}
        {!isAdmin3 && userMarks.length > 0 && (
          <div className="marks-table-container">
            <h2>My Uploaded Marks</h2>
            <div className="marks-table">
              <table>
                <thead>
                  <tr>
                    <th>Class</th>
                    <th>Sequence</th>
                    <th>Upload Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {userMarks.map((mark) => (
                    <tr key={mark.id}>
                      <td>{mark.class_name}</td>
                      <td>{mark.sequence_name}</td>
                      <td>{new Date(mark.upload_date).toLocaleDateString()}</td>
                      <td>
                        <span className="status-badge uploaded">
                          Uploaded
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Message for non-Admin3 users when no marks are uploaded */}
        {!isAdmin3 && userMarks.length === 0 && (
          <div className="upload-info-message">
            <div className="info-card">
              <h3>📊 Marks Management</h3>
              <p>You can upload marks for your classes. Only Admin3 can view and manage all uploaded marks.</p>
              <ul>
                <li>Select a class and sequence</li>
                <li>Download the Excel template with student names</li>
                <li>Fill in the marks and upload</li>
                <li>Admin3 will review and manage all submissions</li>
              </ul>
            </div>
          </div>
        )}

        {/* Upload Modal */}
        {showModal && (
          <div className="modal-overlay" onClick={closeModal}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Upload Marks</h2>
                <button className="close-btn" onClick={closeModal}>
                  <FaTimes />
                </button>
              </div>

              <div className="modal-body">
                {/* Step 1: Class Selection */}
                {currentStep === 1 && (
                  <div className="step-content">
                    <h3>Step 1: Select Class</h3>
                    <div className="class-grid">
                      {classes.map((cls) => (
                        <div 
                          key={cls.id} 
                          className="class-card"
                          onClick={() => handleClassSelect(cls.id)}
                        >
                          <h4>{cls.name}</h4>
                          <p>Fee: {cls.total_fee || 'N/A'}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Step 2: Sequence Selection */}
                {currentStep === 2 && (
                  <div className="step-content">
                    <h3>Step 2: Select Sequence</h3>
                    <div className="sequence-grid">
                      {sequences.map((seq) => (
                        <div 
                          key={seq.id} 
                          className="sequence-card"
                          onClick={() => handleSequenceSelect(seq.id)}
                        >
                          <h4>{seq.name}</h4>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Step 3: Download Template */}
                {currentStep === 3 && (
                  <div className="step-content">
                    <h3>Step 3: Download Excel Template</h3>
                    <div className="download-info">
                      <p><strong>Class:</strong> {classes.find(c => c.id === selectedClass)?.name}</p>
                      <p><strong>Sequence:</strong> {sequences.find(s => s.id === selectedSequence)?.name}</p>
                    </div>
                    <button className="download-btn" onClick={downloadExcelTemplate} disabled={downloading}>
                      {downloading ? (
                        'Downloading...'
                      ) : (
                        <>
                          <FaDownload /> Download Excel Template
                        </>
                      )}
                    </button>
                    <p className="download-note">
                      Download the template with student names pre-filled, fill in the marks, then proceed to upload.
                    </p>
                  </div>
                )}

                {/* Step 4: Upload File */}
                {currentStep === 4 && (
                  <div className="step-content">
                    <h3>Step 4: Upload Marks File</h3>
                    <div className="upload-info">
                      <p><strong>Class:</strong> {classes.find(c => c.id === selectedClass)?.name}</p>
                      <p><strong>Sequence:</strong> {sequences.find(s => s.id === selectedSequence)?.name}</p>
                    </div>
                    <div className="file-upload">
                      <input
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleFileUpload}
                        id="marks-file"
                      />
                      <label htmlFor="marks-file" className="file-upload-label">
                        <FaFileExcel /> Choose Excel File
                      </label>
                      {excelFile && (
                        <p className="selected-file">Selected: {excelFile.name}</p>
                      )}
                    </div>
                    <button 
                      className="upload-btn" 
                      onClick={uploadMarks}
                      disabled={!excelFile || loading}
                    >
                      {loading ? 'Uploading...' : 'Upload Marks'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Edit Marks Modal */}
        {showEditModal && editingMarks && (
          <div className="modal-overlay" onClick={closeEditModal}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Edit Marks</h2>
                <button className="close-btn" onClick={closeEditModal}>
                  <FaTimes />
                </button>
              </div>

              <div className="modal-body">
                <h3>Class: {editingMarks.class_name}</h3>
                <h3>Sequence: {editingMarks.sequence_name}</h3>
                <h3>Uploaded By: {editingMarks.uploaded_by_name}</h3>
                <h3>Upload Date: {new Date(editingMarks.upload_date).toLocaleDateString()}</h3>

                <div className="edit-table-container">
                  <h4>Student Marks</h4>
                  <table className="edit-table">
                    <thead>
                      <tr>
                        <th>S/N</th>
                        <th>Full Name</th>
                        <th>Marks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {editingMarksData.map((row, index) => (
                        <tr key={row.id}>
                          <td>{row.serialNumber}</td>
                          <td>{row.fullName}</td>
                          <td>
                            <input
                              type="text"
                              value={row.marks}
                              onChange={(e) => updateMarkValue(index, e.target.value)}
                              className="edit-input"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="modal-footer">
                  <button className="save-btn" onClick={saveEditedMarks} disabled={savingMarks}>
                    {savingMarks ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button className="cancel-btn" onClick={closeEditModal}>Cancel</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </SideTop>
  );
} 