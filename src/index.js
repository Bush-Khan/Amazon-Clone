const express = require('express');
const route = require('./route/routes.js');
const multer = require("multer");

const mongoose = require('mongoose'); 
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(multer().any());

mongoose.connect("mongodb+srv://bushra:euVDEv190AGHYJDI@cluster0.nwfddcm.mongodb.net/group14Database?retryWrites=true&w=majority",{
    useNewUrlParser: true
})
.then(() => console.log("MongoDb is connected"))
.catch ( err => console.log(err))

app.use('/', route);
app.listen(process.env.PORT || 3000, function () {
    console.log('Express app running on port ' + (process.env.PORT|| 3000))
});
