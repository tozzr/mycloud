var express = require('express')
  , routes = require('./routes')
  , fs = require('fs');

var app = module.exports = express.createServer();

// Configuration
global.BASE_DIR = 'F:\\tmp\\mycloud_server';

fs.watch(BASE_DIR, function(event, filename) {
	console.log('watch: ' + event + ' ' + filename);
});

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.limit('100mb'));
  app.use(express.bodyParser({uploadDir:'./uploads'}));
  app.use(express.cookieParser());
  app.use(express.static(__dirname + '/public'));
  app.use(express.session({ secret: "mycloud 2012" }));
  app.use(express.methodOverride());
  app.use(require('stylus').middleware({ src: __dirname + '/public' }));
  app.use(app.router);
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});

// Routes
app.get('/', routes.index);

app.get('/files*', routes.authRequired, routes.files);
app.post('/files*', routes.authRequired, routes.formUploadData);
app.del('/files*', routes.authRequired, routes.deleteFile);

app.get('/filelist', routes.authRequired, routes.filelist);

app.get('/upload', routes.authRequired, routes.uploadForm);

app.post('/dir*', routes.authRequired, routes.createDirectory);
app.del('/dir*', routes.authRequired, routes.deleteDirectory);

app.get('/login', routes.loginForm);
app.post('/login', routes.loginAuth);
app.get('/logout', routes.logout);

app.listen(25811, function(){
  console.log("mycloud server listening on port %d in %s mode", app.address().port, app.settings.env);
});
