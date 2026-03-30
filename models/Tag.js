const mongoose = require('mongoose');

const TagSchema = new mongoose.Schema({
  tags_id:   { type: String, required: true, unique: true },
  tags_name: { type: String, required: true },
  tag_type:  { type: String, default: 'general' }
});

module.exports = mongoose.model('Tag', TagSchema);
