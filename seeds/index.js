const mongoose= require('mongoose');
const cities= require('./cities');
const Campground= require('../models/camp');
const {places,descriptors} = require('./seedHelpers');

mongoose.connect('mongodb://localhost:27017/yelpCamp')
.then(() =>{
    console.log("CONNECTED to MONGO!");
})
.catch((err)=>{
    console.log("OH NO ERROR!");
    console.log(err);
})


const sample= array => array[Math.floor(Math.random() * array.length)];



const seedDb= async ()=>{
    await Campground.deleteMany({});
    for(let i=0; i<2; i++){
        const num= Math.floor(Math.random() * 1000);
        const price= Math.floor(Math.random() * 20)+ 10;
        const camp= new Campground({
            author: '67a353d234ce2966b5b6ec31',
            title: `${sample(descriptors)} ${sample(places)}`,
            location: `${cities[num].city} , ${cities[num].state}`,
            geometry: {
                type: "Point",
                coordinates:[
                    cities[num].longitude,
                    cities[num].latitude

                ]
            },
            images: [{
                url: 'https://res.cloudinary.com/drduxpqg2/image/upload/v1741341843/YelpCamp/wgk8jkzphbwcd9rviqmy.jpg',
                filename: 'YelpCamp/wgk8jkzphbwcd9rviqmy',
              },
              {
                url: 'https://res.cloudinary.com/drduxpqg2/image/upload/v1741341846/YelpCamp/vzdgekysm2koslmnbglg.jpg',
                filename: 'YelpCamp/vzdgekysm2koslmnbglg',
              }],
            price: price,
            description: 'Lorem ipsum dolor, sit amet consectetur adipisicing elit. Sit odio aut eum exercitationem rerum possimus. Accusamus, fugiat nam iusto iste sunt quos! Sunt nesciunt, voluptate mollitia natus fuga adipisci consequatur.'

        })
        await camp.save();

    }
}
seedDb();
