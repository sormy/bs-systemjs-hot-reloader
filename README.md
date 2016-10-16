# BrowserSync SystemJS Hot Reloader #

## Features ##

* BrowserSync plugin to watch file for changes and deliver events to
  SystemJS Hot Reloader
* JavaScript / CSS hot reload (if css plugin supports reload)
* Integrated CSS dependency tracker (SASS, SCSS, LESS, Stylus, CSS, PostCSS etc)
  based on `progeny` library
* Resolves JSPM and NPM virtual paths in CSS imports
* Designed to be used together with `BrowserSync`, `JSPM`, `SystemJS` and
  `github:sormy/systemjs-hot-reloader`

## Installation ##

```shell
npm install bs-systemjs-hot-reloader --save-dev
```

## Usage ##

This example will hot reload `*.scss` and `*.jsx` and will do full reload for
`index.html` and `jspm.config.js`.

```javascript
var browserSync = require('browser-sync');
var bsSystemHotReloader = require('bs-systemjs-hot-reloader');

var bs = browserSync.create();

bs.watch([
  'index.html',
  'jspm.config.js'
]).on('change', bs.reload);

bs.use(bsSystemHotReloader, {
  files: [
    'src/**/*.scss',
    'src/**/*.jsx',
  ]
});

bs.init({
  server: '.',
  online: false,
  open: false,
  reloadOnRestart: true
});
```

## Options ##

* `files` - standard BrowserSync plugin option to enable watch for changes
* `cssReloader` - css reloader options, pass `false` to disable
  * `loader` - instance of SystemJS, default to `SystemJS` or `System`
  * `jspmPrefix` - JSPM prefix RegExp which could be used in CSS files to refer
    relative to JSPM imports, default to `jspm:`
  * `npmPrefix`- NPM prefix RegExp which could be used in CSS files to refer
    relative to NPM imports, default to `jspm:`
  * `nodeModulesDir` - `node_modules` path, default to `node_modules`
  * `supportsRegExp` - RegExp for supported filenames, default to
    `/\.(scss|sass|less|styl|css)$/`
  * `handleAddEvent` - enable add event handling, default to `true`
  * `handleChangeEvent` - enable change event handling, default to `true`
  * `handleRemoveEvent` - enable remove event handling, default to `true`
  * `filterNoExport` - enable filter reloads (for `_*.scss`), default to `true`
  * `reloadsFilter` - custom reloads filter function, default to `undefined`
  * `rootPath` - project root folder (where `node_modules` and `jspm_packages`),
    default to current work directory
  * `progenyOptions` - progeny options, default to `{}`
  * `jspmRootDir` - set JSPM root directory, default to `rootPath`
  * `jspmPackagesDir` - set path to `jspm_packages`, default to `./jspm_packages`
  * `jspmConfigFile` - set path to system/jspm config, default to `./jspm.config.js`
  * `systemPath` - set path to SystemJS library, default to
    `./jspm_packages/system.js`
  * `debug` - enable debug mode, default to `false`