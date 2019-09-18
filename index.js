var express = require("express");
var app = express();

const sw = require('stopword');
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
        var result_tracks = []

        for (var track of response.data.message.body.track_list) {
            // save artist name, track name, album name to do a detailed search in other API (happi api)
            var trackId = track.track['track_id']
            var cleanArtistName = track.track['artist_name'].split('(')[0]
            var cleanTrackName = track.track['track_name'].replace(/ *\([^)]*\) */g, '')
            cleanTrackName = cleanTrackName.split(' -')[0]
            var albumCover = track.track['album_coverart_350x350']
            if (!albumCover) {
                albumCover = '../static/no-cover-placeholder.png'
            }

            // remove duplicate tracks
            var trackFound = false
            for (var track of result_tracks) {
                if (cleanTrackName === track['track_name']) {
                trackFound = true
                continue
                }
            }
            if (!trackFound) {
                var obj = {
                'track_name': cleanTrackName,
                'artist_name': cleanArtistName,
                'track_id': trackId,
                'image_url': albumCover,
                'selected': false
                }
                result_tracks.push(obj)
            }
        }
        res.send(result_tracks)
    })
    .catch(error => {
        console.log(error);
    });
});

// Retrieve lyrics for a song by its track_id (just 30% because free musixmatch version)
app.get("/lyrics/:track_id", (req, res, next) => {
    url = BASE_URL+'/track.lyrics.get?&track_id='+req.params.track_id+'&s_track_rating=desc'+API_KEY
    axios.get(url)
    .then(response => {
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

// Retrieve lyrics for a song by its track_id (just 30% because free musixmatch version)
app.get("/all_lyrics/:track_ids", (req, res, next) => {
    var promises = []
    result_lyrics = []
    var trackIdsString = req.params.track_ids.split(',')
    var trackIds = []
    for (trackString of trackIdsString) {
        trackIds.push(parseInt(trackString))
    }
    trackIds.forEach(track => {
        var url = BASE_URL+'/track.lyrics.get?&track_id='+track+'&s_track_rating=desc'+API_KEY
        promises.push(axios.get(url))
    })

    axios.all(promises)
    .then(results => {
        combinedLyrics = []
        results.forEach(response => {
            var cleanText = response.data.message.body.lyrics['lyrics_body'].split('...')[0]
            var data = {lyrics: cleanText, language: 'en', tracking_url: response.data.message.body.lyrics['pixel_tracking_url']}
            result_lyrics.push(data)
            combinedLyrics.push(cleanText)
        })

        detectLanguage.detect(combinedLyrics, function(error, result) {
            for (var index in result) {
                result_lyrics[index]['language'] = result[index][0]['language']
            }
            var wordCountMap = preprocessLyrics(result_lyrics)
            res.send(wordCountMap)
        });

    })
    .catch(error => {
        console.log(error)
        res.send({})
    })
});

// Preprocess the lyrics so they can used in a wordcloud
function preprocessLyrics (lyrics) {
    var wordCountMap = {}

    for (var song of lyrics) {
        var songLyric = song['lyrics']
        var language = song['language']['language']
        // musixmatch remove free version tags in lyrics
        // songLyric = songLyric.split('...')[0]

        // remove line breaks
        songLyric = songLyric.replace(/(\r\n|\n|\r)/gm, ' ')

        // song_lyric = song_lyric.replace(/\s+/g,' ')
        songLyric = songLyric.replace('?', '')
        songLyric = songLyric.replace('`', ' ')

        // lower case
        songLyric = songLyric.toString().toLowerCase()

        // stem (combine stems of the words likes/like = like)

        // tokenize (split into single words)
        songLyric = songLyric.split(' ')

        // remove stopwords in the respective language
        songLyric = sw.removeStopwords(songLyric, selectStopwordLanguage(language))

        for (var word of songLyric) {
          if (word in wordCountMap) {
            wordCountMap[word].count += 1
          } else {
            wordCountMap[word] = {'count': 1}
          }
        }
    }
    return wordCountMap;
}

// Interface to dynamically select a language for the stopword removal
function selectStopwordLanguage (language) {
    switch (language) {
      case 'af':
        return sw.af
      case 'ar':
        return sw.ar
      case 'bn':
        return sw.bn
      case 'br':
        return sw.br
      case 'da':
        return sw.da
      case 'de':
        return sw.de
      case 'en':
        return sw.en
      case 'es':
        return sw.es
      case 'fa':
        return sw.fa
      case 'fi':
        return sw.fi
      case 'fr':
        return sw.fr
      case 'ha':
        return sw.ha
      case 'he':
        return sw.he
      case 'hi':
        return sw.hi
      case 'id':
        return sw.id
      case 'it':
        return sw.it
      case 'lgg':
        return sw.lgg
      case 'lggo':
        return sw.lggo
      case 'nl':
        return sw.nl
      case 'no':
        return sw.no
      case 'pl':
        return sw.pl
      case 'pt':
        return sw.pt
      case 'pa':
        return sw.pa
      case 'ru':
        return sw.ru
      case 'so':
        return sw.so
      case 'st':
        return sw.st
      case 'sv':
        return sw.sv
      case 'sw':
        return sw.sw
      case 'vi':
        return sw.vi
      case 'yo':
        return sw.yo
      case 'zu':
        return sw.zu
    }
}

// Preprocess lyrics
app.get("/preprocess/:lyrics", (req, res, next) => {
    var lyrics_list = req.params.lyrics

    res.send(response.data.result.lyrics)
});

// Start server
app.listen(3000, () => {
    console.log("Server running on port 3000");
});