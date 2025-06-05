import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { fileAPI } from '../utils/API';
import { FaDownload, FaFile, FaFileImage, FaFilePdf, FaFileWord, FaFileExcel, FaFileArchive } from 'react-icons/fa';

const SharedFile = () => {
  const { shareId } = useParams();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSharedFile = async () => {
      try {
        setLoading(true);
        const response = await fileAPI.getSharedFile(shareId);
        setFile(response.data.data);
        setLoading(false);
      } catch (err) {
        setError(err.response?.data?.message || 'Không thể tải thông tin file');
        setLoading(false);
        toast.error(err.response?.data?.message || 'Không thể tải thông tin file');
      }
    };

    fetchSharedFile();
  }, [shareId]);

  const getFileIcon = (fileType) => {
    if (fileType.startsWith('image/')) {
      return <FaFileImage className="text-blue-500 text-5xl" />;
    } else if (fileType === 'application/pdf') {
      return <FaFilePdf className="text-red-500 text-5xl" />;
    } else if (fileType.includes('word') || fileType.includes('document')) {
      return <FaFileWord className="text-blue-700 text-5xl" />;
    } else if (fileType.includes('excel') || fileType.includes('spreadsheet')) {
      return <FaFileExcel className="text-green-600 text-5xl" />;
    } else if (fileType.includes('zip') || fileType.includes('compressed')) {
      return <FaFileArchive className="text-yellow-600 text-5xl" />;
    } else {
      return <FaFile className="text-gray-500 text-5xl" />;
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(2) + ' KB';
    else return (bytes / 1048576).toFixed(2) + ' MB';
  };

  const handleDownload = async () => {
    try {
      const response = await fileAPI.downloadSharedFile(shareId);
      
      // Tạo URL cho blob và tạo link tải xuống
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', file.name);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('Tải xuống file thành công');
    } catch (err) {
      toast.error('Không thể tải xuống file');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !file) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center p-4">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <div className="text-red-500 text-5xl mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">File không tồn tại</h1>
          <p className="text-gray-600 mb-6">
            {error || 'File bạn đang tìm kiếm không tồn tại hoặc đã bị xóa.'}
          </p>
          <Link to="/" className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded transition duration-300">
            Về trang chủ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md overflow-hidden">
        <div className="p-8">
          <div className="flex flex-col md:flex-row items-center">
            <div className="flex-shrink-0 mr-6 mb-4 md:mb-0">
              {getFileIcon(file.type)}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-800">{file.name}</h1>
              <p className="text-gray-500 mt-1">{file.originalName}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {formatFileSize(file.size)}
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  {file.type}
                </span>
              </div>
            </div>
          </div>

          {file.description && (
            <div className="mt-6">
              <h2 className="text-lg font-medium text-gray-800">Mô tả</h2>
              <p className="mt-2 text-gray-600">{file.description}</p>
            </div>
          )}

          <div className="mt-8 flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleDownload}
              className="flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <FaDownload className="mr-2" />
              Tải xuống
            </button>
            <Link
              to="/"
              className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Về trang chủ
            </Link>
          </div>

          <div className="mt-6 border-t border-gray-200 pt-6">
            <div className="flex items-center justify-between text-sm text-gray-500">
              <div>Lượt truy cập: {file.accessCount}</div>
              <div>Lượt tải: {file.downloadCount}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SharedFile; 