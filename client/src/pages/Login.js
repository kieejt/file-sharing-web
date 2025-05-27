import React, { useState, useContext, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { AuthContext } from '../context/AuthContext';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { login, user, error, setError } = useContext(AuthContext);
  const navigate = useNavigate();
  
  useEffect(() => {
    // Nếu người dùng đã đăng nhập, chuyển hướng đến trang dashboard
    if (user) {
      navigate('/dashboard');
    }
    
    // Xóa thông báo lỗi khi component được mount
    return () => {
      if (setError) setError(null);
    };
  }, [user, navigate, setError]);
  
  useEffect(() => {
    // Hiển thị thông báo lỗi nếu có
    if (error) {
      toast.error(error);
    }
  }, [error]);
  
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Kiểm tra dữ liệu đầu vào
    if (!formData.email || !formData.password) {
      toast.error('Vui lòng nhập đầy đủ thông tin');
      return;
    }
    
    try {
      setIsSubmitting(true);
      const success = await login(formData.email, formData.password);
      
      if (success) {
        toast.success('Đăng nhập thành công!');
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Login error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Đăng nhập</h1>
        <p className="text-gray-600 mt-2">
          Đăng nhập để truy cập tài khoản của bạn
        </p>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Nhập email của bạn"
              required
            />
          </div>
          
          <div className="mb-6">
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Mật khẩu
              </label>
              <Link to="/forgot-password" className="text-xs text-primary-600 hover:text-primary-800">
                Quên mật khẩu?
              </Link>
            </div>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Nhập mật khẩu của bạn"
              required
            />
          </div>
          
          <button
            type="submit"
            className={`w-full py-2 px-4 rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
              isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
            }`}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Đang xử lý...
              </span>
            ) : (
              'Đăng nhập'
            )}
          </button>
        </form>
        
        <div className="mt-6 text-center text-sm">
          <span className="text-gray-600">Chưa có tài khoản? </span>
          <Link to="/register" className="text-primary-600 hover:text-primary-800 font-medium">
            Đăng ký ngay
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login; 