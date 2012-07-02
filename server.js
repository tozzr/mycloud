var express = require('express')
  , routes = require('./routes')
  , fs = require('fs')
  , stalker = require('stalker');

var db = require('./lib/db.js');  
var dir_info = require('./lib/dir_info.js');

var app = module.exports = express.createServer();

// Configuration
var serverConfig = require('./serverConfig');

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

stalker.watch(
	serverConfig.data.basepath, 
	{buffer: serverConfig.data.fs_event_timeout}, 
	function (err, file) {
		if (err) console.log(err);
		monitorFilesystem();
	},
	function (err, file) {
		if (err) console.log(err);
		monitorFilesystem();
	}
);

function monitorFilesystem() {
	dir_info.syncDBWithFS(serverConfig.data.dbName, serverConfig.data.basepath,  function(err, data) {
		serverConfig.data.files = data;
		db.save(serverConfig.data.dbName, serverConfig.data.files, function (err) {
			console.log('server fs event ' + new Date());
		});
	});
}

dir_info.syncDBWithFS(serverConfig.data.dbName, serverConfig.data.basepath,  function(err, data) {
	if (err) throw err;
	serverConfig.files = data;
	app.listen(serverConfig.data.port, function(){
		console.log("mycloud server listening on port %d in %s mode", app.address().port, app.settings.env);
	});
});
