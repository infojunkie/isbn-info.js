#!/usr/bin/env node
var isbnApi = require('node-isbn');
var argv = require('minimist')(process.argv.slice(2), { string: '_', boolean: 'q' });
var isbnInfo = require('isbn').ISBN;
var path = require('path');

const OPTIONS = argv;
const FORMAT = argv['f'] || '%A - (%Y) %T';

OPTIONS['_'].forEach(input => {

  const isbn = parseInput(input, OPTIONS);
  if (!isbn) {
    if (!OPTIONS['q']) console.error('Error: Not a valid ISBN', input);
    return;
  }

  isbnApi.resolve(isbn, function(err, book) {
    if (err) {
      if (!OPTIONS['q']) console.error(err);
    }
    else {
      console.log(formatBook(book, FORMAT, OPTIONS));
    }
  });

});

export function parseInput(input, options) {
  // extract isbn from input
  const isbn = path.basename(input, path.extname(input)).replace('-', '');

  // ignore non ISBN strings
  return isbnInfo.parse(isbn) ? isbn : null;
}

export function formatBook(book, format, options) {
  const replacements = {
    '%T': (book) => book.title,
    '%Y': (book) => book.publishedDate.match(/\d{4}/),
    '%A': (book) => book.authors.join(', '),
    '%J': (book) => JSON.stringify(book, null, '\t')
  }
  const result = Object.keys(replacements).reduce((result, pattern) => {
    const regex = new RegExp(pattern, 'gi');
    return result.replace(regex, function() {
      try {
        const field = replacements[pattern](book);
        if (!field && !options['q']) console.error('Warning: pattern', pattern, 'empty for', book);
        return field || '';
      }
      catch (e) {
        if (e instanceof TypeError) {
          if (!options['q']) console.error('Warning: pattern', pattern, 'broke for', book);
          return '';
        }
        else {
          throw e;
        }
      }
    });
  }, format);

  // discard empty result
  if (result === format.replace(/%./g, '')) return null;
  return result;
}
