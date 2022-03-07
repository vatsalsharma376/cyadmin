const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const passport = require("passport");
const axios = require("axios");
const users = require("./routes/api/users");
const plaid = require("./routes/api/plaid.tsx");
var cron = require("node-cron");

var cors = require('cors')
const app = express();
app.use(cors())
const path = require("path");
// Bodyparser 

app.use ( express.static("client/build"));
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

// Routes
app.use("/api/users", users);
app.use("/api/plaid", plaid);

const port = process.env.PORT || 5006;
app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "client", "build", "index.html"));
});

app.listen(port, () => console.log(`Server up and running on port ${port} !`));
// cron.schedule("* * * * *", () => {
//   console.log("running a task every minute");
// });
var currr = 1;
cron.schedule("* * * * *", () => {
  console.log("running a task every minute", currr++);
  axios.get("https://claimyouraid.herokuapp.com/api/plaid/makealert").then((res) => {
    console.log(res);
  });
});
