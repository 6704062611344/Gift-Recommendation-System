const mongoose = require('mongoose');

const RecipientSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name:      { type: String, required: true },
  age:       { type: Number, required: true },
  gender:    { type: String, required: true },
  relation:  { type: String, required: true },
  interests: { type: [String], default: [] },
  budget:    { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Recipient', RecipientSchema);
