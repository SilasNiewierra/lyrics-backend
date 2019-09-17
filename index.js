var express = require("express");
var app = express();

const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

// API Configuration
const BASE_URL = "https://api.musixmatch.com/ws/1.1"
const API_KEY = "&apikey="+process.env.MUSIXMATCH_API_KEY

var DetectLanguage = require('detectlanguage');
var detectLanguage = new DetectLanguage({
    key: process.env.LANGUAGE_API_KEY,
    ssl: true
});

// Allow Cross Origin Domains
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

// Get tracks for artist by name and page number
app.get("/tracks/:artist_name/:page", (req, res, next) => {
    url = BASE_URL+'/track.search?q_artist='+req.params.artist_name+'&page='+req.params.page+'&s_track_rating=desc&f_has_lyrics=1'+API_KEY
    axios.get(url)
    .then(response => {
        res.send(response.data.message.body.track_list)
    })
    .catch(error => {
        console.log(error);
    });
});

// Retrieve lyrics for a song by its track_id (just 30% because free musixmatch version)
app.get("/lyrics/:track_id", (req, res, next) => {
    url = BASE_URL+'/track.lyrics.get?&track_id='+req.params.track_id+'&s_track_rating=desc'+API_KEY
    console.log(url)
    axios.get(url)
    .then(response => {
        // console.log(response.data.message.body.lyrics['lyrics_body'].split('...')[0])
        var dataSimple = response.data.message.body.lyrics['lyrics_body'].split('...')[0]
        detectLanguage.detect(dataSimple, function(error, result) {
            var data = {lyrics: response.data.message.body.lyrics['lyrics_body'].split('...')[0], language: result[0], tracking_url: response.data.message.body.lyrics['pixel_tracking_url']}
            res.send(data)
        });
    })
    .catch(error => {
        console.log(error);
    });
});

// Preprocess lyrics
app.get("/preprocess/:lyrics", (req, res, next) => {
    var lyrics_list = req.params.lyrics

    res.send(response.data.result.lyrics)
});

// Start server
app.listen(3000, () => {
    console.log("Server running on port 3000");
});