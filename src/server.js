var fs = require('fs');
var path = require('path');

var CssReloader = require('./css-reloader');

var PLUGIN_FULL_NAME = 'SystemJS Hot Reloader';
var PLUGIN_SHORT_NAME = 'SystemJS';

module.exports['plugin'] = function (opts, bs) {
  var logger = bs.getLogger(PLUGIN_SHORT_NAME);
  var clients = bs.io.of(bs.options.getIn(['socket', 'namespace']));

  function resolveFile(filename, sourceFilename) { // eslint-disable-line
    if (!opts.resolver) {
      return filename;
    }
    var newFilename = opts.resolver(filename);
    if (newFilename === false) {
      return false;
    }
    if (newFilename === true || newFilename === undefined) {
      return filename;
    }
    return newFilename;
  }

  function reloadFile(filename) {
    var newFilename = resolveFile(filename);
    if (newFilename !== false) {
      logger.info('{cyan:Reload file: {magenta:%s', newFilename);
      clients.emit('system:reload', { path: newFilename });
    } else {
      logger.info('{cyan:Skip file: {magenta:%s', newFilename);
    }
  }

  var cssReloader = opts.cssReloader !== false
    ? new CssReloader(opts.cssReloader)
    : false;

  var actionLabelMap = { add: 'added', change: 'changed', unlink: 'removed' };

  bs.events.on('file:changed', function (data) {
    if (data.namespace !== PLUGIN_FULL_NAME) {
      return;
    }

    var action = actionLabelMap[data.event];

    if (cssReloader && cssReloader.supports(data)) {
      logger.info('{cyan:File %s: {magenta:%s', action, data.path);
      cssReloader.processEvent(data)
        .then(function (reloads) {
          reloads.forEach(function (filename) {
            reloadFile(filename, data.path);
          });
        })
        .catch(function (error) {
          setTimeout(function () { throw error; });
        });
    } else if (data.event === 'change') {
      logger.info('{cyan:File %s: {magenta:%s', action, data.path);
      reloadFile(data.path, data.path);
    }
  });
};

module.exports['plugin:name'] = PLUGIN_FULL_NAME;

module.exports['hooks'] = {
  'client:js': fs.readFileSync(path.join(__dirname, 'client.js'), 'utf-8'),
};
