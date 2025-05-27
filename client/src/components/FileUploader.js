import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import { toast } from 'react-toastify';

const FileUploader = ({ onUploadSuccess }) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);

  const onDrop = useCallback(acceptedFiles => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      setSelectedFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    multiple: false
  });

  const uploadFile = async () => {
    if (!selectedFile) {
      toast.error('Vui lòng chọn file để tải lên');
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);

      const formData = new FormData();
      formData.append('file', selectedFile);

      const token = localStorage.getItem('token');
      
      const response = await axios.post('/api/files', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        }
      });

      if (response.data && response.data.success) {
        toast.success('Tải lên file thành công!');
        setSelectedFile(null);
        if (onUploadSuccess) {
          onUploadSuccess(response.data.data);
        }
      }
    } catch (error) {
      console.error('Upload error:', error);
      
      if (error.response) {
        const errorMessage = error.response.data?.message || 'Có lỗi xảy ra khi tải lên file';
        const errorDetails = error.response.data?.details;
        
        if (error.response.status === 413) {
          toast.error('File quá lớn, vui lòng chọn file nhỏ hơn');
        } else if (errorDetails) {
          toast.error(`${errorMessage}: ${errorDetails}`);
        } else {
          toast.error(errorMessage);
        }
      } else if (error.request) {
        toast.error('Không thể kết nối đến server, vui lòng thử lại sau');
      } else {
        toast.error('Có lỗi xảy ra khi tải lên file: ' + error.message);
      }
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-lg font-medium text-gray-900 mb-4">Tải lên file mới</h2>
      
      <div 
        {...getRootProps()} 
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          isDragActive ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-primary-500'
        }`}
      >
        <input {...getInputProps()} />
        
        {selectedFile ? (
          <div>
            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="mt-2 text-sm font-medium text-gray-900">{selectedFile.name}</p>
            <p className="text-xs text-gray-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
          </div>
        ) : isDragActive ? (
          <div>
            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="mt-2 text-sm font-medium text-gray-900">Thả file vào đây để tải lên</p>
          </div>
        ) : (
          <div>
            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="mt-2 text-sm font-medium text-gray-900">Kéo và thả file vào đây, hoặc click để chọn file</p>
            <p className="text-xs text-gray-500">Hỗ trợ tất cả các loại file</p>
          </div>
        )}
      </div>
      
      <div className="mt-4">
        <button
          onClick={uploadFile}
          disabled={!selectedFile || uploading}
          className={`w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
            !selectedFile || uploading ? 'bg-gray-400 cursor-not-allowed' : 'bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500'
          }`}
        >
          {uploading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Đang tải lên... {uploadProgress}%
            </>
          ) : (
            'Tải lên'
          )}
        </button>
      </div>
      
      {uploading && (
        <div className="mt-3">
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div className="bg-primary-600 h-2.5 rounded-full" style={{ width: `${uploadProgress}%` }}></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUploader; 