const mongoose = require('mongoose');

const RuleSchema = new mongoose.Schema({
  priority: { type: Number, required: true },
  name:     { type: String, required: true },
  condition: {
    // Array of keywords to match in the user's analyzed input
    type: [String],
    required: true
  },
  target_category_ids: {
    // รองรับหลาย Category ต่อ 1 Rule
    type: [String],
    required: true
  }
});

module.exports = mongoose.model('Rule', RuleSchema);
