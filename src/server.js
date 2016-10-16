var fs = require('fs');
var path = require('path');

var CssReloader = require('./css-reloader');

var PLUGIN_FULL_NAME = 'SystemJS Hot Reloader';
var PLUGIN_SHORT_NAME = 'SystemJS';

module.exports['plugin'] = function (opts, bs) {
  var logger = bs.getLogger(PLUGIN_SHORT_NAME);
  var clients = bs.io.of(bs.options.getIn(['socket', 'namespace']));

  var cssReloader = opts.cssReloader !== false
    ? new CssReloader(opts.cssReloader)
    : false;

  bs.events.on('file:changed', function (data) {
    if (data.namespace !== PLUGIN_FULL_NAME) {
      return;
    }

    if (cssReloader && cssReloader.supports(data)) {
      cssReloader.processEvent(data)
        .then(function (reloads) {
          var actionMap = { add: 'added', change: 'changed', unlink: 'removed' };
          var action = actionMap[data.event];

          logger.info('{cyan:File %s: {magenta:%s', action, data.path);

          if (reloads.length) {
            reloads.forEach(function (file) {
              logger.info('{cyan:Reload file: {magenta:%s', file);
              clients.emit('system:reload', { path: file });
            });
          }
        })
        .catch(function (error) {
          setTimeout(function () { throw error; });
        });
    } else {
      if (data.event === 'change') {  // eslint-disable-line
        logger.info('{cyan:Reload file: {magenta:%s', data.path);
        clients.emit('system:reload', { path: data.path });
      }
    }
  });
};

module.exports['plugin:name'] = PLUGIN_FULL_NAME;

module.exports['hooks'] = {
  'client:js': fs.readFileSync(path.join(__dirname, 'client.js'), 'utf-8'),
};
