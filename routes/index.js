var fs = require('fs');

var utils = require('../lib/utils.js');
var dir_info = require('../lib/dir_info.js');
var db = require('../lib/db.js');

var serverConfig = require('../serverConfig.js');

exports.index = function (req, res) {
	res.render('index', { title: 'myCloud' });
};

exports.listDirEntries = function(req, res){
	var dir = utils.dirFromParam(req.params[0]);
	var parentdir = utils.parentdirFromPath(dir);
  
	var path = serverConfig.data.basepath + dir;
	var stats = fs.statSync(path);
  
	if (stats.isDirectory()) {
		var data = new Object();
		fs.readdir(path, function(err, files) {
			var dirInfos = new Array();
			var fileInfos = new Array();
			for (i in files) {
				if (files[i].indexOf('.') != 0) {
					var stats = fs.statSync(path + '/' + files[i]);
					if (stats.isDirectory())
						dirInfos.push({
							name: files[i], 
							path: dir + '/' + files[i],
						});
					else
						fileInfos.push({
							name: files[i], 
							path: dir + '/' + files[i], 
							icon: getMimetype(files[i]),
							size: getFormattedSize( stats.size )
						});
				}
			}
			res.render('direntries', { title: 'myCloud', dirpath: dir, parentdir: parentdir, dirs: dirInfos, files: fileInfos, user: req.user.name });
		});
	}
	else {
		res.download(path, dir);
	}
};

exports.createDirectory = function(req, res) {
	var dir = utils.dirFromParam(req.params[0]);
	var path = serverConfig.data.basepath + dir + '/' + req.body.newDirName;
	
	fs.mkdir(path, 0755, function(err) {
		console.log('create dir ok');
		res.writeHead(200, {'Content-Type': 'text/plain'});
		res.end('ok');
	});
};
exports.renameDirectory = function(req, res) {
	var dir = utils.dirFromParam(req.params[0]);
	var parentdir = utils.parentdirFromPath(dir);
	
	var oldpath = serverConfig.data.basepath + dir;
	var newpath = serverConfig.data.basepath + parentdir + '/' + req.body.rename;
	console.log(oldpath + ' ' + newpath);
	fs.rename(oldpath, newpath, function (err) {
		res.writeHead(200, {'Content-Type': 'text/plain'});
		res.end('ok');
	});
};
exports.deleteDirectory = function(req, res) {
	var dir = utils.dirFromParam(req.params[0]);
	var parentdir = utils.parentdirFromPath(dir);
	var path = serverConfig.data.basepath + dir;
	
	utils.rmdirRecursive(path);
	res.writeHead(200, {'Content-Type': 'text/plain'});
	res.end('ok');
};

exports.filelist = function(req, res) {
	serverConfig.data.files.status = 'ok';
	res.writeHead(200, {'Content-Type': 'application/json'});
	res.end( JSON.stringify(serverConfig.data.files) );
};

exports.downloadFile = function(req, res){
	var dir = utils.dirFromParam(req.params[0]);
	var parentdir = utils.parentdirFromPath(dir);
  
	var path = serverConfig.data.basepath + dir;
	res.download(path, dir);
};

exports.formUploadData = function(req, res) {
	var dir = utils.dirFromParam(req.params[0]);
	var tmp_path = req.files.uploadfile.path;
	
	res.writeHead(200, {'Content-Type': 'application/json'});
	var data = { status: 'ok' };
	
	if (req.files.uploadfile.size == 0) {
		fs.unlink(tmp_path, function(err) {
            //if (err) throw err;
            data['status'] = 'fail';
        });
		res.end( JSON.stringify(data) );
		return;
	}
	
	var path = dir + '/' + decodeURI(req.files.uploadfile.name);
	//console.log('path: ' + path);
	var target_path = serverConfig.data.basepath + path;
	console.log('upload: ' + target_path);
	var target_file = fs.createWriteStream(target_path);
	target_file.on('close', function() {
		fs.unlink(tmp_path, function(err) {
            var filetime = req.body.filetime ? new Date(parseInt(req.body.filetime)) : new Date();
			var version = parseInt(req.body.version) >= 0 ? parseInt(req.body.version) : 0;
			fs.utimes(target_path, filetime, filetime, function(err){
				if (err) console.log('utime err: ' + err);
				serverConfig.data.files[path] = {type: 'file', state: 'active', filetime: filetime.getTime(), version: version};
				db.save(serverConfig.data.dbName, serverConfig.data.files, function (err) {
					res.end( JSON.stringify(data) );
				});
			});
        });
	});
	
	var tmp_file = fs.createReadStream(tmp_path);
	tmp_file.on('data', function(data) {
		target_file.write(data);
	});
	tmp_file.on('close', function() { target_file.end(); });
};
exports.renameFile = function(req, res) {
	var dir = utils.dirFromParam(req.params[0]);
	var parentdir = utils.parentdirFromPath(dir);
	
	var oldpath = serverConfig.data.basepath + dir;
	var newpath = serverConfig.data.basepath + parentdir + '/' + req.body.rename;
	
	fs.rename(oldpath, newpath, function (err) {
		res.writeHead(200, {'Content-Type': 'text/plain'});
		res.end('ok');
	});
};
exports.deleteFile = function (req, res) {
	var path = utils.dirFromParam(req.params[0]);
	console.log(serverConfig.data.basepath);
	console.log(path);
	var filepath = serverConfig.data.basepath + path;
	console.log(new Date().getTime() + ': delete ' + filepath);
	//console.log(JSON.stringify(serverConfig));
	fs.unlink(filepath, function(error) {
		if (error) console.log(error);
		if (!serverConfig.data || !serverConfig.data.files || serverConfig.data.files[path]) {
			console.log(path + ' not in db!!!');
			res.writeHead(200, {'Content-Type': 'text/plain'});
			res.end('ok');
		}
		else {
			console.log(JSON.stringify(serverConfig.data));
			//serverConfig.data.files[path].state = 'deleted';
			//serverConfig.data.files[path].version = parseInt(serverConfig.data.files[path].version) + 1;
			//db.save(serverConfig.data.dbName, serverConfig.data.files, function (err) {
				res.writeHead(200, {'Content-Type': 'text/plain'});
				res.end('ok');
			//});
		}
    });
};

/*
*
* Helpers
*
*/
var mimetypes = ['css','doc','gif','html','jpg','numbers','odt','pages','pdf','png','xls'];

function getMimetype(path) {
	var mime = path.split('.');
	if (mime.length > 1) {
		mime = mime[mime.length-1].toLowerCase();
		if (mimetypes.indexOf(mime) != -1)
			return mime;
	}
	return 'unknown';
};

var K = 1024;
var M = K * K;
var G = M * K;

function getFormattedSize( size ) {
	if (size < K)
		return size + ' Bytes';
	else if (size < M)
		return getRounded(size / K) + ' KB';
	else if (size < G)
		return getRounded(size / M) + ' MB';
	else
		return size + ' ?';
};
function getRounded(value) {
	return Math.round(value * 10.0) / 10.0;
};