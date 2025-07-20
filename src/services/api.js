// For local development, use the local backend API:
const API_URL = 'http://localhost:5000/api';
// For production, use the Render backend API:
// const API_URL = process.env.REACT_APP_API_URL || 'https://votech-back-new.onrender.com/api';
console.log('API URL:', API_URL);

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

  // Message endpoints
  async getMessages({ recipient_id, group_id } = {}) {
    try {
      let url = `${API_URL}/messages`;
      const params = [];
      if (recipient_id) params.push(`recipient_id=${recipient_id}`);
      if (group_id) params.push(`group_id=${group_id}`);
      if (params.length) url += '?' + params.join('&');
      const response = await fetch(url, {
        headers: this.getAuthHeaders(),
      });
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Get messages error:', error);
      throw error;
    }
  }

  async sendMessage({ recipient_id, group_id, content, type, file_url }) {
    try {
      const response = await fetch(`${API_URL}/messages`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ recipient_id, group_id, content, type, file_url }),
      });
      return await this.handleResponse(response);
    } catch (error) {
      console.error('Send message error:', error);
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
}

const api = new ApiService();
api.API_URL = API_URL;
export default api; 