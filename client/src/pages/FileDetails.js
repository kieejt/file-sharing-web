import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { AuthContext } from '../context/AuthContext';
import { fileAPI } from '../utils/API';

const FileDetails = () => {
  const { fileId } = useParams();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copying, setCopying] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [updating, setUpdating] = useState(false);
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    fetchFileDetails();
  }, [fileId]);

  const fetchFileDetails = async () => {
    try {
      setLoading(true);
      
      // Lấy token nếu có (không bắt buộc cho trang chi tiết file)
      const token = localStorage.getItem('token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      
      const response = await axios.get(`/api/files/${fileId}`, { headers });
      
      if (response.data) {
        // Đảm bảo lấy đúng cấu trúc dữ liệu
        const fileData = response.data.data || response.data;
        console.log('File data from API:', fileData); // Log để debug
        setFile({
          ...fileData,
          currentUserId: user?.id
        });
      }
    } catch (error) {
      console.error('Error fetching file details:', error);
      
      if (error.response?.status === 404) {
        toast.error('File không tồn tại hoặc đã bị xóa');
        navigate('/404');
      } else if (error.response?.status === 403) {
        toast.error('Bạn không có quyền xem file này');
        navigate('/login');
      } else {
        toast.error('Không thể tải thông tin file');
      }
    } finally {
      setLoading(false);
    }
  };

  // Hàm để xác định icon dựa trên loại file
  const getFileIcon = () => {
    if (!file || !file.originalName) return null;
    
    const extension = file.originalName.split('.').pop().toLowerCase();
    
    if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(extension)) {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
        </svg>
      );
    } else if (['pdf'].includes(extension)) {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-red-500" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
        </svg>
      );
    } else if (['doc', 'docx'].includes(extension)) {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-blue-700" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
        </svg>
      );
    } else if (['xls', 'xlsx'].includes(extension)) {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-green-600" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
        </svg>
      );
    } else if (['zip', 'rar', '7z'].includes(extension)) {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-yellow-600" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm3 1h2v2H7V5zm2 3H7v2h2V8zm-2 3h2v2h-2v-2zm3-6h2v2h-2V5zm2 3h-2v2h2V8zm-2 3h2v2h-2v-2z" clipRule="evenodd" />
        </svg>
      );
    } else {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
        </svg>
      );
    }
  };

  // Hàm để định dạng kích thước file
  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    
    if (bytes < 1024) {
      return bytes + ' B';
    } else if (bytes < 1024 * 1024) {
      return (bytes / 1024).toFixed(2) + ' KB';
    } else {
      return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    }
  };

  // Hàm để sao chép link chia sẻ
  const copyShareLink = () => {
    const shareLink = `${window.location.origin}/share/${file.shareId}`;
    navigator.clipboard.writeText(shareLink)
      .then(() => {
        setCopying(true);
        toast.success('Đã sao chép link chia sẻ!');
        setTimeout(() => setCopying(false), 2000);
      })
      .catch(err => {
        toast.error('Không thể sao chép link: ' + err);
      });
  };

  // Hàm để tải xuống file
  const downloadFile = async () => {
    if (!file) return;
    
    try {
      setDownloading(true);
      
      // Lấy token nếu có (không bắt buộc cho tải xuống file)
      const token = localStorage.getItem('token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      
      const response = await axios.get(`/api/files/${fileId}/download`, {
        headers,
        responseType: 'blob'
      });
      
      // Kiểm tra nếu response không phải là blob (có thể là JSON lỗi)
      const contentType = response.headers['content-type'];
      if (contentType && contentType.indexOf('application/json') !== -1) {
        // Đây có thể là thông báo lỗi từ server
        const reader = new FileReader();
        reader.onload = function() {
          try {
            const errorData = JSON.parse(reader.result);
            toast.error(errorData.message || 'Có lỗi xảy ra khi tải xuống file');
          } catch (e) {
            toast.error('Có lỗi xảy ra khi tải xuống file');
          }
        };
        reader.readAsText(response.data);
        return;
      }
      
      // Tạo URL cho blob và tạo link tải xuống
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      // Đảm bảo tên file hợp lệ
      const fileName = file.originalName || `file_${fileId}.txt`;
      link.setAttribute('download', file.name);
      
      document.body.appendChild(link);
      link.click();
      
      // Dọn dẹp
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Tải xuống thành công!');
    } catch (error) {
      console.error('Download error:', error);
      if (error.response) {
        // Lỗi từ server
        if (error.response.status === 404) {
          toast.error('File không tồn tại hoặc đã bị xóa');
        } else if (error.response.status === 403) {
          toast.error('Bạn không có quyền tải xuống file này');
        } else {
          toast.error(error.response.data?.message || 'Có lỗi xảy ra khi tải xuống file');
        }
      } else {
        toast.error('Có lỗi xảy ra khi tải xuống file');
      }
    } finally {
      setDownloading(false);
    }
  };

  // Hàm để xóa file
  const deleteFile = async () => {
    if (!file || String(file.userId) !== String(user?.id || '')) return;
    
    if (window.confirm('Bạn có chắc chắn muốn xóa file này?')) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`/api/files/${fileId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        toast.success('Đã xóa file thành công!');
        navigate('/dashboard');
      } catch (error) {
        console.error('Delete error:', error);
        toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi xóa file');
      }
    }
  };

  // Hàm để bắt đầu đổi tên file
  const startRenameFile = () => {
    if (!file) return;
    // Lấy phần tên trước dấu chấm
    const nameWithoutExtension = file.name.split('.').slice(0, -1).join('.');
    setNewFileName(nameWithoutExtension);
    setIsRenaming(true);
  };

  // Hàm để hủy đổi tên file
  const cancelRenameFile = () => {
    setIsRenaming(false);
  };

  // Hàm để cập nhật tên file
  const updateFileName = async (e) => {
    e.preventDefault();
    
    if (!newFileName.trim()) {
      toast.error('Tên file không được để trống');
      return;
    }

    // Lấy phần đuôi của tên file gốc
    const originalExtension = file.originalName.split('.').pop();
    // Tạo tên file mới bằng cách thêm phần đuôi vào
    const newFullFileName = `${newFileName.trim()}.${originalExtension}`;
    
    try {
      setUpdating(true);
      
      const response = await fileAPI.updateFile(fileId, { name: newFullFileName });
      
      if (response.data) {
        setFile({
          ...file,
          name: newFullFileName
        });
        
        toast.success('Đổi tên file thành công!');
        setIsRenaming(false);
        // Tải lại thông tin file để đảm bảo dữ liệu mới nhất
        fetchFileDetails();
      }
    } catch (error) {
      console.error('Update error:', error);
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi cập nhật tên file');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto flex justify-center items-center py-16">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!file) {
    return (
      <div className="max-w-4xl mx-auto text-center py-16">
        <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-16 w-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h2 className="mt-4 text-xl font-medium text-gray-900">File không tồn tại</h2>
        <p className="mt-2 text-gray-600">File này có thể đã bị xóa hoặc link không hợp lệ.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {loading ? (
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : file ? (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="flex-shrink-0">
              {getFileIcon()}
            </div>
            
            <div className="flex-grow">
              {isRenaming ? (
                <form onSubmit={updateFileName} className="mb-4">
                  <div className="flex items-center">
                    <input
                      type="text"
                      value={newFileName}
                      onChange={(e) => setNewFileName(e.target.value)}
                      className="flex-grow px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Nhập tên mới cho file"
                      required
                    />
                    <div className="flex ml-2">
                      <button
                        type="submit"
                        disabled={updating}
                        className="px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                      >
                        {updating ? 'Đang lưu...' : 'Lưu'}
                      </button>
                      <button
                        type="button"
                        onClick={cancelRenameFile}
                        className="ml-2 px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Hủy
                      </button>
                    </div>
                  </div>
                </form>
              ) : (
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  {file.name || file.originalName}
                  
                    <button
                      onClick={startRenameFile}
                      className="ml-2 inline-flex items-center p-1 border border-transparent rounded-full shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      title="Đổi tên file"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                      </svg>
                    </button>
                  
                </h1>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                <div>
                  <p className="mb-2">
                    <span className="font-semibold">Tên file gốc:</span> {file.originalName}
                  </p>
                  <p className="mb-2">
                    <span className="font-semibold">Kích thước:</span> {formatFileSize(file.size)}
                  </p>
                  <p className="mb-2">
                    <span className="font-semibold">Loại file:</span> {file.type}
                  </p>
                </div>
                
                <div>
                  <p className="mb-2">
                    <span className="font-semibold">Người đăng tải:</span> {file.uploader?.name || 'Người dùng không xác định'}
                  </p>
                  <p className="mb-2">
                    <span className="font-semibold">Ngày tải lên:</span>{' '}
                    {new Date(file.createdAt).toLocaleDateString('vi-VN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                  <p className="mb-2">
                    <span className="font-semibold">Lượt tải xuống:</span> {file.downloadCount || 0}
                  </p>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-3 mt-6">
                <button
                  onClick={downloadFile}
                  disabled={downloading}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {downloading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Đang tải xuống...
                    </>
                  ) : (
                    <>
                      <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                      Tải xuống
                    </>
                  )}
                </button>
                
                <button
                  onClick={copyShareLink}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {copying ? (
                    <>
                      <svg className="-ml-1 mr-2 h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Đã sao chép
                    </>
                  ) : (
                    <>
                      <svg className="-ml-1 mr-2 h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
                      </svg>
                      Sao chép link
                    </>
                  )}
                </button>
                
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center text-gray-600">
          Không tìm thấy thông tin file
        </div>
      )}
    </div>
  );
};

export default FileDetails;