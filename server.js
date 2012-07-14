var express = require('express')
  , everyauth = require('everyauth')
  , routes = require('./routes')
  , fs = require('fs');
// nStore !!!


var db = require('./lib/db.js');  
var dir_info = require('./lib/dir_info.js');

var usersByLogin = {
  'admin': {
      id: 1,
	  name: 'Admin',
      login: 'admin',
	  email: 'mail@mycloud.com',
      password: 'password',
	  maxSize: '10M'
  },
  'torsten': {
      id: 2,
	  name: 'Torsten Hein',
      login: 'torsten',
	  email: 'torsten@mycloud.com',
      password: 'password',
	  maxSize: '1GB'
  }
};

everyauth
  .password
    .loginWith('login') // login, email or phone
    .getLoginPath('/login')
    .postLoginPath('/login')
    //.loginView('login')
    .loginLocals( function (req, res, done) {
      setTimeout( function () {
        done(null, {
          title: 'Login'
        });
      }, 200);
    })
    .authenticate( function (login, password) {
      var errors = [];
      if (!login) errors.push('Missing login');
      if (!password) errors.push('Missing password');
	  if (errors.length) return errors;
      var user = usersByLogin[login];
	  if (!user) return ['Login failed'];
      if (user.password !== password) return ['Login failed'];
	  return user;
    })
	.respondToLoginSucceed( function (res, user) {
	  if (user) { // Then the login was successful
        return res.json({ status: 'ok' }, 200);
      }
    })
    .respondToLoginFail( function (req, res, errors, login) {
	  if (!errors || !errors.length) return;
	  console.log('login failed ' + JSON.stringify(errors));
      return res.json({ status: 'fail', errors: errors }, 200);
    })
    .getRegisterPath('/register')
    .postRegisterPath('/register')
    .registerView('register.jade')
    .registerLocals( function (req, res, done) {
      setTimeout( function () {
        done(null, {
          title: 'Async Register'
        });
      }, 200);
    })
    .extractExtraRegistrationParams( function (req) {
      return {
          email: req.body.email
      };
    })
    .validateRegistration( function (newUserAttrs, errors) {
      var login = newUserAttrs.login;
      if (usersByLogin[login]) errors.push('Login already taken');
      return errors;
    })
    .registerUser( function (newUserAttrs) {
      var login = newUserAttrs[this.loginKey()];
      return usersByLogin[login] = newUserAttrs;
    });
    //.loginSuccessRedirect('/files');
    //.registerSuccessRedirect('/');

everyauth.everymodule.findUserById( function (userId, callback) {
  for (login in usersByLogin) {
    if (usersByLogin[login].id == userId) {
	  // FUNZT!!! console.log(JSON.stringify(usersByLogin[login]) + ' found by id ' + userId);
	  return callback(null, usersByLogin[login]);
	}
  }
  
  console.log('user not found by id ' + userId);
  callback(['user not found'], null);
  //User.findById(userId, callback);
  // callback has the signature, function (err, user) {...}
});

var app = module.exports = express.createServer();

everyauth.helpExpress(app);

var authRequired = function(req, res, next) {
	if (req.loggedIn) {
		return next();
	}
	if (req.headers['user-agent'])
		res.redirect('/');
	else 
		res.json( { status: 'fail', message: 'authorization required'}, 401 );
};

// Configuration
var serverConfig = require('./serverConfig.js');

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.limit('100mb'));
  app.use(express.bodyParser({uploadDir:'./uploads'}));
  app.use(express.cookieParser());
  app.use(express.static(__dirname + '/public'));
  app.use(express.session({ secret: "mycloud 2012" }));
  app.use(express.methodOverride());
  //app.use(require('stylus').middleware({ src: __dirname + '/public' }));
  app.use(everyauth.middleware());
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

app.get('/dir*', authRequired, routes.listDirEntries);
app.post('/dir*', authRequired, routes.createDirectory);
app.put('/dir*', authRequired, routes.renameDirectory);
app.del('/dir*', authRequired, routes.deleteDirectory);

app.get('/file*', authRequired, routes.downloadFile);
app.post('/file*', authRequired, routes.formUploadData);
app.put('/file*', authRequired, routes.renameFile);
app.del('/file*', authRequired, routes.deleteFile);

app.get('/list', authRequired, routes.filelist);

dir_info.syncDBWithFS(serverConfig.data.dbName, serverConfig.data.basepath,  function(err, data) {
	if (err) throw err;
	serverConfig.data.files = data;
	app.listen(serverConfig.data.port, function(){
		console.log("mycloud server listening on port %d in %s mode", app.address().port, app.settings.env);
	});
});
