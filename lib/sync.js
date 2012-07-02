exports.syncLists = function (dbList, fsList, callback) {
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
				dbList[path].version = incrementVersion(dbList[path]);
			}
			
			dbList[path].filetime = fsList[path].filetime;
			dbList[path].size = fsList[path].size;
			delete fsList[path];
		}
	}
	
	for (path in fsList) {
		if (path.indexOf('/') == 0 && dbList[path] === undefined) {
			dbList[path] = fsList[path];
		}
	}

	callback(dbList);
};

var incrementVersion = function (listEntry) {
	return parseInt(listEntry.version) + 1;
};