var http = require('http');
var fs = require('fs');
var mime = require('mime');

var utils = require('./utils.js');

function encodeFieldPart(boundary,name,value) {
    var return_part = "--" + boundary + "\r\n";
    return_part += "Content-Disposition: form-data; name=\"" + name + "\"\r\n\r\n";
    return_part += value + "\r\n";
    return return_part;
}

function encodeFilePart(boundary,type,name,filename) {
    var return_part = "--" + boundary + "\r\n";
    return_part += "Content-Disposition: form-data; name=\"" + name + "\"; filename=\"" + filename + "\"\r\n";
    return_part += "Content-Type: " + type + "\r\n\r\n";
    return return_part;
}

function makePost(config, filepath, post_data, boundary, callback) {
  var length = 0;

  for(var i = 0; i < post_data.length; i++) {
    length += post_data[i].length;
  }

  var post_options = {
    host: config.host,
    port: config.port,
    path: '/files' + utils.parentdirFromPath(filepath),
    method: 'POST',
    headers : {
        'Content-Type' : 'multipart/form-data; boundary=' + boundary,
        'Content-Length' : length,
		'Cookie' : config.cookie
    }
  };

  var post_request = http.request(post_options, function(response){
    response.setEncoding('binary');
    response.on('data', function(chunk){
      console.log('post file request: ' + chunk);
    });
	response.on('end', function() {
		callback(null);
	});
  });

  for (var i = 0; i < post_data.length; i++) {
    post_request.write(post_data[i]);
  }
  post_request.end();
}

exports.post = function (config, filepath, filetime, callback) {
  var boundary = Math.random();
  var post_data = [];

  post_data.push(new Buffer(encodeFieldPart(boundary, 'filetime', filetime), 'ascii'));
  post_data.push(new Buffer(encodeFilePart(boundary, 'application/octet-stream', 'uploadfile', filepath), 'ascii'));

  var file_reader = fs.createReadStream(config.basepath + filepath, {encoding: 'binary'});
  var file_contents = '';
  file_reader.on('data', function(data){
    file_contents += data;
  });
  file_reader.on('end', function(){
    post_data.push(new Buffer(file_contents, 'binary'))
    post_data.push(new Buffer("\r\n--" + boundary + "--\r\n"), 'ascii');

    makePost(config, filepath, post_data, boundary, callback);
  });
}