const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const passport = require("passport");
const axios = require("axios");
const users = require("./routes/api/users");
const plaid = require("./routes/api/plaid.tsx");
var cron = require("node-cron");
const app = express();

const path = require("path");
// Bodyparser middleware
app.use(
  bodyParser.urlencoded({
    extended: false,
  })
);
app.use(bodyParser.json());

// DB Config
const db = require("./config/keys").mongoURI;

// Connect to MongoDB
mongoose
  .connect(db, { useNewUrlParser: true })
  .then(() => console.log("MongoDB successfully connected"))
  .catch((err) => console.log(err));

// Passport middleware
app.use(passport.initialize());

// Passport config
require("./config/passport")(passport);

// Routes t
app.use("/api/users", users);
app.use("/api/plaid", plaid);

const port = process.env.PORT || 5006;

app.listen(port, () => console.log(`Server up and running on port ${port} !`));
// cron.schedule("* * * * *", () => {
//   console.log("running a task every minute");
// });
// var currr = 1;
// cron.schedule("* * * * *", () => {
//   console.log("running a task every minute", currr++);
//   axios.get("http://localhost:5006/api/plaid/makealert").then((res) => {
//     console.log(res);
//   });
// });
