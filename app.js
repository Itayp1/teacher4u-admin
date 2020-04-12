//jshint esversion:6
if (process.env.ENV != "prod") {
  require("dotenv").config();
}
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");
const PORT = process.env.PORT || "3000";

const app = express();
const genSchema = new mongoose.Schema({}, { strict: false });
const Teachers = mongoose.model("teachers", genSchema);
const Students = mongoose.model("students", genSchema);
const Timetables = mongoose.model("timetables", genSchema);

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

app.use(
  session({
    secret: "Our little secret.",
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect(process.env.MONGO_CONNECTION_STRING, {
  useNewUrlParser: true,
});
mongoose.set("useCreateIndex", true);

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  secret: String,
});

userSchema.plugin(passportLocalMongoose);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.deserializeUser(function (id, done) {

  User.findById(id, function (err, user) {
    done(err, user);
  });
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.clientID,
      clientSecret: process.env.clientSecret,
      callbackURL: process.env.callbackURL,
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    },
    function (accessToken, refreshToken, profile, cb) {
      // console.log(profile);

      User.findOne({ googleId: profile.id }, function (err, user) {

        console.log("google id: " + profile.id)

        return cb(err, user);
      });

    }
  )
);

app.get("/", function (req, res) {
  const error = {}
  error.message = ""
  res.render("home", { error: error });
});

app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile"] })
);

app.get(
  "/auth/google/secrets",
  passport.authenticate("google", { failureRedirect: "/login" }),
  function (req, res) {
    // Successful authentication, redirect to secrets.

    res.redirect("/secrets");
  }
);

app.get("/login", function (req, res) {
  const error = {}
  error.message = "invalid email"
  res.render("home", { error: error });
});



app.get("/secrets", async function (req, res) {
  const result = await Promise.all([
    Teachers.find(),
    Students.find(),
    Timetables.find(),
  ]);



  res.render("secrets", {
    timetables: JSON.parse(JSON.stringify(result[2])),
    students: JSON.parse(JSON.stringify(result[1])),
    teachers: JSON.parse(JSON.stringify(result[0])),
  });
});


app.get("/logout", function (req, res) {
  req.logout();
  res.redirect("/");
});




app.listen(PORT, () => {
  console.log("Server started on port 3000.");
});
