import React, { useState, useEffect, useMemo } from 'react';
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaEye,
  FaCheck,
  FaTimes,
  FaDownload,
  FaFileAlt,
  FaClock,
  FaFolderOpen,
  FaCheckCircle,
  FaTimesCircle,
} from 'react-icons/fa';
import SideTop from './SideTop';
import SuccessMessage from './SuccessMessage';
import api from '../services/api';
import { PageHeader } from './marks-module/components/PageHeader/PageHeader.component';
import Stats from './marks-module/components/Stats/Stats.component';
import './marks-module/components/PageHeader/PageHeader.styles.css';
import './marks-module/components/Stats/Stats.styles.css';
import './LessonPlan.css';
import LessonPlanPagination from './LessonPlanPagination';

const PAGE_SIZE = 15;
const MERGE_FETCH_LIMIT = 500;

export default function DeanLessonPlan() {
  const [lessonPlans, setLessonPlans] = useState([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showApprovedModal, setShowApprovedModal] = useState(false);
  const [savingAll, setSavingAll] = useState(false);
  const [saveProgress, setSaveProgress] = useState({ current: 0, total: 0 });
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
  const [filterClass, setFilterClass] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [classes, setClasses] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [page, setPage] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    fetchUserRole();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [userRole, filterStatus, filterClass, filterDepartment, debouncedSearch]);

  useEffect(() => {
    if (userRole) {
      fetchLessonPlans();
    }
  }, [userRole, filterStatus, filterClass, filterDepartment, debouncedSearch]);

  useEffect(() => {
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
  }, []);

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

      const filters = {
        status: filterStatus !== 'all' ? filterStatus : undefined,
        search: debouncedSearch.trim() || undefined,
        class: filterClass || undefined,
        department: filterDepartment || undefined,
        page: '1',
        limit: String(MERGE_FETCH_LIMIT),
      };
      
      // Fetch both lesson plans (uploaded files) and lessons (created content)
      if (userRole === 'Admin1' || userRole === 'Admin4' || userRole === 'Dean') {
        console.log('🔍 DeanLessonPlan: User is admin/dean, calling getAllLessonPlans() and getAllLessons()');
        
        // Fetch uploaded lesson plans (PDFs)
        try {
          const plansResult = await api.getAllLessonPlans(filters);
          lessonPlans = plansResult.items || [];
          console.log('🔍 DeanLessonPlan: getAllLessonPlans() returned:', lessonPlans);
        } catch (err) {
          console.error('🔍 DeanLessonPlan: Error fetching lesson plans:', err);
        }
        
        // Fetch created lessons (content-based)
        try {
          const lessonsResult = await api.getAllLessons(filters);
          lessons = lessonsResult.items || [];
          console.log('🔍 DeanLessonPlan: getAllLessons() returned:', lessons);
        } catch (err) {
          console.error('🔍 DeanLessonPlan: Error fetching lessons:', err);
        }
      } else {
        console.log('🔍 DeanLessonPlan: User is not admin/dean, calling getMyLessonPlans() and getMyLessons()');
        
        // Fetch user's lesson plans (PDFs)
        try {
          const plansResult = await api.getMyLessonPlans(filters);
          lessonPlans = plansResult.items || [];
          console.log('🔍 DeanLessonPlan: getMyLessonPlans() returned:', lessonPlans);
        } catch (err) {
          console.error('🔍 DeanLessonPlan: Error fetching my lesson plans:', err);
        }
        
        // Fetch user's lessons (content-based)
        try {
          const lessonsResult = await api.getMyLessons(filters);
          lessons = lessonsResult.items || [];
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

  const getAuthHeadersFromStorage = () => {
    try {
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      if (token) return { Authorization: `Bearer ${token}` };
    } catch (_) {}
    return {};
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

  const handleSaveAllApproved = async () => {
    try {
      const files = approvedPlans
        .filter(p => p.type === 'file' && p.file_url)
        .map(p => ({
          url: resolveFileUrl(p.file_url),
          name: `${(p.title || 'lesson_plan').replace(/[^a-z0-9_\-\s]/gi, '_')}.pdf`
        }));
      if (files.length === 0) {
        alert('There are no approved file-based lesson plans to save.');
        return;
      }

      setSavingAll(true);
      setSaveProgress({ current: 0, total: files.length });

      // Trigger individual downloads (browser saves to default downloads folder)
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        let downloaded = false;
        try {
          const headers = { ...getAuthHeadersFromStorage(), Accept: 'application/pdf' };
          const resp = await fetch(f.url, { credentials: 'include', mode: 'cors', headers }).catch(() => null);
          if (resp && resp.ok) {
            const ct = resp.headers.get('content-type') || '';
            const blob = await resp.blob();
            if (ct.includes('pdf') || f.name.toLowerCase().endsWith('.pdf')) {
              downloadBlob(blob, f.name);
              downloaded = true;
            }
          }
        } catch (_) {}
        if (!downloaded) {
          // Fallback: open in new tab to let the browser handle the download
          const a = document.createElement('a');
          a.href = f.url;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          a.download = f.name;
          document.body.appendChild(a);
          // Space out to reduce popup blocking
          await new Promise(r => setTimeout(r, 60));
          a.click();
          a.remove();
        }
        setSaveProgress({ current: i + 1, total: files.length });
        await new Promise(r => setTimeout(r, 180));
      }
    } catch (e) {
      console.error('Save all approved failed:', e);
      setError('Failed to save approved lesson plans');
      setTimeout(() => setError(''), 2500);
    } finally {
      setSavingAll(false);
    }
  };

  const handleDownloadSingle = async (plan) => {
    if (!plan || plan.type !== 'file' || !plan.file_url) return;
    try {
      const url = resolveFileUrl(plan.file_url);
      const headers = { ...getAuthHeadersFromStorage(), Accept: 'application/pdf' };
      const resp = await fetch(url, { credentials: 'include', mode: 'cors', headers }).catch(() => null);
      if (resp && resp.ok) {
        const ct = resp.headers.get('content-type') || '';
        const blob = await resp.blob();
        const filename = `${(plan.title || 'lesson_plan').replace(/[^a-z0-9_\-\s]/gi, '_')}.pdf`;
        if (ct.includes('pdf') || filename.toLowerCase().endsWith('.pdf')) {
          downloadBlob(blob, filename);
          return;
        }
      }
      // Fallback: open in new tab
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.download = `${(plan.title || 'lesson_plan').replace(/[^a-z0-9_\-\s]/gi, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      console.error('Download failed:', e);
    }
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

  const isDean = userRole === 'Dean';
  const isAdmin1 = userRole === 'Admin1';
  const isAdmin4 = userRole === 'Admin4';
  const canUpload = !isAdmin4 && !isDean; // Only Admin4 and Dean cannot upload, Admin1 can upload
  const canReview = isDean || isAdmin4; // Dean and Admin4 can review
  const showDashboard = isDean || isAdmin4; // Show enhanced dashboard for both Dean and Admin4

  // Server-side filtering for Admin4/Dean dashboard; client-side for teachers
  const filteredPlans = showDashboard
    ? lessonPlans
    : lessonPlans.filter((plan) => {
        const matchesSearch =
          !searchTerm ||
          plan.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (plan.teacher_name &&
            plan.teacher_name.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesStatus =
          filterStatus === 'all' || plan.status === filterStatus;
        return matchesSearch && matchesStatus;
      });

  const totalRecords = filteredPlans.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / PAGE_SIZE));
  const paginatedPlans = filteredPlans.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const pageTitle = isDean
    ? 'Dean Lesson Plan Management'
    : isAdmin4
      ? 'Admin Lesson Plan Management'
      : 'Lesson Plans';

  const pageSubtitle = showDashboard
    ? 'Review, filter, and manage submitted lesson plans by class and department'
    : 'Manage your lesson planning documents';

  const statsData = useMemo(
    () => [
      { title: showDashboard ? 'Total Submitted' : 'Submitted', value: lessonPlans.length, icon: FaFileAlt },
      { title: 'Pending Review', value: getStatusCount('pending'), icon: FaClock },
      { title: 'Approved', value: getStatusCount('approved'), icon: FaCheckCircle },
      { title: 'Rejected', value: getStatusCount('rejected'), icon: FaTimesCircle },
    ],
    [lessonPlans, showDashboard]
  );

  const downloadableApprovedCount = approvedPlans.filter(
    (p) => p.type === 'file' && p.file_url
  ).length;

  return (
    <SideTop>
      <div className="lesson-plan-page">
        {success && <SuccessMessage message={success} />}
        {error && <div className="lp-alert lp-alert-error">{error}</div>}

        <PageHeader
          title={pageTitle}
          subtitle={pageSubtitle}
          actions={
            <>
              {showDashboard && (
                <>
                  <button
                    type="button"
                    className="lp-btn-secondary"
                    onClick={() => setShowApprovedModal(true)}
                    title="Open approved lesson plans archive"
                  >
                    <FaFolderOpen /> Archive ({approvedPlans.length})
                  </button>
                  <button
                    type="button"
                    className="lp-btn-secondary"
                    onClick={handleSaveAllApproved}
                    disabled={savingAll || downloadableApprovedCount === 0}
                  >
                    <FaDownload />
                    {savingAll
                      ? `Downloading ${saveProgress.current}/${saveProgress.total}…`
                      : 'Download All Approved'}
                  </button>
                </>
              )}
              {canUpload && (
                <button
                  type="button"
                  className="lp-btn-primary"
                  onClick={() => setShowUploadModal(true)}
                >
                  <FaPlus /> Upload Plan
                </button>
              )}
            </>
          }
        />

        <Stats data={statsData} loading={loading && lessonPlans.length === 0} skeletonCount={4} />

        {showDashboard && (
          <div className="lp-toolbar">
            <div className="lp-filter-grid">
              <div className="lp-filter-field">
                <label htmlFor="lp-filter-class">Class</label>
                <select
                  id="lp-filter-class"
                  value={filterClass}
                  onChange={(e) => setFilterClass(e.target.value)}
                >
                  <option value="">All Classes</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="lp-filter-field">
                <label htmlFor="lp-filter-dept">Department</label>
                <select
                  id="lp-filter-dept"
                  value={filterDepartment}
                  onChange={(e) => setFilterDepartment(e.target.value)}
                >
                  <option value="">All Departments</option>
                  {specialties.map((spec) => (
                    <option key={spec.id} value={spec.id}>
                      {spec.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="lp-filter-field">
                <label htmlFor="lp-filter-status">Status</label>
                <select
                  id="lp-filter-status"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <div className="lp-filter-field lp-search-field">
                <label htmlFor="lp-filter-search">Search</label>
                <input
                  id="lp-filter-search"
                  type="text"
                  placeholder="Title, teacher, subject, or filename…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        <div className="lp-panel">
          <div className="lp-panel-head">
            <h3 className="lp-panel-title">Lesson Plans</h3>
            <span className="lp-panel-meta">
              {loading
                ? 'Loading…'
                : totalRecords > 0
                  ? `${totalRecords} record(s) total`
                  : '0 record(s)'}
            </span>
          </div>
          <div className="lp-table-scroll">
        <div className="lesson-plan-table-wrapper">
          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Loading lesson plans...</p>
            </div>
          ) : paginatedPlans.length === 0 ? (
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
                    <th>Class</th>
                    <th>Department</th>
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
                  {paginatedPlans.map((plan) => (
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
                      <td>{plan.class_label || plan.class_name || '—'}</td>
                      <td>{plan.department_name || '—'}</td>
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

                          {plan.status === 'approved' && plan.type === 'file' && plan.file_url && (
                            <button
                              className="action-btn view"
                              onClick={() => handleDownloadSingle(plan)}
                              title="Download"
                            >
                              <FaDownload />
                            </button>
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
        <LessonPlanPagination
          page={page}
          totalPages={totalPages}
          total={totalRecords}
          pageSize={PAGE_SIZE}
          onPageChange={setPage}
          loading={loading}
        />
          </div>
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

      {/* Approved Archive Modal */}
      {showApprovedModal && (
        <div className="lesson-plan-modal-overlay" onClick={() => setShowApprovedModal(false)}>
          <div className="approved-archive-modal" onClick={(e) => e.stopPropagation()}>
            <button className="lesson-plan-modal-close" onClick={() => setShowApprovedModal(false)}>×</button>
            <div className="approved-archive-header">
              <h2><FaFolderOpen style={{ marginRight: 8 }} /> Approved Lesson Plans</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button 
                  className="approved-downloadall-btn" 
                  onClick={handleSaveAllApproved}
                  disabled={savingAll || approvedPlans.length === 0}
                >
                  {savingAll ? `Downloading ${saveProgress.current}/${saveProgress.total}...` : 'Download All'}
                </button>
                <span className="approved-count">{approvedPlans.length} stored</span>
              </div>
            </div>
            <div className="approved-list">
              {approvedPlans.length === 0 ? (
                <div className="approved-empty-state" style={{ padding: 20 }}>
                  <FaFileAlt />
                  <p>No approved lesson plans found.</p>
                </div>
              ) : (
                <table className="approved-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Title</th>
                      <th>Teacher</th>
                      <th>Submitted</th>
                      <th>Download</th>
                    </tr>
                  </thead>
                  <tbody>
                    {approvedPlans
                      .filter(p => p.type === 'file' && p.file_url)
                      .map((plan, idx) => (
                        <tr key={plan.id}>
                          <td>{idx + 1}</td>
                          <td>{plan.title}</td>
                          <td>{plan.teacher_name || plan.teacher_username || '-'}</td>
                          <td>{formatDate(plan.submitted_at)}</td>
                          <td>
                            <button 
                              className="approved-download-link" 
                              onClick={() => handleDownloadSingle(plan)}
                              title="Download PDF"
                            >
                              <FaDownload style={{ marginRight: 6 }} /> Download
                            </button>
                          </td>
                        </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </SideTop>
  );
} 