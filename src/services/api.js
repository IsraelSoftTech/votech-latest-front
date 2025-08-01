import config from '../config';

// For local development, use the local backend API:
// const API_URL = 'http://localhost:5000/api';
// For production, use the production backend API:
const API_URL = config.API_URL;
// console.log('API URL:', API_URL);

class ApiService {
  constructor() {
    // Initialize token and user from sessionStorage
    this.token = sessionStorage.getItem('token');
    this.user = JSON.parse(sessionStorage.getItem('authUser'));
    console.log('API Service initialized with token:', this.token ? 'Present' : 'Not present');
  }

  setToken(token) {
    console.log('Setting new token');
    this.token = token;
    if (token) {
      sessionStorage.setItem('token', token);
    } else {
      this.clearToken();
    }
  }

  getToken() {
    return this.token;
  }

  clearToken() {
    console.log('Clearing token and user data');
    this.token = null;
    this.user = null;
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('authUser');
  }

  getAuthHeaders() {
    const token = this.getToken();
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
  }

  async handleResponse(response) {
    if (!response.ok) {
      const text = await response.text();
      let error;
      try {
        error = JSON.parse(text);
      } catch (e) {
        error = { error: text };
      }

      if (response.status === 401 || response.status === 403) {
        this.clearToken();
        throw new Error('Session expired. Please login again.');
      }
      throw new Error(error.details || error.error || 'Request failed');
    }

    const data = await response.json();
    return data;
  }

  async login(username, password) {
    try {
      console.log('Attempting login for:', username);
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      const data = await this.handleResponse(response);
      
      if (data.token) {
        console.log('Login successful, setting token');
        this.setToken(data.token);
        if (data.user) {
          this.user = data.user;
          sessionStorage.setItem('authUser', JSON.stringify(data.user));
        }
        return data;
      }
      
      throw new Error('No token received from server');
    } catch (error) {
      console.error('Login failed:', error);
      this.clearToken();
      throw error;
    }
  }

  async createAccount({ username, contact, password, role }) {
    try {
      console.log('Sending registration request:', { username, contact, password, role });
      const response = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, contact, password, role }),
      });

      // First try to parse the response as text
      const text = await response.text();
      console.log('Raw response:', text);

      // Then try to parse it as JSON
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error('Failed to parse response as JSON:', e);
        throw new Error('Server returned invalid JSON response');
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create account');
      }

      return data;
    } catch (error) {
      console.error('Account creation error:', error);
      throw error;
    }
  }

  // Remove all methods related to students (getStudents, createStudent, updateStudent, deleteStudent, uploadStudents, etc.)

  // User management endpoints
  async getUsers() {
    try {
      const response = await fetch(`${API_URL}/users`, {
        headers: this.getAuthHeaders(),
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Get users error:', error);
      throw error;
    }
  }

  async getCurrentUser() {
    try {
      const response = await fetch(`${API_URL}/users/current`, {
        headers: this.getAuthHeaders(),
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Get current user error:', error);
      throw error;
    }
  }

  async logout() {
    try {
      const response = await fetch(`${API_URL}/logout`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
      });

      await this.handleResponse(response);
      this.clearToken();
    } catch (error) {
      console.error('Logout error:', error);
      this.clearToken();
      throw error;
    }
  }

  async checkUser(username) {
    try {
      const response = await fetch(`${API_URL}/check-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username }),
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Check user error:', error);
      throw error;
    }
  }

  async resetPassword(username, newPassword) {
    try {
      const response = await fetch(`${API_URL}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, newPassword }),
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Reset password error:', error);
      throw error;
    }
  }

  async changePassword(currentPassword, newPassword) {
    try {
      const response = await fetch(`${API_URL}/change-password`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Change password error:', error);
      throw error;
    }
  }

  async getStudentAnalyticsDaily(year) {
    try {
      const url = year ? `${API_URL}/students/analytics/daily?year=${year}` : `${API_URL}/students/analytics/daily`;
      const response = await fetch(url, {
        headers: this.getAuthHeaders(),
      });
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Get student analytics error:', error);
      throw error;
    }
  }

  // Specialties endpoints
  async getSpecialties() {
    const response = await fetch(`${API_URL}/specialties`, { headers: this.getAuthHeaders() });
    return await this.handleResponse(response);
  }
  async createSpecialty(data) {
    const response = await fetch(`${API_URL}/specialties`, {
      method: 'POST',
      headers: { ...this.getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await this.handleResponse(response);
  }
  async updateSpecialty(id, data) {
    const response = await fetch(`${API_URL}/specialties/${id}`, {
      method: 'PUT',
      headers: { ...this.getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await this.handleResponse(response);
  }
  async deleteSpecialty(id) {
    const response = await fetch(`${API_URL}/specialties/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });
    return await this.handleResponse(response);
  }

  async assignClassesToSpecialty(specialtyId, classIds) {
    const response = await fetch(`${API_URL}/specialties/${specialtyId}/classes`, {
      method: 'PUT',
      headers: { ...this.getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ classIds })
    });
    return await this.handleResponse(response);
  }
  async getClassesForSpecialty(specialtyId) {
    const response = await fetch(`${API_URL}/specialties/${specialtyId}/classes`, {
      headers: this.getAuthHeaders()
    });
    return await this.handleResponse(response);
  }

  // Class endpoints
  async getClasses() {
    try {
      const response = await fetch(`${API_URL}/classes`, {
        headers: this.getAuthHeaders(),
      });
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Get classes error:', error);
      throw error;
    }
  }

  async createClass(classData) {
    try {
      const response = await fetch(`${API_URL}/classes`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(classData),
      });
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Create class error:', error);
      throw error;
    }
  }

  async updateClass(id, classData) {
    try {
      const response = await fetch(`${API_URL}/classes/${id}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(classData),
      });
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Update class error:', error);
      throw error;
    }
  }

  async deleteClass(id) {
    try {
      const response = await fetch(`${API_URL}/classes/${id}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      });
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Delete class error:', error);
      throw error;
    }
  }

  async checkUserDetails(username, contact) {
    try {
      const response = await fetch(`${API_URL}/check-user-details`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, contact })
      });
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Check user details error:', error);
      throw error;
    }
  }

  // User management for Admin3
  async getAllUsers() {
    const response = await fetch(`${API_URL}/users/all`, {
      headers: this.getAuthHeaders(),
    });
    return await this.handleResponse(response);
  }
  async updateUser(id, data) {
    const response = await fetch(`${API_URL}/users/${id}`, {
      method: 'PUT',
      headers: { ...this.getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return await this.handleResponse(response);
  }
  async deleteUser(id) {
    const response = await fetch(`${API_URL}/users/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    return await this.handleResponse(response);
  }
  async suspendUser(id) {
    const response = await fetch(`${API_URL}/users/${id}/suspend`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });
    return await this.handleResponse(response);
  }

  async createStudent(formData) {
    const response = await fetch(`${API_URL}/students`, {
      method: 'POST',
      body: formData
    });
    if (!response.ok) {
      let error;
      try { error = await response.json(); } catch (e) { error = { error: 'Failed to register student' }; }
      throw new Error(error.error || 'Failed to register student');
    }
    return await response.json();
  }

  async getStudents() {
    const response = await fetch(`${API_URL}/students`);
    if (!response.ok) throw new Error('Failed to fetch students');
    return await response.json();
  }

  async deleteStudent(id) {
    const response = await fetch(`${API_URL}/students/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      let error;
      try { error = await response.json(); } catch (e) { error = { error: 'Failed to delete student' }; }
      throw new Error(error.error || 'Failed to delete student');
    }
    return await response.json();
  }

  async uploadManyStudents(formData) {
    const response = await fetch(`${API_URL}/students/upload-many`, {
      method: 'POST',
      body: formData
    });
    if (!response.ok) {
      let error;
      try { error = await response.json(); } catch (e) { error = { error: 'Failed to upload students' }; }
      throw new Error(error.error || 'Failed to upload students');
    }
    return await response.json();
  }

  async getClassFeeStats(classId) {
    const response = await fetch(`${API_URL}/fees/class/${classId}`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch class fee stats');
    return await response.json();
  }

  async searchStudents(query) {
    const response = await fetch(`${API_URL}/students/search?query=${encodeURIComponent(query)}`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to search students');
    return await response.json();
  }

  async getStudentFeeStats(studentId) {
    const response = await fetch(`${API_URL}/student/${studentId}/fees`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch student fee stats');
    return await response.json();
  }

  async payStudentFee({ student_id, class_id, fee_type, amount }) {
    const response = await fetch(`${API_URL}/fees`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ student_id, class_id, fee_type, amount })
    });
    if (!response.ok) throw new Error('Failed to record payment');
    return await response.json();
  }

  // Message endpoints
  async getMessages(userId) {
    const response = await fetch(`${API_URL}/messages/${userId}`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch messages');
    return await response.json();
  }
  async sendMessage(receiver_id, content) {
    const response = await fetch(`${API_URL}/messages`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ receiver_id, content })
    });
    if (!response.ok) throw new Error('Failed to send message');
    return await response.json();
  }

  async sendMessageWithFile(receiver_id, content, file) {
    const formData = new FormData();
    formData.append('receiver_id', receiver_id);
    if (content) formData.append('content', content);
    if (file) formData.append('file', file);

    const authHeaders = this.getAuthHeaders();
    const headers = {};
    headers['Authorization'] = authHeaders['Authorization'];

    const response = await fetch(`${API_URL}/messages/with-file`, {
      method: 'POST',
      headers: headers,
      body: formData
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Message with file failed:', response.status, errorText);
      throw new Error(`Failed to send message with file: ${response.status} ${errorText}`);
    }
    
    return await response.json();
  }

  // Group chat methods
  async createGroup(name, participant_ids) {
    const response = await fetch(`${API_URL}/groups`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ name, participant_ids })
    });
    if (!response.ok) throw new Error('Failed to create group');
    return await response.json();
  }

  async deleteGroup(groupId) {
    const response = await fetch(`${API_URL}/groups/${groupId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to delete group');
    return await response.json();
  }

  async getGroups() {
    const response = await fetch(`${API_URL}/groups`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch groups');
    return await response.json();
  }

  async getGroupMessages(groupId) {
    const response = await fetch(`${API_URL}/groups/${groupId}/messages`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch group messages');
    return await response.json();
  }

  async sendGroupMessage(groupId, content) {
    const response = await fetch(`${API_URL}/groups/${groupId}/messages`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ content })
    });
    if (!response.ok) throw new Error('Failed to send group message');
    return await response.json();
  }

  async sendGroupMessageWithFile(groupId, content, file) {
    const formData = new FormData();
    if (content) formData.append('content', content);
    if (file) formData.append('file', file);

    const authHeaders = this.getAuthHeaders();
    const headers = {};
    headers['Authorization'] = authHeaders['Authorization'];

    console.log('Sending group message with file:', { groupId, content, fileName: file.name, fileSize: file.size, fileType: file.type });

    const response = await fetch(`${API_URL}/groups/${groupId}/messages/with-file`, {
      method: 'POST',
      headers: headers,
      body: formData
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Group message with file failed:', response.status, errorText);
      throw new Error(`Failed to send group message with file: ${response.status} ${errorText}`);
    }
    
    const result = await response.json();
    console.log('Group message with file success:', result);
    return result;
  }

  async getGroupParticipants(groupId) {
    const response = await fetch(`${API_URL}/groups/${groupId}/participants`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch group participants');
    return await response.json();
  }

  // Mark all messages from userId as read
  async markMessagesRead(userId) {
    const response = await fetch(`${API_URL}/messages/${userId}/read`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to mark messages as read');
    return await response.json();
  }

  // Mark all group messages as read
  async markMessagesReadGroup(groupId) {
    const response = await fetch(`${API_URL}/groups/${groupId}/read`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to mark group messages as read');
    return await response.json();
  }

  // Get all users for chat (all roles)
  async getAllUsersForChat() {
    const response = await fetch(`${API_URL}/users/all-chat`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch users');
    return await response.json();
  }

  // Get chat list for sidebar (last message, unread count, etc.)
  async getChatList() {
    const response = await fetch(`${API_URL}/users/chat-list`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch chat list');
    return await response.json();
  }

  // Attendance endpoints
  async startAttendanceSession(class_id, session_time) {
    const response = await fetch(`${API_URL}/attendance/start`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ class_id, session_time })
    });
    return await this.handleResponse(response);
  }

  async getAttendanceClasses() {
    const response = await fetch(`${API_URL}/attendance/classes`, {
      headers: this.getAuthHeaders()
    });
    return await this.handleResponse(response);
  }

  async getAttendanceStudents(classId) {
    const response = await fetch(`${API_URL}/attendance/${classId}/students`, {
      headers: this.getAuthHeaders()
    });
    return await this.handleResponse(response);
  }

  async markAttendance(sessionId, student_id, status) {
    const response = await fetch(`${API_URL}/attendance/${sessionId}/mark`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ student_id, status })
    });
    return await this.handleResponse(response);
  }

  async getTodayAttendanceSummary() {
    const response = await fetch(`${API_URL}/attendance/today-summary`, {
      headers: this.getAuthHeaders()
    });
    return await this.handleResponse(response);
  }

  async deleteAllAttendance() {
    const response = await fetch(`${API_URL}/attendance/all`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });
    return await this.handleResponse(response);
  }

  // Teacher endpoints
  async getAllTeachers() {
    const response = await fetch(`${API_URL}/teachers`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch teachers');
    return await response.json();
  }
  async addTeacher(data) {
    const response = await fetch(`${API_URL}/teachers`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to add teacher');
    return await response.json();
  }
  async updateTeacher(id, data) {
    const response = await fetch(`${API_URL}/teachers/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update teacher');
    return await response.json();
  }
  async deleteTeacher(id) {
    const response = await fetch(`${API_URL}/teachers/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to delete teacher');
    return await response.json();
  }
  async approveTeacher(id, status) {
    const response = await fetch(`${API_URL}/teachers/${id}/status`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ status }),
    });
    if (!response.ok) throw new Error('Failed to update teacher status');
    return await response.json();
  }

  // Subject endpoints
  async getSubjects() {
    const response = await fetch(`${API_URL}/subjects`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch subjects');
    return await response.json();
  }
  async createSubject(data) {
    const response = await fetch(`${API_URL}/subjects`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to create subject');
    return await response.json();
  }
  async updateSubject(id, data) {
    const response = await fetch(`${API_URL}/subjects/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update subject');
    return await response.json();
  }
  async deleteSubject(id) {
    const response = await fetch(`${API_URL}/subjects/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to delete subject');
    return await response.json();
  }

  // Inventory API
  async getInventory(type = 'income') {
    const response = await fetch(`${API_URL}/inventory?type=${type}`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch inventory');
    return await response.json();
  }

  async registerInventoryItem(data) {
    const response = await fetch(`${API_URL}/inventory`, {
      method: 'POST',
      headers: { ...this.getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to register item');
    return await response.json();
  }

  async deleteInventoryItem(id) {
    const response = await fetch(`${API_URL}/inventory/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to delete item');
    return await response.json();
  }

  async editInventoryItem(id, data) {
    const response = await fetch(`${API_URL}/inventory/${id}`, {
      method: 'PUT',
      headers: { ...this.getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update item');
    return await response.json();
  }

  async getDepartments() {
    const response = await fetch(`${API_URL}/departments`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch departments');
    return await response.json();
  }

  // Get all students
  async getAllStudents() {
    const response = await fetch(`${API_URL}/students`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  // === Lesson Plans API ===
  
  async uploadLessonPlan(formData) {
    const authHeaders = this.getAuthHeaders();
    const headers = {};
    
    // For FormData, only include Authorization header, not Content-Type
    headers['Authorization'] = authHeaders['Authorization'];
    
    const response = await fetch(`${API_URL}/lesson-plans`, {
      method: 'POST',
      headers: headers,
      body: formData,
    });
    if (!response.ok) throw new Error('Failed to upload lesson plan');
    return await response.json();
  }

  async getMyLessonPlans() {
    const response = await fetch(`${API_URL}/lesson-plans/my`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch lesson plans');
    return await response.json();
  }

  async getAllLessonPlans() {
    const response = await fetch(`${API_URL}/lesson-plans/all`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch all lesson plans');
    return await response.json();
  }

  async updateLessonPlan(id, formData) {
    const authHeaders = this.getAuthHeaders();
    const headers = {};
    
    // For FormData, only include Authorization header, not Content-Type
    headers['Authorization'] = authHeaders['Authorization'];
    
    const response = await fetch(`${API_URL}/lesson-plans/${id}`, {
      method: 'PUT',
      headers: headers,
      body: formData,
    });
    if (!response.ok) throw new Error('Failed to update lesson plan');
    return await response.json();
  }

  async deleteLessonPlan(id) {
    const response = await fetch(`${API_URL}/lesson-plans/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to delete lesson plan');
    return await response.json();
  }

  async reviewLessonPlan(id, status, adminComment) {
    const response = await fetch(`${API_URL}/lesson-plans/${id}/review`, {
      method: 'PUT',
      headers: {
        ...this.getAuthHeaders(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status, admin_comment: adminComment }),
    });
    if (!response.ok) throw new Error('Failed to review lesson plan');
    return await response.json();
  }

  async deleteLessonPlanAdmin(id) {
    const response = await fetch(`${API_URL}/lesson-plans/${id}/admin`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to delete lesson plan');
    return await response.json();
  }

  // Test method to check if lesson plans are working
  async testLessonPlans() {
    const response = await fetch(`${API_URL}/lesson-plans/test`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to test lesson plans');
    return await response.json();
  }

  // === Marks Management API ===
  
  async getUploadedMarks() {
    const response = await fetch(`${API_URL}/marks`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch uploaded marks');
    return await response.json();
  }

  async uploadMarks(formData) {
    const authHeaders = this.getAuthHeaders();
    const headers = {};
    
    // For FormData, only include Authorization header, not Content-Type
    headers['Authorization'] = authHeaders['Authorization'];
    
    const response = await fetch(`${API_URL}/marks/upload`, {
      method: 'POST',
      headers: headers,
      body: formData,
    });
    if (!response.ok) throw new Error('Failed to upload marks');
    return await response.json();
  }

  async deleteMarks(marksId) {
    const response = await fetch(`${API_URL}/marks/${marksId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to delete marks');
    return await response.json();
  }

  async updateMarks(marksId, formData) {
    const authHeaders = this.getAuthHeaders();
    const headers = {};
    
    // For FormData, only include Authorization header, not Content-Type
    headers['Authorization'] = authHeaders['Authorization'];
    
    const response = await fetch(`${API_URL}/marks/${marksId}`, {
      method: 'PUT',
      headers: headers,
      body: formData,
    });
    if (!response.ok) throw new Error('Failed to update marks');
    return await response.json();
  }

  async getMarksByClassAndSequence(classId, sequenceId) {
    const response = await fetch(`${API_URL}/marks/${classId}/${sequenceId}`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch marks');
    return await response.json();
  }

  async getMarksStatistics() {
    const response = await fetch(`${API_URL}/marks/statistics`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch marks statistics');
    return await response.json();
  }

  // Get students by class
  async getStudentsByClass(classId) {
    const response = await fetch(`${API_URL}/students/class/${classId}`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to fetch students for class');
    return await response.json();
  }

  // Test students table access
  async testStudentsTable() {
    const response = await fetch(`${API_URL}/students/test`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to test students table');
    return await response.json();
  }

  // Test marks table access
  async testMarksTable() {
    const response = await fetch(`${API_URL}/marks/test`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Failed to test marks table');
    return await response.json();
  }

  // Test specific marks record access
  async testMarksRecord(marksId) {
    const response = await fetch(`${API_URL}/marks/test/${marksId}`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  // === Applications API ===
  
  async getApplications() {
    try {
      const response = await fetch(`${API_URL}/applications`, {
        headers: this.getAuthHeaders(),
      });
      
      // Handle response manually to avoid automatic logout
      if (!response.ok) {
        const text = await response.text();
        let error;
        try {
          error = JSON.parse(text);
        } catch (e) {
          error = { error: text };
        }
        
        // Only logout for actual authentication errors, not business logic errors
        if (response.status === 401) {
          this.clearToken();
          throw new Error('Session expired. Please login again.');
        }
        
        throw new Error(error.details || error.error || 'Failed to fetch applications');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Get applications error:', error);
      throw error;
    }
  }

  async getUserApplication(userId) {
    try {
      const response = await fetch(`${API_URL}/applications/user/${userId}`, {
        headers: this.getAuthHeaders(),
      });
      
      // Handle 404 gracefully (user has no application yet)
      if (response.status === 404) {
        return null;
      }
      
      return this.handleResponse(response);
    } catch (error) {
      console.error('Get user application error:', error);
      // Don't throw error for 404, just return null
      if (error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  async submitApplication(formData) {
    try {
      const authHeaders = this.getAuthHeaders();
      const headers = {};
      
      // For FormData, only include Authorization header, not Content-Type
      headers['Authorization'] = authHeaders['Authorization'];
      
      const response = await fetch(`${API_URL}/applications`, {
        method: 'POST',
        headers: headers,
        body: formData
      });
      
      // Handle response manually to avoid automatic logout
      if (!response.ok) {
        const text = await response.text();
        let error;
        try {
          error = JSON.parse(text);
        } catch (e) {
          error = { error: text };
        }
        
        // Only logout for actual authentication errors, not business logic errors
        if (response.status === 401) {
          this.clearToken();
          throw new Error('Session expired. Please login again.');
        }
        
        throw new Error(error.details || error.error || 'Failed to submit application');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Submit application error:', error);
      throw error;
    }
  }

  async updateApplication(id, formData) {
    try {
      const authHeaders = this.getAuthHeaders();
      const headers = {};
      
      // For FormData, only include Authorization header, not Content-Type
      headers['Authorization'] = authHeaders['Authorization'];
      
      const response = await fetch(`${API_URL}/applications/${id}`, {
        method: 'PUT',
        headers: headers,
        body: formData
      });
      
      // Handle response manually to avoid automatic logout
      if (!response.ok) {
        const text = await response.text();
        let error;
        try {
          error = JSON.parse(text);
        } catch (e) {
          error = { error: text };
        }
        
        // Only logout for actual authentication errors, not business logic errors
        if (response.status === 401) {
          this.clearToken();
          throw new Error('Session expired. Please login again.');
        }
        
        throw new Error(error.details || error.error || 'Failed to update application');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Update application error:', error);
      throw error;
    }
  }

  async updateApplicationStatus(id, status) {
    try {
      const response = await fetch(`${API_URL}/applications/${id}/status`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ status })
      });
      
      // Handle response manually to avoid automatic logout
      if (!response.ok) {
        const text = await response.text();
        let error;
        try {
          error = JSON.parse(text);
        } catch (e) {
          error = { error: text };
        }
        
        // Only logout for actual authentication errors, not business logic errors
        if (response.status === 401) {
          this.clearToken();
          throw new Error('Session expired. Please login again.');
        }
        
        throw new Error(error.details || error.error || 'Failed to update application status');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Update application status error:', error);
      throw error;
    }
  }

  async deleteApplication(id) {
    try {
      const response = await fetch(`${API_URL}/applications/${id}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      });
      
      // Handle response manually to avoid automatic logout
      if (!response.ok) {
        const text = await response.text();
        let error;
        try {
          error = JSON.parse(text);
        } catch (e) {
          error = { error: text };
        }
        
        // Only logout for actual authentication errors, not business logic errors
        if (response.status === 401) {
          this.clearToken();
          throw new Error('Session expired. Please login again.');
        }
        
        throw new Error(error.details || error.error || 'Failed to delete application');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Delete application error:', error);
      throw error;
    }
  }

  // === End Applications API ===
}

const api = new ApiService();
api.API_URL = API_URL;
export default api; 