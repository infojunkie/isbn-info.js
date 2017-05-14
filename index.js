var isbnApi = require('node-isbn');
var argv = require('minimist')(process.argv.slice(2), { string: '_', boolean: 'q' });
var isbnInfo = require('isbn').ISBN;
var path = require('path');

const FORMAT = argv['f'] || '%A - (%Y) %T';

argv['_'].forEach(function(input) {

  const isbn = parseInput(input);
  if (!isbn) {
    if (!argv['q']) console.error('Error: Not a valid ISBN', input);
    return;
  }

  isbnApi.resolve(isbn, function(err, book) {
    if (err) {
      if (!argv['q']) console.error(err);
    }
    else {
      console.log(formatBook(book, FORMAT));
    }
  });

});

function parseInput(input) {
  // extract isbn from input
  const isbn = path.basename(input, path.extname(input));

  // ignore non ISBN strings
  return isbnInfo.parse(isbn) ? isbn : null;
}

function formatBook(book, format) {
  const replacements = {
    '%T': function(book) { return book.title; },
    '%Y': function(book) { return book.publishedDate.match(/\d{4}/); },
    '%A': function(book) { return book.authors.join(', '); },
    '%JSON': function(book) { return JSON.stringify(book, null, '\t'); }
  }
  return Object.keys(replacements).reduce(function(result, pattern) {
    const regex = new RegExp(pattern, 'gi');
    return result.replace(regex, function() {
      try {
        return replacements[pattern](book);
      }
      catch (e) {
        if (e instanceof TypeError) {
          if (!argv['q']) console.error('Warning: pattern', pattern, 'broke for', book);
          return '';
        }
        else {
          throw e;
        }
      }
    });
  }, format);
}

exports.parseInput = parseInput;
exports.formatBook = formatBook;
