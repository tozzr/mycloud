var fs = require('fs'); 
var db = require('./db.js');

var sync = require('./sync.js');

var basepathLength = 0;

var DirEntry = function(type, size, filetime) {
	this.type = type;
	this.size = size;
	this.state = 'active';
	this.filetime = filetime
	this.version = 0;
};
var getFSFileList = function(path, callback) {
	getDirEntries(path, callback);
};
var getDirEntries = function(path, callback) {
	var dirEntries = new Object();
	fs.readdir(path, function(err, files) {
		if (err) return callback(err, null);
		var remaining = files.length;
		if (!remaining) return callback(null, dirEntries);

		files.forEach(function(file) {
			var filepath = path + '/' + file;
			fs.stat(filepath, function(err, stats) {
				if (stats && stats.isDirectory()) {
					dirEntries[filepath.substring(basepathLength)] = new DirEntry('dir', stats.size, stats.mtime.getTime());
					getDirEntries(filepath, function(results){
						for (p in results)
							dirEntries[p] = results[p];
						
						if (!--remaining)
							callback(null, dirEntries)
					});
				}
				else {
					dirEntries[filepath.substring(basepathLength)] = new DirEntry('file', stats.size, stats.mtime.getTime());
					if (!--remaining)
						callback(null, dirEntries);
				}
			});
		});
	});
};

exports.syncDBWithFS = function (dbName, basepath, callback) {
	basepathLength = basepath.length;
	db.read(dbName, function(err, dbFileList) {
		getFSFileList(basepath, function(err, fsFileList) {
			sync.syncLists(dbFileList, fsFileList, function(resultList){
				db.save(dbName, resultList, function(err) {
					if (err) return callback(err, null);
					callback(null, resultList);
				});
			});
		});
	});
};