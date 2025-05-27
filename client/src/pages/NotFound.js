import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div className="max-w-4xl mx-auto text-center py-16">
      <div className="mb-8">
        <h1 className="text-9xl font-bold text-primary-600">404</h1>
        <h2 className="text-3xl font-bold text-gray-900 mt-4">Trang không tồn tại</h2>
        <p className="text-lg text-gray-600 mt-4">
          Trang bạn đang tìm kiếm không tồn tại hoặc đã bị di chuyển.
        </p>
      </div>
      
      <div className="flex flex-col sm:flex-row justify-center gap-4">
        <Link
          to="/"
          className="px-6 py-3 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
        >
          Quay lại trang chủ
        </Link>
        <Link
          to="/dashboard"
          className="px-6 py-3 bg-white border border-primary-600 text-primary-600 rounded-md hover:bg-primary-50 transition-colors"
        >
          Đi đến quản lý file
        </Link>
      </div>
      
      <div className="mt-12">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="mx-auto h-32 w-32 text-gray-300"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
    </div>
  );
};

export default NotFound; 