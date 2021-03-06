/// <reference path="../../defs/tsd.d.ts"/>
// Source based on : https://github.com/tschaub/grunt-newer/blob/master/lib/util.js
var fs = require('fs');
var _ = require('underscore');
var path = require('path');
var crypto = require('crypto');
var grunt = require('grunt');

//////////////////////
//  Basic algo:
//        - We have a timestamp file per target.
//        - We use the mtime of this file to filter out
//              new files for this target
//        - Finally we can update the timestamp file with new time
/////////////////////
var cacheDir = '.tscache';

//////////////////////////////
// File stamp based filtering
//////////////////////////////
function getStampPath(targetName) {
    return path.join(cacheDir, targetName, 'timestamp');
}

function getLastSuccessfullCompile(targetName) {
    var stampFile = getStampPath(targetName);
    try  {
        return fs.statSync(stampFile).mtime;
    } catch (err) {
        // task has never succeeded before
        return new Date(0);
    }
}

function getFilesNewerThan(paths, time) {
    var filtered = _.filter(paths, function (path) {
        var stats = fs.statSync(path);
        return stats.mtime > time;
    });
    return filtered;
}

function anyNewerThan(paths, time) {
    return getFilesNewerThan(paths, time).length > 0;
}
exports.anyNewerThan = anyNewerThan;

function filterPathsByTime(paths, targetName) {
    var time = getLastSuccessfullCompile(targetName);
    return getFilesNewerThan(paths, time);
}
exports.filterPathsByTime = filterPathsByTime;
;

//////////////////////////////
// File hash based filtering
//////////////////////////////
/**
* Get path to cached file hash for a target.
* @return {string} Path to hash.
*/
function getHashPath(filePath, targetName) {
    var hashedName = crypto.createHash('md5').update(filePath).digest('hex');
    return path.join(cacheDir, targetName, 'hashes', hashedName);
}
;

/**
* Get an existing hash for a file (if it exists).
*/
function getExistingHash(filePath, targetName) {
    var hashPath = getHashPath(filePath, targetName);
    var exists = fs.existsSync(hashPath);
    if (!exists) {
        return null;
    }
    return fs.readFileSync(hashPath).toString();
}
;

/**
* Generate a hash (md5sum) of a file contents.
* @param {string} filePath Path to file.
*/
function generateFileHash(filePath) {
    var md5sum = crypto.createHash('md5');
    var data = fs.readFileSync(filePath);
    md5sum.update(data);
    return md5sum.digest('hex');
}
;

/**
* Filter files based on hashed contents.
* @param {Array.<string>} paths List of paths to files.
* @param {string} cacheDir Cache directory.
* @param {string} taskName Task name.
* @param {string} targetName Target name.
* @param {function(Error, Array.<string>)} callback Callback called with any
*     error and a filtered list of files that only includes files with hashes
*     that are different than the cached hashes for the same files.
*/
function filterPathsByHash(filePaths, targetName) {
    var filtered = _.filter(filePaths, function (filePath) {
        var previous = getExistingHash(filePath, targetName);
        var current = generateFileHash(filePath);
        return previous !== current;
    });

    return filtered;
}
;

function updateHashes(filePaths, targetName) {
    _.forEach(filePaths, function (filePath) {
        var hashPath = getHashPath(filePath, targetName);
        var hash = generateFileHash(filePath);
        grunt.file.write(hashPath, hash);
    });
}

//////////////////////////////
// External functions
//////////////////////////////
/**
* Filter a list of files by target
*/
function getNewFilesForTarget(paths, targetName) {
    var step1 = exports.filterPathsByTime(paths, targetName);
    var step2 = filterPathsByHash(step1, targetName);

    return step2;
}
exports.getNewFilesForTarget = getNewFilesForTarget;
;

/**
* Update the timestamp for a target to denote last successful compile
*/
function compileSuccessfull(paths, targetName) {
    // update timestamp
    grunt.file.write(getStampPath(targetName), '');

    // update filehash
    updateHashes(paths, targetName);
}
exports.compileSuccessfull = compileSuccessfull;
//# sourceMappingURL=cacheUtils.js.map
