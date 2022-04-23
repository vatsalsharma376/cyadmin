const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const TransactionSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId, // how we associate each transaction with a user
    ref: "users",
  },
  accountId: {
    type: Schema.Types.ObjectId, // how we associate each transaction with a user
    ref: "accounts",
  },
  accessToken: {
    type: String,
    required: true,
  },
  accountname: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  txndate: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true,
  },
});

module.exports = Transaction = mongoose.model(
  "transactions",
  TransactionSchema
);
