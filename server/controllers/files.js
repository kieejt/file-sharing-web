const path = require('path');
const fs = require('fs');
const { File } = require('../models');

// @desc    Upload file
// @route   POST /api/files
// @access  Private
exports.uploadFile = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng tải lên một file'
      });
    }

    let { originalname, filename, size, mimetype, path: filePath } = req.file;
    originalname = Buffer.from(originalname, "latin1").toString("utf8");
    console.log('Thông tin file upload:', {
      originalname,
      filename,
      size,
      mimetype,
      path: filePath
    });
    
    // Đảm bảo đường dẫn file là tương đối với thư mục gốc
    const relativePath = filePath.replace(/\\/g, '/').replace(/^.*uploads\//, 'uploads/');
    console.log('Đường dẫn tương đối:', relativePath);
    
    // Tạo file mới trong database
    const newFile = new File({
      name: originalname,
      originalName: originalname,
      type: mimetype,
      size: size,
      path: relativePath,
      userId: req.user.id,
      isPublic: true // Luôn đặt là công khai
    });

    await newFile.save();
    
    res.status(201).json({
      success: true,
      data: newFile
    });
  } catch (error) {
    console.error('Create file error:', error);
    
    // Cải thiện thông báo lỗi
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu file không hợp lệ',
        details: error.message
      });
    }
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'File đã tồn tại'
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi khi tải lên file',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Lấy tất cả file của người dùng
// @route   GET /api/files
// @access  Private
exports.getFiles = async (req, res, next) => {
  try {
    // Tìm kiếm và phân trang
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    const search = req.query.search || '';

    // Tạo điều kiện tìm kiếm
    const searchCondition = search
      ? {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { originalName: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } }
          ]
        }
      : {};

    // Lấy tổng số file
    const total = await File.countDocuments({
      userId: req.user.id,
      ...searchCondition
    });

    // Lấy danh sách file
    const files = await File.find({
      userId: req.user.id,
      ...searchCondition
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(startIndex);

    res.status(200).json({
      success: true,
      count: files.length,
      total,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      },
      data: files
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Lấy thông tin file theo ID
// @route   GET /api/files/:id
// @access  Public/Private (tùy thuộc vào cài đặt file)
exports.getFile = async (req, res) => {
  try {
    const file = await File.findById(req.params.id)
      .populate('userId', 'name email'); // Thêm populate để lấy thông tin người dùng
    
    if (!file) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy file' });
    }
    
    // Định dạng dữ liệu trả về
    const fileData = {
      ...file.toObject(),
      uploader: file.userId ? {
        name: file.userId.name || 'Người dùng không xác định',
        email: file.userId.email
      } : {
        name: 'Người dùng không xác định',
        email: null
      }
    };
    
    // Xóa thông tin nhạy cảm
    delete fileData.userId;
    
    // Cho phép truy cập tất cả các file
    res.status(200).json({
      success: true,
      data: fileData
    });
  } catch (error) {
    console.error('Get file error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// @desc    Cập nhật thông tin file
// @route   PUT /api/files/:id
// @access  Private
exports.updateFile = async (req, res, next) => {
  try {
    let file = await File.findById(req.params.id);

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy file'
      });
    }

    // Kiểm tra quyền sở hữu
    if (file.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền cập nhật file này'
      });
    }

    // Cập nhật thông tin
    file.name = req.body.name || file.name;
    file.description = req.body.description || file.description;
    
    // Luôn đặt isPublic là true, bỏ qua giá trị từ request
    file.isPublic = true;
    
    await file.save();

    res.status(200).json({
      success: true,
      data: file
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Xóa file
// @route   DELETE /api/files/:id
// @access  Private
exports.deleteFile = async (req, res, next) => {
  try {
    const file = await File.findById(req.params.id);

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy file'
      });
    }

    // Kiểm tra quyền sở hữu
    if (file.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xóa file này'
      });
    }

    // Xóa file vật lý
    fs.unlink(file.path, async (err) => {
      if (err) {
        console.error('Lỗi khi xóa file:', err);
      }

      // Xóa bản ghi trong database
      await file.deleteOne();

      res.status(200).json({
        success: true,
        data: {}
      });
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Tải xuống file
// @route   GET /api/files/:id/download
// @access  Public/Private (tùy thuộc vào cài đặt file)
exports.downloadFile = async (req, res) => {
  try {
    const file = await File.findById(req.params.id);
    
    if (!file) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy file' });
    }
    
    console.log('Thông tin file từ DB:', {
      id: file._id,
      name: file.name,
      path: file.path,
      size: file.size
    });
    
    // Kiểm tra xem đường dẫn file có đúng không
    let filePath;
    
    // Nếu đường dẫn đã là đường dẫn tuyệt đối
    if (path.isAbsolute(file.path)) {
      filePath = file.path;
    } else {
      // Nếu đường dẫn là tương đối, thêm đường dẫn gốc
      filePath = path.join(__dirname, '..', '..', file.path);
    }
    
    console.log('Đường dẫn file tuyệt đối:', filePath);
    
    // Kiểm tra xem file có tồn tại không
    if (!fs.existsSync(filePath)) {
      console.error('File không tồn tại tại đường dẫn:', filePath);
      
      // Thử tìm file trong thư mục uploads của server
      const serverUploadsPath = path.join(__dirname, '..', 'uploads', path.basename(file.path));
      console.log('Thử đường dẫn server/uploads:', serverUploadsPath);
      
      if (fs.existsSync(serverUploadsPath)) {
        filePath = serverUploadsPath;
        console.log('Đã tìm thấy file tại đường dẫn server/uploads');
      } else {
        // Thử tìm file trong thư mục uploads ở thư mục gốc
        const rootUploadsPath = path.join(__dirname, '..', '..', 'uploads', path.basename(file.path));
        console.log('Thử đường dẫn root/uploads:', rootUploadsPath);
        
        if (fs.existsSync(rootUploadsPath)) {
          filePath = rootUploadsPath;
          console.log('Đã tìm thấy file tại đường dẫn root/uploads');
        } else {
          return res.status(404).json({ success: false, message: 'File không tồn tại trên server' });
        }
      }
    }
    
    // Tăng số lượt tải xuống
    file.downloadCount = (file.downloadCount || 0) + 1;
    await file.save();
    
    // Gửi file cho client
    res.download(filePath, file.originalName, (err) => {
      if (err) {
        console.error('Lỗi khi tải xuống file:', err);
        // Nếu đã gửi header nhưng có lỗi trong quá trình tải xuống
        if (!res.headersSent) {
          return res.status(500).json({ success: false, message: 'Lỗi khi tải xuống file' });
        }
      }
    });
  } catch (error) {
    console.error('Download file error:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

// @desc    Lấy thông tin file được chia sẻ
// @route   GET /api/files/share/:shareId
// @access  Public
exports.getSharedFile = async (req, res, next) => {
  try {
    const file = await File.findOne({ shareId: req.params.shareId });

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy file được chia sẻ'
      });
    }
    
    // Kiểm tra hạn sử dụng
    if (file.expiresAt && new Date(file.expiresAt) < new Date()) {
      return res.status(410).json({
        success: false,
        message: 'Link chia sẻ đã hết hạn'
      });
    }

    // Tăng số lượt truy cập
    file.accessCount += 1;
    await file.save();

    res.status(200).json({
      success: true,
      data: file
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Tải xuống file được chia sẻ
// @route   GET /api/files/share/:shareId/download
// @access  Public
exports.downloadSharedFile = async (req, res, next) => {
  try {
    const file = await File.findOne({ shareId: req.params.shareId });

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy file được chia sẻ'
      });
    }

    // Kiểm tra hạn sử dụng
    if (file.expiresAt && new Date(file.expiresAt) < new Date()) {
      return res.status(410).json({
        success: false,
        message: 'Link chia sẻ đã hết hạn'
      });
    }

    console.log('Thông tin file từ DB:', {
      id: file._id,
      name: file.name,
      path: file.path,
      size: file.size
    });
    
    // Kiểm tra xem đường dẫn file có đúng không
    let filePath;
    
    // Nếu đường dẫn đã là đường dẫn tuyệt đối
    if (path.isAbsolute(file.path)) {
      filePath = file.path;
    } else {
      // Nếu đường dẫn là tương đối, thêm đường dẫn gốc
      filePath = path.join(__dirname, '..', '..', file.path);
    }
    
    console.log('Đường dẫn file tuyệt đối:', filePath);
    
    // Kiểm tra xem file có tồn tại không
    if (!fs.existsSync(filePath)) {
      console.error('File không tồn tại tại đường dẫn:', filePath);
      
      // Thử tìm file trong thư mục uploads của server
      const serverUploadsPath = path.join(__dirname, '..', 'uploads', path.basename(file.path));
      console.log('Thử đường dẫn server/uploads:', serverUploadsPath);
      
      if (fs.existsSync(serverUploadsPath)) {
        filePath = serverUploadsPath;
        console.log('Đã tìm thấy file tại đường dẫn server/uploads');
      } else {
        // Thử tìm file trong thư mục uploads ở thư mục gốc
        const rootUploadsPath = path.join(__dirname, '..', '..', 'uploads', path.basename(file.path));
        console.log('Thử đường dẫn root/uploads:', rootUploadsPath);
        
        if (fs.existsSync(rootUploadsPath)) {
          filePath = rootUploadsPath;
          console.log('Đã tìm thấy file tại đường dẫn root/uploads');
        } else {
          return res.status(404).json({ success: false, message: 'File không tồn tại trên server' });
        }
      }
    }

    // Tăng số lượt tải xuống
    file.downloadCount += 1;
    await file.save();

    // Gửi file
    res.download(filePath, file.originalName, (err) => {
      if (err) {
        console.error('Lỗi khi tải xuống file:', err);
        // Nếu đã gửi header nhưng có lỗi trong quá trình tải xuống
        if (!res.headersSent) {
          return res.status(500).json({ success: false, message: 'Lỗi khi tải xuống file' });
        }
      }
    });
  } catch (err) {
    console.error('Download shared file error:', err);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi tải xuống file'
    });
  }
}; 