var fs = require('fs');
var http = require('http');
var querystring = require('querystring');

var request = require('request');
var stalker = require('stalker');

var dir_info = require('./lib/dir_info.js');
var file_download = require('./lib/file_download.js');
var file_upload = require('./lib/file_upload.js');

var config = {
	host: 'localhost',
	port: 25811,
	url: 'http://localhost:25811',
	credentials: {
		username: 'admin',
		password: 'password'
	},
	basepath: 'F:\\tmp\\mycloud_client',
	cookie: 'undefined'
};

stalker.watch(
	config.basepath, 
	{buffer: 10000}, 
	function (err, file) {
		if (err) console.log(err);
		monitorFilesystem(config.basepath);
	},
	function (err, file) {
		if (err) console.log(err);
		monitorFilesystem(config.basepath);
	}
);

var upload = function(path, dirEntry, callback) {
	console.log('upload ' + path + ' newer on client');
	if (dirEntry.type == 'dir') {
		console.log('=> is dir.');
		callback();
	}
	else {
		file_upload.post(config, path, dirEntry.changed, function(err){
			console.log(path + ' uploaded');
			callback();
		});
	}
};
var download = function(path, dirEntry, callback) {
	console.log('download ' + path + ' newer on server');
	
	var diskpath = config.basepath + path;
	if (dirEntry.type == 'dir') {
		console.log('=> is dir.');
		fs.mkdir(diskpath, callback);
	}
	else {
		var filetime = new Date(dirEntry.changed);
		file_download.get(config, path, function(err) {
			console.log('download ' + config.url + '/files' +  path + ' done.');
			console.log('filetime should be ' + filetime);
			fs.utimes(diskpath, filetime, filetime, function(err){
				if (err) console.log('utime err: ' + err);
				console.log('time set to ' + filetime);
				callback();
			});
		});
	}
};

var syncWithServer = function (clientList, serverList, callback) {
	syncClientToServer(clientList, serverList, function (clientList, serverList) {
		syncServerToClient(clientList, serverList, function() {
			callback(null);
		});
	});
};

var syncClientToServer = function (clientList, serverList, callback) {
	var remaining = Object.keys(clientList).length;
	console.log('client2server remaining ' + remaining);
	if (!remaining) return callback(clientList, serverList);
		
	for (path in clientList) {
		if (serverList[path] === undefined && clientList[path].state == 'active') {
			console.log('1');
			upload(path, clientList[path], function() {
				serverList[path] = clientList[path];
				if (!--remaining) callback(clientList, serverList);
			});
		}
		else if (clientList[path].state == 'active' && serverList[path].state == 'active') { 
			if (parseInt(clientList[path].changed) < parseInt(serverList[path].changed)) {
				console.log('2');
				download(path, serverList[path], function(){
					clientList[path].changed = serverList[path].changed;
					if (!--remaining) callback(clientList, serverList);
				});
			}
			else if (parseInt(clientList[path].changed) > parseInt(serverList[path].changed)) {
				console.log('3');
				upload(path, clientList[path], function () {
					serverList[path].changed = clientList[path].changed;
					if (!--remaining) callback(clientList, serverList);
				});
			}
			else
				if (!--remaining) callback(clientList, serverList);
		}
		else {
			if (!--remaining) callback(clientList, serverList);
		}
	}
};

var syncServerToClient = function (clientList, serverList, callback) {
	var remaining = Object.keys(serverList).length;
	console.log('server2client remaining ' + remaining);
	if (!remaining) return callback(null);
	
	for (path in serverList) {
		if (path.indexOf('/') == 0) {
			if (clientList[path] === undefined && serverList[path].state == 'active') {
				download(path, serverList[path], function() {
					if (!--remaining) callback(null);
				});
			}
			else if (clientList[path].state == 'active' && serverList[path].state == 'active') { 
				if (parseInt(clientList[path].changed) < parseInt(serverList[path].changed)) {
					download(path, serverList[path], function() {
						if (!--remaining) callback(null);
					});
				}
				else if (parseInt(clientList[path].changed) > parseInt(serverList[path].changed)) {
					upload(path, clientList[path], function() {
						if (!--remaining) callback(null);
					});
				}
				else
					if (!--remaining) callback(null);
			}
			else {
				if (!--remaining) callback(null);
			}
		}
		else
			if (!--remaining) callback(null);
	}
};

var action = false;
var monitorFilesystem = function (path) {
	if (action) return;
	action = true;
	dir_info.syncDBWithFS(path, function(err, dbList) {
		if (err) throw err;
		var j = request.jar();
		request.post({url: config.url + '/login', form: config.credentials, jar: j}, function _login(error, response, body) {
			if (!error && response.statusCode == 200) {
				config.cookie = j.cookies[0].name + '=' + j.cookies[0].value;
				request({url: config.url + '/filelist', jar: j}, function _getServerFileList(error, response, body) {
					if (!error && response.statusCode == 200) {
						var serverList = JSON.parse(body);
						syncWithServer(dbList, serverList, function(err) {
							request.get({url: config.url + '/logout', jar: j}, function _logout(error, response, body) {
								if (!error && response.statusCode == 200) {
									console.log('\n' + new Date() + '\n');
									action = false;
								}
							});							
						});
					}
					else
						console.log(JSON.parse(body).message);
				});
			}
		});
	});
};

monitorFilesystem(config.basepath);
