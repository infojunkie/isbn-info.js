#!/usr/bin/env node
"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isbnFormat = isbnFormat;

var _regenerator = _interopRequireDefault(require("@babel/runtime/regenerator"));

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

var _nodeIsbn = _interopRequireDefault(require("node-isbn"));

var _isbn = _interopRequireDefault(require("isbn3"));

var _path = _interopRequireDefault(require("path"));

var _meow = _interopRequireDefault(require("meow"));

// https://stackoverflow.com/a/54577682/209184
function isMochaRunning(context) {
  return ['afterEach', 'after', 'beforeEach', 'before', 'describe', 'it'].every(function (functionName) {
    return context[functionName] instanceof Function;
  });
}

if (!isMochaRunning(global)) {
  var DEFAULT_FORMAT = '%A - %T (%Y) %I';
  var OPTIONS = (0, _meow["default"])("\n    Usage: ".concat(_path["default"].basename(process.argv[1]), " <isbn>\n\n    Options:\n      -f, --format=FORMAT       output format for book information\n                                  %I0 for ISBN-10\n                                  %I3 for ISBN-13\n                                  %IS for ISSN\n                                  %I for ISBN-13 or ISBN-10, whichever comes first\n                                  %T for title + subtitle\n                                  %Y for publication date\n                                  %A for author(s)\n                                  %D for description\n                                  %P for publisher\n                                  %J for raw JSON\n                                  default is \"").concat(DEFAULT_FORMAT, "\"\n      -s, --sanitize            sanitize the output as a valid filename\n      -q, --quiet               quiet mode: don't output errors\n      -h, --help                show usage information\n      -v, --version             show version information\n    "), {
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

  if (OPTIONS.flags['help'] || !OPTIONS.input.length) {
    OPTIONS.showHelp();
  }

  (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee() {
    var output;
    return _regenerator["default"].wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            _context.prev = 0;
            _context.next = 3;
            return isbnInfo(OPTIONS.input[0], OPTIONS);

          case 3:
            output = _context.sent;
            console.log(output);
            _context.next = 11;
            break;

          case 7:
            _context.prev = 7;
            _context.t0 = _context["catch"](0);

            if (!OPTIONS.flags['quiet']) {
              console.error(_context.t0.message);
            }

            process.exit(1);

          case 11:
          case "end":
            return _context.stop();
        }
      }
    }, _callee, null, [[0, 7]]);
  }))();
}

function isbnFormat(_x, _x2) {
  return _isbnFormat.apply(this, arguments);
}

function _isbnFormat() {
  _isbnFormat = (0, _asyncToGenerator2["default"])( /*#__PURE__*/_regenerator["default"].mark(function _callee2(input, OPTIONS) {
    return _regenerator["default"].wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            return _context2.abrupt("return", new Promise(function (resolve, reject) {
              var isbn = parseInput(input);

              if (!isbn) {
                reject(new Error("Not a valid ISBN: ".concat(input)));
              } else {
                _nodeIsbn["default"].resolve(isbn.source, function (err, book) {
                  if (err) {
                    reject(new Error("Failed to query ".concat(input, " with error: ").concat(err)));
                  } else {
                    try {
                      resolve(formatBook(input, addIsbnIfNotThere(isbn, book), OPTIONS));
                    } catch (e) {
                      reject(e);
                    }
                  }
                });
              }
            }));

          case 1:
          case "end":
            return _context2.stop();
        }
      }
    }, _callee2);
  }));
  return _isbnFormat.apply(this, arguments);
}

function parseInput(input) {
  // Extract ISBN from input.
  var filename = _path["default"].basename(input, _path["default"].extname(input)).replace('-', '');

  var isbn = filename.match(/\d{13}|\d{10}|\d{9}X/i); // Ignore invalid ISBN strings.

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

function formatBook(input, book, OPTIONS) {
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
          if (!OPTIONS.flags['quiet']) console.warn("Pattern ".concat(pattern, " empty for ").concat(input));
          return 'Unknown';
        }

        return field;
      } catch (e) {
        if (e instanceof TypeError) {
          if (!OPTIONS.flags['quiet']) console.warn("Pattern ".concat(pattern, " broke for ").concat(input));
          return 'Unknown';
        } else {
          throw e;
        }
      }
    });
  }, OPTIONS.flags['format']); // Discard empty result.

  var empty = new RegExp(Object.keys(replacements).join('|'), 'gi');
  if (result === OPTIONS.flags['format'].replace(empty, 'Unknown')) return null;
  return OPTIONS.flags['sanitize'] ? sanitizeFilename(result + _path["default"].extname(input)) : result;
}