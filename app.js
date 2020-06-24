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

var Storage = multer.diskStorage({
  destination: "./public/uploads/",
  filename: (req, file, cb) => {
    cb(null, file.fieldname + "_" + Date.now() + path.extname(file.originalname));
  }
});

var upload = multer({
  storage: Storage,

}).single("file");

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/instaDB", {useNewUrlParser: true,useUnifiedTopology: true });
mongoose.set("useCreateIndex",true);


const commentsSchema = new mongoose.Schema({
  post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
  userComment: String,
  content: String,
});
const Comment = new mongoose.model("Comment", commentsSchema);

const postSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  caption: String,
  img: String,
  likes: Number,
  comments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }],
});

const Post = new mongoose.model("Post",postSchema);


const userSchema = new mongoose.Schema ({
  _id: mongoose.Schema.Types.ObjectId,
      name: String,
      username: String,
      password: String,
  posts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],
      profileimage: String,
      bio:String,
});







userSchema.plugin(passportLocalMongoose);

const User = new mongoose.model("User",userSchema);


passport.use(User.createStrategy());
 
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());



app.get("/login", function(req,res){
  res.render("signup");
});

app.get("/profile", function(req,res){
  if (req.isAuthenticated()) {
    const dp = req.user.profileimage;
    const bio= req.user.bio;
    const name= req.user.name;
    
    User.findOne({_id: req.user.id}).populate("userposts");
    const userPosts = req.user.posts;
    console.log(req.user.posts);
    res.render(("profile"), {
        dp: dp,
        bio:bio,
        name: name,
      userPosts: userPosts,
    });
} else {
    res.redirect("/login");
  }
});

app.get("/upload", function(req,res){
  if(req.isAuthenticated){
    res.render("upload-file");
  } else{
    res.redirect("/login");
  }
});



app.post("/upload",upload, function(req,res,next){
  if (req.isAuthenticated()){
    const post = new Post({
      caption: req.body.caption,
      img: req.file.filename,
      user: req.user.id,
    });
    post.save();
    User.findById(req.user.id, function (err, foundUser) {
      if (err) {
        console.log(err);
      } else{
         if(foundUser){
           
           
           foundUser.posts.push(post);
           foundUser.save();
           res.redirect("/profile");
         }
      }
  }
)}
});





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





app.post("/upload-profile",upload,function(req,res,next){
  if(req.isAuthenticated()){
    const bio = req.body.bioinput;
    const profile = req.file.filename;
    User.findById(req.user.id, function (err, foundUser) {
      if (err) {
        console.log(err);
      } else {
        if (foundUser) {
          foundUser.bio = bio;
          foundUser.profileimage = profile;
          foundUser.save(function () {
            res.redirect("/profile");
          })

        }
      }
    });
  }else{
    res.redirect("/login");
  }
   
});





app.post("/register", function(req,res){
  User.register({ username: req.body.username, name: req.body.name, _id: new mongoose.Types.ObjectId()}, req.body.password, function(err, user){
    if(err){
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, function(){
        res.redirect("/upload-profile");
      });
    }
  });
});






app.get("/upload-profile",function(req,res){
  res.render("upload-profile");
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
