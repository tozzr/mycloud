var fs = require('fs');
var utils = require('../utils');

exports.form = function(req, res) {
	var dir = utils.dirFromParam(req.query['dir']);
	res.render('upload', { title: 'myCloud form', dir: dir });
};
