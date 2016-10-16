require('core-js/shim');

var fs = require('fs');
var path = require('path');

var progeny = require('progeny');

var CssReloader = function (options) {
  var opts = options || {};

  this.jspmPrefix = opts.jspmPrefix || /^(jspm:)/;
  this.npmPrefix = opts.npmPrefix || /^(~|npm:)/;
  this.nodeModulesDir = opts.nodeModulesDir || 'node_modules';
  this.supportsRegExp = /\.(scss|sass|less|styl|css)$/;
  this.handleAddEvent = opts.handleAddEvent === undefined ? true : opts.handleAddEvent;
  this.handleChangeEvent = opts.handleChangeEvent === undefined ? true : opts.handleChangeEvent;
  this.handleRemoveEvent = opts.handleRemoveEvent === undefined ? true : opts.handleRemoveEvent;
  this.filterNoExport = opts.filterNoExport === undefined ? true : opts.filterNoExport;
  this.reloadsFilter = opts.reloadsFilter || false;
  this.rootPath = opts.rootPath || '.';
  this.progenyOptions = opts.progenyOptions || {};
  this.jspmRootDir = opts.jspmRootDir || this.rootPath;
  this.jspmPackagesDir = opts.jspmPackagesDir || path.join(this.jspmRootDir, 'jspm_packages');
  this.jspmConfigFile = opts.jspmConfigFile || path.join(this.jspmRootDir, 'jspm.config.js');
  this.systemPath = opts.systemPath || path.join(this.jspmPackagesDir, 'system.js');
  this.debug = opts.debug || false;

  if (!opts.loader
    && !(global.SystemJS && global.SystemJS.import)
    && !(global.System && global.System.import)
  ) {
    this.loadSystemJS();
  }

  this.loader = opts.loader || global.SystemJS || global.System;

  this.entries = {};
};

CssReloader.prototype.loadSystemJS = function () {
  require(path.resolve(this.systemPath));
  require(path.resolve(this.jspmConfigFile));
};

CssReloader.prototype.supports = function (data) {
  return data.path.match(this.supportsRegExp);
};

CssReloader.prototype.processEvent = function (data) {
  if (this.handleAddEvent && data.event === 'add') {
    return this.addFile(data.path);
  }

  if (this.handleChangeEvent && data.event === 'change') {
    return this.changeFile(data.path);
  }

  if (this.handleRemoveEvent && data.event === 'unlink') {
    return this.removeFile(data.path);
  }

  return Promise.resolve([]);
};

CssReloader.prototype.addFile = function (filename) {
  return this.changeFile(filename);
};

CssReloader.prototype.removeFile = function (filename) {
  return Promise.resolve()
    .then(function () {
      var oldEntry = this.removeEntry(filename);
      return oldEntry ? oldEntry.importers : [];
    }.bind(this));
};

CssReloader.prototype.changeFile = function (filename) {
  var oldImporters;
  var wasAdded;

  return Promise.resolve()
    .then(function () {
      var oldEntry = this.removeEntry(filename, true);
      wasAdded = !oldEntry;
      oldImporters = oldEntry ? oldEntry.importers : [];
    }.bind(this))
    .then(function () {
      return this.readFile(filename);
    }.bind(this))
    .then(function (source) {
      return this.getFileDeps(filename, source);
    }.bind(this))
    .then(function (deps) {
      var entry = this.addEntry(filename, deps, oldImporters);
      if (wasAdded) {
        return []; // do not reload on initial add
      }
      var reloads = [filename].concat(entry.importers);
      return this.filterReloads(reloads);
    }.bind(this));
};

CssReloader.prototype.filterReloads = function (reloads) {
  if (!this.filterNoExport) {
    return reloads;
  }

  if (this.reloadsFilter) {
    return reloads.filter(this.reloadsFilter);
  }

  return reloads.filter(function (name) {
    // sass/scss files with underscore in name don't have exports
    // so there are no reasons to reload them
    return !(name.match(/\.(scss|sass)$/) && path.basename(name).startsWith('_'));
  });
};

CssReloader.prototype.getEntry = function (name) {
  if (!this.entries[name]) {
    this.entries[name] = {
      name: name,
      dependencies: [],
      importers: [],
    };
  }
  return this.entries[name];
};

CssReloader.prototype.hasEntry = function (name) {
  return !!this.entries[name];
};

CssReloader.prototype.removeEntry = function (name, keepImporters) {
  if (!this.hasEntry(name)) {
    return undefined;
  }

  var entry = this.getEntry(name);

  entry.dependencies.forEach(function (depName) {
    if (!this.hasEntry(depName)) {
      return;
    }
    var depEntry = this.getEntry(depName);
    var entryIndex = depEntry.importers.indexOf(name);
    if (entryIndex !== -1) {
      depEntry.importers.splice(entryIndex, 1);
    }
  }.bind(this));

  if (!keepImporters) {
    entry.importers.forEach(function (impName) {
      if (!this.hasEntry(impName)) {
        return;
      }
      var impEntry = this.getEntry(impName);
      var entryIndex = impEntry.dependencies.indexOf(name);
      if (entryIndex !== -1) {
        impEntry.dependencies.splice(entryIndex, 1);
      }
    }.bind(this));
  }

  delete this.entries[name];

  return entry;
};

CssReloader.prototype.addEntry = function (name, deps, imps) {
  var entry = this.getEntry(name);

  entry.dependencies = deps || entry.dependencies;
  entry.importers = imps || entry.importers;

  entry.dependencies.forEach(function (depName) {
    var depEntry = this.getEntry(depName);
    if (depEntry.importers.indexOf(name) === -1) {
      depEntry.importers.push(name);
    }
  }.bind(this));

  entry.importers.forEach(function (impName) {
    var impEntry = this.getEntry(impName);
    if (impEntry.dependencies.indexOf(name) === -1) {
      impEntry.dependencies.push(name);
    }
  }.bind(this));

  return entry;
};

CssReloader.prototype.readFile = function (filename) {
  return new Promise(function (resolve, reject) {
    fs.readFile(filename, 'utf8', function (error, source) {
      if (error) {
        reject(error);
      } else {
        resolve(source);
      }
    });
  });
};

CssReloader.prototype.shiftPrefix = function (prefix, filename) {
  if (prefix === null || prefix === undefined || prefix === false || prefix === '') {
    return false;
  }

  if (typeof prefix === 'string') {
    return filename.startsWith(filename) ? filename.substr(prefix.length) : false;
  }

  if (prefix instanceof RegExp) {
    var match = filename.match(prefix);
    return match ? filename.substr(match[0].length) : false;
  }

  throw new Error('Invalid prefix: ' + prefix);
};

CssReloader.prototype.urlToPath = function (url) {
  var filename = url.replace(/^file:\/\//, '');     // remove url prefix
  if (path.sep === '\\') {
    filename = filename.replace(/\//g, path.sep);   // fix separators
  }
  return filename;
};

CssReloader.prototype.resolveJspmPath = function (jspmPath) {
  return this.urlToPath(this.loader.normalizeSync(jspmPath));
};

CssReloader.prototype.resolveNpmPath = function (npmPath) {
  return path.resolve(this.rootPath, this.nodeModulesDir, npmPath);
};

CssReloader.prototype.progenyResolver = function (filename, parent) {
  var newPath;

  var jspmPath = this.shiftPrefix(this.jspmPrefix, filename);
  if (jspmPath) {
    newPath = path.relative(parent, this.resolveJspmPath(jspmPath));
  } else {
    var npmPath = this.shiftPrefix(this.npmPrefix, filename);
    if (npmPath) {
      newPath = path.relative(parent, this.resolveNpmPath(npmPath));
    } else {
      newPath = filename;
    }
  }

  if (this.debug) {
    console.log('Resolution: (' + parent + ') ' + filename + ' -> ' + newPath);
  }

  return newPath;
};

CssReloader.prototype.getFileDeps = function (filename, source) {
  var progenyOptions = Object.assign({}, this.progenyOptions, {
    resolver: this.progenyResolver.bind(this),
  });

  var getDeps = progeny(progenyOptions);

  return new Promise(function (resolve, reject) {
    getDeps(filename, source, function (error, deps) {
      if (error) {
        reject(error);
      } else {
        resolve(deps);
      }
    });
  });
};

module.exports = CssReloader;
