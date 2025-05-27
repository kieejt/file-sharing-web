import React, { useState, useContext, useEffect } from 'react';
import { toast } from 'react-toastify';
import { AuthContext } from '../context/AuthContext';
import { authAPI } from '../utils/API';
import { FaUser, FaKey, FaSave } from 'react-icons/fa';

const Profile = () => {
  const { user, updateUser } = useContext(AuthContext);
  
  // State cho form thông tin cá nhân
  const [name, setName] = useState('');
  const [loadingDetails, setLoadingDetails] = useState(false);
  
  // State cho form đổi mật khẩu
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loadingPassword, setLoadingPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
    }
  }, [user]);

  const handleUpdateDetails = async (e) => {
    e.preventDefault();
    
    if (!name.trim()) {
      return toast.error('Vui lòng nhập tên của bạn');
    }
    
    try {
      setLoadingDetails(true);
      const response = await authAPI.updateDetails({ name });
      
      // Cập nhật thông tin người dùng trong context
      updateUser(response.data.data);
      
      toast.success('Cập nhật thông tin thành công');
      setLoadingDetails(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể cập nhật thông tin');
      setLoadingDetails(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    
    // Kiểm tra mật khẩu
    if (!currentPassword || !newPassword || !confirmPassword) {
      return toast.error('Vui lòng điền đầy đủ thông tin');
    }
    
    if (newPassword !== confirmPassword) {
      return toast.error('Mật khẩu mới không khớp');
    }
    
    if (newPassword.length < 6) {
      return toast.error('Mật khẩu mới phải có ít nhất 6 ký tự');
    }
    
    try {
      setLoadingPassword(true);
      await authAPI.updatePassword({
        currentPassword,
        newPassword
      });
      
      // Xóa form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      toast.success('Cập nhật mật khẩu thành công');
      setLoadingPassword(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể cập nhật mật khẩu');
      setLoadingPassword(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Thông tin cá nhân</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Form cập nhật thông tin */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
            <FaUser className="mr-2 text-blue-500" />
            Cập nhật thông tin
          </h2>
          
          <form onSubmit={handleUpdateDetails}>
            <div className="mb-4">
              <label htmlFor="name" className="block text-gray-700 font-medium mb-2">
                Họ tên
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nhập họ tên của bạn"
              />
            </div>
            
            <div className="mb-4">
              <label htmlFor="email" className="block text-gray-700 font-medium mb-2">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={user?.email || ''}
                className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-100"
                disabled
              />
              <p className="text-sm text-gray-500 mt-1">Email không thể thay đổi</p>
            </div>
            
            <button
              type="submit"
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md transition duration-300 flex items-center justify-center"
              disabled={loadingDetails}
            >
              {loadingDetails ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Đang cập nhật...
                </span>
              ) : (
                <span className="flex items-center">
                  <FaSave className="mr-2" />
                  Lưu thay đổi
                </span>
              )}
            </button>
          </form>
        </div>
        
        {/* Form đổi mật khẩu */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
            <FaKey className="mr-2 text-blue-500" />
            Đổi mật khẩu
          </h2>
          
          <form onSubmit={handleUpdatePassword}>
            <div className="mb-4">
              <label htmlFor="currentPassword" className="block text-gray-700 font-medium mb-2">
                Mật khẩu hiện tại
              </label>
              <input
                type="password"
                id="currentPassword"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nhập mật khẩu hiện tại"
              />
            </div>
            
            <div className="mb-4">
              <label htmlFor="newPassword" className="block text-gray-700 font-medium mb-2">
                Mật khẩu mới
              </label>
              <input
                type="password"
                id="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nhập mật khẩu mới"
              />
            </div>
            
            <div className="mb-4">
              <label htmlFor="confirmPassword" className="block text-gray-700 font-medium mb-2">
                Xác nhận mật khẩu mới
              </label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nhập lại mật khẩu mới"
              />
            </div>
            
            <button
              type="submit"
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-md transition duration-300 flex items-center justify-center"
              disabled={loadingPassword}
            >
              {loadingPassword ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Đang cập nhật...
                </span>
              ) : (
                <span className="flex items-center">
                  <FaSave className="mr-2" />
                  Cập nhật mật khẩu
                </span>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile; 