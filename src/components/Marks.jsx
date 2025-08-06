import React, { useState, useEffect } from 'react';
import SideTop from './SideTop';
import { FaUpload, FaDownload, FaEdit, FaTrash, FaPlus, FaTimes, FaCheck, FaFileExcel, FaExclamationTriangle, FaEye } from 'react-icons/fa';
import * as XLSX from 'xlsx';
import api from '../services/api';
import SuccessMessage from './SuccessMessage';
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
  const [currentStep, setCurrentStep] = useState(1); // 1: class, 2: subject, 3: sequence, 4: download, 5: upload
  const [excelFile, setExcelFile] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMarks, setEditingMarks] = useState(null);
  const [editingMarksData, setEditingMarksData] = useState([]);
  const [savingMarks, setSavingMarks] = useState(false);
  const [userApplication, setUserApplication] = useState(null);
  const [checkingApplication, setCheckingApplication] = useState(true);
  const [assignedClasses, setAssignedClasses] = useState([]);
  const [assignedSubjects, setAssignedSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [subjects, setSubjects] = useState([]);
  
  // Preview state variables
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  
  const authUser = JSON.parse(sessionStorage.getItem('authUser'));
  const isAdmin2 = authUser?.role === 'Admin2';
  const isAdmin4 = authUser?.role === 'Admin4';
  const isTeacher = authUser?.role === 'Teacher';
  const isAdmin3 = authUser?.role === 'Admin3';
  const isDiscipline = authUser?.role === 'Discipline';
  const isPsychosocialist = authUser?.role === 'Psychosocialist';
  
  // Check if user can upload marks based on role and application status
  const canUploadMarks = isAdmin2 || isAdmin4 || (isTeacher && userApplication?.status === 'approved') || (isDiscipline && userApplication?.status === 'approved') || (isPsychosocialist && userApplication?.status === 'approved');
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
    checkUserApplication();
    fetchSubjects();
    // Fetch assigned data for all users who need it
    if (authUser?.id) {
      fetchUserAssignedData();
    }
  }, []);

  const checkUserApplication = async () => {
    try {
      setCheckingApplication(true);
      if (authUser?.id && (isTeacher || isDiscipline || isPsychosocialist)) {
        const application = await api.getUserApplication(authUser.id);
        setUserApplication(application);
      }
    } catch (error) {
      console.error('Error checking user application:', error);
      setUserApplication(null);
    } finally {
      setCheckingApplication(false);
    }
  };

  const fetchUserAssignedData = async () => {
    try {
      if (authUser?.id) {
        const assignedData = await api.getUserAssignedData(authUser.id);
        setAssignedClasses(assignedData.assignedClasses || []);
        setAssignedSubjects(assignedData.assignedSubjects || []);
      }
    } catch (error) {
      console.error('Error fetching user assigned data:', error);
      setAssignedClasses([]);
      setAssignedSubjects([]);
    }
  };

  const fetchClasses = async () => {
    try {
      const data = await api.getClasses();
      setClasses(data);
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchSubjects = async () => {
    try {
      const data = await api.getSubjects();
      setSubjects(data);
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  };

  // Get classes to show based on user role
  const getClassesToShow = () => {
    // For Admin4 users, filter by assigned classes if available
    if (isAdmin4 && assignedClasses.length > 0) {
      return classes.filter(cls => assignedClasses.includes(cls.name));
    }
    
    // For teachers, discipline, and psychosocialist users, filter by their application classes
    if ((isTeacher || isDiscipline || isPsychosocialist) && userApplication?.classes) {
      const userClasses = userApplication.classes.split(',').map(c => c.trim());
      return classes.filter(cls => userClasses.includes(cls.name));
    }
    
    // For Admin2 and Admin3, show all classes
    if (isAdmin2 || isAdmin3) {
      return classes;
    }
    
    // Default: show all classes
    return classes;
  };

  // Get subjects to show based on user role
  const getSubjectsToShow = () => {
    // For Admin4 users, filter by assigned subjects if available
    if (isAdmin4 && assignedSubjects.length > 0) {
      return subjects.filter(subject => assignedSubjects.includes(subject.name));
    }
    
    // For teachers, discipline, and psychosocialist users, filter by their application subjects
    if ((isTeacher || isDiscipline || isPsychosocialist) && userApplication?.subjects) {
      const userSubjects = userApplication.subjects.split(',').map(s => s.trim());
      return subjects.filter(subject => userSubjects.includes(subject.name));
    }
    
    // For Admin2 and Admin3, show all subjects
    if (isAdmin2 || isAdmin3) {
      return subjects;
    }
    
    // Default: show all subjects
    return subjects;
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
    setSelectedSubject('');
    setSelectedSequence('');
    setExcelFile(null);
  };

  const handleClassSelect = (classId) => {
    setSelectedClass(classId);
    setCurrentStep(2);
  };

  const handleSubjectSelect = (subjectName) => {
    setSelectedSubject(subjectName);
    setCurrentStep(3);
  };

  const handleSequenceSelect = (sequenceId) => {
    setSelectedSequence(sequenceId);
    setCurrentStep(4);
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
      
      // Automatically proceed to Step 5 (Upload) after successful download
      setCurrentStep(5);
      
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
      formData.append('subject', selectedSubject);

      await api.uploadMarks(formData);
      
      setSuccess('Marks uploaded successfully!');
      setShowModal(false);
      fetchUploadedMarks();
      
      // Reset form
      setSelectedClass('');
      setSelectedSequence('');
      setSelectedSubject('');
      setExcelFile(null);
      setCurrentStep(1);
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      if (error.message && error.message.includes('already exist')) {
        setError('Marks for this class, sequence, and subject combination already exist. Please choose a different subject or sequence.');
      } else {
        setError('Failed to upload marks. Please check your file format.');
      }
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

  const previewMarks = async (mark) => {
    try {
      setPreviewLoading(true);
      setShowPreview(true);
      
      // Get the marks data using class_id and sequence_id
      const marksData = await api.getMarksByClassAndSequence(mark.class_id, mark.sequence_id);
      
      if (marksData.student_data) {
        const studentData = typeof marksData.student_data === 'string' 
          ? JSON.parse(marksData.student_data) 
          : marksData.student_data;
        
        setPreviewData({
          marks: marksData,
          studentData: studentData
        });
      } else {
        setPreviewData({
          marks: marksData,
          studentData: []
        });
      }
    } catch (error) {
      console.error('Error previewing marks:', error);
      setError('Failed to load marks preview');
    } finally {
      setPreviewLoading(false);
    }
  };

  const closePreview = () => {
    setShowPreview(false);
    setPreviewData(null);
  };

  const closeModal = () => {
    setShowModal(false);
    setCurrentStep(1);
    setSelectedClass('');
    setSelectedSubject('');
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

        {/* Application Status Message */}
        {!isAdmin2 && !isAdmin4 && !isAdmin3 && (isTeacher || isDiscipline || isPsychosocialist) && (
          <div className="application-status-message">
            {checkingApplication ? (
              <div className="loading-message">
                <div className="loading-spinner"></div>
                <p>Checking application status...</p>
              </div>
            ) : userApplication ? (
              <div className={`status-message ${userApplication.status}`}>
                <FaExclamationTriangle />
                <div className="status-content">
                  <h4>Application Status: {userApplication.status === 'approved' ? 'Approved' : userApplication.status === 'pending' ? 'Pending' : 'Rejected'}</h4>
                  <p>
                    {userApplication.status === 'approved' 
                      ? 'You can upload marks for your assigned classes.' 
                      : userApplication.status === 'pending' 
                      ? 'Your application is pending approval. You will be able to upload marks once approved by Admin4.'
                      : 'Your application was rejected. Please contact Admin4 for more information.'
                    }
                  </p>
                  {userApplication.status !== 'approved' && (
                    <button 
                      className="submit-application-btn"
                      onClick={() => window.location.href = '/application'}
                    >
                      {userApplication.status === 'rejected' ? 'Resubmit Application' : 'Submit Application'}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="status-message no-application">
                <FaExclamationTriangle />
                <div className="status-content">
                  <h4>Application Required</h4>
                  <p>You need to submit an application and be approved by Admin4 before you can upload marks.</p>
                  <button 
                    className="submit-application-btn"
                    onClick={() => window.location.href = '/application'}
                  >
                    Submit Application
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

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
          <SuccessMessage message={success} />
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
                    <th>Subject</th>
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
                      <td>{mark.subject || 'N/A'}</td>
                      <td>{mark.sequence_name}</td>
                      <td>{mark.uploaded_by_name}</td>
                      <td>{new Date(mark.upload_date).toLocaleDateString()}</td>
                      <td>
                        <div className="action-buttons">
                          <button 
                            className="preview-btn" 
                            onClick={() => previewMarks(mark)}
                            title="Preview Marks"
                          >
                            <FaEye />
                          </button>
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
                    <th>Subject</th>
                    <th>Sequence</th>
                    <th>Upload Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {userMarks.map((mark) => (
                    <tr key={mark.id}>
                      <td>{mark.class_name}</td>
                      <td>{mark.subject || 'N/A'}</td>
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
                      {getClassesToShow().map((cls) => (
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

                {/* Step 2: Subject Selection */}
                {currentStep === 2 && (
                  <div className="step-content">
                    <h3>Step 2: Select Subject</h3>
                    <div className="subject-grid">
                      {getSubjectsToShow().map((subject) => (
                        <div 
                          key={subject.id} 
                          className="subject-card"
                          onClick={() => handleSubjectSelect(subject.name)}
                        >
                          <h4>{subject.name}</h4>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Step 3: Sequence Selection */}
                {currentStep === 3 && (
                  <div className="step-content">
                    <h3>Step 3: Select Sequence</h3>
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

                {/* Step 4: Download Template */}
                {currentStep === 4 && (
                  <div className="step-content">
                    <h3>Step 4: Download Excel Template</h3>
                    <div className="download-info">
                      <p><strong>Class:</strong> {classes.find(c => c.id === selectedClass)?.name}</p>
                      <p><strong>Subject:</strong> {selectedSubject}</p>
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
                    <div className="skip-download-section">
                      <p className="download-note">
                        Download the template with student names pre-filled, fill in the marks, then proceed to upload.
                      </p>
                      <button 
                        className="skip-btn" 
                        onClick={() => setCurrentStep(5)}
                        disabled={downloading}
                      >
                        Skip Download & Proceed to Upload
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 5: Upload File */}
                {currentStep === 5 && (
                  <div className="step-content">
                    <h3>Step 5: Upload Marks File</h3>
                    <div className="upload-info">
                      <p><strong>Class:</strong> {classes.find(c => c.id === selectedClass)?.name}</p>
                      <p><strong>Subject:</strong> {selectedSubject}</p>
                      <p><strong>Sequence:</strong> {sequences.find(s => s.id === selectedSequence)?.name}</p>
                    </div>
                    <div className="upload-note">
                      <p><strong>Note:</strong> You can upload marks for different subjects for the same class and sequence. Each subject will be stored separately.</p>
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
                <h3>Subject: {editingMarks.subject || 'N/A'}</h3>
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

        {/* Preview Marks Modal */}
        {showPreview && (
          <div className="modal-overlay" onClick={closePreview}>
            <div className="modal-content preview-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Preview Marks</h2>
                <button className="close-btn" onClick={closePreview}>
                  <FaTimes />
                </button>
              </div>

              <div className="modal-body">
                {previewLoading ? (
                  <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p>Loading marks data...</p>
                  </div>
                ) : previewData ? (
                  <div className="preview-content">
                    <div className="preview-info">
                      <h3>Class: {previewData.marks.class_name}</h3>
                      <h3>Subject: {previewData.marks.subject || 'N/A'}</h3>
                      <h3>Sequence: {previewData.marks.sequence_name}</h3>
                      <h3>Uploaded By: {previewData.marks.uploaded_by_name}</h3>
                      <h3>Upload Date: {new Date(previewData.marks.upload_date).toLocaleDateString()}</h3>
                    </div>

                    <div className="preview-table-container">
                      <h4>Student Marks Data</h4>
                      {previewData.studentData.length > 0 ? (
                        <div className="table-responsive">
                          <table className="preview-table">
                            <thead>
                              <tr>
                                <th>S/N</th>
                                <th>Full Name</th>
                                <th>Marks/20</th>
                              </tr>
                            </thead>
                            <tbody>
                              {previewData.studentData.map((row, index) => (
                                <tr key={index}>
                                  <td>{row[0] || '-'}</td>
                                  <td>{row[1] || '-'}</td>
                                  <td>{row[2] || '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="no-data-message">
                          <p>No student data found in the uploaded file.</p>
                          <p>This might indicate that the Excel file was not processed correctly.</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="error-message">
                    <p>Failed to load marks data.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </SideTop>
  );
} 