import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-white shadow-inner py-6">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <Link to="/" className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M2 9.5A3.5 3.5 0 005.5 13H9v2.586l-1.293-1.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 15.586V13h2.5a4.5 4.5 0 10-.616-8.958 4.002 4.002 0 10-7.753 1.977A3.5 3.5 0 002 9.5zm9 3.5H9V8a1 1 0 012 0v5z" clipRule="evenodd" />
              </svg>
              <span className="ml-2 text-lg font-bold text-gray-800">FileShare</span>
            </Link>
          </div>
          
          <div className="flex space-x-4">
            <Link to="/" className="text-gray-600 hover:text-primary-600">
              Trang chủ
            </Link>
            <Link to="/about" className="text-gray-600 hover:text-primary-600">
              Giới thiệu
            </Link>
            <Link to="/privacy" className="text-gray-600 hover:text-primary-600">
              Chính sách
            </Link>
            <Link to="/terms" className="text-gray-600 hover:text-primary-600">
              Điều khoản
            </Link>
          </div>
        </div>
        
        <div className="mt-6 border-t border-gray-200 pt-6 text-center text-sm text-gray-500">
          &copy; {new Date().getFullYear()} FileShare Web
        </div>
      </div>
    </footer>
  );
};

export default Footer; 