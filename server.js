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

//var config = require('./config');
var routes = require('./app/routes');
//var Character = require('./models/character');

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


app.listen(app.get('port'), function() {
  console.log('Express server listening on port ' + app.get('port'));
});