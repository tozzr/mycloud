var fs = require('fs');
var login = require('./login.js');

var utils = require('../../common-lib/utils.js');
var dir_info = require('../../common-lib/dir_info.js');
var db = require('../../common-lib/db.js');

exports.loginForm = login.form;
exports.loginAuth = login.auth;
exports.logout = login.logout;
exports.authRequired = login.authRequired;

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
	files.status = 'ok';
	res.writeHead(200, {'Content-Type': 'application/json'});
	res.end( JSON.stringify(files) );
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
	
	var path = dir + decodeURI(req.files.uploadfile.name);
	var target_path = BASE_DIR + path;
	
	var target_file = fs.createWriteStream(target_path);
	target_file.on('close', function() {
		fs.unlink(tmp_path, function(err) {
            var filetime = req.body.filetime ? new Date(parseInt(req.body.filetime)) : new Date();
			var version = parseInt(req.body.version) >= 0 ? parseInt(req.body.version) : 0;
			fs.utimes(target_path, filetime, filetime, function(err){
				if (err) console.log('utime err: ' + err);
				files[path] = {type: 'file', state: 'active', filetime: filetime.getTime(), version: version};
				db.save('files', files, function (err) {
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

exports.deleteFile = function (req, res) {
	var path = utils.dirFromParam(req.params[0]);
	var filepath = BASE_DIR + path;
	console.log(new Date().getTime() + ': delete ' + filepath);
	fs.unlink(filepath, function(error) {
		files[path].state = 'deleted';
		files[path].version = parseInt(files[path].version) + 1;
		db.save('files', files, function (err) {
			res.writeHead(200, {'Content-Type': 'text/plain'});
			res.end('ok');
		});
    });
};

exports.createDirectory = function(req, res) {
	var dir = utils.dirFromParam(req.params[0]);
	var path = BASE_DIR + dir + '\\' + req.body.newDirName;
	
	fs.mkdir(path, 0755, function(err) {
		res.writeHead(200, {'Content-Type': 'text/plain'});
		res.end('ok');
	});
};

exports.deleteDirectory = function(req, res) {
	var dir = utils.dirFromParam(req.params[0]);
	var parentdir = utils.parentdirFromPath(dir);
	var path = BASE_DIR + dir;
	
	utils.rmdirRecursive(path);
	res.writeHead(200, {'Content-Type': 'text/plain'});
	res.end('ok');
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