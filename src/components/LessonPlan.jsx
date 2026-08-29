import React, { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaEye, FaCheck, FaTimes, FaDownload } from 'react-icons/fa';
import SideTop from './SideTop';
import SuccessMessage from './SuccessMessage';
import api from '../services/api';
import './LessonPlan.css';


export default function LessonPlan({ noLayoutWrapper = false }) {
  const [lessonPlans, setLessonPlans] = useState([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [form, setForm] = useState({ title: '', period_type: 'weekly' });
  const [lessonForm, setLessonForm] = useState({
    title: '',
    subject: '',
    class_name: '',
    week: '',
    period_type: 'weekly',
    objectives: '',
    content: '',
    activities: '',
    assessment: '',
    resources: ''
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [reviewForm, setReviewForm] = useState({ status: 'approved', admin_comment: '' });
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [classes, setClasses] = useState([]);
  const [specialties, setSpecialties] = useState([]);

  useEffect(() => {
    fetchUserRole();
  }, []);

  useEffect(() => {
    if (userRole) {
      fetchLessonPlans();
    }
  }, [userRole, filterClass, filterDepartment]);

  useEffect(() => {
    if (!userRole || userRole !== 'Admin3') return undefined;
    const timer = setTimeout(() => fetchLessonPlans(), 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    if (userRole !== 'Admin3') return;
    const loadFilterOptions = async () => {
      try {
        const [classList, specialtyList] = await Promise.all([
          api.getClasses(),
          api.getSpecialties(),
        ]);
        setClasses(Array.isArray(classList) ? classList : []);
        setSpecialties(Array.isArray(specialtyList) ? specialtyList : []);
      } catch (err) {
        console.error('Failed to load lesson plan filters:', err);
      }
    };
    loadFilterOptions();
  }, [userRole]);

  const fetchUserRole = async () => {
    try {
      const user = await api.getCurrentUser();
      setUserRole(user.role);
    } catch (err) {
      console.error('Error fetching user role:', err);
    }
  };

  const fetchLessonPlans = async () => {
    try {
      setLoading(true);
      let plans;
      const filters = {
        search: searchTerm.trim() || undefined,
        class: filterClass || undefined,
        department: filterDepartment || undefined,
      };

      if (userRole === 'Admin3') {
        plans = await api.getAllLessonPlans(filters);
      } else if (userRole === 'Admin1' || userRole === 'Admin4') {
        plans = await api.getAllLessonPlans(filters);
      } else {
        plans = await api.getMyLessonPlans();
      }
      setLessonPlans(Array.isArray(plans) ? plans : []);
    } catch (err) {
      setError('Failed to fetch lesson plans');
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = e => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleFileChange = e => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
    } else {
      setError('Please select a valid PDF file');
      setSelectedFile(null);
    }
  };

  const handleUpload = async e => {
    e.preventDefault();
    if (!selectedFile) {
      setError('Please select a PDF file');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('title', form.title);
      formData.append('period_type', form.period_type);
      formData.append('file', selectedFile);

      await api.uploadLessonPlan(formData);
      setSuccess('Lesson plan uploaded successfully!');
      setShowUploadModal(false);
      setForm({ title: '', period_type: 'weekly' });
      setSelectedFile(null);
      fetchLessonPlans();
    } catch (err) {
      setError('Failed to upload lesson plan');
    } finally {
      setLoading(false);
    }
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleEdit = plan => {
    setSelectedPlan(plan);
    setForm({ title: plan.title, period_type: plan.period_type });
    setShowEditModal(true);
  };

  const handleUpdate = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('title', form.title);
      formData.append('period_type', form.period_type);
      if (selectedFile) {
        formData.append('file', selectedFile);
      }

      await api.updateLessonPlan(selectedPlan.id, formData);
      setSuccess('Lesson plan updated successfully!');
      setShowEditModal(false);
      setSelectedPlan(null);
      setForm({ title: '', period_type: 'weekly' });
      setSelectedFile(null);
      fetchLessonPlans();
    } catch (err) {
      setError('Failed to update lesson plan');
    } finally {
      setLoading(false);
    }
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleDelete = async id => {
    if (!window.confirm('Are you sure you want to delete this lesson plan?')) return;
    
    try {
      if (canReview) {
        await api.deleteLessonPlanAdmin(id);
      } else {
        await api.deleteLessonPlan(id);
      }
      setSuccess('Lesson plan deleted successfully!');
      fetchLessonPlans();
    } catch (err) {
      setError('Failed to delete lesson plan');
    }
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleReview = plan => {
    setSelectedPlan(plan);
    setReviewForm({ status: 'approved', admin_comment: '' });
    setShowReviewModal(true);
  };

  const handleReviewSubmit = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.reviewLessonPlan(selectedPlan.id, reviewForm.status, reviewForm.admin_comment);
      setSuccess('Lesson plan reviewed successfully!');
      setShowReviewModal(false);
      setSelectedPlan(null);
      setReviewForm({ status: 'approved', admin_comment: '' });
      fetchLessonPlans();
    } catch (err) {
      setError('Failed to review lesson plan');
    } finally {
      setLoading(false);
    }
    setTimeout(() => setSuccess(''), 3000);
  };

  const resolveFileUrl = (fileUrl) => {
    if (!fileUrl) return null;
    if (fileUrl.startsWith('http')) return fileUrl;
    const isDevelopment = process.env.NODE_ENV === 'development' ||
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1';
    const apiUrl = process.env.REACT_APP_API_URL || (isDevelopment
      ? 'http://localhost:5000'
      : 'https://api.votechs7academygroup.com');
    return `${apiUrl}${fileUrl}`;
  };

  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleDownload = async (plan) => {
    try {
      setError('');
      const meta = await api.downloadLessonPlan(plan.id);
      const url = resolveFileUrl(meta.file_url || plan.file_url);
      if (!url) {
        setError('No file available for download');
        return;
      }
      const filename = meta.file_name || `${(plan.title || 'lesson_plan').replace(/[^a-z0-9_\-\s]/gi, '_')}.pdf`;
      const resp = await fetch(url, { mode: 'cors' }).catch(() => null);
      if (resp && resp.ok) {
        const blob = await resp.blob();
        downloadBlob(blob, filename);
        setSuccess('Lesson plan downloaded');
      } else {
        const a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setSuccess('Download started');
      }
    } catch (err) {
      setError(err.message || 'Failed to download lesson plan');
    }
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleViewFile = fileUrl => {
    // If it's already a full URL (FTP), use it directly
    if (fileUrl && fileUrl.startsWith('http')) {
      window.open(fileUrl, '_blank');
    } else {
      // For local files, construct the proper URL
      const isDevelopment = process.env.NODE_ENV === 'development' || 
                           window.location.hostname === 'localhost' || 
                           window.location.hostname === '127.0.0.1';
      const apiUrl = process.env.REACT_APP_API_URL || (isDevelopment 
        ? 'http://localhost:5000' 
        : 'https://api.votechs7academygroup.com');
      window.open(`${apiUrl}${fileUrl}`, '_blank');
    }
  };

  const getStatusCount = status => {
    return lessonPlans.filter(plan => plan.status === status).length;
  };

  const formatDate = dateString => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isAdmin4 = userRole === 'Admin4';
  const isAdmin1 = userRole === 'Admin1';
  const isAdmin3 = userRole === 'Admin3';
  const canUpload = !(isAdmin4 || isAdmin1 || isAdmin3);
  const canReview = isAdmin4;
  const isDownloadOnly = isAdmin3;

  const content = (
    <div className="lesson-plan-container">
        {/* Success/Error Messages */}
        {success && <SuccessMessage message={success} />}
        {error && <div className="error-message">{error}</div>}

        {/* Dashboard Cards */}
        {!isDownloadOnly && (
        <div className="lesson-plan-cards">
          <div className="lesson-plan-card">
            <div className="count">{lessonPlans.length}</div>
            <div className="desc">Submitted Lesson Plans</div>
          </div>
          <div className="lesson-plan-card">
            <div className="count">{getStatusCount('pending')}</div>
            <div className="desc">Pending Review</div>
          </div>
          {!isAdmin4 && (
            <>
              <div className="lesson-plan-card">
                <div className="count">{getStatusCount('approved')}</div>
                <div className="desc">Approved Plans</div>
              </div>
              <div className="lesson-plan-card">
                <div className="count">{getStatusCount('rejected')}</div>
                <div className="desc">Rejected Plans</div>
              </div>
            </>
          )}
        </div>
        )}

        {isDownloadOnly && (
          <div className="lesson-plan-cards">
            <div className="lesson-plan-card">
              <div className="count">{lessonPlans.length}</div>
              <div className="desc">Approved Lesson Plans</div>
            </div>
          </div>
        )}

        {/* Header with Upload Button */}
        <div className="lesson-plan-header">
          <h2>
            {isDownloadOnly
              ? 'Approved Lesson Plans'
              : isAdmin1 || isAdmin4
                ? 'All Lesson Plans'
                : 'My Lesson Plans'}
          </h2>
          {canUpload && (
            <button 
              className="upload-plan-btn" 
              onClick={() => setShowUploadModal(true)}
            >
              <FaPlus /> Upload Plan
            </button>
          )}
        </div>

        {isDownloadOnly && (
          <div className="lesson-plan-filters">
            <div className="filter-group">
              <label>Class:</label>
              <select
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                className="filter-select"
              >
                <option value="">All Classes</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>{cls.name}</option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label>Department:</label>
              <select
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
                className="filter-select"
              >
                <option value="">All Departments</option>
                {specialties.map((spec) => (
                  <option key={spec.id} value={spec.id}>{spec.name}</option>
                ))}
              </select>
            </div>
            <div className="search-group">
              <input
                type="text"
                placeholder="Search by title, teacher, or filename..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
          </div>
        )}

        {/* Lesson Plans Table */}
        <div className="lesson-plan-table-wrapper">
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>
          ) : lessonPlans.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
              {isDownloadOnly
                ? 'No approved lesson plans match your filters.'
                : isAdmin1 || isAdmin4
                  ? 'No lesson plans submitted yet.'
                  : 'No lesson plans uploaded yet.'}
            </div>
          ) : (
            <table className="lesson-plan-table">
              <thead>
                <tr>
                  <th>Title</th>
                  {isDownloadOnly && <th>Class</th>}
                  {isDownloadOnly && <th>Department</th>}
                  <th>Period Type</th>
                  {!isDownloadOnly && <th>Status</th>}
                  <th>Submitted</th>
                  {(isAdmin1 || isAdmin4 || isDownloadOnly) && <th>Submitted By</th>}
                  {(isAdmin1 || isAdmin4) && <th>Role</th>}
                  {(isAdmin1 || isAdmin4) && <th>Review Status</th>}
                  {!isDownloadOnly && <th>View</th>}
                  {!isAdmin1 && !isDownloadOnly && <th>Actions</th>}
                  {isDownloadOnly && <th>Download</th>}
                </tr>
              </thead>
              <tbody>
                {lessonPlans.map((plan) => (
                  <tr key={plan.id}>
                    <td className="title-cell"><span className="title-text">{plan.title}</span></td>
                    {isDownloadOnly && <td>{plan.class_label || plan.class_name || '—'}</td>}
                    {isDownloadOnly && <td>{plan.department_name || '—'}</td>}
                    <td>
                      <span className={`period-type-badge period-${plan.period_type}`}>
                        {plan.period_type}
                      </span>
                    </td>
                    {!isDownloadOnly && (
                    <td>
                      <span className={`status-badge status-${plan.status}`}>
                        {plan.status}
                      </span>
                    </td>
                    )}
                    <td>{formatDate(plan.submitted_at)}</td>
                    {(isAdmin1 || isAdmin4 || isDownloadOnly) && (
                      <td>{plan.teacher_name || plan.teacher_username || 'Unknown User'}</td>
                    )}
                    {(isAdmin1 || isAdmin4) && (
                      <td>{plan.teacher_role || '-'}</td>
                    )}
                    {(isAdmin1 || isAdmin4) && (
                      <td>
                        <span className={`status-badge status-${plan.status}`}>
                          {plan.status}
                        </span>
                      </td>
                    )}
                    {!isDownloadOnly && (
                    <td className="actions">
                      <button 
                        className="action-btn view" 
                        onClick={() => handleViewFile(plan.file_url)}
                        title="View PDF"
                        aria-label="View lesson plan"
                      >
                        <FaEye />
                      </button>
                    </td>
                    )}
                    {isDownloadOnly && (
                      <td className="actions">
                        <button
                          className="action-btn view"
                          onClick={() => handleDownload(plan)}
                          title="Download PDF"
                        >
                          <FaDownload />
                        </button>
                      </td>
                    )}
                    {!isAdmin1 && !isDownloadOnly && (
                      <td className="actions">
                        <button 
                          className="action-btn view" 
                          onClick={() => handleViewFile(plan.file_url)}
                          title="View PDF"
                        >
                          <FaEye />
                        </button>
                        
                        {canUpload && plan.status === 'pending' && (
                          <>
                            <button 
                              className="action-btn edit" 
                              onClick={() => handleEdit(plan)}
                              title="Edit"
                            >
                              <FaEdit />
                            </button>
                            <button 
                              className="action-btn delete" 
                              onClick={() => handleDelete(plan.id)}
                              title="Delete"
                            >
                              <FaTrash />
                            </button>
                          </>
                        )}
                        
                        {canReview && plan.status === 'pending' && (
                          <>
                            <button 
                              className="action-btn approve" 
                              onClick={() => handleReview(plan)}
                              title="Review"
                            >
                              <FaCheck />
                            </button>
                            <button 
                              className="action-btn delete" 
                              onClick={() => handleDelete(plan.id)}
                              title="Delete"
                            >
                              <FaTrash />
                            </button>
                          </>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Upload Modal */}
        {showUploadModal && canUpload && (
          <div className="lesson-plan-modal-overlay" onClick={() => setShowUploadModal(false)}>
            <div className="lesson-plan-modal-content" onClick={e => e.stopPropagation()}>
              <button className="lesson-plan-modal-close" onClick={() => setShowUploadModal(false)}>×</button>
              <form onSubmit={handleUpload}>
                <h2 className="lesson-plan-form-title">Upload Lesson Plan</h2>
                <div className="lesson-plan-form-grid">
                  <div className="lesson-plan-input-group">
                    <label className="lesson-plan-input-label">Title *</label>
                    <input 
                      className="lesson-plan-input-field" 
                      type="text" 
                      name="title" 
                      value={form.title} 
                      onChange={handleFormChange} 
                      placeholder="Enter lesson plan title" 
                      required 
                    />
                  </div>
                  <div className="lesson-plan-input-group">
                    <label className="lesson-plan-input-label">Period Type *</label>
                    <select 
                      className="lesson-plan-select" 
                      name="period_type" 
                      value={form.period_type} 
                      onChange={handleFormChange}
                      required
                    >
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                  <div className="lesson-plan-input-group">
                    <label className="lesson-plan-input-label">PDF File *</label>
                    <div className="lesson-plan-file-input">
                      <input 
                        type="file" 
                        accept=".pdf" 
                        onChange={handleFileChange} 
                        required 
                      />
                      <label className={`lesson-plan-file-label ${selectedFile ? 'has-file' : ''}`}>
                        <FaDownload />
                        {selectedFile ? selectedFile.name : 'Choose PDF file'}
                      </label>
                    </div>
                  </div>
                </div>
                <button 
                  type="submit" 
                  className="lesson-plan-submit-btn" 
                  disabled={loading}
                >
                  {loading ? 'Uploading...' : 'Upload Plan'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {showEditModal && selectedPlan && canUpload && (
          <div className="lesson-plan-modal-overlay" onClick={() => setShowEditModal(false)}>
            <div className="lesson-plan-modal-content" onClick={e => e.stopPropagation()}>
              <button className="lesson-plan-modal-close" onClick={() => setShowEditModal(false)}>×</button>
              <form onSubmit={handleUpdate}>
                <h2 className="lesson-plan-form-title">Edit Lesson Plan</h2>
                <div className="lesson-plan-form-grid">
                  <div className="lesson-plan-input-group">
                    <label className="lesson-plan-input-label">Title *</label>
                    <input 
                      className="lesson-plan-input-field" 
                      type="text" 
                      name="title" 
                      value={form.title} 
                      onChange={handleFormChange} 
                      placeholder="Enter lesson plan title" 
                      required 
                    />
                  </div>
                  <div className="lesson-plan-input-group">
                    <label className="lesson-plan-input-label">Period Type *</label>
                    <select 
                      className="lesson-plan-select" 
                      name="period_type" 
                      value={form.period_type} 
                      onChange={handleFormChange}
                      required
                    >
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  </div>
                  <div className="lesson-plan-input-group">
                    <label className="lesson-plan-input-label">PDF File (Optional)</label>
                    <div className="lesson-plan-file-input">
                      <input 
                        type="file" 
                        accept=".pdf" 
                        onChange={handleFileChange} 
                      />
                      <label className={`lesson-plan-file-label ${selectedFile ? 'has-file' : ''}`}>
                        <FaDownload />
                        {selectedFile ? selectedFile.name : 'Choose new PDF file (optional)'}
                      </label>
                    </div>
                  </div>
                </div>
                <button 
                  type="submit" 
                  className="lesson-plan-submit-btn" 
                  disabled={loading}
                >
                  {loading ? 'Updating...' : 'Update Plan'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Review Modal */}
        {showReviewModal && selectedPlan && canReview && (
          <div className="lesson-plan-modal-overlay" onClick={() => setShowReviewModal(false)}>
            <div className="review-modal-content" onClick={e => e.stopPropagation()}>
              <button className="lesson-plan-modal-close" onClick={() => setShowReviewModal(false)}>×</button>
              <form onSubmit={handleReviewSubmit}>
                <h2 className="lesson-plan-form-title">Review Lesson Plan</h2>
                <div className="review-form-grid">
                  <div className="lesson-plan-input-group">
                    <label className="lesson-plan-input-label">Plan Title</label>
                    <input 
                      className="lesson-plan-input-field" 
                      type="text" 
                      value={selectedPlan.title} 
                      readOnly 
                    />
                  </div>
                  <div className="lesson-plan-input-group">
                    <label className="lesson-plan-input-label">Submitted By</label>
                    <input 
                      className="lesson-plan-input-field" 
                      type="text" 
                      value={selectedPlan.teacher_name || selectedPlan.teacher_username || 'Unknown User'} 
                      readOnly 
                    />
                  </div>
                  <div className="lesson-plan-input-group">
                    <label className="lesson-plan-input-label">Period Type</label>
                    <input 
                      className="lesson-plan-input-field" 
                      type="text" 
                      value={selectedPlan.period_type} 
                      readOnly 
                    />
                  </div>
                  <div className="lesson-plan-input-group">
                    <label className="lesson-plan-input-label">Status *</label>
                    <select 
                      className="lesson-plan-select" 
                      value={reviewForm.status} 
                      onChange={e => setReviewForm(f => ({ ...f, status: e.target.value }))}
                      required
                    >
                      <option value="approved">Approve</option>
                      <option value="rejected">Reject</option>
                    </select>
                  </div>
                  <div className="lesson-plan-input-group">
                    <label className="lesson-plan-input-label">Comment (Optional)</label>
                    <textarea 
                      className="lesson-plan-input-field" 
                      name="admin_comment" 
                      value={reviewForm.admin_comment} 
                      onChange={e => setReviewForm(f => ({ ...f, admin_comment: e.target.value }))} 
                      placeholder="Add a comment..." 
                      rows="3"
                    />
                  </div>
                </div>
                <div className="review-actions">
                  <button 
                    type="button" 
                    className="review-btn cancel" 
                    onClick={() => setShowReviewModal(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className={`review-btn ${reviewForm.status}`} 
                    disabled={loading}
                  >
                    {loading ? 'Processing...' : reviewForm.status === 'approved' ? 'Approve' : 'Reject'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
  );

  return noLayoutWrapper ? content : <SideTop>{content}</SideTop>;
} 