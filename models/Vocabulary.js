const mongoose = require('mongoose');

const VocabularySchema = new mongoose.Schema({
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
    type: String, // e.g., 'function', 'emotion', 'context'
    default: 'general',
  }
});

module.exports = mongoose.model('Vocabulary', VocabularySchema);
