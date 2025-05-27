import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import FileUploader from '../components/FileUploader';

const Home = () => {
  const { user } = useContext(AuthContext);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Chia sẻ file dễ dàng và an toàn
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Tải lên, chia sẻ và quản lý file của bạn một cách đơn giản. Hỗ trợ nhiều định dạng file với kích thước tối đa 5MB.
        </p>
      </div>

      {user ? (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Tải lên file mới
          </h2>
          <FileUploader 
            onUploadSuccess={(fileData) => {
              // Redirect to dashboard after successful upload
              window.location.href = '/dashboard';
            }}
          />
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8 text-center">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Bắt đầu chia sẻ file ngay hôm nay
          </h2>
          <p className="text-gray-600 mb-6">
            Đăng nhập hoặc đăng ký để bắt đầu tải lên và chia sẻ file của bạn.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              to="/login"
              className="px-6 py-2 bg-white border border-primary-600 text-primary-600 rounded-md hover:bg-primary-50 transition-colors"
            >
              Đăng nhập
            </Link>
            <Link
              to="/register"
              className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
            >
              Đăng ký
            </Link>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary-100 text-primary-600 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Tải lên dễ dàng</h3>
          <p className="text-gray-600">
            Chỉ cần kéo và thả file của bạn để tải lên. Hỗ trợ nhiều định dạng file phổ biến.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary-100 text-primary-600 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Chia sẻ ngay lập tức</h3>
          <p className="text-gray-600">
            Nhận link chia sẻ ngay sau khi tải lên. Dễ dàng sao chép và gửi cho bạn bè hoặc đồng nghiệp.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary-100 text-primary-600 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">An toàn & Bảo mật</h3>
          <p className="text-gray-600">
            Dữ liệu của bạn được bảo vệ. Chỉ những người có link mới có thể truy cập file của bạn.
          </p>
        </div>
      </div>

      <div className="bg-primary-50 rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Cách sử dụng FileShare
        </h2>
        <ol className="list-decimal pl-5 space-y-3 text-gray-700">
          <li>Đăng ký tài khoản miễn phí hoặc đăng nhập nếu bạn đã có tài khoản.</li>
          <li>Tải lên file của bạn (tối đa 5MB) bằng cách kéo và thả hoặc chọn file.</li>
          <li>Nhận link chia sẻ ngay lập tức sau khi tải lên.</li>
          <li>Chia sẻ link với bất kỳ ai bạn muốn.</li>
          <li>Quản lý tất cả file đã tải lên trong trang quản lý cá nhân.</li>
        </ol>
      </div>
    </div>
  );
};

export default Home; 