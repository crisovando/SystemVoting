// Babel ES6/JSX Compiler
require('babel-register');

var path = require('path');
var express = require('express');
var bodyParser = require('body-parser');
var compression = require('compression');
var favicon = require('serve-favicon');
var logger = require('morgan');
var async = require('async');
var colors = require('colors');
var request = require('request');
var React = require('react');
var ReactDOM = require('react-dom/server');
var Router = require('react-router');
var swig  = require('swig');
var xml2js = require('xml2js');
var _ = require('underscore');
var mongojs = require('mongojs');
var db = mongojs('systemvoting', ['character']);
var routes = require('./app/routes');
var async = require('async');
var request = require('request');
var xml2js = require('xml2js');

var app = express();

app.set('port', process.env.PORT || 3000);
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res)=>{
  Router.match({ routes: routes.default, location: req.url },(err, redirectLocation, renderProps) => {
    if (err){
      res.status(500).send(err.message)
    } else if (redirectLocation){
      res.status(302).redirect(redirectLocation.pathname + redirectLocation.search);
    } else if (renderProps) {
      var html = ReactDOM.renderToString(React.createElement(Router.RoutingContext, renderProps));
      var page = swig.renderFile('views/index.html', {html: html});
      res.status(200).send(page);
    } else {
      res.status(400).send('Page not found');
    }
  })
});

/**
 * Socket.io stuff.
 */
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var onlineUsers = 0;

io.sockets.on('connection', function(socket) {
  onlineUsers++;

  io.sockets.emit('onlineUsers', { onlineUsers: onlineUsers });

  socket.on('disconnect', function() {
    onlineUsers--;
    io.sockets.emit('onlineUsers', { onlineUsers: onlineUsers });
  });
});

app.post('/api/characters', (req, res, next) => {
  var gender = req.body.gender;
  var characterName = req.body.name;
  var characterIdLoockupUrl = 'https://api.eveonline.com/eve/CharacterID.xml.aspx?names=' + characterName;

  var parser = new xml2js.Parser();

  async.Waterfall([
    (callback) => {
      request.get(characterIdLoockupUrl, (err, request, xml) => {
        if (err) return next(err);
        try {
          var characterId = parsedXml.eveapi.result[0].rowset[0].row[0].$.characterID;

          db.character.findOne({ characterId: characterId }, (err, character) => {
            if (err) return next(err);

            if (character) {
              return res.status(409).send({ message: character.name + 'is already in the database' });
            }
          })

          callback(err, characterId);
        } catch (e) {
          return res.status(400).send({ message: 'XML Parse Error' });
        }
      })
    },(characterId) => {
      var characterInfoUrl = 'https://api.eveonline.com/eve/CharacterInfo.xml.aspx?characterID=' + characterId;

      request.get({ url: characterInfoUrl }, (err, requeset, xml) => {
        if (err) return next(err);
        parser.parseString(xml, (err, parsedXML) => {
          if (err) return res.send(err);
          try {
            var name = parsedXml.eveapi.result[0].characterName[0];
            var race = parsedXml.eveapi.result[0].race[0];
            var bloodline = parsedXml.eveapi.result[0].bloodline[0];

            var character = {
              characterId: characterId,
              name: name,
              race: race,
              bloodline: bloodline,
              gender: gender,
              random: [Math.random(), 0]
            }
            db.character.save(character, (err, doc) =>{
              if (err) return next(err);
              res.send({ message: characterName + ' has been added successfully' });
            });

          } catch (e) {
            res.status(404).send({ message: characterName + ' is not a registered citizen of New Eden.' });
          } 
        });
      });
    }
  ]);
});

db.on('connect', function () {
    console.log('database connected')
})

server.listen(app.get('port'), function() {
  console.log('Express server listening on port ' + app.get('port'));
});
