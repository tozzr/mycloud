var fs = require('fs');
var http = require('http');
var querystring = require('querystring');

var request = require('request');
var stalker = require('stalker');

var dir_info = require('./lib/dir_info.js');
var file_download = require('./lib/file_download.js');
var file_upload = require('./lib/file_upload.js');

var utils = require('./lib/utils.js');

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

var cookieJar= null;

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
		var basedir = utils.parentdirFromPath(path);
		request.post({url: config.url + '/dir' + basedir, form: {newDirName: path}, jar: cookieJar}, 
			function (error, response, body) {
				callback();
			}
		);
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
	var filetime = new Date(parseInt(dirEntry.changed));
	
	if (dirEntry.type == 'dir') {
		fs.mkdir(diskpath, callback);
	}
	else {
		file_download.get(config, path, function(err) {
			console.log('download ' + config.url + '/files' +  path + ' done.');
			fs.utimes(diskpath, filetime, filetime, function(err){
				callback();
			});
		});
	}
};

var whatToDo = function (clientEntry, serverEntry) {
	if (clientEntry === undefined && serverEntry === undefined)
		return 'nothing';
		
	if (serverEntry === undefined && clientEntry !== undefined)
		if (clientEntry.state == 'active')
			return 'upload_init';
		else
			return 'nothing';
			
	if (clientEntry === undefined && serverEntry !== undefined)
		if (serverEntry.state == 'active')
			return 'download_init';
		else
			return 'nothing';
			
	if (clientEntry.state == 'active' && serverEntry.state == 'active')
		if (clientEntry.changed < serverEntry.changed)
			return 'download_update';
		else if (clientEntry.changed > serverEntry.changed)
			return 'upload_update';
		else
			return 'nothing';
			
	if (clientEntry.state == 'deleted' && serverEntry.state == 'active')
		if (clientEntry.changed <= serverEntry.changed)
			return 'download_update';
		else if (clientEntry.changed > serverEntry.changed)
			return 'delete_server';

	if (clientEntry.state == 'active' && serverEntry.state == 'deleted')
		if (clientEntry.changed < serverEntry.changed)
			return 'delete_client';
		else if (clientEntry.changed > serverEntry.changed)
			return 'upload_update';	
	
	return 'nothing';
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
		var action = whatToDo(clientList[path], serverList[path]);
		console.log(path + ': ' + action);
		if (action == 'upload_init' || action == 'upload_update') { 
			upload(path, clientList[path], function() {
				if (!--remaining) callback(clientList, serverList);
			});
		}
		else if (action == 'download_init' || action == 'download_update') { 
			download(path, serverList[path], function(){
				if (action == 'download_update')
					clientList[path].changed = serverList[path].changed;
				if (!--remaining) callback(clientList, serverList);
			});
		}
		else if (action == 'delete_client') {
			if (clientList[path].type == 'file') {
				fs.unlink(config.basepath + path, function(err) {
					if (err) throw err;
					clientList[path].changed = serverList[path].changed;
					clientList[path].state = 'deleted';
					if (!--remaining) callback(clientList, serverList);
				});
			}
			else {
				utils.rmdirRecursive(config.basepath + path);
			}
		}
		else if (action == 'delete_server') {
			var type = clientList[path].type == 'dir' ? '/dir' : '/files';
			var url = config.url + type + path;
			console.log('.....' + url);
			request.del({url: url, jar: cookieJar}, function (error, response, body) {
				if (error) console.log(error + ': ' + body);
				if (!--remaining) callback(clientList, serverList);
			});
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
		var action = whatToDo(clientList[path], serverList[path]);
		console.log(path + ': ' + action);
		if (action == 'upload_init' || action == 'upload_update') { 
			upload(path, clientList[path], function() {
				if (!--remaining) callback(clientList, serverList);
			});
		}
		else if (action == 'download_init' || action == 'download_update') { 
			download(path, serverList[path], function(){
				if (action == 'download_update')
					clientList[path].changed = serverList[path].changed;
				if (!--remaining) callback(clientList, serverList);
			});
		}
		else if (action == 'delete_client') {
			fs.unlink(config.basepath + path, function(err) {
				if (err) throw err;
				if (!--remaining) callback(clientList, serverList);
			});
		}
		else if (action == 'delete_server') {
			var type = clientList[path].type == 'dir' ? '/dir' : '/files';
			request.del({url: config.url + type + path, jar: cookieJar}, function (error, response, body) {
				if (error) console.log(error + ': ' + body);
				if (!--remaining) callback(clientList, serverList);
			});
		}
		else {
			if (!--remaining) callback(clientList, serverList);
		}
	}
};

var action = false;
var monitorFilesystem = function (path) {
	if (action) return;
	action = true;
	dir_info.syncDBWithFS(path, function(err, dbList) {
		if (err) throw err;
		cookieJar = request.jar();
		request.post({url: config.url + '/login', form: config.credentials, jar: cookieJar}, function _login(error, response, body) {
			if (!error && response.statusCode == 200) {
				config.cookie = cookieJar.cookies[0].name + '=' + cookieJar.cookies[0].value;
				request({url: config.url + '/filelist', jar: cookieJar}, function _getServerFileList(error, response, body) {
					if (!error && response.statusCode == 200) {
						var serverList = JSON.parse(body);
						syncWithServer(dbList, serverList, function(err) {
							request.get({url: config.url + '/logout', jar: cookieJar}, function _logout(error, response, body) {
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
