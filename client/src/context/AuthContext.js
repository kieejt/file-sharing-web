import React, { createContext, useState, useEffect } from 'react';
import { authAPI } from '../utils/API';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Kiểm tra xem người dùng đã đăng nhập chưa khi tải trang
  useEffect(() => {
    const checkUserLoggedIn = async () => {
      try {
        const token = localStorage.getItem('token');
        
        if (token) {
          const res = await authAPI.getMe();
          setUser(res.data.data);
        }
      } catch (err) {
        // Xóa token nếu không hợp lệ
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkUserLoggedIn();
  }, []);

  // Đăng ký người dùng
  const register = async (name, email, password) => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await authAPI.register({ name, email, password });
      
      // Lưu token và thông tin người dùng
      localStorage.setItem('token', res.data.token);
      setUser(res.data.user);
      
      setLoading(false);
      return true;
    } catch (err) {
      setLoading(false);
      setError(err.response?.data?.message || 'Đăng ký không thành công');
      return false;
    }
  };

  // Đăng nhập
  const login = async (email, password) => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await authAPI.login({ email, password });
      
      // Lưu token và thông tin người dùng
      localStorage.setItem('token', res.data.token);
      setUser(res.data.user);
      
      setLoading(false);
      return true;
    } catch (err) {
      setLoading(false);
      setError(err.response?.data?.message || 'Đăng nhập không thành công');
      return false;
    }
  };

  // Đăng xuất
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  // Cập nhật thông tin người dùng
  const updateUser = (userData) => {
    setUser(userData);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        setError,
        register,
        login,
        logout,
        updateUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}; 