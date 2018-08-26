// TODO - organise the code/folder structure for this api implementation
// as I may wish to add more music api endpoints in the near future
// server.js

const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const cors = require("cors");
const PlayMusic = require("playmusic");
const config = require("config-yml");

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());

const port = process.env.PORT || 5000;

// ROUTES FOR OUR GOOGLE MUSICAPI
// =============================================================================
const router = express.Router();
const pm = new PlayMusic();

// GOOGLE ACCOUNT SETTINGS
const EMAIL = config.google_music.email,
  PASSWORD = config.google_music.password;
const MASTER_TOKEN = null;

router.get("/", function(req, res) {
  res.json({ message: "Google Music API is live!" });
});

// middleware to use for all requests
router.use(function(req, res, next) {
  // do logging
  // console.log('Something is happening.');
  next(); // make sure we go to the next routes and don't stop here
});

router.route("/login").post(function(req, res) {
  pm.login({ email: EMAIL, password: PASSWORD }, function(err, credentials) {
    if (err) res.send({ error: err });
    MASTER_TOKEN = credentials.masterToken;

    pm.init(
      {
        androidId: credentials.androidId,
        masterToken: credentials.masterToken
      },
      function(err, data) {
        if (err) res.send({ error: err });
        res.json({
          message: "Google Account Logged In!",
          accessToken: MASTER_TOKEN
        });
      }
    );
  });
});

router.route("/logout").post(function(req, res) {
  //for now just send a blank accessToken to client
  MASTER_TOKEN = null;
  res.json({ message: "Google Account Logged Out", accessToken: MASTER_TOKEN });
});

router.route("/songs").get(function(req, res) {
  pm.getAllTracks(function(err, library) {
    if (err) res.send({ error: err });
    const songs = library.data.items;
    res.json({ message: "All songs fetched", songs: songs });
  });
});

router.route("/songs/:id").get(function(req, res) {
  pm.getStreamUrl(req.params.id, function(err, url) {
    if (err) res.send({ error: err });
    const stream_url = url;
    res.json({ message: "A song is fetched", stream_url: stream_url });
  });
});

// REGISTER OUR ROUTES -------------------------------
// all of our routes will be prefixed with /api
app.use("/api", router);

// START THE SERVER
// =============================================================================
app.listen(port);
console.log("Google Music API Server listening on port " + port);
