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
const $ = require('jQuery');

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


const userSchema = new mongoose.Schema({
  name: String,
  username: String,
  password: String,
  posts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],
  profileimage: String,
  bio: String,
});







userSchema.plugin(passportLocalMongoose);

const User = new mongoose.model("User", userSchema);




const postSchema = new mongoose.Schema({
  caption: String,
  img: String,
  likes: Number,
  dashName:String,
  dashDP:String,
  dashUserId: String,
  comments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Comment' }],
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Like' }],
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
});



const Post = new mongoose.model("Post", postSchema);




const commentsSchema = new mongoose.Schema({
  postComment: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
  userComment: String,
  commentDP: String,
  content: String,
  commentUserId:String,
});
const Comment = new mongoose.model("Comment", commentsSchema);

const likesSchema = new mongoose.Schema({
  postLike: { type: mongoose.Schema.Types.ObjectId, ref: 'Post'},
  likeDP: String,
  likeUserId: String,
  likeUserName:String,
});



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
    User.findOne({_id:req.user.id}).populate("posts").exec((err,posts)=> {
      res.render(("profile"), {
        dp: dp,
        bio: bio,
        name: name,
        userPosts: posts.posts,
      });
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
      author: req.user.id,
      dashName:req.user.name,
      dashDP: req.user.profileimage,
      dashUserId:req.user.id,
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
        Post.find({},function(err,posts){
          res.render("dashboard",{
              posts:posts,
          });
        })

          
          
        
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
  User.register({ username: req.body.username, name: req.body.name}, req.body.password, function(err, user){
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



app.get("/user/:userId", function(req,res){
   if(req.isAuthenticated()){
    if(req.params.userId == req.user.id){
      res.redirect("/profile");
    }else{
      User.findOne({ _id: req.params.userId }).populate("posts").exec((err, posts) => {
        res.render(("user-profile"), {
          dp: posts.profileimage,
          bio: posts.bio,
          name: posts.name,
          userPosts: posts.posts,
        });
      });
    }
     
   }
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



app.get("/posts/:postId", function (req, res) {
  const userid= req.user._id;
  Post.findOne({ _id: req.params.postId}).populate("comments").exec(function(err, comments){
    if(userid == comments.dashUserId){
      res.render("individualpost", {
        postId: comments.id,
        name: comments.dashName,
        dp: comments.dashDP,
        photo: comments.img,
        caption: comments.caption,
        Id: comments._id,
        comments: comments.comments,
        proId: comments.dashUserId,
      });
    } else{
      res.render("individualpostOU", {
        name: comments.dashName,
        dp: comments.dashDP,
        photo: comments.img,
        caption: comments.caption,
        Id: comments._id,
        comments: comments.comments,
        proId: comments.dashUserId,
      });
    }
    
  });
 
});

app.get("/posts/:postId/editpost", function(req,res){
    res.render("editpost", {
      postId:req.params.postId,
    });
});

app.post("/posts/:postId/editpost", function(req,res){
  const caption = req.body.caption;
  Post.findById(req.params.postId, function(err, foundPost){
    if(err){
      console.log(err)
    }else{
         if(foundPost){
           foundPost.caption=caption;
           foundPost.save(function(){
             res.redirect("/posts/" + req.params.postId);
           })
           
         }
    }
  })
})



app.post("/posts/:postId/comment", function (req, res) {
  if(req.isAuthenticated()){
    const requestedPostId = req.params.postId;
    const comment = new Comment({
       userComment: req.user.name,
       commentDP: req.user.profileimage,
      content: req.body.commentBoxArea,
      commentUserId:req.user.id,
    });
    comment.save();
    Post.findById(requestedPostId, function (err, foundPost){
      if(err){
        console.log(err);
      }else{
        if(foundPost){
             foundPost.comments.push(comment);
             foundPost.save();
          res.redirect("/posts/"+req.params.postId);
        }
      }
    })
  }
  

});


app.get("/posts/:postId/deletepost",function(req,res){
   Post.findByIdAndRemove({_id:req.params.postId}, function(err){
     if(err){
       console.log(err);
     }else{
       res.redirect("/dashboard");
     }
   })
})




app.get("/logout",function(req,res){
  req.logout();
  res.redirect("/login");
});


app.listen(3000,function(){
  console.log("Server Started on port 3000");
});
