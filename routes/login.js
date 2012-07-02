exports.form = function(req, res) {
	res.render('login', { title: 'myCloud' });
};

var crypto = require('crypto');

exports.auth = function(req, res) {
	var username = req.body.username;
	var password = req.body.password;
	
	res.writeHead(200, {'Content-Type': 'application/json'});
	var data = new Object();
	data['sID'] = req.session.id;
	
	if (username == 'admin' && password == 'password') {
		req.session.user = { name: username };
		data['status'] = 'ok';
		console.log(new Date().getTime() + ': login  ' + req.session.id);
	}
	else { 
		data['status'] = 'fail';
	}
	
	res.end( JSON.stringify(data) );
};

exports.logout = function(req, res) {
	console.log(new Date().getTime() + ': logout ' + req.session.id);
	res.send('ok: logged out sucessful');
	req.session.destroy(function(){});
};

exports.authRequired = function(req, res, next) {
	if (req.session && req.session.user) {
		return next();
	}
	res.writeHead(401, {'Content-Type': 'application/json'});
	var data = { status: 'fail', message: 'authorization required'};
	res.end( JSON.stringify(data) );
};