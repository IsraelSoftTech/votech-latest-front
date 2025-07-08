const API_URL = 'http://localhost:5000/api';

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

  // Students endpoints
  async getStudents(year) {
    try {
      const url = year ? `${API_URL}/students?year=${year}` : `${API_URL}/students`;
      const response = await fetch(url, {
        headers: this.getAuthHeaders(),
      });
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Get students error:', error);
      throw error;
    }
  }

  async createStudent(studentData) {
    try {
      const headers = this.getAuthHeaders();
      // Remove Content-Type for FormData to let browser set it with boundary
      delete headers['Content-Type'];
      
      const response = await fetch(`${API_URL}/students`, {
        method: 'POST',
        headers: headers,
        body: studentData, // FormData object
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Create student error:', error);
      throw error;
    }
  }

  async updateStudent(id, studentData) {
    try {
      const headers = this.getAuthHeaders();
      // Remove Content-Type for FormData to let browser set it with boundary
      delete headers['Content-Type'];
      
      const response = await fetch(`${API_URL}/students/${id}`, {
        method: 'PUT',
        headers: headers,
        body: studentData, // FormData object
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Update student error:', error);
      throw error;
    }
  }

  async deleteStudent(id) {
    try {
      const response = await fetch(`${API_URL}/students/${id}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      });
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Delete student error:', error);
      throw error;
    }
  }

  async deleteAllStudents() {
    try {
      const response = await fetch(`${API_URL}/students/delete-all`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      });
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Delete all students error:', error);
      throw error;
    }
  }

  async approveAllStudents() {
    try {
      const response = await fetch(`${API_URL}/students/approve-all`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Approve all students error:', error);
      throw error;
    }
  }

  async uploadStudents(fileData) {
    try {
      const headers = this.getAuthHeaders();
      // Remove Content-Type for FormData to let browser set it with boundary
      delete headers['Content-Type'];
      
      const response = await fetch(`${API_URL}/students/upload`, {
        method: 'POST',
        headers: headers,
        body: fileData, // FormData object containing the Excel file
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Upload students error:', error);
      throw error;
    }
  }

  // Classes endpoints
  async getClasses(year) {
    try {
      const url = year ? `${API_URL}/classes?year=${year}` : `${API_URL}/classes`;
      const response = await fetch(url, {
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

  // Vocational endpoints
  async getVocational(year) {
    try {
      const url = year ? `${API_URL}/vocational?year=${year}` : `${API_URL}/vocational`;
      const response = await fetch(url, {
        headers: this.getAuthHeaders(),
      });
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Get vocational departments error:', error);
      throw error;
    }
  }

  async createVocational(vocationalData) {
    try {
      const headers = this.getAuthHeaders();
      delete headers['Content-Type'];
      const response = await fetch(`${API_URL}/vocational`, {
        method: 'POST',
        headers: headers,
        body: vocationalData,
      });
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Create vocational department error:', error);
      throw error;
    }
  }

  async updateVocational(id, vocationalData) {
    try {
      const headers = this.getAuthHeaders();
      delete headers['Content-Type'];
      const response = await fetch(`${API_URL}/vocational/${id}`, {
        method: 'PUT',
        headers: headers,
        body: vocationalData,
      });
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Update vocational department error:', error);
      throw error;
    }
  }

  async deleteVocational(id) {
    try {
      const response = await fetch(`${API_URL}/vocational/${id}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Delete vocational department error:', error);
      throw error;
    }
  }

  // Teachers endpoints
  async getTeachers(year) {
    try {
      const url = year ? `${API_URL}/teachers?year=${year}` : `${API_URL}/teachers`;
      const response = await fetch(url, {
        headers: this.getAuthHeaders(),
      });
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Get teachers error:', error);
      throw error;
    }
  }

  async createTeacher(teacherData) {
    try {
      const response = await fetch(`${API_URL}/teachers`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(teacherData),
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Create teacher error:', error);
      throw error;
    }
  }

  async updateTeacher(id, teacherData) {
    try {
      const response = await fetch(`${API_URL}/teachers/${id}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(teacherData),
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Update teacher error:', error);
      throw error;
    }
  }

  async deleteTeacher(id) {
    try {
      const response = await fetch(`${API_URL}/teachers/${id}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Delete teacher error:', error);
      throw error;
    }
  }

  async updateTeacherStatus(id, status) {
    try {
      const response = await fetch(`${API_URL}/teachers/${id}/status`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ status }),
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error('Update teacher status error:', error);
      throw error;
    }
  }

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

  // Fees & ID Cards endpoints
  async searchStudents(query) {
    try {
      const response = await fetch(`${API_URL}/students/search?query=${encodeURIComponent(query)}`, {
        headers: this.getAuthHeaders(),
      });
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Search students error:', error);
      throw error;
    }
  }

  async getStudentFees(studentId) {
    try {
      const response = await fetch(`${API_URL}/student/${studentId}/fees`, {
        headers: this.getAuthHeaders(),
      });
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Get student fees error:', error);
      throw error;
    }
  }

  async payFee({ student_id, class_id, fee_type, amount, paid_at }) {
    try {
      const body = { student_id, class_id, fee_type, amount };
      if (paid_at) body.paid_at = paid_at;
      const response = await fetch(`${API_URL}/fees`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(body),
      });
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Pay fee error:', error);
      throw error;
    }
  }

  async getClassFeeStats(classId, year) {
    try {
      const url = year ? `${API_URL}/fees/class/${classId}?year=${year}` : `${API_URL}/fees/class/${classId}`;
      const response = await fetch(url, {
        headers: this.getAuthHeaders(),
      });
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Get class fee stats error:', error);
      throw error;
    }
  }

  async getIdCardStudents() {
    try {
      const response = await fetch(`${API_URL}/idcards/students`, {
        headers: this.getAuthHeaders(),
      });
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Get ID card students error:', error);
      throw error;
    }
  }

  async getTeacherAnalyticsDaily(year) {
    try {
      const url = year ? `${API_URL}/teachers/analytics/daily?year=${year}` : `${API_URL}/teachers/analytics/daily`;
      const response = await fetch(url, {
        headers: this.getAuthHeaders(),
      });
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Get teacher analytics error:', error);
      throw error;
    }
  }

  async getFeeAnalyticsDaily(year) {
    try {
      const url = year ? `${API_URL}/fees/analytics/daily?year=${year}` : `${API_URL}/fees/analytics/daily`;
      const response = await fetch(url, {
        headers: this.getAuthHeaders(),
      });
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Get fee analytics error:', error);
      throw error;
    }
  }

  async getYearlyTotalFees(year) {
    try {
      const url = year ? `${API_URL}/fees/total/yearly?year=${year}` : `${API_URL}/fees/total/yearly`;
      const response = await fetch(url, {
        headers: this.getAuthHeaders(),
      });
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Get yearly total fees error:', error);
      throw error;
    }
  }

  async getPublicVocational() {
    const response = await fetch(`${API_URL}/vocational/public`);
    return await response.json();
  }

  // Debug methods
  async getDebugClasses() {
    try {
      const response = await fetch(`${API_URL}/debug/classes`, {
        headers: this.getAuthHeaders(),
      });
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Get debug classes error:', error);
      throw error;
    }
  }

  async getDebugStudents() {
    try {
      const response = await fetch(`${API_URL}/debug/students`, {
        headers: this.getAuthHeaders(),
      });
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Get debug students error:', error);
      throw error;
    }
  }
}

export default new ApiService(); 