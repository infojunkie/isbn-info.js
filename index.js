var isbnApi = require('node-isbn');
var argv = require('minimist')(process.argv.slice(2), { string: '_', boolean: 's' });
var isbnInfo = require('isbn').ISBN;
var path = require('path');

let format = argv['f'] || '%A - (%Y) %T';

argv['_'].forEach(function(input) {

  const isbn = parseInput(input);
  if (!isbn) {
    if (!argv['s']) console.error('Error: Not a valid ISBN', isbn);
    return;
  }

  isbnApi.resolve(isbn, function(err, book) {
    if (err) {
      if (!argv['s']) console.error(err);
    }
    else {
      console.log(formatBook(book));
    }
  });

});

function parseInput(input) {
  // extract isbn from input
  const isbn = path.basename(input, path.extname(input));

  // ignore non ISBN strings
  return isbnInfo.parse(isbn) ? isbn : null;
}

function formatBook(book) {
  const replacements = {
    '%T': book.title || '<no title>',
    '%Y': book.publishedDate.match(/\d{4}/) || '<no date>',
    '%A': book.authors.join(', ') || '<no author>'
  }
  return Object.keys(replacements).reduce(function(result, pattern) {
    const regex = new RegExp(pattern, 'gi');
    return result.replace(regex, replacements[pattern]);
  }, format);
}

exports.parseInput = parseInput;
exports.formatBook = formatBook;
