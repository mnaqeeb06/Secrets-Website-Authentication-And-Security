
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');

const app = express();

app.use(express.static("public"));
app.set("view engine", 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));

// setup session
app.use(session({
    secret: "Our little secret.",
    resave: false,
    saveUninitialized: false
}));
// setup passport
app.use(passport.initialize());
app.use(passport.session());

// connect to database
mongoose.connect("mongodb://localhost:27017/userDB");

// setup new user database
const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    secret: String
});

// setup Passport-local-Mongoose
// it is use for hashing & salting password and save our user into mongodb database
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());
passport.serializeUser(function (user, done) {
    done(null, user.id)
});

passport.deserializeUser(function (id, done) {
    User.findById(id, function (err, user) {
        done(err, user);
    });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    // callback url which you set to google dashboard
    callbackURL: "http://localhost:3000/auth/google/secrets"
},
    function (accessToken, refreshToken, profile, cb) {
        // console.log(profile);
        User.findOrCreate({ googleId: profile.id }, function (err, user) {
            return cb(err, user);
        });
    }
));

app.get("/", function (req, res) {
    res.render("home");
});

app.get("/auth/google", passport.authenticate("google", { scope: ["profile"] }));

app.get('/auth/google/secrets',
    passport.authenticate('google', { failureRedirect: '/login' }),
    function (req, res) {
        // Successful authentication, redirect to secrets.
        res.redirect('/secrets');
    });

app.get("/secrets", function (req, res) {
    // ne -> not equal
    User.find({"secret": {$ne: null}}, function(err,foundUsers){
        if(err){
            console.log(err);
        }else{
            if(foundUsers){
            res.render("secrets",{usersWithSecrets: foundUsers})
            }
        }
    });
});

app.get("/register", function (req, res) {
    res.render("register");
});
// regiser new user, form in register.ejs
app.post("/register", function (req, res) {

    // User -> model
    User.register({ username: req.body.username }, req.body.password, function (err, user) {
        if (err) {
            console.log(err);
            res.redirect("/register")
        } else {
            passport.authenticate("local")(req, res, function () {
                res.redirect("/secrets")
            });
        }
    })

});

app.get("/login", function (req, res) {
    res.render("login");
});
// login user when they try to login from login form '/login'(
app.post("/login", function (req, res) {

    const newUser = User({
        username: req.body.username,
        password: req.body.password
    });

    req.login(newUser, function (err) {
        if (err) {
            console.log(err);
        } else {
            passport.authenticate("local")(req, res, function () {
                res.redirect("/secrets");
            });
        }
    });

});

// Submit a secret
app.get("/submit", function (req, res) {
    if (req.isAuthenticated()) {
        res.render("submit")
    } else {
        res.redirect("/login")
    }
});

app.post("/submit", function (req, res) {

    const submittedSecret = req.body.secret;
    // passport saves user cradential in req as an object
    // console.log(req.user._id);

    User.findById(req.user._id, function (err, foundUser) {
        if (err) {
            console.lod(err);
        }else{
            foundUser.secret = submittedSecret;
            foundUser.save(function(){
                res.redirect("/secrets");

            });

        }
    });
});

// logout
app.get("/logout", function (req, res) {
    req.logout(function (err) {
        if (err) {
            console.log(err);
        } else {
            res.redirect("/");
        }
    });

});

app.listen(3000, function () {
    console.log("Server started on port 3000.");
});