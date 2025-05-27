const jwt = require('jsonwebtoken');
const { User } = require('../models');

// Bảo vệ các route yêu cầu đăng nhập
exports.protect = async (req, res, next) => {
  let token;

  // Kiểm tra header Authorization
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    // Lấy token từ header
    token = req.headers.authorization.split(' ')[1];
  }

  // Kiểm tra nếu không có token
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Không có quyền truy cập, vui lòng đăng nhập'
    });
  }

  try {
    // Xác thực token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Tìm user từ id trong token
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Người dùng không tồn tại'
      });
    }

    // Thêm thông tin user vào request
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Không có quyền truy cập, vui lòng đăng nhập'
    });
  }
};

// Xác thực tùy chọn - cho phép truy cập nếu không có token
exports.optionalAuth = async (req, res, next) => {
  let token;

  // Kiểm tra header Authorization
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    // Lấy token từ header
    token = req.headers.authorization.split(' ')[1];
  }

  // Nếu không có token, vẫn cho phép truy cập
  if (!token) {
    return next();
  }

  try {
    // Xác thực token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Tìm user từ id trong token
    const user = await User.findById(decoded.id);

    if (user) {
      // Thêm thông tin user vào request nếu tìm thấy
      req.user = user;
    }
    
    next();
  } catch (err) {
    // Nếu token không hợp lệ, vẫn cho phép truy cập nhưng không có thông tin user
    next();
  }
};

// Kiểm tra quyền admin
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền thực hiện hành động này'
      });
    }
    next();
  };
}; 