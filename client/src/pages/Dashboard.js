import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { AuthContext } from '../context/AuthContext';
import FileUploader from '../components/FileUploader';
import FileCard from '../components/FileCard';

const Dashboard = () => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { user } = useContext(AuthContext);

  useEffect(() => {
    fetchUserFiles();
  }, []);

  const fetchUserFiles = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await axios.get('/api/files', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.data) {
        // Lấy mảng file từ response
        const filesData = response.data.data || [];
        console.log('Files data from API:', filesData); // Log để debug
        
        // Thêm currentUserId vào mỗi file để kiểm tra quyền xóa
        const filesWithCurrentUser = filesData.map(file => ({
          ...file,
          currentUserId: user?.id
        }));
        setFiles(filesWithCurrentUser);
      }
    } catch (error) {
      console.error('Error fetching files:', error);
      toast.error('Không thể tải danh sách file');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadSuccess = (fileData) => {
    // Thêm file mới vào danh sách
    const newFileData = fileData.data || fileData;
    console.log('New file data after upload:', newFileData); // Log để debug
    
    const newFile = {
      ...newFileData,
      currentUserId: user?.id
    };
    setFiles([newFile, ...files]);
    toast.success('Tải lên file thành công!');
  };

  const handleDeleteFile = (fileId) => {
    // Xóa file khỏi danh sách
    setFiles(files.filter(file => file._id !== fileId));
  };

  const handleUpdateFile = (updatedFile) => {
    // Cập nhật file trong danh sách
    setFiles(files.map(file => 
      file._id === updatedFile._id ? { ...updatedFile, currentUserId: user?.id } : file
    ));
  };

  // Lọc file theo từ khóa tìm kiếm
  const filteredFiles = files.filter(file => 
    file.originalName && file.originalName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Quản lý file của bạn</h1>
        <p className="text-gray-600">
          Tải lên, quản lý và chia sẻ file của bạn từ một nơi duy nhất.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Tải lên file mới
        </h2>
        <FileUploader onUploadSuccess={handleUploadSuccess} />
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 md:mb-0">
            File của bạn
          </h2>
          <div className="w-full md:w-64">
            <input
              type="text"
              placeholder="Tìm kiếm file..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
          </div>
        ) : filteredFiles.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {filteredFiles.map(file => (
              <FileCard 
                key={file._id} 
                file={file} 
                onDelete={handleDeleteFile}
                onUpdate={handleUpdateFile}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">Không có file nào</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm ? 'Không tìm thấy file phù hợp với từ khóa tìm kiếm.' : 'Bắt đầu bằng cách tải lên file đầu tiên của bạn.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard; 