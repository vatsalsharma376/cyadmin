const mongo = require("mongoose");

const express = require("express");
const plaid = require("plaid");
const twilio = require("twilio");

//app.use(express.json());
const router = express.Router();
const passport = require("passport");
const moment = require("moment");
const http = require("http");
const cron = require("node-cron");
const MongoClient = require("mongodb").MongoClient;
const { Configuration, PlaidApi, PlaidEnvironments } = require("plaid");
// import fetch from "node-fetch";
// Load Account and User models
const Account = require("../../models/Account");
const User = require("../../models/User");
const Alerts = require("../../models/Alerts");
const sgMail = require("@sendgrid/mail");
sgMail.setApiKey(
  "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"
);

const userURI =
  "mongodb+srv://claimyouraid:cya@cluster0.kfgzq.mongodb.net/?retryWrites=true&w=majority";
const configuration = new Configuration({
  basePath: PlaidEnvironments["sandbox"],
  baseOptions: {
    headers: {
      "PLAID-CLIENT-ID": "6166d89a162e690010d7084b",
      "PLAID-SECRET": "9097d5e53b34172035a9cbf66e1047",
    },
  },
});

const client = new PlaidApi(configuration);

var PUBLIC_TOKEN = null;
var ACCESS_TOKEN = null;
var ITEM_ID = null;
const accountSid = "ACd092381d0c8cc04422e65e019416b32f";
const authToken = "89dfad26a24dced20458fd725b05ab07";
const twclient = require("twilio")(accountSid, authToken);
// @route GET api/plaid/accounts
// @desc Get all accounts linked with plaid for a specific user
// @access Private
router.get(
  "/accounts",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    Account.find({ userId: req.user.id })
      .then((accounts) => res.json(accounts))
      .catch((err) => console.log(err));
  }
);

// @route POST api/plaid/accounts/add
// @desc Trades public token for access token and stores credentials in database
// @access Private
router.post(
  "/accounts/add",
  passport.authenticate("jwt", { session: false }),
  async (req, res) => {
    PUBLIC_TOKEN = req.body.public_token;

    const userId = req.user.id;
    const institution = req.body.metadata.institution;
    const { name, institution_id } = institution;

    const publicToken = req.body.public_token;
    try {
      const request = {
        public_token: publicToken,
      };
      const response = await client.itemPublicTokenExchange(request);
      ACCESS_TOKEN = await response.data.access_token;
      ITEM_ID = await response.data.item_id;
      const mungu = async () => {
        if (PUBLIC_TOKEN) {
          Account.findOne({
            userId: req.user.id,
            institutionId: institution_id,
          })
            .then((account) => {
              if (account) {
                console.log("Account already exists");
              } else {
                const newAccount = new Account({
                  userId: userId,
                  accessToken: ACCESS_TOKEN,
                  itemId: ITEM_ID,
                  institutionId: institution_id,
                  institutionName: name,
                });

                newAccount.save().then((account) => res.json(account));
              }
            })
            .catch((err) => {
              console.log("wow", err);
            }); // Mongo Error
        }
      };
      await mungu();
    } catch (error) {
      // handle error
      console.log("acces token exchange erro");
    }
  }
);

// @route DELETE api/plaid/accounts/:id
// @desc Delete account with given id
// @access Private
router.delete(
  "/accounts/:id",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    Account.findById(req.params.id).then((account) => {
      // Delete account
      account.remove().then(() => res.json({ success: true }));
    });
  }
);

// @route POST api/plaid/accounts/transactions
// @desc Fetch transactions from past 30 days from all linked accounts
// @access Private
router.post(
  "/accounts/transactions",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    const now = moment();
    const today = now.format("YYYY-MM-DD");
    const thirtyDaysAgo = now.subtract(30, "days").format("YYYY-MM-DD");

    let transactions = [];

    const accounts = req.body;
    //console.log(accounts);
    if (accounts) {
      accounts.forEach(function (account) {
        ACCESS_TOKEN = account.accessToken;
        const institutionName = account.institutionName;
        const txnreq = {
          access_token: ACCESS_TOKEN,
          start_date: thirtyDaysAgo,
          end_date: today,
        };
        client
          .transactionsGet(txnreq)
          .then((response) => {
            //console.log(response);
            transactions.push({
              accountName: institutionName,
              transactions: response.data.transactions,
            });
            console.log(transactions);
            if (transactions.length === accounts.length) {
              res.json(transactions);
            }
          })
          .catch((err) => console.log(err));
      });
    }
  }
);
const connectToCluster = async (uri) => {
  try {
    let mongoClient = new MongoClient(uri);
    await mongoClient.connect();
    return mongoClient;
  } catch (err) {
    console.error("Connection to MongoDB Atlas failed!", err);
  }
};
// @route POST api/plaid/names
// @desc Fetch names from all user linked accounts
// @access Private
let mongoClient1, db1, collection1, collection2;
let alertcoll;
router.get("/names", async (req, res) => {
  try {
    let mongoClient = await connectToCluster(userURI);
    db1 = mongoClient.db("Cluster1");
    alertcoll = db1.collection("alerts");

    const db = mongoClient.db("Cluster0");
    const collection = db.collection("users");
    collection1 = db.collection("accounts");
    //collection2 = db.collection("company");

    let time = Date.now();

    collection
      .find()
      .toArray()
      .then((users) => {
        res.json(users);
        console.log(`Took ${Date.now() - time}ms to run part 1`);
      });

    //await res.json(collection.find().toArray());
  } catch (err) {
    console.error("Failed to get names from MongoDB Atlas", err);
  }
});

// @route POST api/plaid/names
// @desc Fetch names from all bank accounts
// @access Private
router.get("/banknames", async (req, res) => {
  try {
    // const reqObjectID = new mongo.Types.ObjectId(req.body.usrid);
    collection1
      .find()
      .toArray()
      .then((users) => {
        res.json(users);
      });
    //await res.json(collection.find().toArray());
  } catch (err) {
    console.error("Failed to get names from MongoDB Atlas", err);
  }
});

// @route POST api/plaid/add
// @desc Add all alerts to the database which will be monitored
// @access Private
router.post("/addAlert", async (req, res) => {
  try {
    alertcoll.update(
      { accessToken: req.body.accessToken },
      { $set: req.body },
      {
        upsert: true,
      }
    );
  } catch (err) {
    console.error("Failed to insert alerts in database", err);
  }
});

cron.schedule("* * * * *", async () => {
  try {
    let mongoClient = await connectToCluster(userURI);
    db1 = mongoClient.db("Cluster1");
    alertcoll = db1.collection("alerts");
    alertcoll
      .find()
      .toArray()
      .then((alert) => {
        //console.log(alert);
        // now here we have an array of alerts and we have to perform the twilio things for each of them
        const now = moment();
        const today = now.format("YYYY-MM-DD");
        for (var ind = 0; ind < alert.length; ind++) {
          const curAccessToken = alert[ind].accessToken;
          const AMOUNT = alert[ind].amount;
          const MSG = alert[ind].message;
          const EMAIL = alert[ind].email;
          const CELL = alert[ind].cell;
          const FNAME = alert[ind].fname;
          const CLIENTNAME = alert[ind].clientname;
          var TXTBODY = alert[ind].fullTXTmessage;
          var MLBODY = alert[ind].fullMLmessage;
          //console.log(curAccessToken, alert[ind].lasttxn);
          //console.log(TXTBODY, MLBODY);
          const OFFSET =
            alert[ind].lasttxndone === undefined ? 0 : alert[ind].lasttxndone;
          //const thirtyDaysAgo = now.subtract(2, "days").format("YYYY-MM-DD");
          // const OFFSET = 0;
          var NEWOFFSET = 0;
          const txnreq = {
            access_token: curAccessToken,
            start_date: "2022-03-06",
            end_date: today,
          };
          client
            .transactionsGet(txnreq)
            .then((response) => {
              const transactions = response.data.transactions;
              //console.log(response.data);
              //console.log(transactions.length);
              for (
                var counter = transactions.length - 1 - OFFSET;
                counter >= 0;
                counter--
              ) {
                var transaction = transactions[counter];
                if (today == transaction.date) ++NEWOFFSET;
                //console.log(transaction.amount);
                TXTBODY = TXTBODY.replace("<<Deposit Date>>", transaction.date);
                TXTBODY = TXTBODY.replace(
                  "<<Deposit Amount>>",
                  transaction.amount
                );
                TXTBODY = TXTBODY.replace(
                  "<<Deposit Description>>",
                  transaction.name
                );
                MLBODY = MLBODY.replace("<<Deposit Date>>", transaction.date);
                MLBODY = MLBODY.replace(
                  "<<Deposit Amount>>",
                  transaction.amount
                );
                MLBODY = MLBODY.replace(
                  "<<Deposit Description>>",
                  transaction.name
                );
                console.log(TXTBODY, MLBODY);
                console.log(
                  transaction.name,
                  transaction.date,
                  transaction.amount
                );
                if (
                  Math.abs(transaction.amount) >= AMOUNT ||
                  transaction.name.indexOf(MSG) != -1
                ) {
                  if (CELL !== undefined) {
                    twclient.messages
                      .create({
                        body: TXTBODY,
                        from: "+13515298183",
                        to: CELL,
                      })
                      .then((message) => console.log(message.sid))
                      .catch((err) => console.log("Twilio error here", err));
                  }
                  if (EMAIL !== undefined) {
                    const msg = {
                      to: EMAIL, // Change to your recipient
                      from: "claimyouraids@gmail.com", // Change to your verified sender
                      subject: "Alert: New transaction recieved",
                      text: MLBODY,
                    };
                    sgMail
                      .send(msg)
                      .then((response) => {
                        console.log(response[0].statusCode);
                      })
                      .catch((error) => {
                        console.error(error.response.body.errors[0]);
                      });
                  }
                }
              }
            })
            .catch((err) => console.log("Transactions fetching error: ", err));
          // update the alert after sending current alerts
          var prevAlert = alert[ind];
          prevAlert.lasttxndone = NEWOFFSET;
          prevAlert.lasttxn = today;
          // alertcoll
          //   .remove({ accessToken: curAccessToken })
          //   .then((response) => {
          //     console.log(response);
          //     const newAlert = new Alerts(prevAlert);
          //     newAlert
          //       .save()
          //       .then((response) => {
          //         console.log("Successfully updated alert");
          //       })
          //       .catch((error) => {
          //         console.log("Error updating alert", error);
          //       });
          //   })
          //   .catch((error) => {
          //     console.log(error);
          //   });
          alertcoll
            .update(
              { accessToken: curAccessToken },
              { $set: prevAlert },
              {
                upsert: true,
              }
            )
            .then((all) => {
              console.log(all);
            })
            .catch((err) => {
              console.log(err);
            });
        }
      });
  } catch (err) {
    console.error("Failed to make alerts in database", err);
  }
});
module.exports = router;
