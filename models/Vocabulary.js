const mongoose = require('mongoose');

const VocabularySchema = new mongoose.Schema({
  tag_id: {
    type: String,
    default: ''
  },
  term: {
    type: String,
    required: true,
    unique: true,
  },
  synonyms: {
    type: [String],
    default: [],
  },
  category_id: {
    type: String,
    required: true,
  },
  tag_type: {
    type: String,
    default: 'general',
  }
});

module.exports = mongoose.model('Vocabulary', VocabularySchema);
