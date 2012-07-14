var SJS = require('./sjs.js');

var userDB = new SJS('/test/db/user.db');
var fileDB = new SJS('/test/db/file.db');

console.log(userDB.path);
console.log(fileDB.path);

userDB.path = '/test/storage.db';
console.log(userDB.path);

userDB.read();
userDB.save();

fileDB.read();
fileDB.save();