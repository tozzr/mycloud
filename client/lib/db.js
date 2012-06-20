var fs = require('fs');

exports.read = function(dbName, callback) {
	fs.open('./db/' + dbName + '.db', 'a+', 0666, function(err, fd) {
		if (err) { callback(err, null); return; }
		fs.close(fd, function() {
			fs.readFile('./db/' + dbName + '.db', 'utf8', function(err, data) {
				if (data == '' || typeof data == 'undefined')
					data = new Object();
				else
					data = JSON.parse(data);
				callback(null, data);
			});
		});
	});
};

exports.save = function(dbName, data, callback) {
	fs.writeFile('./db/' + dbName + '.db', JSON.stringify(data), 'utf8', function(err){
		if (err) return callback(err);
		callback(null)
	});
};