const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const AlertsSchema = new Schema({
  email: {
    type: String,
  },
  cell: {
    type: String,
  },
  stamount: {
    type: Number,
  },
  endamount: {
    type: Number,
  },
  message: {
    type: String,
  },
  lasttxn: {
    type: String,
  },
  accessToken: {
    type: String,
  },
  fname: {
    type: String,
  },
  clientname: {
    type: String,
  },
  fullMLmessage: {
    type: String,
  },
  fullTXTmessage: {
    type: String,
  },
  lasttxndone: {
    type: Number,
  },
});

module.exports = Alerts = mongoose.model("alerts", AlertsSchema);
