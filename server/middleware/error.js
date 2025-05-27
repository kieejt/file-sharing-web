const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log lỗi để debug
  console.error(err);

  // Lỗi Sequelize
  if (err.name === 'SequelizeValidationError') {
    const message = Object.values(err.errors).map(val => val.message);
    error.message = message.join(', ');
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }

  // Lỗi Sequelize unique constraint
  if (err.name === 'SequelizeUniqueConstraintError') {
    const message = Object.values(err.errors).map(val => val.message);
    error.message = message.join(', ');
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }

  // Lỗi JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Token không hợp lệ'
    });
  }

  // Lỗi JWT hết hạn
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token đã hết hạn'
    });
  }

  // Trả về response với mã lỗi và thông báo
  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Lỗi máy chủ'
  });
};

module.exports = errorHandler; 