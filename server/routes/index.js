var fs = require('fs');
var login = require('./login.js');
var upload = require('./upload.js');
var utils = require('../utils');
var dir_info = require('../lib/dir_info.js');

exports.loginForm = login.form;
exports.loginAuth = login.auth;
exports.logout = login.logout;
exports.authRequired = login.authRequired;

exports.uploadForm = upload.form;
exports.upload = upload.processData;

exports.index = function (req, res) {
	res.render('index', { title: 'myCloud' });
};

exports.files = function(req, res){
	var dir = utils.dirFromParam(req.params[0]);
	var parentdir = utils.parentdirFromPath(dir);
  
	var path = BASE_DIR + dir;
	var stats = fs.statSync(path);
  
	if (stats.isDirectory()) {
		res.writeHead(200, {'Content-Type': 'application/json'});
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
			data['dirs'] = dirInfos;
			data['files'] = fileInfos;
			data['parentdir'] = parentdir;
			res.end( JSON.stringify(data) );
			//res.render('index', { title: 'myCloud', dirpath: dir, parentdir: parentdir, dirs: dirInfos, files: fileInfos, user: req.session.user });
		});
	}
	else {
		res.download(path, dir);
	}
};

exports.filelist = function(req, res) {
	dir_info.syncDBWithFS('F:\\tmp\\mycloud_server', function(err, data) {
		if (err) throw err;
		data.status = 'ok';
		res.writeHead(200, {'Content-Type': 'application/json'});
		res.end( JSON.stringify(data) );
	});
	
};

exports.formUploadData = function(req, res) {
	var dir = utils.dirFromParam(req.params[0]);
	var tmp_path = req.files.uploadfile.path;
	console.log('form upload ' + JSON.stringify(req.body));
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
	
	var target_path = BASE_DIR + dir + '\\' + req.files.uploadfile.name;
	
	var target_file = fs.createWriteStream(target_path);
	target_file.on('close', function() {
		fs.unlink(tmp_path, function(err) {
            //if (err) console.log(err);
			if (req.body.filetime) {
				var filetime = new Date(parseInt(req.body.filetime));
				fs.utimes(target_path, filetime, filetime, function(err){
					if (err) console.log('utime err: ' + err);
					res.end( JSON.stringify(data) );
				});
			}
        });
	});
	
	var tmp_file = fs.createReadStream(tmp_path);
	tmp_file.on('data', function(data) {
		target_file.write(data);
	});
	tmp_file.on('close', function() { target_file.end(); });
};

exports.deleteFile = function (req, res) {
	var dir = utils.dirFromParam(req.params[0]);
	var parentdir = utils.parentdirFromPath(dir);
	var filepath = BASE_DIR + dir;
	
	fs.unlink(filepath, function(err) {
        if (err) throw err;
        res.redirect('/files'+parentdir);
    });
};

exports.createDirectory = function(req, res) {
	var dir = utils.dirFromParam(req.params[0]);
	var path = BASE_DIR + dir + '\\' + req.body.newDirName;
	
	fs.mkdir(path, 0755, function(err) {
		res.redirect('/files'+dir);
	});
};

exports.deleteDirectory = function(req, res) {
	var dir = utils.dirFromParam(req.params[0]);
	var parentdir = utils.parentdirFromPath(dir);
	var path = BASE_DIR + dir;
	
	utils.rmdirRecursive(path);
	res.redirect('/files'+parentdir);
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