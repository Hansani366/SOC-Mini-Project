const mongoose = require('mongoose');

const covidSchema = new mongoose.Schema({
  country: String,
  cases: Number,
  deaths: Number,
  recovered: Number,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Covid', covidSchema);
