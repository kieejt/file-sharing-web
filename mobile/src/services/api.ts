import axios, { AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import axiosRetry from 'axios-retry';

// Types
interface User {
  _id: string;
  name: string;
  email: string;
}

interface AuthResponse {
  token: string;
  user: User;
}

interface FileData {
  file: any;
  name?: string;
  description?: string;
  isPublic?: boolean;
}

interface FileResponse {
  [x: string]: any;
  _id: string;
  name: string;
  originalName: string;
  description?: string;
  isPublic: boolean;
  shareId: string;
  size: number;
  mimeType: string;
  user: string;
  createdAt: string;
  updatedAt: string;
}

interface PaginatedResponse<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
}

// Get base URL based on platform
const getBaseURL = () => {
  // Use the development machine's IP address for both iOS and Android
  return 'http://192.168.23.100:5000/api';
};

// Create axios instance with base URL
const API = axios.create({
  baseURL: getBaseURL(),
  timeout: 30000, // 30 seconds timeout
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Configure retry
axiosRetry(API, { 
  retries: 3,
  retryDelay: (retryCount: number) => {
    return retryCount * 1000; // time interval between retries
  },
  retryCondition: (error: AxiosError) => {
    return axiosRetry.isNetworkOrIdempotentRequestError(error) || error.code === 'ECONNABORTED';
  }
});

// Add request interceptor for logging
API.interceptors.request.use(
  async (config) => {
    console.log('API Request:', {
      url: config.url,
      method: config.method,
      data: config.data,
      headers: config.headers,
      baseURL: config.baseURL,
      platform: Platform.OS
    });
    
    // Không thêm Content-Type cho FormData
    if (!(config.data instanceof FormData)) {
      config.headers['Content-Type'] = 'application/json';
    }
    
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for logging
API.interceptors.response.use(
  (response) => {
    console.log('API Response:', {
      status: response.status,
      data: response.data
    });
    return response;
  },
  async (error) => {
    console.error('API Response Error:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    // Handle 401 (Unauthorized)
    if (error.response && error.response.status === 401) {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
      // Navigation will be handled by the auth context
    }
    return Promise.reject(error);
  }
);

// Authentication API
export const authAPI = {
  register: (userData: { name: string; email: string; password: string }) =>
    API.post<AuthResponse>('/auth/register', userData),
  login: (userData: { email: string; password: string }) =>
    API.post<AuthResponse>('/auth/login', userData),
  getMe: () => API.get<User>('/auth/me'),
  updateDetails: (userData: { name: string; email: string }) =>
    API.put<User>('/auth/updatedetails', userData),
  updatePassword: (passwordData: { currentPassword: string; newPassword: string }) =>
    API.put<void>('/auth/updatepassword', passwordData)
};

// Files API
export const fileAPI = {
  uploadFile: (fileData: FileData) => {
    const formData = new FormData();
    formData.append('file', fileData.file);
    if (fileData.name) formData.append('name', fileData.name);
    if (fileData.description) formData.append('description', fileData.description);
    if (fileData.isPublic !== undefined) formData.append('isPublic', String(fileData.isPublic));
    
    return API.post<FileResponse>('/files', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  },
  getFiles: (page = 1, limit = 10, search = '') => {
    return API.get<PaginatedResponse<FileResponse>>(`/files?page=${page}&limit=${limit}&search=${search}`);
  },
  getFile: (id: string) => API.get<FileResponse>(`/files/${id}`),
  updateFile: (id: string, fileData: Partial<FileData>) =>
    API.put<FileResponse>(`/files/${id}`, fileData),
  deleteFile: (id: string) => API.delete<void>(`/files/${id}`),
  downloadFile: (id: string) => {
    return API.get(`/files/${id}/download`, {
      responseType: 'blob'
    });
  },
  getSharedFile: (shareId: string) => API.get<FileResponse>(`/files/share/${shareId}`),
  downloadSharedFile: (shareId: string) => {
    return API.get(`/files/share/${shareId}/download`, {
      responseType: 'blob'
    });
  },
  getUserDetails: (userId: string) => {
    return API.get<User>(`/auth/users/${userId}`);
  }
};

export default API;