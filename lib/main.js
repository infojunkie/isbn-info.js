#!/usr/bin/env node
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.parseInput = parseInput;
exports.addIsbnIfNotThere = addIsbnIfNotThere;
exports.formatBook = formatBook;

var _nodeIsbn = _interopRequireDefault(require("node-isbn"));

var _minimist = _interopRequireDefault(require("minimist"));

var _isbnUtils = _interopRequireDefault(require("isbn-utils"));

var _path = _interopRequireDefault(require("path"));

var _sanitizeFilename = _interopRequireDefault(require("sanitize-filename"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var argv = (0, _minimist["default"])(process.argv.slice(2), {
  string: '_',
  "boolean": 'q'
});
var OPTIONS = argv;
var FORMAT = argv['f'] || '%A - %T (%Y) %I';
var QUIET = argv['q'] || false;
OPTIONS['_'].forEach(function (input) {
  var isbn = parseInput(input, OPTIONS);

  if (!isbn) {
    if (!QUIET) console.error('Error: Not a valid ISBN', input);
    process.exit(1);
  }

  _nodeIsbn["default"].provider(['google']).resolve(isbn.codes.source, function (err, book) {
    if (err) {
      if (!QUIET) console.error('Failed to query', input, 'with error:', err);
      process.exit(1);
    } else {
      var output = formatBook(input, addIsbnIfNotThere(isbn, book), FORMAT, OPTIONS);
      if (output) console.log(output);else process.exit(1);
    }
  });
});

function parseInput(input, options) {
  // extract isbn from input
  var filename = _path["default"].basename(input, _path["default"].extname(input)).replace('-', '');

  var isbn = filename.match(/\d{13}|\d{10}|\d{9}X/i); // ignore invalid ISBN strings

  return _isbnUtils["default"].parse(isbn);
}

function addIsbnIfNotThere(isbn, book) {
  var b = Object.assign({}, book);
  [{
    type: 'ISBN_10',
    identifier: function identifier() {
      return isbn.asIsbn10();
    }
  }, {
    type: 'ISBN_13',
    identifier: function identifier() {
      return isbn.asIsbn13();
    }
  }].forEach(function (i) {
    if (!book.industryIdentifiers.filter(function (id) {
      return id.type === i.type;
    }).length) {
      b.industryIdentifiers.push({
        type: i.type,
        identifier: i.identifier()
      });
    }
  });
  return b;
}

function sanitizeFilename(title) {
  var sanitized = (0, _sanitizeFilename["default"])(title, {
    replacement: ' '
  }).trim().replace(/(["\s'$`\\])/g, '\\$1');
  if (sanitized.length < 255) return sanitized;
  return "".concat(sanitized.slice(0, 127), "\u2026").concat(sanitized.slice(-127));
}

function formatBook(input, book, format, options) {
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
          if (!QUIET) console.error('Warning: pattern', pattern, 'empty for', input);
          return 'Unknown';
        }

        return field;
      } catch (e) {
        if (e instanceof TypeError) {
          if (!QUIET) console.error('Warning: pattern', pattern, 'broke for', input);
          return 'Unknown';
        } else {
          throw e;
        }
      }
    });
  }, format); // discard empty result

  var empty = new RegExp(Object.keys(replacements).join('|'), 'gi');
  if (result === format.replace(empty, 'Unknown')) return null; // sanitize result by removing bad filename characters and escaping terminal characters

  return options['s'] ? sanitizeFilename(result) : result;
}