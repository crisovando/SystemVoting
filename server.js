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

app.get('/api/characters', (req, res, next) => {
  var choices = ['Female', 'Male'];
  var randomGender = _.sample(choices);

  //{ random: { $near: [Math.random(), 0] }
  db.character.find({ voted : false, gender: randomGender }).limit(2, (err, docs) => {
    if (err) return next(err);

    if (characters.length === 2) {
      return res.send(characters);
    }

    var oppositeGender = _.first(_.without(choices, randomGender));

    db.character.find({ random: { $near: [Math.random(), 0]}, voted: false, gender: oppositeGender }).limit(2,(err, doc) => {
      if (err) return next(err);

      if( characters.length === 2){
        return res.send(characters);
      }

      db.character.update({}, { $set: { voted: false } }, { multi: true }, (err) => {
        if (err) return next(err);
        res.send([]);
      })
    })
  })
})

/**
* GET api/characters
* Returns 2 random characters of the same gender that have not been voted yet
*/
app.get('/api/characters', (req, res, next) => {
  let choices = ['Female', 'Male'];
  let randomGender = _.sample(choices);

  db.character
    .find({ random: { $near: [Math.random(), 0] }, voted: false, gender: randomGender })
    .limit(2, (err, characters) => {
      if(err) return next(err);

      if(characters.length === 2) return res.send(characters);

      db.character.update({}, { $set: { voted: false } }, { multi: true }, (err) => {
        if(err) return next(err);
        res.send([]);
      })
    })
});

app.put('/api/characters', (res, req, next) => {
  let winner = req.body.winner,
      loser = req.body.loser;

  if (!winner || !loser) {
    return res.status(400).send({ message: 'Voting require two characters.' });
  }

  if (winner === loser) {
    return res.status(400).send({ message: 'Cannot vote for and againts the same character.'  });
  }

  async.parallel([
    (callback) =>{
      db.character.findOne({ characterId: winner }, (err, winner) => {
        callback(err, winner);
      })
    },
    (callback) =>{
      db.character.findOne({ characterId: loser }, (err, loser) => {
        callback(err, loser);
      })
    }
  ],
  (err, results) => {
    if (err) return next(err);

    let winner = results[0],
        loser = results[1];

    if (!winner || !loser)
      return res.status(404).send({ message: 'One og the characters no longer exists.' });

    if (winner.voted || loser.voted)
      return res.status(200).end();

    async.parallel([
        (callback) =>{
          winner.wins++;
          winner.voted = true;
          winner.random = [Math.random(), 0];
          winner.save(function(err) {
            callback(err);
          });
        },
        (callback) =>{
          loser.losses++;
          loser.voted = true;
          loser.random = [Math.random(), 0];
          loser.save(function(err) {
            callback(err);
          });
        }
      ], (err) =>{
        if (err) return next(err);
        res.status(200).end();
      });
  })
})

/**
 * GET /api/characters/count
 * Returns the total number of characters.
 */
app.get('/api/characters/count', function(req, res, next) {
  db.character.count({}, (err, count) =>{
    if (err) return next(err);
    res.send({ count: count });
  });
});

/**
 * GET /api/characters/search
 * Looks up a character by name. (case-insensitive)
 */
app.get('/api/characters/search', function(req, res, next) {
  var characterName = new RegExp(req.query.name, 'i');

  db.character.findOne({ name: characterName }, function(err, character) {
    if (err) return next(err);

    if (!character) {
      return res.status(404).send({ message: 'Character not found.' });
    }

    res.send(character);
  });
});

/**
 * GET /api/characters/top
 * Return 100 highest ranked characters. Filter by gender, race and bloodline.
 */
app.get('/api/characters/top', function(req, res, next) {
  var params = req.query;
  var conditions = {};

  _.each(params, (value, key) =>{
    conditions[key] = new RegExp('^' + value + '$', 'i');
  });

  db.character
    .find(conditions)
    .sort('-wins') // Sort in descending order (highest wins on top)
    .limit(100, (err, characters) =>{
      if (err) return next(err);

      // Sort by winning percentage
      characters.sort((a, b) =>{
        if (a.wins / (a.wins + a.losses) < b.wins / (b.wins + b.losses)) { return 1; }
        if (a.wins / (a.wins + a.losses) > b.wins / (b.wins + b.losses)) { return -1; }
        return 0;
      });

      res.send(characters);
    });
});

/**
 * GET /api/characters/shame
 * Returns 100 lowest ranked characters.
 */
app.get('/api/characters/shame', (req, res, next) =>{
  db.character
    .find()
    .sort('-losses')
    .limit(100, (err, characters) =>{
      if (err) return next(err);
      res.send(characters);
    });
});

/**
 * GET /api/characters/:id
 * Returns detailed character information.
 */
app.get('/api/characters/:id', (req, res, next) =>{
  var id = req.params.id;

  db.character.findOne({ characterId: id }, (err, character) =>{
    if (err) return next(err);

    if (!character) {
      return res.status(404).send({ message: 'Character not found.' });
    }

    res.send(character);
  });
});

/**
 * POST /api/report
 * Reports a character. Character is removed after 4 reports.
 */
app.post('/api/report', (req, res, next) =>{
  var characterId = req.body.characterId;

  db.character.findOne({ characterId: characterId }, (err, character) =>{
    if (err) return next(err);

    if (!character) {
      return res.status(404).send({ message: 'Character not found.' });
    }

    character.reports++;

    if (character.reports > 4) {
      character.remove();
      return res.send({ message: character.name + ' has been deleted.' });
    }

    character.save((err) =>{
      if (err) return next(err);
      res.send({ message: character.name + ' has been reported.' });
    });
  });
});

/**
 * GET /api/stats
 * Returns characters statistics.
 */
app.get('/api/stats', (req, res, next) =>{
  async.parallel([
      (callback) =>{
        db.character.count({}, (err, count) =>{
          callback(err, count);
        });
      },
      (callback) =>{
        db.character.count({ race: 'Amarr' }, (err, amarrCount) =>{
          callback(err, amarrCount);
        });
      },
      (callback) =>{
        db.character.count({ race: 'Caldari' }, (err, caldariCount) =>{
          callback(err, caldariCount);
        });
      },
      (callback) =>{
        db.character.count({ race: 'Gallente' }, (err, gallenteCount) =>{
          callback(err, gallenteCount);
        });
      },
      (callback) =>{
        db.character.count({ race: 'Minmatar' }, (err, minmatarCount) =>{
          callback(err, minmatarCount);
        });
      },
      (callback) =>{
        db.character.count({ gender: 'Male' }, (err, maleCount) =>{
          callback(err, maleCount);
        });
      },
      (callback) =>{
        db.character.count({ gender: 'Female' }, (err, femaleCount) =>{
          callback(err, femaleCount);
        });
      },
      (callback) =>{
        db.character.aggregate({ $group: { _id: null, total: { $sum: '$wins' } } }, (err, totalVotes) =>{
            var total = totalVotes.length ? totalVotes[0].total : 0;
            callback(err, total);
          }
        );
      },
      (callback) =>{
        db.character
          .find()
          .sort('-wins')
          .limit(100, (err, characters) =>{
            if (err) return next(err);

            var raceCount = _.countBy(characters, character =>{ return character.race; });
            var max = _.max(raceCount, race =>{ return race });
            var inverted = _.invert(raceCount);
            var topRace = inverted[max];
            var topCount = raceCount[topRace];

            callback(err, { race: topRace, count: topCount });
          });
      },
      callback =>{
        db.character
          .find()
          .sort('-wins')
          .limit(100, (err, characters) =>{
            if (err) return next(err);

            var bloodlineCount = _.countBy(characters, character =>{ return character.bloodline; });
            var max = _.max(bloodlineCount, bloodline =>{ return bloodline });
            var inverted = _.invert(bloodlineCount);
            var topBloodline = inverted[max];
            var topCount = bloodlineCount[topBloodline];

            callback(err, { bloodline: topBloodline, count: topCount });
          });
      }
    ],
    (err, results) =>{
      if (err) return next(err);

      res.send({
        totalCount: results[0],
        amarrCount: results[1],
        caldariCount: results[2],
        gallenteCount: results[3],
        minmatarCount: results[4],
        maleCount: results[5],
        femaleCount: results[6],
        totalVotes: results[7],
        leadingRace: results[8],
        leadingBloodline: results[9]
      });
    });
});

db.on('connect', function () {
    console.log('database connected')
})

server.listen(app.get('port'), function() {
  console.log('Express server listening on port ' + app.get('port'));
});
