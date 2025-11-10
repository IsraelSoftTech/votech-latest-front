import React, { useState, useEffect, useMemo } from 'react';
import { FaPlus, FaEdit, FaTrash, FaEye, FaCheck, FaTimes, FaDownload, FaFileAlt, FaClock } from 'react-icons/fa';
import SideTop from './SideTop';
import SuccessMessage from './SuccessMessage';
import api from '../services/api';
import './LessonPlan.css';

export default function DeanLessonPlan() {
  const [lessonPlans, setLessonPlans] = useState([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [form, setForm] = useState({ title: '', period_type: 'weekly' });
  const [selectedFile, setSelectedFile] = useState(null);
  const [reviewForm, setReviewForm] = useState({ status: 'approved', admin_comment: '' });
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchUserRole();
  }, []);

  useEffect(() => {
    if (userRole) {
      fetchLessonPlans();
    }
  }, [userRole]);

  const fetchUserRole = async () => {
    try {
      const user = await api.getCurrentUser();
      console.log('🔍 DeanLessonPlan: User role fetched:', user);
      if (user && user.role) {
        setUserRole(user.role);
        return;
      }
      // Fallback to session storage
      const stored = sessionStorage.getItem('authUser');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.role) setUserRole(parsed.role);
      }
    } catch (err) {
      console.error('Error fetching user role:', err);
      const stored = sessionStorage.getItem('authUser');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.role) setUserRole(parsed.role);
      }
    }
  };

  const fetchLessonPlans = async () => {
    try {
      console.log('🔍 DeanLessonPlan: Fetching lesson plans, userRole:', userRole);
      setLoading(true);
      let lessonPlans = [];
      let lessons = [];
      
      // Fetch both lesson plans (uploaded files) and lessons (created content)
      if (userRole === 'Admin1' || userRole === 'Admin4' || userRole === 'Dean') {
        console.log('🔍 DeanLessonPlan: User is admin/dean, calling getAllLessonPlans() and getAllLessons()');
        
        // Fetch uploaded lesson plans (PDFs)
        try {
          lessonPlans = await api.getAllLessonPlans();
          console.log('🔍 DeanLessonPlan: getAllLessonPlans() returned:', lessonPlans);
        } catch (err) {
          console.error('🔍 DeanLessonPlan: Error fetching lesson plans:', err);
        }
        
        // Fetch created lessons (content-based)
        try {
          lessons = await api.getAllLessons();
          console.log('🔍 DeanLessonPlan: getAllLessons() returned:', lessons);
        } catch (err) {
          console.error('🔍 DeanLessonPlan: Error fetching lessons:', err);
        }
      } else {
        console.log('🔍 DeanLessonPlan: User is not admin/dean, calling getMyLessonPlans() and getMyLessons()');
        
        // Fetch user's lesson plans (PDFs)
        try {
          lessonPlans = await api.getMyLessonPlans();
          console.log('🔍 DeanLessonPlan: getMyLessonPlans() returned:', lessonPlans);
        } catch (err) {
          console.error('🔍 DeanLessonPlan: Error fetching my lesson plans:', err);
        }
        
        // Fetch user's lessons (content-based)
        try {
          lessons = await api.getMyLessons();
          console.log('🔍 DeanLessonPlan: getMyLessons() returned:', lessons);
        } catch (err) {
          console.error('🔍 DeanLessonPlan: Error fetching my lessons:', err);
        }
      }
      
      // Combine and mark the type for each item
      const combinedPlans = [
        ...lessonPlans.map(plan => ({ 
          ...plan, 
          type: 'file', 
          submitted_at: plan.submitted_at || plan.created_at,
          display_title: plan.title,
          display_content: 'PDF File Upload'
        })),
        ...lessons.map(lesson => ({ 
          ...lesson, 
          type: 'content', 
          submitted_at: lesson.created_at,
          display_title: lesson.title,
          display_content: lesson.subject ? `${lesson.subject} - ${lesson.class_name || 'No Class'}` : 'Content-based Lesson'
        }))
      ];
      
      // Sort by submission/creation date (newest first)
      combinedPlans.sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at));
      
      setLessonPlans(combinedPlans);
      console.log('🔍 DeanLessonPlan: Final combined plans set in state:', combinedPlans);
    } catch (err) {
      console.error('🔍 DeanLessonPlan: Error fetching lesson plans:', err);
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

  const handleViewFile = (fileUrl, plan) => {
    if (plan && plan.type === 'content') {
      // For content-based lessons, show a modal or navigate to edit view
      alert(`Content Lesson: ${plan.title}\nSubject: ${plan.subject || 'N/A'}\nClass: ${plan.class_name || 'N/A'}\nObjectives: ${plan.objectives || 'N/A'}`);
      return;
    }
    
    // For file-based lessons, open the PDF
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

  const handleDelete = async id => {
    if (!window.confirm('Are you sure you want to delete this lesson plan?')) return;
    
    try {
      const plan = lessonPlans.find(p => p.id === id);
      if (!plan) return;
      
      if (plan.type === 'content') {
        // Delete from lessons table
        await api.deleteLesson(id);
      } else {
        // Delete from lesson_plans table
        if (userRole === 'Dean' || userRole === 'Admin4') {
          await api.deleteLessonPlanAdmin(id);
        } else {
          await api.deleteLessonPlan(id);
        }
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
      if (selectedPlan.type === 'content') {
        // For content-based lessons
        await api.reviewLesson(selectedPlan.id, reviewForm.status, reviewForm.admin_comment);
      } else {
        // For file-based lesson plans
        await api.reviewLessonPlan(selectedPlan.id, reviewForm.status, reviewForm.admin_comment);
      }
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

  const getStatusCount = status => {
    return lessonPlans.filter(plan => plan.status === status).length;
  };

  const approvedPlans = useMemo(
    () => lessonPlans.filter((plan) => plan.status === 'approved'),
    [lessonPlans]
  );

  const formatDate = dateString => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Filter lesson plans based on search and status
  const filteredPlans = lessonPlans.filter(plan => {
    const matchesSearch = plan.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (plan.teacher_name && plan.teacher_name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = filterStatus === 'all' || plan.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const isDean = userRole === 'Dean';
  const isAdmin1 = userRole === 'Admin1';
  const isAdmin4 = userRole === 'Admin4';
  const canUpload = !isAdmin4 && !isDean; // Only Admin4 and Dean cannot upload, Admin1 can upload
  const canReview = isDean || isAdmin4; // Dean and Admin4 can review
  const showDashboard = isDean || isAdmin4; // Show enhanced dashboard for both Dean and Admin4

  return (
    <SideTop>
      <div className="lesson-plan-container">
        {/* Success/Error Messages */}
        {success && <SuccessMessage message={success} />}
        {error && <div className="error-message">{error}</div>}

        {/* Enhanced Dashboard Cards for Dean */}
        {showDashboard && (
          <div className="lesson-plan-stats-grid">
            <div className="lesson-plan-stat-card total">
              <div className="stat-icon">
                <FaFileAlt />
              </div>
              <div className="stat-content">
                <div className="stat-number">{lessonPlans.length}</div>
                <div className="stat-label">Total Submitted</div>
                <div className="stat-sublabel">All lesson plans</div>
              </div>
            </div>
            
            <div className="lesson-plan-stat-card pending">
              <div className="stat-icon">
                <FaClock />
              </div>
              <div className="stat-content">
                <div className="stat-number">{getStatusCount('pending')}</div>
                <div className="stat-label">Pending Review</div>
                <div className="stat-sublabel">Awaiting approval</div>
              </div>
            </div>
            
            <div className="lesson-plan-stat-card approved">
              <div className="stat-icon">
                <FaCheck />
              </div>
              <div className="stat-content">
                <div className="stat-number">{getStatusCount('approved')}</div>
                <div className="stat-label">Approved</div>
                <div className="stat-sublabel">Ready for use</div>
              </div>
            </div>
            
            <div className="lesson-plan-stat-card rejected">
              <div className="stat-icon">
                <FaTimes />
              </div>
              <div className="stat-content">
                <div className="stat-number">{getStatusCount('rejected')}</div>
                <div className="stat-label">Rejected</div>
                <div className="stat-sublabel">Need revision</div>
              </div>
            </div>
          </div>
        )}

        {/* Standard Dashboard Cards for Others */}
        {!showDashboard && (
          <div className="lesson-plan-cards">
            <div className="lesson-plan-card">
              <div className="count">{lessonPlans.length}</div>
              <div className="desc">Submitted Lesson Plans</div>
            </div>
            <div className="lesson-plan-card">
              <div className="count">{getStatusCount('pending')}</div>
              <div className="desc">Pending Review</div>
            </div>
            {(
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

        {/* Header with Actions */}
        <div className="lesson-plan-header">
          <div className="header-left">
            <h2>
              {isDean ? 'Dean Lesson Plan Management' : isAdmin4 ? 'Admin Lesson Plan Management' : 'Lesson Plans'}
            </h2>
            <p className="header-subtitle">
              {showDashboard ? 'Review and manage all submitted lesson plans' : 'Manage your lesson planning documents'}
            </p>
          </div>
          
          <div className="header-actions">
            {canUpload && (
              <button 
                className="action-btn upload-btn" 
                onClick={() => setShowUploadModal(true)}
              >
                <FaPlus /> Upload Plan
              </button>
            )}
          </div>
        </div>

        {/* Filters and Search - Only for Dean/Admin4 */}
        {showDashboard && (
          <div className="lesson-plan-filters">
            <div className="filter-group">
              <label>Filter by Status:</label>
              <select 
                value={filterStatus} 
                onChange={(e) => setFilterStatus(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            
            <div className="search-group">
              <input
                type="text"
                placeholder="Search by title or teacher name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
          </div>
        )}

        {/* Approved Lesson Plans Folder */}
        {showDashboard && (
          <div className="lesson-plan-approved-folder">
            <div className="approved-folder-header">
              <div>
                <h3>Approved Lesson Plans Archive</h3>
                <p>Every plan you approve appears here automatically for quick access.</p>
              </div>
              <span className="approved-count">{approvedPlans.length} stored</span>
            </div>
            <div className="approved-folder-body">
              {approvedPlans.length === 0 ? (
                <div className="approved-empty-state">
                  <FaFileAlt />
                  <p>No approved lesson plans yet.</p>
                </div>
              ) : (
                <div className="approved-grid">
                  {approvedPlans.map((plan) => (
                    <div key={plan.id} className="approved-card">
                      <div className="approved-card-meta">
                        <span className="approved-card-title">{plan.title}</span>
                        <span className="approved-card-info">
                          {plan.teacher_name || plan.teacher_username || 'Unknown'}
                        </span>
                        <span className="approved-card-date">{formatDate(plan.submitted_at)}</span>
                      </div>
                      <div className="approved-card-actions">
                        <button
                          className="approved-view-btn"
                          onClick={() => handleViewFile(plan.file_url, plan)}
                        >
                          Open
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Lesson Plans Table */}
        <div className="lesson-plan-table-wrapper">
          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Loading lesson plans...</p>
            </div>
          ) : filteredPlans.length === 0 ? (
            <div className="empty-state">
              <FaFileAlt className="empty-icon" />
              <h3>No lesson plans found</h3>
              <p>
                {searchTerm || filterStatus !== 'all' 
                  ? 'Try adjusting your search or filter criteria.' 
                  : showDashboard ? 'No lesson plans have been submitted yet.' : 'You haven\'t uploaded any lesson plans yet.'
                }
              </p>
            </div>
          ) : (
            <div className="table-container">
              <table className="lesson-plan-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Type</th>
                    <th>Content</th>
                    <th>Period</th>
                    <th>Status</th>
                    <th>Submitted</th>
                    {showDashboard && <th>Teacher</th>}
                    {showDashboard && <th>Role</th>}
                    {showDashboard && <th>Review</th>}
                    <th>Admin Comment</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPlans.map((plan) => (
                    <tr key={plan.id} className={`table-row ${plan.status}`}>
                      <td className="title-cell">
                        <div className="title-content">
                          <span className="title-text">{plan.title}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`period-badge period-${plan.period_type}`}>
                          {plan.type === 'file' ? 'File' : 'Content'}
                        </span>
                      </td>
                      <td>
                        <span className="content-cell">
                          {plan.type === 'file' ? (
                            <a href="#" onClick={(e) => { e.preventDefault(); handleViewFile(plan.file_url, plan); }}>
                              {plan.display_content}
                            </a>
                          ) : (
                            plan.display_content
                          )}
                        </span>
                      </td>
                      <td>
                        <span className={`period-badge period-${plan.period_type}`}>
                          {plan.period_type}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge status-${plan.status}`}>
                          <span className="status-dot"></span>
                          {plan.status}
                        </span>
                      </td>
                      <td className="date-cell">{formatDate(plan.submitted_at)}</td>
                      {showDashboard && (
                        <td className="teacher-cell">
                          <div className="teacher-info">
                            <span className="teacher-name">
                              {plan.teacher_name || plan.teacher_username || 'Unknown User'}
                            </span>
                          </div>
                        </td>
                      )}
                      {showDashboard && (
                        <td>
                          <span className="role-badge">
                            {plan.teacher_role || '-'}
                          </span>
                        </td>
                      )}
                      {showDashboard && (
                        <td className="review-cell">
                          {plan.admin_comment ? (
                            <span className="reviewed-badge">Reviewed</span>
                          ) : (
                            <span className="not-reviewed-badge">Not Reviewed</span>
                          )}
                        </td>
                      )}
                      <td>
                        {plan.admin_comment ? (
                          <span 
                            title={plan.admin_comment} 
                            style={{ 
                              cursor: 'help', 
                              color: plan.status === 'rejected' ? '#dc3545' : plan.status === 'approved' ? '#28a745' : '#6c757d',
                              fontWeight: '500'
                            }}
                          >
                            {plan.admin_comment.length > 30 ? `${plan.admin_comment.substring(0, 30)}...` : plan.admin_comment}
                          </span>
                        ) : (
                          <span style={{ color: '#6c757d' }}>-</span>
                        )}
                      </td>
                      <td className="actions-cell">
                        <div className="action-buttons">
                          <button 
                            className="action-btn view" 
                            onClick={() => handleViewFile(plan.file_url, plan)}
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
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Upload Modal */}
        {showUploadModal && (
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
        {showEditModal && selectedPlan && (
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
        {showReviewModal && selectedPlan && (
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
    </SideTop>
  );
} 