#!/usr/bin/env node
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.parseInput = parseInput;
exports.addIsbnIfNotThere = addIsbnIfNotThere;
exports.formatBook = formatBook;

var isbnApi = require('node-isbn');
var argv = require('minimist')(process.argv.slice(2), { string: '_', boolean: 'q' });
var isbnInfo = require('isbn').ISBN;
var path = require('path');
var sanitize = require('sanitize-filename');

var OPTIONS = argv;
var FORMAT = argv['f'] || '%A - (%Y) %T';

OPTIONS['_'].forEach(function (input) {

  var isbn = parseInput(input, OPTIONS);
  if (!isbn) {
    if (!OPTIONS['q']) console.error('Error: Not a valid ISBN', input);
    process.exit(1);
  }
  isbnApi.resolve(isbn.codes.source, function (err, book) {
    if (err) {
      if (!OPTIONS['q']) console.error(err);
      process.exit(1);
    } else {
      var output = formatBook(addIsbnIfNotThere(isbn, book), FORMAT, OPTIONS);
      if (output) console.log(output);else process.exit(1);
    }
  });
});

function parseInput(input, options) {
  // extract isbn from input
  var isbn = path.basename(input, path.extname(input)).replace('-', '');

  // ignore invalid ISBN strings
  return isbnInfo.parse(isbn);
}

function addIsbnIfNotThere(isbn, book) {
  var b = Object.assign({}, book);
  if (!b.industryIdentifiers.filter(function (id) {
    return id.type === 'ISBN_10';
  }).length) {
    b.industryIdentifiers.push({ type: 'ISBN_10', identifier: isbn.asIsbn10() });
  }
  if (!b.industryIdentifiers.filter(function (id) {
    return id.type === 'ISBN_13';
  }).length) {
    b.industryIdentifiers.push({ type: 'ISBN_13', identifier: isbn.asIsbn13() });
  }
  return b;
}

function formatBook(book, format, options) {
  // https://developers.google.com/books/docs/v1/reference/volumes
  var replacements = {
    '%I10': function I10(book) {
      return book.industryIdentifiers.filter(function (id) {
        return id.type === 'ISBN_10';
      })[0].identifier;
    },
    '%I13': function I13(book) {
      return book.industryIdentifiers.filter(function (id) {
        return id.type === 'ISBN_13';
      })[0].identifier;
    },
    '%IS': function IS(book) {
      return book.industryIdentifiers.filter(function (id) {
        return id.type === 'ISSN';
      })[0].identifier;
    },
    '%T': function T(book) {
      return [].concat(book.title, book.subtitle).filter(function (v) {
        return v;
      }).join(' - ');
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
          if (!options['q']) console.error('Warning: pattern', pattern, 'empty for', book);
          return '';
        }
        return options['s'] ? sanitize(field, { replacement: ' ' }).trim() : field;
      } catch (e) {
        if (e instanceof TypeError) {
          if (!options['q']) console.error('Warning: pattern', pattern, 'broke for', book);
          return '';
        } else {
          throw e;
        }
      }
    });
  }, format);

  // discard empty result
  var empty = new RegExp(Object.keys(replacements).join('|'), 'gi');
  if (result === format.replace(empty, '')) return null;
  return result;
}
