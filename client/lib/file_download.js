var http = require('http');
var fs = require('fs');

exports.get = function (config, filepath, callback) {
	console.log(filepath);
	var get_options = {
		host: config.host,
		port: config.port,
		path: '/files' + encodeURI(filepath),
		method: 'GET',
		headers : {
			'Cookie' : config.cookie
		}
    };
	
	var request = http.request(get_options, function(response) {
		var downloadfile = fs.createWriteStream(config.basepath + filepath);
		
		response.setEncoding('binary');
		response.on('data', function(chunk){
			downloadfile.write(chunk, encoding='binary');
		});
		response.on('end', function() {
			downloadfile.end();
			callback(null);
		});
	});
	request.end();
};
