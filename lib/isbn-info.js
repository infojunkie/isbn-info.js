#!/usr/bin/env node
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.parseInput = parseInput;
exports.addIsbnIfNotThere = addIsbnIfNotThere;
exports.formatBook = formatBook;

var _nodeIsbn = _interopRequireDefault(require("node-isbn"));

var _isbn = _interopRequireDefault(require("isbn3"));

var _path = _interopRequireDefault(require("path"));

var _meow = _interopRequireDefault(require("meow"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var DEFAULT_FORMAT = "%A - %T (%Y) %I";
var OPTIONS = (0, _meow["default"])("\n  Usage: ".concat(_path["default"].basename(process.argv[1]), " <isbn>\n\n  Options:\n    -f, --format=FORMAT       output format for book information\n                                %I0 for ISBN-10\n                                %I3 for ISBN-13\n                                %IS for ISSN\n                                %I for ISBN-13 or ISBN-10, whichever comes first\n                                %T for title + subtitle\n                                %Y for publication date\n                                %A for author(s)\n                                %D for description\n                                %P for publisher\n                                %J for raw JSON\n                                default is \"").concat(DEFAULT_FORMAT, "\"\n    -s, --sanitize            sanitize the output as a valid filename\n    -q, --quiet               quiet mode: don't output errors\n    -h, --help                show usage information\n    -v, --version             show version information\n  "), {
  flags: {
    format: {
      type: 'string',
      alias: 'f',
      "default": DEFAULT_FORMAT
    },
    sanitize: {
      type: 'boolean',
      alias: 's',
      "default": false
    },
    quiet: {
      type: 'boolean',
      alias: 'q',
      "default": false
    },
    help: {
      type: 'boolean',
      alias: 'h'
    },
    version: {
      type: 'boolean',
      alias: 'v'
    }
  }
});
var QUIET = OPTIONS.flags['quiet'];
var FORMAT = OPTIONS.flags['format'];
var SANITIZE = OPTIONS.flags['sanitize']; // https://stackoverflow.com/a/54577682/209184

function isMochaRunning(context) {
  return ['afterEach', 'after', 'beforeEach', 'before', 'describe', 'it'].every(function (functionName) {
    return context[functionName] instanceof Function;
  });
}

if (OPTIONS.flags['help'] || !OPTIONS.input.length && !isMochaRunning(global)) {
  OPTIONS.showHelp();
}

OPTIONS.input.slice(0, 1).forEach(function (input) {
  var isbn = parseInput(input);

  if (!isbn) {
    if (!QUIET) console.error("Not a valid ISBN: ".concat(input));
    process.exit(1);
  }

  _nodeIsbn["default"].resolve(isbn.source, function (err, book) {
    if (err) {
      if (!QUIET) console.error("Failed to query ".concat(input, " with error: ").concat(err));
      process.exit(1);
    } else {
      var output = formatBook(input, addIsbnIfNotThere(isbn, book), FORMAT, QUIET, SANITIZE);
      if (output) console.log(output);else process.exit(1);
    }
  });
});

function parseInput(input) {
  // extract isbn from input
  var filename = _path["default"].basename(input, _path["default"].extname(input)).replace('-', '');

  var isbn = filename.match(/\d{13}|\d{10}|\d{9}X/i); // ignore invalid ISBN strings

  return isbn ? _isbn["default"].parse(isbn[0]) : null;
}

function addIsbnIfNotThere(isbn, book) {
  if (!book.industryIdentifiers) {
    book.industryIdentifiers = [];
  }

  [{
    type: 'ISBN_10',
    identifier: function identifier() {
      return isbn.isbn10;
    }
  }, {
    type: 'ISBN_13',
    identifier: function identifier() {
      return isbn.isbn13;
    }
  }].forEach(function (i) {
    if (!book.industryIdentifiers.filter(function (id) {
      return id.type === i.type;
    }).length) {
      book.industryIdentifiers.push({
        type: i.type,
        identifier: i.identifier()
      });
    }
  });
  return book;
}

function sanitizeFilename(title) {
  // Unicode-aware string length because filesystems expect 255 _bytes_.
  var ellipsis = '…';
  var truncation = (255 - Buffer.byteLength(ellipsis)) / 2 >> 0;
  var truncated = Buffer.byteLength(title) <= 255 ? title : "".concat(title.slice(0, truncation)).concat(ellipsis).concat(title.slice(-truncation)); // Copied from https://github.com/parshap/node-sanitize-filename because we do our own truncation.

  var illegalRe = /[\/\?<>\\:\*\|"]/g;
  var controlRe = /[\x00-\x1f\x80-\x9f]/g;
  var reservedRe = /^\.+$/;
  var windowsReservedRe = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(\..*)?$/i;
  var windowsTrailingRe = /[\. ]+$/;
  var replacement = ' ';
  return truncated.replace(illegalRe, replacement).replace(controlRe, replacement).replace(reservedRe, replacement).replace(windowsReservedRe, replacement).replace(windowsTrailingRe, replacement).trim();
}

function formatBook(input, book, format, quiet, sanitize) {
  // https://developers.google.com/books/docs/v1/reference/volumes
  var replacements = {
    '%I0': function I0(book) {
      return book.industryIdentifiers.filter(function (id) {
        return id.type === 'ISBN_10';
      })[0].identifier;
    },
    '%I3': function I3(book) {
      return book.industryIdentifiers.filter(function (id) {
        return id.type === 'ISBN_13';
      })[0].identifier;
    },
    '%IS': function IS(book) {
      return book.industryIdentifiers.filter(function (id) {
        return id.type === 'ISSN';
      })[0].identifier;
    },
    '%I': function I(book) {
      return book.industryIdentifiers.filter(function (id) {
        return id.type === 'ISBN_13' || id.type === 'ISBN_10';
      })[0].identifier;
    },
    '%T': function T(book) {
      return [].concat(book.title, book.subtitle).filter(function (v) {
        return v;
      }).join('. ').replace(/[\r\n\s]+/g, ' ');
    },
    '%Y': function Y(book) {
      return book.publishedDate.match(/\d{4}/)[0];
    },
    '%A': function A(book) {
      return book.authors.join(', ');
    },
    '%D': function D(book) {
      return book.description;
    },
    '%P': function P(book) {
      return book.publisher;
    },
    '%J': function J(book) {
      return JSON.stringify(book, null, '\t');
    }
  };
  var result = Object.keys(replacements).reduce(function (result, pattern) {
    var regex = new RegExp(pattern, 'gi');
    return result.replace(regex, function () {
      try {
        var field = replacements[pattern](book);

        if (!field) {
          if (!quiet) console.error('Pattern', pattern, 'empty for', input);
          return 'Unknown';
        }

        return field;
      } catch (e) {
        if (e instanceof TypeError) {
          if (!quiet) console.error('Pattern', pattern, 'broke for', input);
          return 'Unknown';
        } else {
          throw e;
        }
      }
    });
  }, format); // discard empty result

  var empty = new RegExp(Object.keys(replacements).join('|'), 'gi');
  if (result === format.replace(empty, 'Unknown')) return null;
  return sanitize ? sanitizeFilename(result + _path["default"].extname(input)) : result;
}