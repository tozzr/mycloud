var assert = require('assert');
var sync = require('../lib/sync.js');


var dbList = {"/test.txt":{type: 'file', filetime: 1, version: 0}};
var fsList = {"/test.txt":{type: 'file', filetime: 1, version: 0}};
	
sync.syncLists(dbList, fsList, function(list) {
	assert.deepEqual(dbList, list, 'list are not equal');
});
