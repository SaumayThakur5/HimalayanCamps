
const express= require('express');
const mongoose= require('mongoose');
require('dotenv').config();


const app= express();
const path=require('path');
const Campground= require('./models/camp');
const methodOverride= require('method-override');
const ejsMate = require('ejs-mate'); 
const catchAsync= require('./utils/catchAsync');
const expressError= require('./utils/expressError');
const Review= require('./models/review');
const passport= require('passport');
const localStrategy= require('passport-local');
const User= require('./models/user');
const session= require('express-session');
const MongoDbStore= require('connect-mongo')(session);
const flash= require('connect-flash');
const {isLoggedIn} = require('./middleware');
const multer  = require('multer');
const {storage}= require('./cloudinary');
const upload = multer({ storage });
const maptilerClient = require("@maptiler/client");
maptilerClient.config.apiKey = process.env.MAPTILER_API_KEY;
const cloudinary = require('cloudinary').v2;
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_KEY,
    api_secret: process.env.CLOUDINARY_SECRET
  });
  
  // Simple ping test
  cloudinary.api.ping((error, result) => {
    if (error) {
      console.error("Connection failed:", error);
    } else {
      console.log("Connection successful:", result);
    }
  });


app.use(express.static('public'));
const dbUrl= "mongodb://localhost:27017/yelpCamp";


mongoose.connect(dbUrl)
.then(() =>{
    console.log("CONNECTED to MONGO!");
})
.catch((err)=>{
    console.log("OH NO ERROR!");
    console.log(err);
})

const store= new MongoDbStore({
    url: dbUrl,
    secret: 'Thisissecret',
    touchAfter: 24 * 60 * 60
})

app.use(session({secret: 'kdsbckdccdk'}));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine','ejs');
app.use(express.urlencoded({extended: true}));
app.use(methodOverride('_method'));
app.engine('ejs', ejsMate);
// app.use(session(sessionConfig));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
passport.use(new localStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


app.use((req,res,next)=>{
    res.locals.signedInUser= req.user;
    res.locals.success= req.flash('success');
    res.locals.error= req.flash('error');
    next();
})

app.get('/register', (req,res)=>{
    res.render('campgrounds/register');
    
})

app.post('/register',catchAsync(async(req,res,next)=>{
    const{username, email, password}= req.body;
    const user= new User({username,email});
    const registeredUser= await User.register(user,password);
    req.login(registeredUser, err=>{
        if(err){
            return next(err);
        }
        req.flash('success','Welcome to Yelp Camp');
        res.redirect('/campground');
    });
    // console.log(registeredUser);
}))

app.get('/login',(req,res)=>{
    res.render('campgrounds/login');
})

app.post('/login', passport.authenticate('local',{failureFlash: true, failureRedirect: '/login'}), (req,res)=>{
    req.flash('success', 'Welcome');
    res.redirect('/campground');
})

app.get('/logout',(req,res,next)=>{
    req.logout(function (err) {
        if (err) {
            return next(err);
        }
    req.flash('success','Logged you out');
    res.redirect('/campground');
})
})

app.get('/', (req,res)=>{
    res.render('campgrounds/home');
})

app.get('/campground', catchAsync(async(req,res)=>{
    const campgrounds= await Campground.find({});
    res.render('campgrounds/index', {campgrounds});
}))

app.get('/campground/new',isLoggedIn, (req,res)=>{
    res.render('campgrounds/new');
})

 app.post('/campground',isLoggedIn, upload.array('image'),catchAsync(async(req,res,next)=>{
    const geoData = await maptilerClient.geocoding.forward(req.body.campground.location, { limit: 1 });
    const campground = new Campground(req.body.campground);
    campground.geometry = geoData.features[0].geometry;
    console.log(campground.geometry.coordinates);
    campground.images=req.files.map(f =>({url: f.path, filename: f.filename}));
   campground.author= req.user._id;
   await campground.save();
   console.log(campground);
    req.flash('success','Successfully made a new Campground');
   res.redirect(`/campground/${campground._id}`);

 }))

app.get('/campground/:id', catchAsync(async (req,res)=>{
    const campground = await Campground.findById(req.params.id).populate({
        path: 'reviews',
        populate: {
            path: 'author'
        }
    }).populate('author');
    console.log(campground.reviews);
    res.render('campgrounds/show', {campground} );
}))

app.put('/campground/:id',isLoggedIn,upload.array('image'), catchAsync(async(req,res)=>{
    const {id} =req.params;
    // const campground= await Campground.findById(id);
    // if(!campground.author.equals(req.user._id)){
    // req.flash('error','You do not have permission to do this!!!');
    // return res.redirect(`/campground/${id}`);
    // }
    const campground= await Campground.findByIdAndUpdate(id, {...req.body.campground});
    const geoData = await maptilerClient.geocoding.forward(req.body.campground.location, { limit: 1 });
    campground.geometry = geoData.features[0].geometry;
    const imgs=req.files.map(f =>({url: f.path, filename: f.filename}))
    campground.images.push(...imgs);
    await campground.save();
    req.flash('success','Successfully updated Campground');
    res.redirect(`/campground/${campground._id}`);
}))


app.get('/campground/:id/edit',isLoggedIn, catchAsync(async(req,res)=>{
    const campground= await Campground.findById(req.params.id);
    res.render('campgrounds/edit', {campground} );
}))

app.delete('/campground/:id',isLoggedIn, catchAsync(async(req,res)=>{
    const{id}= req.params;
    await Campground.findByIdAndDelete(id);
    res.redirect('/campground');
}))

app.post('/campground/:id/reviews',isLoggedIn, async(req,res)=>{
    const{id}= req.params;
    const campground= await Campground.findById(id);
    const review= new Review(req.body.review);
    review.author=req.user._id;
    campground.reviews.push(review);
    await review.save();
    await campground.save();
    res.redirect(`/campground/${campground._id}`);
})



// app.post('/campground', upload.array('image'), (req, res) => {
//     try {
//         console.log(req.body, req.files);
//         res.send('It worked');
//     } catch (error) {
//         console.error('Error uploading to Cloudinary:', error);
//         res.status(500).send('Upload failed: ' + error.message);
//     }
// });

app.all('*', (req,res,next)=> {
    next(new expressError('Page Not Found', 404));

})

app.use((err,req,res,next)=> {
    const{statusCode= 500, message='Something went Wrong'}= err;
    res.status(statusCode).send(message);
})


app.listen(3000, ()=>{
    console.log("LISTENING ON PORT 3000");
})