var fs = require('fs'); 
var db = require('./db.js');

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
		if (err) return err;
		var remaining = files.length;
		if (!remaining) return callback(dirEntries);
		
		files.forEach(function(file) {
			var filepath = path + '/' + file;
			fs.stat(filepath, function(err, stats) {
				if (stats && stats.isDirectory()) {
					dirEntries[filepath.substring(basepathLength)] = new DirEntry('dir', stats.size, stats.mtime.getTime());
					getDirEntries(filepath, function(results){
						for (p in results)
							dirEntries[p] = results[p];
						
						if (!--remaining)
							callback(dirEntries)
					});
				}
				else {
					dirEntries[filepath.substring(basepathLength)] = new DirEntry('file', stats.size, stats.mtime.getTime());
					if (!--remaining)
						callback(dirEntries);
				}
			});
		});
	});
};

var synchLists = function (dbList, fsList, callback) {
	for (path in dbList) {
		if (fsList[path] === undefined) { // not in fs
			if (dbList[path].state == 'active') {
				dbList[path].state = 'deleted';
				dbList[path].version = incrementVersion(dbList[path]);
			}
		}
		else { // in fs
			if (dbList[path].state == 'deleted') {
				dbList[path].state = 'active';
				dbList[path].version = incrementVersion(dbList[path]);
			}
			else if (dbList[path].filetime != fsList[path].filetime) {
				dbList[path].filetime = fsList[path].changed;
				dbList[path].version = incrementVersion(dbList[path]);
			}
			
			dbList[path].size = fsList[path].size;
			delete fsList[path];
		}
		console.log(path + ' ' + dbList[path].version);
	}
	
	for (path in fsList) {
		if (dbList[path] === undefined) {
			dbList[path] = fsList[path];
			console.log(path + ' ' + dbList[path].version);
		}
	}

	callback(dbList);
};

var incrementVersion = function (listEntry) {
	return parseInt(listEntry.version) + 1;
};

exports.syncDBWithFS = function (basepath, callback) {
	basepathLength = basepath.length;
	db.read('files', function(err, dbFileList) {
		getFSFileList(basepath, function(fsFileList) {
			synchLists(dbFileList, fsFileList, function(dbFileList){
				db.save('files', dbFileList, function(err) {
					if (err) return callback(err, null);
					callback(null, dbFileList);
				});
			});
		});
	});
};