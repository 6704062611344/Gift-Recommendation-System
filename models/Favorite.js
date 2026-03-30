const mongoose = require('mongoose');

// One document per user — stores array of gift _id strings
const FavoriteSchema = new mongoose.Schema({
  userId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  giftIds: { type: [String], default: [] }
}, { timestamps: true });

module.exports = mongoose.model('Favorite', FavoriteSchema);
