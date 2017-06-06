#!/usr/bin/env node
var isbnApi = require('node-isbn');
var argv = require('minimist')(process.argv.slice(2), { string: '_', boolean: 'q' });
var isbnInfo = require('isbn').ISBN;
var path = require('path');
var sanitize = require('sanitize-filename');

const OPTIONS = argv;
const FORMAT = argv['f'] || '%A - (%Y) %T';

OPTIONS['_'].forEach(input => {

  const isbn = parseInput(input, OPTIONS);
  if (!isbn) {
    if (!OPTIONS['q']) console.error('Error: Not a valid ISBN', input);
    process.exit(1);
  }
  isbnApi.resolve(isbn.codes.source, function(err, book) {
    if (err) {
      if (!OPTIONS['q']) console.error(err);
      process.exit(1);
    }
    else {
      const output = formatBook(addIsbnIfNotThere(isbn, book), FORMAT, OPTIONS);
      if (output) console.log(output); else process.exit(1);
    }
  });

});

export function parseInput(input, options) {
  // extract isbn from input
  const filename = path.basename(input, path.extname(input)).replace('-', '');
  const isbn = filename.match(/\d{13}|\d{10}|\d{9}X/);

  // ignore invalid ISBN strings
  return isbnInfo.parse(isbn);
}

export function addIsbnIfNotThere(isbn, book) {
  let b = Object.assign({}, book);

  [
    { type: 'ISBN_10', identifier: () => isbn.asIsbn10() },
    { type: 'ISBN_13', identifier: () => isbn.asIsbn13() }
  ].forEach(i => {
    if (!book.industryIdentifiers.filter(id => id.type === i.type).length) {
      b.industryIdentifiers.push({ type: i.type, identifier: i.identifier() });
    }
  });

  return b;
}

export function formatBook(book, format, options) {
  // https://developers.google.com/books/docs/v1/reference/volumes
  const replacements = {
    '%I0': book => book.industryIdentifiers.filter(id => id.type === 'ISBN_10')[0].identifier,
    '%I3': book => book.industryIdentifiers.filter(id => id.type === 'ISBN_13')[0].identifier,
    '%IS': book => book.industryIdentifiers.filter(id => id.type === 'ISSN')[0].identifier,
    '%T': book => [].concat(book.title, book.subtitle).filter(v => v).join(' - '),
    '%Y': book => book.publishedDate.match(/\d{4}/)[0],
    '%A': book => book.authors.join(', '),
    '%D': book => book.description,
    '%P': book => book.publisher,
    '%J': book => JSON.stringify(book, null, '\t')
  }
  const result = Object.keys(replacements).reduce((result, pattern) => {
    const regex = new RegExp(pattern, 'gi');
    return result.replace(regex, function() {
      try {
        const field = replacements[pattern](book);
        if (!field) {
          if (!options['q']) console.error('Warning: pattern', pattern, 'empty for', book);
          return '';
        }
        return options['s'] ? sanitize(field, { replacement: ' ' }).trim() : field;
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
  const empty = new RegExp(Object.keys(replacements).join('|'), 'gi');
  if (result === format.replace(empty, '')) return null;
  return result;
}
