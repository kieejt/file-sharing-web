'use strict';
const mongoose = require('mongoose');
const crypto = require('crypto');

const FileSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Tên file không được để trống'],
    trim: true
  },
  originalName: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  path: {
    type: String,
    required: true
  },
  accessCount: {
    type: Number,
    default: 0
  },
  downloadCount: {
    type: Number,
    default: 0
  },
  shareId: {
    type: String,
    unique: true
  },
  expiresAt: {
    type: Date,
    default: null
  },
  description: {
    type: String,
    default: ''
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Tạo shareId trước khi lưu nếu chưa có
FileSchema.pre('save', function(next) {
  if (!this.shareId) {
    this.shareId = crypto.randomBytes(16).toString('hex');
  }
  next();
});

// Cập nhật thời gian updatedAt khi cập nhật
FileSchema.pre('findOneAndUpdate', function() {
  this.set({ updatedAt: Date.now() });
});

module.exports = mongoose.model('File', FileSchema); 