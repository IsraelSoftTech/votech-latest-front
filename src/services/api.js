import config from "../config";

// For local development, use the local backend API:
// const API_URL = 'http://localhost:5000/api';
// For production, use the production backend API:
const API_URL = config.API_URL;
// console.log('API URL:', API_URL);

class ApiService {
  constructor() {
    // Initialize token and user from storage (session first, then local)
    this.token =
      sessionStorage.getItem("token") || localStorage.getItem("token");
    this.user = JSON.parse(
      sessionStorage.getItem("authUser") ||
        localStorage.getItem("authUser") ||
        "null"
    );
  }

  setToken(token) {
    this.token = token;
    if (token) {
      sessionStorage.setItem("token", token);
      localStorage.setItem("token", token);
    } else {
      this.clearToken();
    }
  }

  getToken() {
    // Always read fresh from storage to avoid stale/missing tokens
    const latest =
      sessionStorage.getItem("token") || localStorage.getItem("token");
    this.token = latest || null;
    return this.token;
  }

  clearToken() {
    this.token = null;
    this.user = null;
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("authUser");
    localStorage.removeItem("token");
    localStorage.removeItem("authUser");
  }

  getAuthHeaders() {
    const token = this.getToken();
    const headers = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
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

      if (response.status === 401) {
        this.clearToken();
        throw new Error("Session expired. Please login again.");
      }
      if (response.status === 403) {
        // Do not clear token; user is authenticated but not authorized
        throw new Error(error.details || error.error || "Unauthorized Request");
      }
      throw new Error(error.details || error.error || "Request failed");
    }

    const data = await response.json();
    return data;
  }

  async login(username, password) {
    try {
      const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await this.handleResponse(response);

      if (data.token) {
        this.setToken(data.token);
        if (data.user) {
          this.user = data.user;
          sessionStorage.setItem("authUser", JSON.stringify(data.user));
        }
        return data;
      }

      throw new Error("No token received from server");
    } catch (error) {
      console.error("Login failed:", error);
      this.clearToken();
      throw error;
    }
  }

  async updateMyProfile({ username, profileFile }) {
    const authHeaders = this.getAuthHeaders();
    const headers = {};
    if (authHeaders["Authorization"])
      headers["Authorization"] = authHeaders["Authorization"];
    const form = new FormData();
    if (username) form.append("username", username);
    if (profileFile) form.append("profile", profileFile);

    const response = await fetch(`${API_URL}/profile`, {
      method: "PUT",
      headers: headers,
      body: form,
    });

    const data = await this.handleResponse(response);
    if (data && data.user) {
      // Keep client-side camelCase convenience
      const merged = {
        ...this.user,
        ...data.user,
        profileImageUrl:
          data.user.profileImageUrl || data.user.profile_image_url || null,
      };
      this.user = merged;
      sessionStorage.setItem("authUser", JSON.stringify(merged));
    }
    return data;
  }

  async createAccount({
    username,
    contact,
    password,
    role,
    name,
    email,
    gender,
  }) {
    try {
      const response = await fetch(`${API_URL}/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          contact,
          password,
          role,
          name,
          email,
          gender,
        }),
      });

      // First try to parse the response as text
      const text = await response.text();
      console.log("Raw response:", text);

      // Then try to parse it as JSON
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error("Failed to parse response as JSON:", e);
        throw new Error("Server returned invalid JSON response");
      }

      if (!response.ok) {
        throw new Error(data.error || "Failed to create account");
      }

      return data;
    } catch (error) {
      console.error("Account creation error:", error);
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
      console.error("Get users error:", error);
      throw error;
    }
  }

  async checkIfUsersExist() {
    try {
      const response = await fetch(`${API_URL}/users`, {
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        return data && data.length > 0;
      }
      return false;
    } catch (error) {
      console.error("Check if users exist error:", error);
      return false;
    }
  }

  async checkIfAdmin3Exists() {
    try {
      console.log("API: Checking if Admin3 exists...");

      // Method 1: Try to check if Admin3 user exists by username
      try {
        const response = await fetch(`${API_URL}/check-user`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ username: "Admin3" }),
        });

        if (response.ok) {
          const data = await response.json();
          console.log("API: Check user response:", data);
          // If the user exists, check if it's Admin3 role
          if (data.exists && data.user && data.user.role === "Admin3") {
            console.log("API: Admin3 exists (method 1):", true);
            return true;
          }
        }
      } catch (error) {
        console.log("API: Method 1 failed, trying method 2...");
      }

      // Method 2: Try to get all users (fallback)
      try {
        const response = await fetch(`${API_URL}/users`, {
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          const data = await response.json();
          console.log("API: Users data:", data);
          // Check if any user has role "Admin3"
          const admin3Exists =
            data && data.some((user) => user.role === "Admin3");
          console.log("API: Admin3 exists (method 2):", admin3Exists);
          return admin3Exists;
        }
      } catch (error) {
        console.log("API: Method 2 failed");
      }

      console.log("API: All methods failed, assuming Admin3 does not exist");
      return false;
    } catch (error) {
      console.error("Check if Admin3 exists error:", error);
      return false;
    }
  }

  async getAdmin3Count() {
    try {
      console.log("API: Getting Admin3 count...");
      const response = await fetch(`${API_URL}/users/admin3-count`, {
        headers: { "Content-Type": "application/json" },
      });
      if (response.ok) {
        const data = await response.json();
        console.log("API: Admin3 count response:", data);
        const admin3Count = data.count || 0;
        console.log("API: Admin3 count:", admin3Count);
        return admin3Count;
      }
      return 0;
    } catch (error) {
      console.error("Get Admin3 count error:", error);
      return 0;
    }
  }

  async getCurrentUser() {
    try {
      // Prefer cached user from session storage
      if (this.user) return this.user;
      const stored = sessionStorage.getItem("authUser");
      if (stored) {
        this.user = JSON.parse(stored);
        return this.user;
      }

      // Fallback: try a lightweight endpoint if available; otherwise return minimal from token
      const response = await fetch(`${API_URL}/users`, {
        headers: this.getAuthHeaders(),
      });
      // If the endpoint exists, use it; note it may not include role
      if (response.ok) {
        const data = await response.json();
        // Merge with any stored role from token storage if present
        const storedUser = JSON.parse(
          sessionStorage.getItem("authUser") || "{}"
        );
        this.user = { ...storedUser, ...data };
        sessionStorage.setItem("authUser", JSON.stringify(this.user));
        return this.user;
      }

      // As last resort, throw to be handled by caller
      throw new Error("Unable to fetch current user");
    } catch (error) {
      console.error("Get current user error:", error);
      // Still try to return whatever is in storage to keep app functional
      const stored = sessionStorage.getItem("authUser");
      if (stored) {
        this.user = JSON.parse(stored);
        return this.user;
      }
      throw error;
    }
  }

  async logout() {
    try {
      const response = await fetch(`${API_URL}/logout`, {
        method: "POST",
        headers: this.getAuthHeaders(),
      });

      await this.handleResponse(response);
      this.clearToken();
    } catch (error) {
      console.error("Logout error:", error);
      this.clearToken();
      throw error;
    }
  }

  async checkUser(username) {
    try {
      const response = await fetch(`${API_URL}/check-user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username }),
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error("Check user error:", error);
      throw error;
    }
  }

  async resetPassword(username, newPassword) {
    try {
      const response = await fetch(`${API_URL}/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, newPassword }),
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error("Reset password error:", error);
      throw error;
    }
  }

  async changePassword(currentPassword, newPassword) {
    try {
      const response = await fetch(`${API_URL}/change-password`, {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error("Change password error:", error);
      throw error;
    }
  }

  async getStudentAnalyticsDaily(year) {
    try {
      const url = year
        ? `${API_URL}/students/analytics/daily?year=${year}`
        : `${API_URL}/students/analytics/daily`;
      const response = await fetch(url, {
        headers: this.getAuthHeaders(),
      });
      return await this.handleResponse(response);
    } catch (error) {
      console.error("Get student analytics error:", error);
      throw error;
    }
  }

  // Specialties endpoints
  async getSpecialties() {
    const response = await fetch(`${API_URL}/specialties`, {
      headers: this.getAuthHeaders(),
    });
    return await this.handleResponse(response);
  }
  async createSpecialty(data) {
    const response = await fetch(`${API_URL}/specialties`, {
      method: "POST",
      headers: { ...this.getAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return await this.handleResponse(response);
  }
  async updateSpecialty(id, data) {
    const response = await fetch(`${API_URL}/specialties/${id}`, {
      method: "PUT",
      headers: { ...this.getAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return await this.handleResponse(response);
  }
  async deleteSpecialty(id) {
    const response = await fetch(`${API_URL}/specialties/${id}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(),
    });
    return await this.handleResponse(response);
  }

  async assignClassesToSpecialty(specialtyId, classIds) {
    const response = await fetch(
      `${API_URL}/specialties/${specialtyId}/classes`,
      {
        method: "PUT",
        headers: {
          ...this.getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ classIds }),
      }
    );
    return await this.handleResponse(response);
  }
  async getClassesForSpecialty(specialtyId) {
    const response = await fetch(
      `${API_URL}/specialties/${specialtyId}/classes`,
      {
        headers: this.getAuthHeaders(),
      }
    );
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
      console.error("Get classes error:", error);
      throw error;
    }
  }

  async createClass(classData) {
    try {
      const response = await fetch(`${API_URL}/classes`, {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: JSON.stringify(classData),
      });
      return await this.handleResponse(response);
    } catch (error) {
      console.error("Create class error:", error);
      throw error;
    }
  }

  async updateClass(id, classData) {
    try {
      const response = await fetch(`${API_URL}/classes/${id}`, {
        method: "PUT",
        headers: this.getAuthHeaders(),
        body: JSON.stringify(classData),
      });
      return await this.handleResponse(response);
    } catch (error) {
      console.error("Update class error:", error);
      throw error;
    }
  }

  async deleteClass(id) {
    try {
      const response = await fetch(`${API_URL}/classes/${id}`, {
        method: "DELETE",
        headers: this.getAuthHeaders(),
      });
      return await this.handleResponse(response);
    } catch (error) {
      console.error("Delete class error:", error);
      throw error;
    }
  }

  async checkUserDetails(username, contact) {
    try {
      const response = await fetch(`${API_URL}/users/check-user-details`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, contact }),
      });
      return await this.handleResponse(response);
    } catch (error) {
      console.error("Check user details error:", error);
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
      method: "PUT",
      headers: { ...this.getAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return await this.handleResponse(response);
  }
  async deleteUser(id) {
    const response = await fetch(`${API_URL}/users/${id}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(),
    });
    return await this.handleResponse(response);
  }
  async suspendUser(id) {
    const response = await fetch(`${API_URL}/users/${id}/suspend`, {
      method: "POST",
      headers: this.getAuthHeaders(),
    });
    return await this.handleResponse(response);
  }

  // User monitoring for Admin3
  async getMonitoredUsers() {
    const response = await fetch(`${API_URL}/monitor/users`, {
      headers: this.getAuthHeaders(),
    });
    return await this.handleResponse(response);
  }

  async getUserActivities(userId = null, limit = 50, offset = 0) {
    let url = `${API_URL}/monitor/user-activities?limit=${limit}&offset=${offset}`;
    if (userId) {
      url += `&userId=${userId}`;
    }
    const response = await fetch(url, {
      headers: this.getAuthHeaders(),
    });
    return await this.handleResponse(response);
  }

  async getUserSessions(userId = null, limit = 50, offset = 0) {
    let url = `${API_URL}/monitor/user-sessions?limit=${limit}&offset=${offset}`;
    if (userId) {
      url += `&userId=${userId}`;
    }
    const response = await fetch(url, {
      headers: this.getAuthHeaders(),
    });
    return await this.handleResponse(response);
  }

  async clearAllMonitoringData() {
    const response = await fetch(`${API_URL}/monitor/clear-all`, {
      method: "DELETE",
      headers: this.getAuthHeaders(),
    });
    return await this.handleResponse(response);
  }

  async createStudent(formData) {
    const authHeaders = this.getAuthHeaders();
    const headers = {};
    if (authHeaders["Authorization"])
      headers["Authorization"] = authHeaders["Authorization"];
    const response = await fetch(`${API_URL}/students`, {
      method: "POST",
      headers,
      body: formData,
    });
    return this.handleResponse(response);
  }

  async updateStudent(id, formData) {
    const authHeaders = this.getAuthHeaders();
    const headers = {};
    if (authHeaders["Authorization"])
      headers["Authorization"] = authHeaders["Authorization"];
    const response = await fetch(`${API_URL}/students/${id}`, {
      method: "PUT",
      headers,
      body: formData,
    });
    return this.handleResponse(response);
  }

  async getStudents() {
    const response = await fetch(`${API_URL}/students`);
    if (!response.ok) throw new Error("Failed to fetch students");
    return await response.json();
  }

  async deleteStudent(id) {
    const response = await fetch(`${API_URL}/students/${id}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async uploadManyStudents(formData) {
    const response = await fetch(`${API_URL}/students/upload-many`, {
      method: "POST",
      body: formData,
    });
    return this.handleResponse(response);
  }

  async getClassFeeStats(classId) {
    const response = await fetch(`${API_URL}/fees/class/${classId}`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Failed to fetch class fee stats");
    return await response.json();
  }

  async searchStudents(query) {
    const response = await fetch(
      `${API_URL}/students/search?query=${encodeURIComponent(query)}`,
      {
        headers: this.getAuthHeaders(),
      }
    );
    if (!response.ok) throw new Error("Failed to search students");
    return await response.json();
  }

  async getStudentFeeStats(studentId) {
    const response = await fetch(`${API_URL}/fees/student/${studentId}`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Failed to fetch student fee stats");
    return await response.json();
  }

  async payStudentFee({ student_id, class_id, fee_type, amount }) {
    const response = await fetch(`${API_URL}/fees`, {
      method: "POST",
      headers: { ...this.getAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ student_id, class_id, fee_type, amount }),
    });
    if (!response.ok) throw new Error("Failed to pay student fee");
    return await response.json();
  }

  async reconcileStudentFee({ student_id, fee_type, total_amount }) {
    const response = await fetch(`${API_URL}/fees/reconcile`, {
      method: "PUT",
      headers: { ...this.getAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ student_id, fee_type, total_amount }),
    });
    if (!response.ok) throw new Error("Failed to reconcile student fee");
    return await response.json();
  }

  async getAllPaymentRecords() {
    const response = await fetch(`${API_URL}/fees/payments`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Failed to fetch payment records");
    return await response.json();
  }

  async getStudentPaymentDetails(studentId) {
    const response = await fetch(
      `${API_URL}/fees/payments/student/${studentId}`,
      {
        headers: this.getAuthHeaders(),
      }
    );
    if (!response.ok)
      throw new Error("Failed to fetch student payment details");
    return await response.json();
  }

  async updatePaymentRecord(paymentId, data) {
    const response = await fetch(`${API_URL}/fees/payments/${paymentId}`, {
      method: "PUT",
      headers: { ...this.getAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to update payment record");
    return await response.json();
  }

  async deletePaymentRecord(paymentId) {
    const response = await fetch(`${API_URL}/fees/payments/${paymentId}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Failed to delete payment record");
    return await response.json();
  }

  async clearStudentFees(studentId) {
    const response = await fetch(`${API_URL}/fees/student/${studentId}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Failed to clear student fees");
    return await response.json();
  }

  // Message endpoints
  async getMessages(userId) {
    const response = await fetch(`${API_URL}/messages/${userId}`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Failed to fetch messages");
    return await response.json();
  }
  async sendMessage(receiver_id, content) {
    const response = await fetch(`${API_URL}/messages`, {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ receiver_id, content }),
    });
    if (!response.ok) throw new Error("Failed to send message");
    return await response.json();
  }

  async sendMessageWithFile(receiver_id, content, file) {
    const formData = new FormData();
    formData.append("receiver_id", receiver_id);
    if (content) formData.append("content", content);
    if (file) formData.append("file", file);

    const authHeaders = this.getAuthHeaders();
    const headers = {};
    headers["Authorization"] = authHeaders["Authorization"];

    const response = await fetch(`${API_URL}/messages/with-file`, {
      method: "POST",
      headers: headers,
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Message with file failed:", response.status, errorText);
      throw new Error(
        `Failed to send message with file: ${response.status} ${errorText}`
      );
    }

    return await response.json();
  }

  // Group chat methods
  async createGroup(name, participant_ids) {
    const response = await fetch(`${API_URL}/groups`, {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ name, participant_ids }),
    });
    if (!response.ok) throw new Error("Failed to create group");
    return await response.json();
  }

  async deleteGroup(groupId) {
    const response = await fetch(`${API_URL}/groups/${groupId}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Failed to delete group");
    return await response.json();
  }

  async getGroups() {
    const response = await fetch(`${API_URL}/groups`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Failed to fetch groups");
    return await response.json();
  }

  async getGroupMessages(groupId) {
    const response = await fetch(`${API_URL}/groups/${groupId}/messages`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Failed to fetch group messages");
    return await response.json();
  }

  async sendGroupMessage(groupId, content) {
    const response = await fetch(`${API_URL}/groups/${groupId}/messages`, {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ content }),
    });
    if (!response.ok) throw new Error("Failed to send group message");
    return await response.json();
  }

  async sendGroupMessageWithFile(groupId, content, file) {
    const formData = new FormData();
    if (content) formData.append("content", content);
    if (file) formData.append("file", file);

    const authHeaders = this.getAuthHeaders();
    const headers = {};
    headers["Authorization"] = authHeaders["Authorization"];

    console.log("Sending group message with file:", {
      groupId,
      content,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    });

    const response = await fetch(
      `${API_URL}/groups/${groupId}/messages/with-file`,
      {
        method: "POST",
        headers: headers,
        body: formData,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        "Group message with file failed:",
        response.status,
        errorText
      );
      throw new Error(
        `Failed to send group message with file: ${response.status} ${errorText}`
      );
    }

    const result = await response.json();
    console.log("Group message with file success:", result);
    return result;
  }

  async getGroupParticipants(groupId) {
    const response = await fetch(`${API_URL}/groups/${groupId}/participants`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Failed to fetch group participants");
    return await response.json();
  }

  // Mark all messages from userId as read
  async markMessagesRead(userId) {
    const response = await fetch(`${API_URL}/messages/${userId}/read`, {
      method: "POST",
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Failed to mark messages as read");
    return await response.json();
  }

  // Mark all group messages as read
  async markMessagesReadGroup(groupId) {
    const response = await fetch(`${API_URL}/groups/${groupId}/read`, {
      method: "POST",
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Failed to mark group messages as read");
    return await response.json();
  }

  // Get all users for chat (all roles)
  async getAllUsersForChat() {
    const response = await fetch(`${API_URL}/users/all-chat`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Failed to fetch users");
    return await response.json();
  }

  // Get chat list for sidebar (last message, unread count, etc.)
  async getChatList() {
    const response = await fetch(`${API_URL}/users/chat-list`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Failed to fetch chat list");
    return await response.json();
  }

  // Get total unread message count across all chats
  async getTotalUnreadCount() {
    try {
      const authUser = JSON.parse(sessionStorage.getItem("authUser") || "{}");
      const groups = await this.getGroups();
      if (!Array.isArray(groups) || groups.length === 0) return 0;
      // Compute unread for groups by fetching messages and counting unread ones per group
      const limited = groups.slice(0, 20); // safety limit
      const counts = await Promise.all(
        limited.map(async (g) => {
          try {
            const msgs = await this.getGroupMessages(g.id);
            if (!Array.isArray(msgs)) return 0;
            const unread = msgs.filter(
              (m) => !m.read_at && String(m.sender_id) !== String(authUser?.id)
            ).length;
            return unread;
          } catch (e) {
            return 0;
          }
        })
      );
      return counts.reduce((a, b) => a + (parseInt(b) || 0), 0);
    } catch (error) {
      console.error("Error getting total unread count:", error);
      return 0;
    }
  }

  // Teacher endpoints
  async getAllTeachers() {
    try {
      const response = await fetch(`${API_URL}/teachers`, {
        headers: this.getAuthHeaders(),
      });
      return await this.handleResponse(response);
    } catch (error) {
      console.error("Get all teachers error:", error);
      throw error;
    }
  }

  // Get staff with class and subject assignments
  async getStaffWithAssignments() {
    try {
      // Fetch all staff members
      const usersResponse = await this.getUsers();
      const staffRaw = Array.isArray(usersResponse)
        ? usersResponse
        : Array.isArray(usersResponse?.data)
        ? usersResponse.data
        : [];

      if (!Array.isArray(staffRaw) || staffRaw.length === 0) {
        return [];
      }

      // Determine if we need assignment data (only for teachers)
      const hasTeachers = staffRaw.some(
        (user) => String(user?.role || "").toLowerCase() === "teacher"
      );

      let classSubjects = [];
      const classMap = new Map();
      const subjectMap = new Map();

      if (hasTeachers) {
        // Fetch class-subject assignments
        const classSubjectsResponse = await fetch(
          `${API_URL}/v1/class-subjects`,
          {
            headers: this.getAuthHeaders(),
          }
        );
        const classSubjectsPayload = await this.handleResponse(
          classSubjectsResponse
        );
        classSubjects = Array.isArray(classSubjectsPayload?.data)
          ? classSubjectsPayload.data
          : Array.isArray(classSubjectsPayload)
          ? classSubjectsPayload
          : [];

        // Fetch class metadata
        const classesResponse = await this.getClasses();
        const classesArray = Array.isArray(classesResponse?.data)
          ? classesResponse.data
          : Array.isArray(classesResponse)
          ? classesResponse
          : [];
        classesArray.forEach((cls) => {
          if (cls && cls.id != null) {
            classMap.set(String(cls.id), cls.name || `Class ${cls.id}`);
          }
        });

        // Fetch subject metadata
        const subjectsResponse = await this.getSubjects();
        const subjectsArray = Array.isArray(subjectsResponse?.data)
          ? subjectsResponse.data
          : Array.isArray(subjectsResponse)
          ? subjectsResponse
          : [];
        subjectsArray.forEach((subj) => {
          if (subj && subj.id != null) {
            subjectMap.set(
              String(subj.id),
              subj.name || subj.code || `Subject ${subj.id}`
            );
          }
        });
      }

      // Group assignments by teacher
      const assignmentsByTeacher = new Map();
      if (Array.isArray(classSubjects)) {
        classSubjects.forEach((cs) => {
          if (!cs || cs.teacher_id == null) return;
          const teacherKey = String(cs.teacher_id);
          if (!assignmentsByTeacher.has(teacherKey)) {
            assignmentsByTeacher.set(teacherKey, []);
          }
          assignmentsByTeacher.get(teacherKey).push({
            classId: cs.class_id,
            className:
              classMap.get(String(cs.class_id)) || `Class ${cs.class_id}`,
            subjectId: cs.subject_id,
            subjectName:
              subjectMap.get(String(cs.subject_id)) ||
              `Subject ${cs.subject_id}`,
          });
        });
      }

      // Combine staff with assignments (teachers) or empty data (other roles)
      const staffWithAssignments = staffRaw
        .map((staff) => {
          if (!staff) return null;
          const staffKey = String(staff.id ?? staff.user_id ?? "");
          const assignments = staffKey
            ? assignmentsByTeacher.get(staffKey) || []
            : [];

          const uniqueClasses = Array.from(
            new Set(assignments.map((a) => a.className).filter(Boolean))
          );
          const uniqueSubjects = Array.from(
            new Set(assignments.map((a) => a.subjectName).filter(Boolean))
          );

          return {
            id: staff.id ?? staff.user_id ?? staffKey,
            name: staff.name || staff.username || "Unknown",
            username: staff.username,
            contact: staff.contact,
            role: staff.role,
            classes: uniqueClasses.length ? uniqueClasses.join(", ") : "None",
            subjects: uniqueSubjects.length
              ? uniqueSubjects.join(", ")
              : "None",
            assignments,
          };
        })
        .filter(Boolean);

      staffWithAssignments.sort((a, b) => {
        const nameA = String(a.name || a.username || "").toLowerCase();
        const nameB = String(b.name || b.username || "").toLowerCase();
        return nameA.localeCompare(nameB);
      });

      return staffWithAssignments;
    } catch (error) {
      console.error("Get staff with assignments error:", error);
      return [];
    }
  }

  // Fee endpoints
  async getTotalFees(year = null) {
    const url = year
      ? `${API_URL}/fees/total/yearly?year=${year}`
      : `${API_URL}/fees/total/yearly`;
    const response = await fetch(url, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Failed to fetch total fees");
    return await response.json();
  }
  async addTeacher(data) {
    const response = await fetch(`${API_URL}/teachers`, {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to add teacher");
    return await response.json();
  }
  async updateTeacher(id, data) {
    const response = await fetch(`${API_URL}/teachers/${id}`, {
      method: "PUT",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to update teacher");
    return await response.json();
  }
  async deleteTeacher(id) {
    const response = await fetch(`${API_URL}/teachers/${id}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Failed to delete teacher");
    return await response.json();
  }
  async approveTeacher(id, status) {
    const response = await fetch(`${API_URL}/teachers/${id}/status`, {
      method: "PUT",
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ status }),
    });
    if (!response.ok) throw new Error("Failed to update teacher status");
    return await response.json();
  }

  // Subject endpoints
  async getSubjects() {
    const response = await fetch(`${API_URL}/v1/subjects`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Failed to fetch subjects");
    return await response.json();
  }
  async createSubject(data) {
    const response = await fetch(`${API_URL}/v1/subjects`, {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to create subject");
    return await response.json();
  }
  async updateSubject(id, data) {
    const response = await fetch(`${API_URL}/v1/subjects/${id}`, {
      method: "PUT",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to update subject");
    return await response.json();
  }
  async deleteSubject(id) {
    const response = await fetch(`${API_URL}/v1/subjects/${id}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Failed to delete subject");
    return await response.json();
  }

  // Inventory API
  async getInventory(type = "income") {
    const response = await fetch(`${API_URL}/inventory?type=${type}`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Failed to fetch inventory");
    return await response.json();
  }

  async registerInventoryItem(data) {
    const response = await fetch(`${API_URL}/inventory`, {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to register inventory item");
    return await response.json();
  }

  async deleteInventoryItem(id) {
    const response = await fetch(`${API_URL}/inventory/${id}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Failed to delete inventory item");
    return await response.json();
  }

  async editInventoryItem(id, data) {
    const response = await fetch(`${API_URL}/inventory/${id}`, {
      method: "PUT",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to edit inventory item");
    return await response.json();
  }

  // Budget Heads API
  async getBudgetHeads() {
    const response = await fetch(`${API_URL}/budget-heads`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Failed to fetch budget heads");
    return await response.json();
  }

  async createBudgetHead(data) {
    const response = await fetch(`${API_URL}/budget-heads`, {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to create budget head");
    }
    return await response.json();
  }

  async updateBudgetHead(id, data) {
    const response = await fetch(`${API_URL}/budget-heads/${id}`, {
      method: "PUT",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to update budget head");
    }
    return await response.json();
  }

  // Delete budget head
  async deleteBudgetHead(id) {
    try {
      const response = await fetch(`${API_URL}/budget-heads/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${this.getToken()}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete budget head");
      }

      return await response.json();
    } catch (error) {
      throw new Error(error.message);
    }
  }

  // Asset Categories API
  async getAssetCategories() {
    const response = await fetch(`${API_URL}/asset-categories`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Failed to fetch asset categories");
    return await response.json();
  }

  async createAssetCategory(data) {
    const response = await fetch(`${API_URL}/asset-categories`, {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to create asset category");
    return await response.json();
  }

  async updateAssetCategory(id, data) {
    const response = await fetch(`${API_URL}/asset-categories/${id}`, {
      method: "PUT",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to update asset category");
    return await response.json();
  }

  // Update asset category
  async updateAssetCategory(id, assetCategoryData) {
    try {
      const response = await fetch(`${API_URL}/asset-categories/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.getToken()}`,
        },
        body: JSON.stringify(assetCategoryData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update asset category");
      }

      return await response.json();
    } catch (error) {
      throw new Error(error.message);
    }
  }

  // Delete asset category
  async deleteAssetCategory(id) {
    try {
      const response = await fetch(`${API_URL}/asset-categories/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${this.getToken()}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete asset category");
      }

      return await response.json();
    } catch (error) {
      throw new Error(error.message);
    }
  }

  // Financial Reports API
  async getFinancialSummary(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(
      `${API_URL}/financial/summary?${queryString}`,
      {
        headers: this.getAuthHeaders(),
      }
    );
    if (!response.ok) throw new Error("Failed to fetch financial summary");
    return await response.json();
  }

  async getBalanceSheet(asOfDate = null) {
    const params = asOfDate ? `?as_of_date=${asOfDate}` : "";
    const response = await fetch(
      `${API_URL}/inventory/balance-sheet${params}`,
      {
        headers: this.getAuthHeaders(),
      }
    );
    if (!response.ok) throw new Error("Failed to fetch balance sheet");
    return await response.json();
  }

  async calculateDepreciation(month, year) {
    const response = await fetch(
      `${API_URL}/inventory/calculate-depreciation`,
      {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ month, year }),
      }
    );
    if (!response.ok) throw new Error("Failed to calculate depreciation");
    return await response.json();
  }

  async getDepartments() {
    const response = await fetch(`${API_URL}/departments`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Failed to fetch departments");
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
    headers["Authorization"] = authHeaders["Authorization"];

    const response = await fetch(`${API_URL}/lesson-plans`, {
      method: "POST",
      headers: headers,
      body: formData,
    });
    if (!response.ok) throw new Error("Failed to upload lesson plan");
    return await response.json();
  }

  async getMyLessonPlans() {
    const response = await fetch(`${API_URL}/lesson-plans/my`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Failed to fetch lesson plans");
    return await response.json();
  }

  async getAllLessonPlans() {
    console.log("🔍 API: getAllLessonPlans() called");
    console.log("🔍 API: API_URL:", API_URL);
    console.log("🔍 API: Auth headers:", this.getAuthHeaders());

    const response = await fetch(`${API_URL}/lesson-plans/all`, {
      headers: this.getAuthHeaders(),
    });

    console.log("🔍 API: Response status:", response.status);
    console.log("🔍 API: Response ok:", response.ok);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("🔍 API: Error response:", errorText);
      throw new Error("Failed to fetch all lesson plans");
    }

    const data = await response.json();
    console.log("🔍 API: getAllLessonPlans() returning data:", data);
    return data;
  }

  async updateLessonPlan(id, formData) {
    const authHeaders = this.getAuthHeaders();
    const headers = {};

    // For FormData, only include Authorization header, not Content-Type
    headers["Authorization"] = authHeaders["Authorization"];

    const response = await fetch(`${API_URL}/lesson-plans/${id}`, {
      method: "PUT",
      headers: headers,
      body: formData,
    });
    if (!response.ok) throw new Error("Failed to update lesson plan");
    return await response.json();
  }

  async deleteLessonPlan(id) {
    const response = await fetch(`${API_URL}/lesson-plans/${id}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Failed to delete lesson plan");
    return await response.json();
  }

  async reviewLessonPlan(id, status, adminComment) {
    const response = await fetch(`${API_URL}/lesson-plans/${id}/review`, {
      method: "PUT",
      headers: {
        ...this.getAuthHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status, admin_comment: adminComment }),
    });
    if (!response.ok) throw new Error("Failed to review lesson plan");
    return await response.json();
  }

  async deleteLessonPlanAdmin(id) {
    const response = await fetch(`${API_URL}/lesson-plans/${id}/admin`, {
      method: "DELETE",
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Failed to delete lesson plan");
    return await response.json();
  }

  // Test method to check if lesson plans are working
  async testLessonPlans() {
    const response = await fetch(`${API_URL}/lesson-plans/test`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Failed to test lesson plans");
    return await response.json();
  }

  // === Lessons API (Content-based lessons) ===

  async createLesson(lessonData) {
    const response = await fetch(`${API_URL}/lessons`, {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(lessonData),
    });
    if (!response.ok) throw new Error("Failed to create lesson");
    return await response.json();
  }

  async getMyLessons() {
    const response = await fetch(`${API_URL}/lessons/my`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Failed to fetch my lessons");
    return await response.json();
  }

  async getAllLessons() {
    const response = await fetch(`${API_URL}/lessons/all`, {
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Failed to fetch all lessons");
    return await response.json();
  }

  async updateLesson(id, lessonData) {
    const response = await fetch(`${API_URL}/lessons/${id}`, {
      method: "PUT",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(lessonData),
    });
    if (!response.ok) throw new Error("Failed to update lesson");
    return await response.json();
  }

  async deleteLesson(id) {
    const response = await fetch(`${API_URL}/lessons/${id}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(),
    });
    if (!response.ok) throw new Error("Failed to delete lesson");
    return await response.json();
  }

  async reviewLesson(id, status, adminComment) {
    const response = await fetch(`${API_URL}/lessons/${id}/review`, {
      method: "PUT",
      headers: {
        ...this.getAuthHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status, admin_comment: adminComment }),
    });
    if (!response.ok) throw new Error("Failed to review lesson");
    return await response.json();
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
          throw new Error("Session expired. Please login again.");
        }

        throw new Error(
          error.details || error.error || "Failed to fetch applications"
        );
      }

      const result = await response.json();
      // Return the data array from the response
      return result.data || result;
    } catch (error) {
      console.error("Get applications error:", error);
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

      const result = this.handleResponse(response);
      // Return the first application from the array, or null if no applications
      return result.data && result.data.length > 0 ? result.data[0] : null;
    } catch (error) {
      console.error("Get user application error:", error);
      // Don't throw error for 404, just return null
      if (error.message.includes("404")) {
        return null;
      }
      throw error;
    }
  }

  async getUserAssignedData(userId) {
    try {
      const response = await fetch(`${API_URL}/user/assigned-data/${userId}`, {
        headers: this.getAuthHeaders(),
      });

      return this.handleResponse(response);
    } catch (error) {
      console.error("Get user assigned data error:", error);
      throw error;
    }
  }

  async submitApplication(formData) {
    try {
      const authHeaders = this.getAuthHeaders();
      const headers = {};

      // For FormData, only include Authorization header, not Content-Type
      headers["Authorization"] = authHeaders["Authorization"];

      const response = await fetch(`${API_URL}/applications`, {
        method: "POST",
        headers: headers,
        body: formData,
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
          throw new Error("Session expired. Please login again.");
        }

        throw new Error(
          error.details || error.error || "Failed to submit application"
        );
      }

      const result = await response.json();
      // Return the data from the response
      return result.data || result;
    } catch (error) {
      console.error("Submit application error:", error);
      throw error;
    }
  }

  async updateApplication(id, formData) {
    try {
      const authHeaders = this.getAuthHeaders();
      const headers = {};

      // For FormData, only include Authorization header, not Content-Type
      headers["Authorization"] = authHeaders["Authorization"];

      const response = await fetch(`${API_URL}/applications/${id}`, {
        method: "PUT",
        headers: headers,
        body: formData,
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
          throw new Error("Session expired. Please login again.");
        }

        throw new Error(
          error.details || error.error || "Failed to update application"
        );
      }

      const result = await response.json();
      // Return the data from the response
      return result.data || result;
    } catch (error) {
      console.error("Update application error:", error);
      throw error;
    }
  }

  async updateApplicationStatus(id, status) {
    try {
      const authUser = JSON.parse(sessionStorage.getItem("authUser") || "{}");
      const approver = authUser.role || "Unknown";

      const response = await fetch(`${API_URL}/applications/${id}/status`, {
        method: "PUT",
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          status,
          approved_by: approver,
          approved_at: new Date().toISOString(),
        }),
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
          throw new Error("Session expired. Please login again.");
        }

        throw new Error(
          error.details || error.error || "Failed to update application status"
        );
      }

      return await response.json();
    } catch (error) {
      console.error("Update application status error:", error);
      throw error;
    }
  }

  async deleteApplication(id) {
    try {
      const response = await fetch(`${API_URL}/applications/${id}`, {
        method: "DELETE",
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
          throw new Error("Session expired. Please login again.");
        }

        throw new Error(
          error.details || error.error || "Failed to delete application"
        );
      }

      const result = await response.json();
      // Return the data from the response
      return result.data || result;
    } catch (error) {
      console.error("Delete application error:", error);
      throw error;
    }
  }

  // === End Applications API ===

  // === Salary API ===
  async getApprovedApplications() {
    try {
      const response = await fetch(`${API_URL}/salary/approved-applications`, {
        headers: this.getAuthHeaders(),
      });
      return this.handleResponse(response);
    } catch (error) {
      console.error("Get approved applications error:", error);
      throw error;
    }
  }

  async getSalaryStatistics() {
    try {
      const response = await fetch(`${API_URL}/salary/statistics`, {
        headers: this.getAuthHeaders(),
      });
      return this.handleResponse(response);
    } catch (error) {
      console.error("Get salary statistics error:", error);
      throw error;
    }
  }

  async updateSalary(userId, amount) {
    try {
      const response = await fetch(`${API_URL}/salary/update`, {
        method: "POST",
        headers: {
          ...this.getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId, amount }),
      });
      return this.handleResponse(response);
    } catch (error) {
      console.error("Update salary error:", error);
      throw error;
    }
  }

  async markSalaryAsPaid(salaryId) {
    try {
      const response = await fetch(`${API_URL}/salary/mark-paid/${salaryId}`, {
        method: "PUT",
        headers: this.getAuthHeaders(),
      });
      return this.handleResponse(response);
    } catch (error) {
      console.error("Mark salary as paid error:", error);
      throw error;
    }
  }

  async undoSalaryPaid(salaryId) {
    try {
      const response = await fetch(`${API_URL}/salary/undo-paid/${salaryId}`, {
        method: "PUT",
        headers: this.getAuthHeaders(),
      });
      return this.handleResponse(response);
    } catch (error) {
      console.error("Undo salary paid error:", error);
      throw error;
    }
  }

  async getUserSalaryHistory(userId) {
    try {
      const response = await fetch(`${API_URL}/salary/user/${userId}`, {
        headers: this.getAuthHeaders(),
      });
      return this.handleResponse(response);
    } catch (error) {
      console.error("Get user salary history error:", error);
      throw error;
    }
  }

  async editPaidSalary(salaryId, { monthNumber, year }) {
    try {
      const response = await fetch(`${API_URL}/salary/edit-paid/${salaryId}`, {
        method: "PUT",
        headers: {
          ...this.getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ monthNumber, year }),
      });
      return this.handleResponse(response);
    } catch (error) {
      console.error("Edit paid salary error:", error);
      throw error;
    }
  }

  async deleteSalaryRecord(salaryId) {
    try {
      const response = await fetch(`${API_URL}/salary/${salaryId}`, {
        method: "DELETE",
        headers: this.getAuthHeaders(),
      });
      return this.handleResponse(response);
    } catch (error) {
      console.error("Delete salary record error:", error);
      throw error;
    }
  }

  async deleteAllSalaries() {
    try {
      const response = await fetch(`${API_URL}/salary/delete-all`, {
        method: "DELETE",
        headers: this.getAuthHeaders(),
      });
      return this.handleResponse(response);
    } catch (error) {
      console.error("Delete all salaries error:", error);
      throw error;
    }
  }

  async getPaidSalaries() {
    try {
      const response = await fetch(`${API_URL}/salary/paid-salaries`, {
        headers: this.getAuthHeaders(),
      });
      return this.handleResponse(response);
    } catch (error) {
      console.error("Get paid salaries error:", error);
      throw error;
    }
  }

  async getCnpsPreference(userId) {
    const response = await fetch(`${API_URL}/salary/cnps/${userId}`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async setCnpsPreference(userId, excluded) {
    const response = await fetch(`${API_URL}/salary/cnps/${userId}`, {
      method: "PUT",
      headers: { ...this.getAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ excluded }),
    });
    return this.handleResponse(response);
  }

  async getSalaryDescriptions() {
    try {
      const response = await fetch(`${API_URL}/salary/descriptions`, {
        headers: this.getAuthHeaders(),
      });
      return this.handleResponse(response);
    } catch (error) {
      console.error("Get salary descriptions error:", error);
      throw error;
    }
  }

  async saveSalaryDescriptions(descriptions) {
    try {
      const response = await fetch(`${API_URL}/salary/descriptions`, {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ descriptions }),
      });
      return await this.handleResponse(response);
    } catch (error) {
      console.error("Error saving salary descriptions:", error);
      throw error;
    }
  }

  // Subject Classification and Coefficient Management
  async getSubjectClassifications() {
    try {
      const response = await fetch(`${API_URL}/subject-classifications`, {
        method: "GET",
        headers: this.getAuthHeaders(),
      });
      return await this.handleResponse(response);
    } catch (error) {
      console.error("Error fetching subject classifications:", error);
      throw error;
    }
  }

  async saveSubjectClassifications(classId, classifications) {
    try {
      const response = await fetch(`${API_URL}/subject-classifications`, {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ classId, classifications }),
      });
      return await this.handleResponse(response);
    } catch (error) {
      console.error("Error saving subject classifications:", error);
      throw error;
    }
  }

  async getSubjectCoefficients() {
    try {
      const response = await fetch(`${API_URL}/subject-coefficients`, {
        method: "GET",
        headers: this.getAuthHeaders(),
      });
      return await this.handleResponse(response);
    } catch (error) {
      console.error("Error fetching subject coefficients:", error);
      throw error;
    }
  }

  async saveSubjectCoefficients(classId, coefficients) {
    try {
      const response = await fetch(
        `${API_URL}/subject-coefficients/${classId}`,
        {
          method: "POST",
          headers: this.getAuthHeaders(),
          body: JSON.stringify({ coefficients }),
        }
      );
      if (!response.ok) throw new Error("Failed to save subject coefficients");
      return await response.json();
    } catch (error) {
      console.error("Error saving subject coefficients:", error);
      throw error;
    }
  }

  // Get all users for class master selection
  async getUsersForClassMaster() {
    try {
      const response = await fetch(`${API_URL}/users/all`, {
        method: "GET",
        headers: this.getAuthHeaders(),
      });
      return await this.handleResponse(response);
    } catch (error) {
      console.error("Error fetching users for class master:", error);
      throw error;
    }
  }

  // Get all approved applicants (for class master selection)
  async getApprovedApplicants() {
    try {
      const response = await this.getApplications();
      // If response is an object with a data property, use that
      const applications = Array.isArray(response)
        ? response
        : response.data || [];
      return applications
        .filter((app) => app.status === "approved")
        .map((app) => ({
          id: app.applicant_id,
          full_name: app.applicant_name,
          contact: app.contact,
        }));
    } catch (error) {
      console.error("Error fetching approved applicants:", error);
      return [];
    }
  }

  // Get the class master for a class and academic year
  async getClassMaster(classId, academicYear) {
    try {
      const response = await fetch(
        `${API_URL}/masters/${classId}/${encodeURIComponent(academicYear)}`,
        {
          method: "GET",
          headers: this.getAuthHeaders(),
        }
      );
      return await this.handleResponse(response);
    } catch (error) {
      console.error("Error fetching class master:", error);
      throw error;
    }
  }

  // Save the class master for a class and academic year
  async saveClassMaster(classId, academicYear, master_id) {
    try {
      const response = await fetch(
        `${API_URL}/masters/${classId}/${encodeURIComponent(academicYear)}`,
        {
          method: "POST",
          headers: this.getAuthHeaders(),
          body: JSON.stringify({ master_id }),
        }
      );
      return await this.handleResponse(response);
    } catch (error) {
      console.error("Error saving class master:", error);
      throw error;
    }
  }

  async saveTimetableSettings(config) {
    try {
      const response = await fetch(`${API_URL}/timetables/settings`, {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: JSON.stringify(config),
      });
      return await this.handleResponse(response);
    } catch (error) {
      console.error("Error saving timetable settings:", error);
      throw error;
    }
  }

  async getTimetableSettings() {
    try {
      const response = await fetch(`${API_URL}/timetables/settings`, {
        method: "GET",
        headers: this.getAuthHeaders(),
      });
      return await this.handleResponse(response);
    } catch (error) {
      console.error("Error fetching timetable settings:", error);
      throw error;
    }
  }

  async saveClassTimetable(classId, data) {
    try {
      const response = await fetch(`${API_URL}/timetables/class/${classId}`, {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: JSON.stringify(data),
      });
      return await this.handleResponse(response);
    } catch (error) {
      console.error("Error saving class timetable:", error);
      throw error;
    }
  }

  async getClassTimetable(classId) {
    try {
      const response = await fetch(`${API_URL}/timetables/class/${classId}`, {
        method: "GET",
        headers: this.getAuthHeaders(),
      });
      return await this.handleResponse(response);
    } catch (error) {
      console.error("Error fetching class timetable:", error);
      throw error;
    }
  }

  async getAllTimetables() {
    try {
      const response = await fetch(`${API_URL}/timetables`, {
        method: "GET",
        headers: this.getAuthHeaders(),
      });
      return await this.handleResponse(response);
    } catch (error) {
      console.error("Error fetching timetables:", error);
      throw error;
    }
  }

  async saveTeacherAssignments(assignments) {
    try {
      const response = await fetch(`${API_URL}/timetables/assignments/bulk`, {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ assignments }),
      });
      return await this.handleResponse(response);
    } catch (error) {
      console.error("Error saving assignments:", error);
      throw error;
    }
  }

  async getTeacherAssignments({ classId, subjectId } = {}) {
    try {
      const params = new URLSearchParams();
      if (classId) params.set("classId", classId);
      if (subjectId) params.set("subjectId", subjectId);
      const response = await fetch(
        `${API_URL}/timetables/assignments?${params.toString()}`,
        {
          method: "GET",
          headers: this.getAuthHeaders(),
        }
      );
      return await this.handleResponse(response);
    } catch (error) {
      console.error("Error fetching assignments:", error);
      throw error;
    }
  }

  async deleteAllTimetables() {
    try {
      const response = await fetch(`${API_URL}/timetables/delete-all`, {
        method: "DELETE",
        headers: this.getAuthHeaders(),
      });
      return await this.handleResponse(response);
    } catch (error) {
      console.error("Error deleting all timetables:", error);
      throw error;
    }
  }

  async deleteTimetableSettings() {
    try {
      const response = await fetch(`${API_URL}/timetables/settings`, {
        method: "DELETE",
        headers: this.getAuthHeaders(),
      });
      return await this.handleResponse(response);
    } catch (error) {
      console.error("Error deleting timetable settings:", error);
      throw error;
    }
  }

  async deleteTeacherAssignments() {
    try {
      const response = await fetch(`${API_URL}/timetables/assignments`, {
        method: "DELETE",
        headers: this.getAuthHeaders(),
      });
      return await this.handleResponse(response);
    } catch (error) {
      console.error("Error deleting teacher assignments:", error);
      throw error;
    }
  }

  async saveClassRequirements(classRequirements) {
    try {
      const response = await fetch(`${API_URL}/timetables/class-requirements`, {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ classRequirements }),
      });
      return await this.handleResponse(response);
    } catch (error) {
      console.error("Error saving class requirements:", error);
      throw error;
    }
  }

  async getClassRequirements() {
    try {
      const response = await fetch(`${API_URL}/timetables/class-requirements`, {
        method: "GET",
        headers: this.getAuthHeaders(),
      });
      return await this.handleResponse(response);
    } catch (error) {
      console.error("Error fetching class requirements:", error);
      throw error;
    }
  }

  async saveHeavySubjects(heavySubjectIds) {
    try {
      const response = await fetch(`${API_URL}/timetables/heavy-subjects`, {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ heavySubjectIds }),
      });
      return await this.handleResponse(response);
    } catch (error) {
      console.error("Error saving heavy subjects:", error);
      throw error;
    }
  }

  async getHeavySubjects() {
    try {
      const response = await fetch(`${API_URL}/timetables/heavy-subjects`, {
        method: "GET",
        headers: this.getAuthHeaders(),
      });
      return await this.handleResponse(response);
    } catch (error) {
      console.error("Error fetching heavy subjects:", error);
      throw error;
    }
  }

  async deleteClassRequirements() {
    try {
      const response = await fetch(`${API_URL}/timetables/class-requirements`, {
        method: "DELETE",
        headers: this.getAuthHeaders(),
      });
      return await this.handleResponse(response);
    } catch (error) {
      console.error("Error deleting class requirements:", error);
      throw error;
    }
  }

  async deleteHeavySubjects() {
    try {
      const response = await fetch(`${API_URL}/timetables/heavy-subjects`, {
        method: "DELETE",
        headers: this.getAuthHeaders(),
      });
      return await this.handleResponse(response);
    } catch (error) {
      console.error("Error deleting heavy subjects:", error);
      throw error;
    }
  }

  // === Cases API ===
  async getCases() {
    const response = await fetch(`${API_URL}/cases`, {
      headers: this.getAuthHeaders(),
    });
    return await this.handleResponse(response);
  }

  async getStudentsForCases() {
    console.log(
      "API: Getting students for cases from:",
      `${API_URL}/cases/students/list`
    );
    console.log("API: Auth headers:", this.getAuthHeaders());
    const response = await fetch(`${API_URL}/cases/students/list`, {
      headers: this.getAuthHeaders(),
    });
    console.log("API: Students response status:", response.status);
    return await this.handleResponse(response);
  }

  async getClassesForCases() {
    console.log(
      "API: Getting classes for cases from:",
      `${API_URL}/cases/classes/list`
    );
    const response = await fetch(`${API_URL}/cases/classes/list`, {
      headers: this.getAuthHeaders(),
    });
    console.log("API: Classes response status:", response.status);
    return await this.handleResponse(response);
  }

  async getAdminsForReports() {
    const response = await fetch(`${API_URL}/cases/admins/list`, {
      headers: this.getAuthHeaders(),
    });
    return await this.handleResponse(response);
  }

  async getCaseSessions(caseId) {
    const response = await fetch(`${API_URL}/cases/${caseId}/sessions`, {
      headers: this.getAuthHeaders(),
    });
    return await this.handleResponse(response);
  }

  async createCase(data) {
    const response = await fetch(`${API_URL}/cases`, {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return await this.handleResponse(response);
  }

  async updateCase(id, data) {
    const response = await fetch(`${API_URL}/cases/${id}`, {
      method: "PUT",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return await this.handleResponse(response);
  }

  async deleteCase(id) {
    const response = await fetch(`${API_URL}/cases/${id}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(),
    });
    return await this.handleResponse(response);
  }

  async createCaseSession(caseId, data) {
    const response = await fetch(`${API_URL}/cases/${caseId}/sessions`, {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return await this.handleResponse(response);
  }

  async sendCaseReport(caseId, data) {
    const response = await fetch(`${API_URL}/cases/${caseId}/send-report`, {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return await this.handleResponse(response);
  }

  // Optional: session update/delete if needed elsewhere
  async updateCaseSession(sessionId, data) {
    const response = await fetch(`${API_URL}/cases/sessions/${sessionId}`, {
      method: "PUT",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return await this.handleResponse(response);
  }

  async deleteCaseSession(sessionId) {
    const response = await fetch(`${API_URL}/cases/sessions/${sessionId}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(),
    });
    return await this.handleResponse(response);
  }

  async getStudentsByClass(classId) {
    try {
      const response = await fetch(`${API_URL}/students/class/${classId}`, {
        headers: this.getAuthHeaders(),
      });
      return await this.handleResponse(response);
    } catch (error) {
      console.error("Get students by class error:", error);
      throw error;
    }
  }

  // Student Attendance endpoints (restored)
  async getAttendanceClasses() {
    const response = await fetch(`${API_URL}/attendance/classes`, {
      headers: this.getAuthHeaders(),
    });
    return await this.handleResponse(response);
  }

  async getAttendanceStudents(classId) {
    const response = await fetch(`${API_URL}/attendance/${classId}/students`, {
      headers: this.getAuthHeaders(),
    });
    return await this.handleResponse(response);
  }

  async startAttendanceSession({ type, class_id, session_time }) {
    const response = await fetch(`${API_URL}/attendance/start`, {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ type, class_id, session_time }),
    });
    return await this.handleResponse(response);
  }

  async saveAttendanceBulk(sessionId, records) {
    const response = await fetch(
      `${API_URL}/attendance/${sessionId}/mark-bulk`,
      {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ records }),
      }
    );
    return await this.handleResponse(response);
  }

  async getTodayAttendanceSummary() {
    const response = await fetch(`${API_URL}/attendance/today-summary`, {
      headers: this.getAuthHeaders(),
    });
    return await this.handleResponse(response);
  }

  async getTodaySessions() {
    console.log("API: Fetching today sessions...");
    const response = await fetch(`${API_URL}/attendance/today-sessions`, {
      headers: this.getAuthHeaders(),
    });
    const data = await this.handleResponse(response);
    console.log("API: Today sessions response:", data);
    return data;
  }

  async exportAttendance({ type, classId, date }) {
    const params = new URLSearchParams();
    if (type) params.set("type", type);
    if (classId) params.set("classId", classId);
    if (date) params.set("date", date);
    const response = await fetch(
      `${API_URL}/attendance/export?${params.toString()}`,
      { headers: this.getAuthHeaders() }
    );
    return await this.handleResponse(response);
  }

  async deleteAllAttendance() {
    const response = await fetch(`${API_URL}/attendance/all`, {
      method: "DELETE",
      headers: this.getAuthHeaders(),
    });
    return await this.handleResponse(response);
  }

  // Staff Attendance API endpoints
  async getStaffAttendanceStats() {
    const response = await fetch(`${API_URL}/staff-attendance/stats`, {
      headers: this.getAuthHeaders(),
    });
    return await this.handleResponse(response);
  }

  async uploadStaffAttendanceFile(file) {
    const formData = new FormData();
    formData.append("file", file);

    const authHeaders = this.getAuthHeaders();
    const headers = {};
    if (authHeaders["Authorization"]) {
      headers["Authorization"] = authHeaders["Authorization"];
    }

    const response = await fetch(`${API_URL}/staff-attendance/upload`, {
      method: "POST",
      headers: headers,
      body: formData,
    });
    return await this.handleResponse(response);
  }

  async getStaffAttendanceRecords(params = {}) {
    const queryParams = new URLSearchParams();
    if (params.page) queryParams.set("page", params.page);
    if (params.limit) queryParams.set("limit", params.limit);
    if (params.month) queryParams.set("month", params.month);
    if (params.year) queryParams.set("year", params.year);

    const response = await fetch(
      `${API_URL}/staff-attendance/records?${queryParams.toString()}`,
      {
        headers: this.getAuthHeaders(),
      }
    );
    return await this.handleResponse(response);
  }

  async createStaffAttendanceRecord(data) {
    const response = await fetch(`${API_URL}/staff-attendance/records`, {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return await this.handleResponse(response);
  }

  async updateStaffAttendanceRecord(id, data) {
    const response = await fetch(`${API_URL}/staff-attendance/records/${id}`, {
      method: "PUT",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return await this.handleResponse(response);
  }

  async deleteStaffAttendanceRecord(id) {
    const response = await fetch(`${API_URL}/staff-attendance/records/${id}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(),
    });
    return await this.handleResponse(response);
  }

  async generateStaffMonthlyReport(month, year) {
    const params = new URLSearchParams();
    params.set("month", month);
    params.set("year", year);

    const response = await fetch(
      `${API_URL}/staff-attendance/monthly-report?${params.toString()}`,
      {
        headers: this.getAuthHeaders(),
      }
    );
    return await this.handleResponse(response);
  }

  async getStaffUsers() {
    const response = await fetch(`${API_URL}/staff-attendance/users`, {
      headers: this.getAuthHeaders(),
    });
    return await this.handleResponse(response);
  }

  async getStaffClasses() {
    const response = await fetch(`${API_URL}/staff-attendance/classes`, {
      headers: this.getAuthHeaders(),
    });
    return await this.handleResponse(response);
  }

  async getStaffEmploymentStatus() {
    const response = await fetch(
      `${API_URL}/staff-attendance/employment-status`,
      {
        headers: this.getAuthHeaders(),
      }
    );
    return await this.handleResponse(response);
  }

  async updateStaffEmploymentStatus(staffName, employmentType) {
    const response = await fetch(
      `${API_URL}/staff-attendance/employment-status`,
      {
        method: "PUT",
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          staff_name: staffName,
          employment_type: employmentType,
        }),
      }
    );
    return await this.handleResponse(response);
  }

  async getStaffAttendanceSettings() {
    const response = await fetch(`${API_URL}/staff-attendance/settings`, {
      headers: this.getAuthHeaders(),
    });
    return await this.handleResponse(response);
  }

  async updateStaffAttendanceSettings(
    fullTimeDays,
    partTimeDays,
    startTime,
    endTime
  ) {
    const response = await fetch(`${API_URL}/staff-attendance/settings`, {
      method: "PUT",
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        full_time_expected_days: fullTimeDays,
        part_time_expected_days: partTimeDays,
        start_time: startTime,
        end_time: endTime,
      }),
    });
    return await this.handleResponse(response);
  }

  // Discipline Cases API endpoints
  async getDisciplineCases() {
    const response = await fetch(`${API_URL}/discipline-cases`, {
      headers: this.getAuthHeaders(),
    });
    return await this.handleResponse(response);
  }

  async getDisciplineStudents() {
    console.log(
      "API: Getting discipline students from:",
      `${API_URL}/discipline-cases/students`
    );
    const response = await fetch(`${API_URL}/discipline-cases/students`, {
      headers: this.getAuthHeaders(),
    });
    console.log("API: Discipline students response status:", response.status);
    return await this.handleResponse(response);
  }

  async getDisciplineClasses() {
    console.log(
      "API: Getting discipline classes from:",
      `${API_URL}/discipline-cases/classes`
    );
    const response = await fetch(`${API_URL}/discipline-cases/classes`, {
      headers: this.getAuthHeaders(),
    });
    console.log("API: Discipline classes response status:", response.status);
    return await this.handleResponse(response);
  }

  async getDisciplineTeachers() {
    const response = await fetch(`${API_URL}/discipline-cases/teachers`, {
      headers: this.getAuthHeaders(),
    });
    return await this.handleResponse(response);
  }

  async getDisciplineCaseStats() {
    const response = await fetch(`${API_URL}/discipline-cases/stats`, {
      headers: this.getAuthHeaders(),
    });
    return await this.handleResponse(response);
  }

  async createDisciplineCase(data) {
    const response = await fetch(`${API_URL}/discipline-cases`, {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return await this.handleResponse(response);
  }

  async updateDisciplineCaseStatus(id, data) {
    const response = await fetch(`${API_URL}/discipline-cases/${id}/status`, {
      method: "PUT",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return await this.handleResponse(response);
  }

  async deleteDisciplineCase(id) {
    const response = await fetch(`${API_URL}/discipline-cases/${id}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(),
    });
    return await this.handleResponse(response);
  }

  async deleteAllDisciplineCases() {
    const response = await fetch(`${API_URL}/discipline-cases`, {
      method: "DELETE",
      headers: this.getAuthHeaders(),
    });
    return await this.handleResponse(response);
  }

  // === Events API ===
  async getEvents() {
    const response = await fetch(`${API_URL}/events`, {
      headers: this.getAuthHeaders(),
    });
    return await this.handleResponse(response);
  }

  async getMyEvents() {
    const response = await fetch(`${API_URL}/events/my-events`, {
      headers: this.getAuthHeaders(),
    });
    return await this.handleResponse(response);
  }

  async getEventsByRange(startDate, endDate) {
    const params = new URLSearchParams();
    params.set("start_date", startDate);
    params.set("end_date", endDate);

    const response = await fetch(
      `${API_URL}/events/range?${params.toString()}`,
      {
        headers: this.getAuthHeaders(),
      }
    );
    return await this.handleResponse(response);
  }

  async getUpcomingEvents() {
    const response = await fetch(`${API_URL}/events/upcoming`, {
      headers: this.getAuthHeaders(),
    });
    return await this.handleResponse(response);
  }

  async getEventStats() {
    const response = await fetch(`${API_URL}/events/stats`, {
      headers: this.getAuthHeaders(),
    });
    return await this.handleResponse(response);
  }

  async createEvent(eventData) {
    const response = await fetch(`${API_URL}/events`, {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(eventData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      if (response.status === 409) {
        throw new Error(`Event creation failed: ${errorData.error}`);
      }
      throw new Error(errorData.error || "Failed to create event");
    }

    return await this.handleResponse(response);
  }

  async updateEvent(id, eventData) {
    const response = await fetch(`${API_URL}/events/${id}`, {
      method: "PUT",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(eventData),
    });
    return await this.handleResponse(response);
  }

  async deleteEvent(id) {
    const response = await fetch(`${API_URL}/events/${id}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(),
    });
    return await this.handleResponse(response);
  }

  async getEvent(id) {
    const response = await fetch(`${API_URL}/events/${id}`, {
      headers: this.getAuthHeaders(),
    });
    return await this.handleResponse(response);
  }

  async getMyPaidSalaries() {
    try {
      const response = await fetch(`${API_URL}/salary/my/paid`, {
        headers: this.getAuthHeaders(),
      });
      return this.handleResponse(response);
    } catch (error) {
      console.error("Get my paid salaries error:", error);
      throw error;
    }
  }

  async getPayslipSettings() {
    const response = await fetch(`${API_URL}/salary/payslip-settings`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async savePayslipSettings(settings) {
    const response = await fetch(`${API_URL}/salary/payslip-settings`, {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ settings }),
    });
    return this.handleResponse(response);
  }

  async getTeacherDisciplineCases() {
    const response = await fetch(`${API_URL}/teacher-discipline-cases`, {
      headers: this.getAuthHeaders(),
    });
    return await this.handleResponse(response);
  }

  async createTeacherDisciplineCase(data) {
    const response = await fetch(`${API_URL}/teacher-discipline-cases`, {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return await this.handleResponse(response);
  }

  async updateTeacherDisciplineCaseStatus(id, data) {
    // repurpose to general update
    const response = await fetch(`${API_URL}/teacher-discipline-cases/${id}`, {
      method: "PUT",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return await this.handleResponse(response);
  }

  async deleteTeacherDisciplineCase(id) {
    const response = await fetch(`${API_URL}/teacher-discipline-cases/${id}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(),
    });
    return await this.handleResponse(response);
  }

  // HODs API methods
  async getHODs() {
    const response = await fetch(`${API_URL}/hods`, {
      headers: this.getAuthHeaders(),
    });
    return await this.handleResponse(response);
  }

  async getHOD(id) {
    const response = await fetch(`${API_URL}/hods/${id}`, {
      headers: this.getAuthHeaders(),
    });
    return await this.handleResponse(response);
  }

  async createHOD(hodData) {
    const response = await fetch(`${API_URL}/hods`, {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(hodData),
    });
    return await this.handleResponse(response);
  }

  async updateHOD(id, hodData) {
    const response = await fetch(`${API_URL}/hods/${id}`, {
      method: "PUT",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(hodData),
    });
    return await this.handleResponse(response);
  }

  async deleteHOD(id) {
    const response = await fetch(`${API_URL}/hods/${id}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(),
    });
    return await this.handleResponse(response);
  }

  async toggleHODSuspension(id) {
    const response = await fetch(`${API_URL}/hods/${id}/toggle-suspension`, {
      method: "PATCH",
      headers: this.getAuthHeaders(),
    });
    return await this.handleResponse(response);
  }

  async getHODStats() {
    const response = await fetch(`${API_URL}/hods/stats/overview`, {
      headers: this.getAuthHeaders(),
    });
    return await this.handleResponse(response);
  }
}

const api = new ApiService();

export default api;
