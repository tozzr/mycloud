var fs = require('fs');

module.exports = function (path) {
	this.path = path;
	
	this.read = function () {
		console.log('read ' + this.path);
	};
	this.save = function () {
		console.log('read ' + this.path);
	};
};