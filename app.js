
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
// More the number of salts round, harder for the computer to calculate the hash
const saltRounds = 10;
const app = express();

app.use(express.static("public"));
app.set("view engine", 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));

// connect to database
mongoose.connect("mongodb://localhost:27017/userDB");

// setup new user database
const userSchema = new mongoose.Schema({
    email: String,
    password: String
});

const User = new mongoose.model("User", userSchema);

app.get("/", function (req, res) {
    res.render("home");
});

app.get("/register", function (req, res) {
    res.render("register");
});
// regiser new user, form in register.ejs
app.post("/register", function (req, res) {

    bcrypt.hash(req.body.password, saltRounds, function (err, hash) {
        // create new user
        const newUser = new User({
            email: req.body.username,
            password: hash
        });
        // save newUser into database
        newUser.save(function (err) {
            if (err) {
                console.log(err);
            } else {
                res.render('secrets');
            }
        });
    });
});

app.get("/login", function (req, res) {
    res.render("login");
});
// login user when they try to login from login form '/login'(
app.post("/login", function (req, res) {
    const username = req.body.username;
    const password = req.body.password;
    User.findOne({ email: username }, function (err, foundUser) {
        if (err) {
            console.log(err);
        } else {
            if (foundUser) {
                // Load hash from your password DB.
                bcrypt.compare(password, foundUser.password, function (err, result) {
                    // result == true
                    if(result == true){
                        res.render("secrets");
                    }
                });
            }
        }
    });
});

app.listen(3000, function () {
    console.log("Server started on port 3000.");
});