var fs = require('fs');
var	path = require('path');

exports.dirFromParam = function (dir) {
	dir = dir == undefined || dir == '/' ? '' : decodeURI(dir);
	dir = dir.replace(/\.\./g, '');
	dir = dir.replace('//', '/');
	return dir;
};

exports.parentdirFromPath = function (dir) {
	var parentdir = '';
	
	var parts = dir.split('/');
	for (var index = 0; index < parts.length-1; index++)
		if (parts[index] != '')
			parentdir += '/' + parts[index]; 
	
	return parentdir;
};
var rmdirRecursive = function(dir) {
	var list = fs.readdirSync(dir);
	
	for(var i = 0; i < list.length; i++) {
		var filename = path.join(dir, list[i]);
		var stat = fs.statSync(filename);

		if(filename == "." || filename == "..") {} 
		else if(stat.isDirectory()) {
			// rmdir recursively
			rmdirRecursive(filename);
		} else {
			// rm filename
			fs.unlinkSync(filename);
		}
	}
	fs.rmdirSync(dir);
};
exports.rmdirRecursive = rmdirRecursive;