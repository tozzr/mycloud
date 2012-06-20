var http = require('http');
var fs = require('fs');

exports.get = function (config, filepath, callback) {
	var get_options = {
		host: config.host,
		port: config.port,
		path: '/files' + filepath,
		method: 'GET',
		headers : {
			'Cookie' : config.cookie
		}
    };
	
	var request = http.request(get_options, function(response) {
		var downloadfile = fs.createWriteStream(config.basepath + filepath);
		downloadfile.on('close', function (){
			console.log('file stream closed');
			callback(null);
		});
		response.setEncoding('binary');
		response.on('data', function(chunk){
			downloadfile.write(chunk, encoding='binary');
		});
		response.on('end', function() {
			downloadfile.end();
		});
	});
	request.end();
};
