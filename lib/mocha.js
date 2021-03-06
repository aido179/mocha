'use strict';

/*!
 * mocha
 * Copyright(c) 2011 TJ Holowaychuk <tj@vision-media.ca>
 * MIT Licensed
 */

var escapeRe = require('escape-string-regexp');
var path = require('path');
var builtinReporters = require('./reporters');
var utils = require('./utils');

exports = module.exports = Mocha;

/**
 * To require local UIs and reporters when running in node.
 */

if (!process.browser) {
  var cwd = process.cwd();
  module.paths.push(cwd, path.join(cwd, 'node_modules'));
}

/**
 * Expose internals.
 */

/**
 * @public
 * @class utils
 * @memberof Mocha
 */
exports.utils = utils;
exports.interfaces = require('./interfaces');
/**
 * @public
 * @memberof Mocha
 */
exports.reporters = builtinReporters;
exports.Runnable = require('./runnable');
exports.Context = require('./context');
/**
 *
 * @memberof Mocha
 */
exports.Runner = require('./runner');
exports.Suite = require('./suite');
exports.Hook = require('./hook');
exports.Test = require('./test');

/**
 * Returns Growl image `name` path.
 *
 * @private
 * @param {string} name - Basename of associated Growl image.
 * @return {string} Pathname to Growl image
 */
function image(name) {
  return path.join(__dirname, '..', 'assets', 'growl', name + '.png');
}

/**
 * Constructs a new Mocha instance with `options`.
 *
 * @public
 * @class Mocha
 * @param {Object} [options] - Settings object.
 * @param {boolean} [options.allowUncaught] - Propagate uncaught errors?
 * @param {boolean} [options.asyncOnly] - Force `done` callback or promise?
 * @param {boolean} [options.bail] - Bail after first test failure?
 * @param {boolean} [options.delay] - Delay root suite execution?
 * @param {boolean} [options.enableTimeouts] - Enable timeouts?
 * @param {string} [options.fgrep] - Test filter given string.
 * @param {boolean} [options.forbidOnly] - Tests marked `only` fail the suite?
 * @param {boolean} [options.forbidPending] - Pending tests fail the suite?
 * @param {boolean} [options.fullStackTrace] - Full stacktrace upon failure?
 * @param {string[]} [options.globals] - Variables expected in global scope.
 * @param {RegExp|string} [options.grep] - Test filter given regular expression.
 * @param {boolean} [options.growl] - Enable desktop notifications?
 * @param {boolean} [options.hideDiff] - Suppress diffs from failures?
 * @param {boolean} [options.ignoreLeaks] - Ignore global leaks?
 * @param {boolean} [options.invert] - Invert test filter matches?
 * @param {boolean} [options.noHighlighting] - Disable syntax highlighting?
 * @param {string} [options.reporter] - Reporter name.
 * @param {Object} [options.reporterOptions] - Reporter settings object.
 * @param {number} [options.retries] - Number of times to retry failed tests.
 * @param {number} [options.slow] - Slow threshold value.
 * @param {number|string} [options.timeout] - Timeout threshold value.
 * @param {string} [options.ui] - Interface name.
 * @param {boolean} [options.useColors] - Color TTY output from reporter?
 * @param {boolean} [options.useInlineDiffs] - Use inline diffs?
 */
function Mocha(options) {
  options = options || {};
  this.files = [];
  this.options = options;
  if (options.grep) {
    this.grep(new RegExp(options.grep));
  }
  if (options.fgrep) {
    this.fgrep(options.fgrep);
  }
  this.suite = new exports.Suite('', new exports.Context());
  this.ui(options.ui);
  this.bail(options.bail);
  this.reporter(options.reporter, options.reporterOptions);
  if (typeof options.timeout !== 'undefined' && options.timeout !== null) {
    this.timeout(options.timeout);
  }
  if (typeof options.retries !== 'undefined' && options.retries !== null) {
    this.retries(options.retries);
  }
  this.useColors(options.useColors);
  if (options.enableTimeouts !== null) {
    this.enableTimeouts(options.enableTimeouts);
  }
  if (options.slow) {
    this.slow(options.slow);
  }
}

/**
 * Enables or disables bailing on the first failure.
 *
 * @public
 * @see {@link https://mochajs.org/#-b---bail|CLI option}
 * @param {boolean} [bail=true] - Whether to bail on first error.
 * @returns {Mocha} this
 * @chainable
 */
Mocha.prototype.bail = function(bail) {
  if (!arguments.length) {
    bail = true;
  }
  this.suite.bail(bail);
  return this;
};

/**
 * @summary
 * Adds `file` to be loaded for execution.
 *
 * @description
 * Useful for generic setup code that must be included within test suite.
 *
 * @public
 * @see {@link https://mochajs.org/#--file-file|CLI option}
 * @param {string} file - Pathname of file to be loaded.
 * @returns {Mocha} this
 * @chainable
 */
Mocha.prototype.addFile = function(file) {
  this.files.push(file);
  return this;
};

/**
 * Sets reporter to `reporter`, defaults to "spec".
 *
 * @public
 * @see {@link https://mochajs.org/#-r---reporter-name|CLI option}
 * @see {@link https://mochajs.org/#reporters|Reporters}
 * @param {String|Function} reporter - Reporter name or constructor.
 * @param {Object} [reporterOptions] - Options used to configure the reporter.
 * @returns {Mocha} this
 * @chainable
 * @throws {Error} if requested reporter cannot be loaded
 * @example
 *
 * // Use XUnit reporter and direct its output to file
 * mocha.reporter('xunit', { output: '/path/to/testspec.xunit.xml' });
 */
Mocha.prototype.reporter = function(reporter, reporterOptions) {
  if (typeof reporter === 'function') {
    this._reporter = reporter;
  } else {
    reporter = reporter || 'spec';
    var _reporter;
    // Try to load a built-in reporter.
    if (builtinReporters[reporter]) {
      _reporter = builtinReporters[reporter];
    }
    // Try to load reporters from process.cwd() and node_modules
    if (!_reporter) {
      try {
        _reporter = require(reporter);
      } catch (err) {
        if (
          err.message.indexOf("Cannot find module '" + reporter + "'") !== -1
        ) {
          // Try to load reporters from a path (absolute or relative)
          try {
            _reporter = require(path.resolve(process.cwd(), reporter));
          } catch (_err) {
            err.message.indexOf("Cannot find module '" + reporter + "'") !== -1
              ? console.warn('"' + reporter + '" reporter not found')
              : console.warn(
                  '"' +
                    reporter +
                    '" reporter blew up with error:\n' +
                    err.stack
                );
          }
        } else if (err.message.indexOf("Cannot find module 'mocha'") !== -1) {
          console.warn(
            'Mocha could not be found from within the reporter package.'
          );
        } else {
          console.warn(
            '"' + reporter + '" reporter blew up with error:\n' + err.stack
          );
        }
      }
    }
    if (!_reporter && reporter === 'teamcity') {
      console.warn(
        'The Teamcity reporter was moved to a package named ' +
          'mocha-teamcity-reporter ' +
          '(https://npmjs.org/package/mocha-teamcity-reporter).'
      );
    }
    if (!_reporter) {
      throw new Error('invalid reporter "' + reporter + '"');
    }
    this._reporter = _reporter;
  }
  this.options.reporterOptions = reporterOptions;
  return this;
};

/**
 * Sets test UI `name`, defaults to "bdd".
 *
 * @public
 * @see {@link https://mochajs.org/#-u---ui-name|CLI option}
 * @see {@link https://mochajs.org/#interfaces|Interface DSLs}
 * @param {string} [name=bdd] - Interface name.
 * @returns {Mocha} this
 * @chainable
 * @throws {Error} if requested interface cannot be loaded
 */
Mocha.prototype.ui = function(name) {
  name = name || 'bdd';
  this._ui = exports.interfaces[name];
  if (!this._ui) {
    try {
      this._ui = require(name);
    } catch (err) {
      throw new Error('invalid interface "' + name + '"');
    }
  }
  this._ui = this._ui(this.suite);

  this.suite.on('pre-require', function(context) {
    exports.afterEach = context.afterEach || context.teardown;
    exports.after = context.after || context.suiteTeardown;
    exports.beforeEach = context.beforeEach || context.setup;
    exports.before = context.before || context.suiteSetup;
    exports.describe = context.describe || context.suite;
    exports.it = context.it || context.test;
    exports.xit = context.xit || context.test.skip;
    exports.setup = context.setup || context.beforeEach;
    exports.suiteSetup = context.suiteSetup || context.before;
    exports.suiteTeardown = context.suiteTeardown || context.after;
    exports.suite = context.suite || context.describe;
    exports.teardown = context.teardown || context.afterEach;
    exports.test = context.test || context.it;
    exports.run = context.run;
  });

  return this;
};

/**
 * @summary
 * Loads `files` prior to execution.
 *
 * @description
 * The implementation relies on Node's `require` to execute
 * the test interface functions and will be subject to its cache.
 *
 * @private
 * @see {@link Mocha#addFile}
 * @param {Function} [fn] - Callback invoked upon completion.
 */
Mocha.prototype.loadFiles = function(fn) {
  var self = this;
  var suite = this.suite;
  this.files.forEach(function(file) {
    file = path.resolve(file);
    suite.emit('pre-require', global, file, self);
    suite.emit('require', require(file), file, self);
    suite.emit('post-require', global, file, self);
  });
  fn && fn();
};

/**
 * Implements desktop notifications using a pseudo-reporter.
 *
 * @private
 * @see {@link Mocha#growl}
 * @param {Object} runner - Runner instance.
 * @param {Object} reporter - Reporter instance.
 */
Mocha.prototype._growl = function(runner, reporter) {
  var notify = require('growl');

  runner.on('end', function() {
    var stats = reporter.stats;
    if (stats.failures) {
      var msg = stats.failures + ' of ' + runner.total + ' tests failed';
      notify(msg, {name: 'mocha', title: 'Failed', image: image('error')});
    } else {
      notify(stats.passes + ' tests passed in ' + stats.duration + 'ms', {
        name: 'mocha',
        title: 'Passed',
        image: image('ok')
      });
    }
  });
};

/**
 * Sets `grep` filter after escaping RegExp special characters.
 *
 * @public
 * @see {@link Mocha#grep}
 * @param {string} str - Value to be converted to a regexp.
 * @returns {Mocha} this
 * @chainable
 * @example
 *
 * // Select tests whose full title begins with `"foo"` followed by a period
 * mocha.fgrep('foo.');
 */
Mocha.prototype.fgrep = function(str) {
  return this.grep(new RegExp(escapeRe(str)));
};

/**
 * @summary
 * Sets `grep` filter used to select specific tests for execution.
 *
 * @description
 * If `re` is a regexp-like string, it will be converted to regexp.
 * The regexp is tested against the full title of each test (i.e., the
 * name of the test preceded by titles of each its ancestral suites).
 * As such, using an <em>exact-match</em> fixed pattern against the
 * test name itself will not yield any matches.
 * <br>
 * <strong>Previous filter value will be overwritten on each call!</strong>
 *
 * @public
 * @see {@link https://mochajs.org/#-g---grep-pattern|CLI option}
 * @see {@link Mocha#fgrep}
 * @see {@link Mocha#invert}
 * @param {RegExp|String} re - Regular expression used to select tests.
 * @return {Mocha} this
 * @chainable
 * @example
 *
 * // Select tests whose full title contains `"match"`, ignoring case
 * mocha.grep(/match/i);
 * @example
 *
 * // Same as above but with regexp-like string argument
 * mocha.grep('/match/i');
 * @example
 *
 * // ## Anti-example
 * // Given embedded test `it('only-this-test')`...
 * mocha.grep('/^only-this-test$/');    // NO! Use `.only()` to do this!
 */
Mocha.prototype.grep = function(re) {
  if (utils.isString(re)) {
    // extract args if it's regex-like, i.e: [string, pattern, flag]
    var arg = re.match(/^\/(.*)\/(g|i|)$|.*/);
    this.options.grep = new RegExp(arg[1] || arg[0], arg[2]);
  } else {
    this.options.grep = re;
  }
  return this;
};

/**
 * Inverts `grep` matches.
 *
 * @public
 * @see {@link Mocha#grep}
 * @return {Mocha} this
 * @chainable
 * @example
 *
 * // Select tests whose full title does *not* contain `"match"`, ignoring case
 * mocha.grep(/match/i).invert();
 */
Mocha.prototype.invert = function() {
  this.options.invert = true;
  return this;
};

/**
 * Enables or disables ignoring global leaks.
 *
 * @public
 * @see {@link Mocha#checkLeaks}
 * @param {boolean} ignoreLeaks - Whether to ignore global leaks.
 * @return {Mocha} this
 * @chainable
 * @example
 *
 * // Ignore global leaks
 * mocha.ignoreLeaks(true);
 */
Mocha.prototype.ignoreLeaks = function(ignoreLeaks) {
  this.options.ignoreLeaks = Boolean(ignoreLeaks);
  return this;
};

/**
 * Enables checking for global variables leaked while running tests.
 *
 * @public
 * @see {@link https://mochajs.org/#--check-leaks|CLI option}
 * @see {@link Mocha#ignoreLeaks}
 * @return {Mocha} this
 * @chainable
 */
Mocha.prototype.checkLeaks = function() {
  this.options.ignoreLeaks = false;
  return this;
};

/**
 * Displays full stack trace upon test failure.
 *
 * @public
 * @return {Mocha} this
 * @chainable
 */
Mocha.prototype.fullTrace = function() {
  this.options.fullStackTrace = true;
  return this;
};

/**
 * Enables desktop notification support.
 *
 * @public
 * @see {@link Mocha#_growl}
 * @return {Mocha} this
 * @chainable
 */
Mocha.prototype.growl = function() {
  this.options.growl = true;
  return this;
};

/**
 * Specifies whitelist of variable names to be expected in global scope.
 *
 * @public
 * @see {@link https://mochajs.org/#--globals-names|CLI option}
 * @see {@link Mocha#checkLeaks}
 * @param {String[]|String} globals - Accepted global variable name(s).
 * @return {Mocha} this
 * @chainable
 * @example
 *
 * // Specify variables to be expected in global scope
 * mocha.globals(['jQuery', 'MyLib']);
 */
Mocha.prototype.globals = function(globals) {
  this.options.globals = (this.options.globals || []).concat(globals);
  return this;
};

/**
 * Enables or disables TTY color output by screen-oriented reporters.
 *
 * @public
 * @param {boolean} colors - Whether to enable color output.
 * @return {Mocha} this
 * @chainable
 */
Mocha.prototype.useColors = function(colors) {
  if (colors !== undefined) {
    this.options.useColors = colors;
  }
  return this;
};

/**
 * Determines if reporter should use inline diffs (rather than +/-)
 * in test failure output.
 *
 * @public
 * @param {boolean} inlineDiffs - Whether to use inline diffs.
 * @return {Mocha} this
 * @chainable
 */
Mocha.prototype.useInlineDiffs = function(inlineDiffs) {
  this.options.useInlineDiffs = inlineDiffs !== undefined && inlineDiffs;
  return this;
};

/**
 * Determines if reporter should include diffs in test failure output.
 *
 * @public
 * @param {boolean} hideDiff - Whether to hide diffs.
 * @return {Mocha} this
 * @chainable
 */
Mocha.prototype.hideDiff = function(hideDiff) {
  this.options.hideDiff = hideDiff !== undefined && hideDiff;
  return this;
};

/**
 * @summary
 * Sets timeout threshold value.
 *
 * @description
 * A string argument can use shorthand (such as "2s") and will be converted.
 * If the value is `0`, timeouts will be disabled.
 *
 * @public
 * @see {@link https://mochajs.org/#-t---timeout-ms|CLI option}
 * @see {@link https://mochajs.org/#--no-timeouts|CLI option}
 * @see {@link https://mochajs.org/#timeouts|Timeouts}
 * @see {@link Mocha#enableTimeouts}
 * @param {number|string} msecs - Timeout threshold value.
 * @return {Mocha} this
 * @chainable
 * @example
 *
 * // Sets timeout to one second
 * mocha.timeout(1000);
 * @example
 *
 * // Same as above but using string argument
 * mocha.timeout('1s');
 */
Mocha.prototype.timeout = function(msecs) {
  this.suite.timeout(msecs);
  return this;
};

/**
 * Sets the number of times to retry failed tests.
 *
 * @public
 * @see {@link https://mochajs.org/#retry-tests|Retry Tests}
 * @param {number} retry - Number of times to retry failed tests.
 * @return {Mocha} this
 * @chainable
 * @example
 *
 * // Allow any failed test to retry one more time
 * mocha.retries(1);
 */
Mocha.prototype.retries = function(n) {
  this.suite.retries(n);
  return this;
};

/**
 * Sets slowness threshold value.
 *
 * @public
 * @see {@link https://mochajs.org/#-s---slow-ms|CLI option}
 * @param {number} msecs - Slowness threshold value.
 * @return {Mocha} this
 * @chainable
 * @example
 *
 * // Sets "slow" threshold to half a second
 * mocha.slow(500);
 * @example
 *
 * // Same as above but using string argument
 * mocha.slow('0.5s');
 */
Mocha.prototype.slow = function(msecs) {
  this.suite.slow(msecs);
  return this;
};

/**
 * Enables or disables timeouts.
 *
 * @public
 * @see {@link https://mochajs.org/#-t---timeout-ms|CLI option}
 * @see {@link https://mochajs.org/#--no-timeouts|CLI option}
 * @param {boolean} enableTimeouts - Whether to enable timeouts.
 * @return {Mocha} this
 * @chainable
 */
Mocha.prototype.enableTimeouts = function(enableTimeouts) {
  this.suite.enableTimeouts(
    arguments.length && enableTimeouts !== undefined ? enableTimeouts : true
  );
  return this;
};

/**
 * Forces all tests to either accept a `done` callback or return a promise.
 *
 * @public
 * @return {Mocha} this
 * @chainable
 */
Mocha.prototype.asyncOnly = function() {
  this.options.asyncOnly = true;
  return this;
};

/**
 * Disables syntax highlighting (in browser).
 *
 * @public
 * @return {Mocha} this
 * @chainable
 */
Mocha.prototype.noHighlighting = function() {
  this.options.noHighlighting = true;
  return this;
};

/**
 * Enables uncaught errors to propagate (in browser).
 *
 * @public
 * @return {Mocha} this
 * @chainable
 */
Mocha.prototype.allowUncaught = function() {
  this.options.allowUncaught = true;
  return this;
};

/**
 * @summary
 * Delays root suite execution.
 *
 * @description
 * Used to perform asynch operations before any suites are run.
 *
 * @public
 * @see {@link https://mochajs.org/#delayed-root-suite|delayed root suite}
 * @returns {Mocha} this
 * @chainable
 */
Mocha.prototype.delay = function delay() {
  this.options.delay = true;
  return this;
};

/**
 * Causes tests marked `only` to fail the suite.
 *
 * @public
 * @returns {Mocha} this
 * @chainable
 */
Mocha.prototype.forbidOnly = function() {
  this.options.forbidOnly = true;
  return this;
};

/**
 * Causes pending tests and tests marked `skip` to fail the suite.
 *
 * @public
 * @returns {Mocha} this
 * @chainable
 */
Mocha.prototype.forbidPending = function() {
  this.options.forbidPending = true;
  return this;
};

/**
 * Mocha version as specified by "package.json".
 *
 * @name Mocha#version
 * @type string
 * @readonly
 */
Object.defineProperty(Mocha.prototype, 'version', {
  value: require('../package').version,
  configurable: false,
  enumerable: true,
  writable: false
});

/**
 * Callback to be invoked when test execution is complete.
 *
 * @callback DoneCB
 * @param {number} failures - Number of failures that occurred.
 */

/**
 * @summary
 * Runs tests and invokes `fn()` when complete.
 *
 * @description
 * To run tests multiple times (or to run tests in files that are
 * already in the `require` cache), make sure to clear them from
 * the cache first!
 *
 * @public
 * @see {@link Mocha#loadFiles}
 * @see {@link Runner#run}
 * @param {DoneCB} [fn] - Callback invoked when test execution completed.
 * @return {Runner} runner instance
 */
Mocha.prototype.run = function(fn) {
  if (this.files.length) {
    this.loadFiles();
  }
  var suite = this.suite;
  var options = this.options;
  options.files = this.files;
  var runner = new exports.Runner(suite, options.delay);
  var reporter = new this._reporter(runner, options);
  runner.ignoreLeaks = options.ignoreLeaks !== false;
  runner.fullStackTrace = options.fullStackTrace;
  runner.asyncOnly = options.asyncOnly;
  runner.allowUncaught = options.allowUncaught;
  runner.forbidOnly = options.forbidOnly;
  runner.forbidPending = options.forbidPending;
  if (options.grep) {
    runner.grep(options.grep, options.invert);
  }
  if (options.globals) {
    runner.globals(options.globals);
  }
  if (options.growl) {
    this._growl(runner, reporter);
  }
  if (options.useColors !== undefined) {
    exports.reporters.Base.useColors = options.useColors;
  }
  exports.reporters.Base.inlineDiffs = options.useInlineDiffs;
  exports.reporters.Base.hideDiff = options.hideDiff;

  function done(failures) {
    if (reporter.done) {
      reporter.done(failures, fn);
    } else {
      fn && fn(failures);
    }
  }

  return runner.run(done);
};
