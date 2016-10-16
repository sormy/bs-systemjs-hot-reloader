/* global window */

(function (window, bs) {
  var socket = bs.socket;

  socket.on('system:reload', function (data) {
    var loader = window.SystemJS || window.System;

    if (!loader) {
      throw new Error('BrowserSync SystemJS Hot Reloader: unable to find SystemJS');
    }

    loader.import('systemjs-hot-reloader-ex')
      .catch(function (error) {
        console.error('BrowserSync SystemJS Hot Reloader: unable to load module "systemjs-hot-reloader-ex"');
        console.error(error.stack || error);
      })
      .then(function (exports) {
        var reloader = exports.default;
        reloader.reloadPath(data.path);
      });
  });
})(window, window.___browserSync___);
