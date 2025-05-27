'use strict';

const mongoose = require('mongoose');

// Import các models
const User = require('./User');
const File = require('./File');

// Export các models
const db = {
  User,
  File,
  mongoose
};

module.exports = db; 