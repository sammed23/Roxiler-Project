const mongoose = require('mongoose');

const productTransactionSchema = new mongoose.Schema({
  title: String,
  description: String,
  price: Number,
  sold: Boolean,
  category: String,
  dateOfSale: Date
});

const ProductTransaction = mongoose.model('ProductTransaction', productTransactionSchema);
module.exports = ProductTransaction;
