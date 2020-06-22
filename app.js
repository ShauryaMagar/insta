require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require('mongoose');
const session=require("express-session");
const passport=require("passport");
const multer=require("multer");
const path = require("path");
const passportLocalMongoose=require("passport-local-mongoose");

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));


app.use(session({
  secret: "Sempiternal is best.",
  resave: false,
  saveUninitialized: false,
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/instaDB", {useNewUrlParser: true,useUnifiedTopology: true });
mongoose.set("useCreateIndex",true);


const commentsSchema = new mongoose.Schema({
  userComment: String,
  content: String,
});
const postSchema = new mongoose.Schema({
  caption: String,
  likes: Number,
  comments: [{ commentsSchema }],
});


const userSchema = new mongoose.Schema ({
      name: String,
      username: String,
      password: String,
      posts: [{postSchema}]
});







userSchema.plugin(passportLocalMongoose);

const User = new mongoose.model("User",userSchema);


passport.use(User.createStrategy());
 
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

var Storage = multer.diskStorage({
   destination:"./public/uploads/",
   filename:(req,file,cb)=>{
     cb(null,file.fieldname+"_"+Date.now()+path.extname(file.originalname));
   }
});

var upload = multer({
  storage: Storage,

}).single("file");

app.get("/login", function(req,res){
  res.render("signup");
});

app.get("/profile", function(req,res){
  if (req.isAuthenticated()) {
    res.render("profile");
  } else {
    res.redirect("/login");
  }
})

app.get("/upload", function(req,res){
  if(req.isAuthenticated){
    res.render("upload-file");
  } else{
    res.redirect("/login");
  }
});

app.post("/upload",upload, function(req,res){
  console.log(res);
})

app.get("/dashboard",function(req,res){
      if(req.isAuthenticated()){
        res.render("dashboard");
      } else{
        res.redirect("/login");
      }
});


app.get("/register", function(req,res){
  res.render("register");
});



app.post("/register", function(req,res){
  User.register({username: req.body.username, name: req.body.name}, req.body.password, function(err, user){
    if(err){
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, function(){
        res.redirect("/dashboard");
      });
    }
  });
});



app.post("/login",function(req,res){
  const user = new User({
    username: req.body.username,
  password: req.body.password
  });
  req.login(user, function(err){
    if(err){
      console.log(err);

    } else{
      passport.authenticate("local")(req, res, function () {
        res.redirect("/dashboard");
      });
    }
  })
});


app.get("/logout",function(req,res){
  req.logout();
  res.redirect("/login");
});


app.listen(3000,function(){
  console.log("Server Started on port 3000");
});
