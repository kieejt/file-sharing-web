import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';

const FileCard = ({ file, onDelete, onUpdate }) => {
  const [copying, setCopying] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Hàm để xác định icon dựa trên loại file
  const getFileIcon = () => {
    if (!file || !file.originalName) return null;
    
    const extension = file.originalName.split('.').pop().toLowerCase();
    
    if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(extension)) {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
        </svg>
      );
    } else if (['pdf'].includes(extension)) {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
        </svg>
      );
    } else if (['doc', 'docx'].includes(extension)) {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-700" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
        </svg>
      );
    } else if (['xls', 'xlsx'].includes(extension)) {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
        </svg>
      );
    } else if (['zip', 'rar', '7z'].includes(extension)) {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-yellow-600" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm3 1h2v2H7V5zm2 3H7v2h2V8zm-2 3h2v2H7v-2zm3-6h2v2h-2V5zm2 3h-2v2h2V8zm-2 3h2v2h-2v-2z" clipRule="evenodd" />
        </svg>
      );
    } else {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
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
  const copyShareLink = async () => {
    try {
      setCopying(true);
      const shareLink = `${window.location.origin}/share/${file.shareId}`;
      await navigator.clipboard.writeText(shareLink);
      toast.success('Đã sao chép link chia sẻ!');
    } catch (error) {
      toast.error('Không thể sao chép link. Vui lòng thử lại.');
    } finally {
      setCopying(false);
      setTimeout(() => setCopying(false), 2000);
    }
  };

  // Hàm để tải xuống file
  const downloadFile = async () => {
    try {
      setDownloading(true);
      
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/files/${file._id}/download`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
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
    if (window.confirm('Bạn có chắc chắn muốn xóa file này?')) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`/api/files/${file._id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        toast.success('Đã xóa file thành công!');
        console.log('File deleted successfully');
        if (onDelete) {
          onDelete(file._id);
        }
      } catch (error) {
        console.error('Delete error:', error);
        toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi xóa file');
      }
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      <div className="p-4">
        <div className="flex items-start">
          {getFileIcon()}
          <div className="ml-3 flex-1 min-w-0">
            <Link to={`/files/${file._id}`} className="block">
              <h3 className="text-sm font-medium text-gray-900 truncate hover:text-primary-600">
                {file.name}
              </h3>
            </Link>
            <p className="text-xs text-gray-500 mt-1">
              {formatFileSize(file.size)} • Tải lên {file.createdAt ? new Date(file.createdAt).toLocaleDateString() : 'N/A'} • {file.downloadCount} lượt tải xuống
            </p>
          </div>
        </div>
        
        <div className="mt-4 flex justify-between">
          <button
            onClick={copyShareLink}
            className="text-xs flex items-center text-gray-700 hover:text-primary-600"
            disabled={copying}
          >
            {copying ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Đã sao chép
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Sao chép link
              </>
            )}
          </button>
          
          <div className="flex space-x-2">
            
              <button
                onClick={downloadFile}
                className="text-xs flex items-center text-gray-700 hover:text-primary-600"
                disabled={downloading}
              >
                {downloading ? (
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Tải xuống
                  </>
                )}
              </button>
            
            
            
              <button
                onClick={deleteFile}
                className="text-xs flex items-center text-red-600 hover:text-red-800"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Xóa
              </button>
            
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileCard; 