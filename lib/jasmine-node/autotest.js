var walkdir = require('walkdir');
var collection = require('./spec-collection');
var path = require('path');
var fs = require('fs');
var child_process = require('child_process');
var gaze = require('gaze');
var _ = require('underscore');

var baseArgv = [];

for(var i = 0; i < process.argv.length; i++) {
    if(process.argv[i] !== '--autotest') {
        baseArgv.push(process.argv[i]);
    }
}

var run_external = function(command, args, callback) {
    var child = child_process.spawn(command, args);
    child.stdout.on('data', function(data) {
        process.stdout.write(data);
    });
    child.stderr.on('data', function(data) {
        process.stderr.write(data);
    });
    if(typeof callback == 'function') {
        child.on('exit', callback);
    }
}

var run_everything = function() {
    // run the suite when it starts
    var argv = [].concat(baseArgv);
    run_external(argv.shift(), argv);
}

var last_run_succesful = true;

exports.start = function(loadpath, pattern) {

    // If loadpath is just a single file, we should just watch that file
    stats = fs.statSync(loadpath);
    if (stats.isFile()) {
      console.log(loadpath);
      pattern = loadpath;
    }

    changedFunc = function(event, file) {
      console.log(file + ' was changed');

      var match = path.basename(file, path.extname(file)) + ".*";
      match = match.replace(new RegExp("spec", "i"), "");

      var argv = [].concat(baseArgv, ["--match", match]);
      run_external(argv.shift(), argv, function(code) {
          // run everything if we fixed some bugs
          if(code == 0) {
              if(!last_run_succesful) {
                  run_everything();
              }
              last_run_succesful = true;
          } else {
              last_run_succesful = false;
          }
      });
    }

    // Vim seems to change a file multiple times, with non-scientific testing
    // the only time we didn't duplicate the call to onChanged was at 2.5s
    // Passing true to have onChanged run on the leading edge of the timeout
    var onChanged = _.debounce(changedFunc, 2500, true);

    gaze(pattern, function(err, watcher) {
      // Get all watched files
      console.log("Watching for changes");

      // On file changed
      this.on('all', onChanged);
    });

    run_everything();
}
