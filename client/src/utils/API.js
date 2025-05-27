import axios from 'axios';

// Tạo instance axios với URL cơ sở
const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api'
});

// Thêm interceptor để thêm token vào header
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Thêm interceptor để xử lý lỗi
API.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Xử lý lỗi 401 (Unauthorized)
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API Authentication
export const authAPI = {
  register: (userData) => API.post('/auth/register', userData),
  login: (userData) => API.post('/auth/login', userData),
  getMe: () => API.get('/auth/me'),
  updateDetails: (userData) => API.put('/auth/updatedetails', userData),
  updatePassword: (passwordData) => API.put('/auth/updatepassword', passwordData)
};

// API Files
export const fileAPI = {
  uploadFile: (fileData) => {
    const formData = new FormData();
    formData.append('file', fileData.file);
    if (fileData.name) formData.append('name', fileData.name);
    if (fileData.description) formData.append('description', fileData.description);
    if (fileData.isPublic !== undefined) formData.append('isPublic', fileData.isPublic);
    
    return API.post('/files', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  },
  getFiles: (page = 1, limit = 10, search = '') => {
    return API.get(`/files?page=${page}&limit=${limit}&search=${search}`);
  },
  getFile: (id) => API.get(`/files/${id}`),
  updateFile: (id, fileData) => API.put(`/files/${id}`, fileData),
  deleteFile: (id) => API.delete(`/files/${id}`),
  downloadFile: (id) => {
    return API.get(`/files/${id}/download`, {
      responseType: 'blob'
    });
  },
  getSharedFile: (shareId) => API.get(`/files/share/${shareId}`),
  downloadSharedFile: (shareId) => {
    return API.get(`/files/share/${shareId}/download`, {
      responseType: 'blob'
    });
  }
};

export default API; 