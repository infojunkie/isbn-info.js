#!/usr/bin/env node
import isbnApi from 'node-isbn';
import minimist from 'minimist';
import isbnParser from 'isbn-utils';
import path from 'path';
import sanitize from 'sanitize-filename';

const argv = minimist(process.argv.slice(2), { string: '_', boolean: 'q' });
const OPTIONS = argv;
const FORMAT = argv['f'] || '%A - %T (%Y) %I';
const QUIET = argv['q'] || false;

OPTIONS['_'].forEach(input => {
  const isbn = parseInput(input, OPTIONS);
  if (!isbn) {
    if (!QUIET) console.error('Error: Not a valid ISBN', input);
    process.exit(1);
  }
  isbnApi.provider(['google']).resolve(isbn.codes.source, function(err, book) {
    if (err) {
      if (!QUIET) console.error('Failed to query', input, 'with error:', err);
      process.exit(1);
    }
    else {
      const output = formatBook(input, addIsbnIfNotThere(isbn, book), FORMAT, OPTIONS);
      if (output) console.log(output); else process.exit(1);
    }
  });
});

export function parseInput(input, options) {
  // extract isbn from input
  const filename = path.basename(input, path.extname(input)).replace('-', '');
  const isbn = filename.match(/\d{13}|\d{10}|\d{9}X/i);

  // ignore invalid ISBN strings
  return isbnParser.parse(isbn);
}

export function addIsbnIfNotThere(isbn, book) {
  const  b = Object.assign({}, book);

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

function sanitizeFilename(title) {
  const sanitized = sanitize(title, { replacement: ' ' }).trim().replace(/(["\s'$`\\])/g,'\\$1');
  if (sanitized.length < 255) return sanitized;
  return `${sanitized.slice(0, 127)}…${sanitized.slice(-127)}`;
}

export function formatBook(input, book, format, options) {
  // https://developers.google.com/books/docs/v1/reference/volumes
  const replacements = {
    '%I0': book => book.industryIdentifiers.filter(id => id.type === 'ISBN_10')[0].identifier,
    '%I3': book => book.industryIdentifiers.filter(id => id.type === 'ISBN_13')[0].identifier,
    '%IS': book => book.industryIdentifiers.filter(id => id.type === 'ISSN')[0].identifier,
    '%I': book => book.industryIdentifiers.filter(id => id.type === 'ISBN_13' || id.type === 'ISBN_10')[0].identifier,
    '%T': book => [].concat(book.title, book.subtitle).filter(v => v).join('. ').replace(/[\r\n\s]+/g, ' '),
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
          if (!QUIET) console.error('Warning: pattern', pattern, 'empty for', input);
          return 'Unknown';
        }
        return field;
      }
      catch (e) {
        if (e instanceof TypeError) {
          if (!QUIET) console.error('Warning: pattern', pattern, 'broke for', input);
          return 'Unknown';
        }
        else {
          throw e;
        }
      }
    });
  }, format);

  // discard empty result
  const empty = new RegExp(Object.keys(replacements).join('|'), 'gi');
  if (result === format.replace(empty, 'Unknown')) return null;

  // sanitize result by removing bad filename characters and escaping terminal characters
  return options['s'] ? sanitizeFilename(result) : result;
}
