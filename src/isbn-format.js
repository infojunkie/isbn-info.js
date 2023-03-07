#!/usr/bin/env node
import isbnApi from 'node-isbn';
import isbn3 from 'isbn3';
import path from 'path';
import meow from 'meow';

// https://stackoverflow.com/a/54577682/209184
function isMochaRunning(context) {
  return ['afterEach','after','beforeEach','before','describe','it'].every(function(functionName) {
    return context[functionName] instanceof Function;
  });
}

if (!isMochaRunning(global)) {
  const DEFAULT_FORMAT = '%A - %T (%Y) %I';
  const OPTIONS = meow(`
    Usage: ${path.basename(process.argv[1])} <isbn>

    Options:
      -f, --format=FORMAT       output format for book information
                                  %I0 for ISBN-10
                                  %I3 for ISBN-13
                                  %IS for ISSN
                                  %I for ISBN-13 or ISBN-10, whichever comes first
                                  %T for title + subtitle
                                  %Y for publication date
                                  %A for author(s)
                                  %D for description
                                  %P for publisher
                                  %J for raw JSON
                                  default is "${DEFAULT_FORMAT}"
      -s, --sanitize            sanitize the output as a valid filename
      -q, --quiet               quiet mode: don't output errors
      -h, --help                show usage information
      -v, --version             show version information
    `, {
      description: 'Identify a book by its ISBN and output formatted metadata.',
      importMeta: import.meta,
      flags: {
        format: {
          type: 'string',
          alias: 'f',
          default: DEFAULT_FORMAT
        },
        sanitize: {
          type: 'boolean',
          alias: 's',
          default: false
        },
        quiet: {
          type: 'boolean',
          alias: 'q',
          default: false
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
    }
  );

  if (OPTIONS.flags['help'] || !OPTIONS.input.length) {
    OPTIONS.showHelp();
  }

  (async () => {
    try {
      const output = await isbnFormat(OPTIONS.input[0], OPTIONS);
      console.log(output);
    } catch (e) {
      if (!OPTIONS.flags['quiet']) {
        console.error(e.message);
      }
      process.exit(1);
    }
  })();
}

export async function isbnFormat(input, OPTIONS) {
  return new Promise(function(resolve, reject) {
    const isbn = parseInput(input);
    if (!isbn) {
      reject(new Error(`Not a valid ISBN: ${input}`));
    } else {
      isbnApi.resolve(isbn.source, function(err, book) {
        if (err) {
          reject(new Error(`Failed to query ${input} with error: ${err}`));
        }
        else {
          try {
            resolve(formatBook(input, addIsbnIfNotThere(isbn, book), OPTIONS));
          }
          catch (e) {
            reject(e);
          }
        }
      });
    }
  });
}

function parseInput(input) {
  // Extract ISBN from input.
  const filename = path.basename(input, path.extname(input)).replace('-', '');
  const isbn = filename.match(/(?:(?:[-–]1[03])?:?\s+)?((?=[0-9X]{10}\b|(?=(?:[0-9]+[-– ]){3})[-– 0-9X]{13}\b|97[89][0-9]{10}\b|(?=(?:[0-9]+[-– ]){4})[-– 0-9]{17}\b)(?:97[89][-– ]?)?[0-9]{1,5}[-– ]?[0-9]+[-– ]?[0-9]+[-– ]?[0-9X])/gi);

  // Ignore invalid ISBN strings.
  return isbn ? isbn3.parse(isbn[0]) : null;
}

function addIsbnIfNotThere(isbn, book) {
  if (!book.industryIdentifiers) {
    book.industryIdentifiers = [];
  }
  [
    { type: 'ISBN_10', identifier: () => isbn.isbn10 },
    { type: 'ISBN_13', identifier: () => isbn.isbn13 }
  ].forEach(i => {
    if (!book.industryIdentifiers.filter(id => id.type === i.type).length) {
      book.industryIdentifiers.push({ type: i.type, identifier: i.identifier() });
    }
  });

  return book;
}

function sanitizeFilename(title) {
  // Unicode-aware string length because filesystems expect 255 _bytes_.
  const ellipsis = '…';
  const truncation = ((255 - Buffer.byteLength(ellipsis)) / 2) >> 0;
  const truncated = Buffer.byteLength(title) <= 255 ? title : `${title.slice(0, truncation)}${ellipsis}${title.slice(-truncation)}`;

  // Copied from https://github.com/parshap/node-sanitize-filename because we do our own truncation.
  const illegalRe = /[\/\?<>\\:\*\|"]/g;
  const controlRe = /[\x00-\x1f\x80-\x9f]/g;
  const reservedRe = /^\.+$/;
  const windowsReservedRe = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(\..*)?$/i;
  const windowsTrailingRe = /[\. ]+$/;
  const replacement = ' ';

  return truncated
    .replace(illegalRe, replacement)
    .replace(controlRe, replacement)
    .replace(reservedRe, replacement)
    .replace(windowsReservedRe, replacement)
    .replace(windowsTrailingRe, replacement)
    .trim()
}

function formatBook(input, book, OPTIONS) {
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
          if (!OPTIONS.flags['quiet']) console.warn(`Pattern ${pattern} empty for ${input}`);
          return 'Unknown';
        }
        return field;
      }
      catch (e) {
        if (e instanceof TypeError) {
          if (!OPTIONS.flags['quiet']) console.warn(`Pattern ${pattern} broke for ${input}`);
          return 'Unknown';
        }
        else {
          throw e;
        }
      }
    });
  }, OPTIONS.flags['format']);

  // Discard empty result.
  const empty = new RegExp(Object.keys(replacements).join('|'), 'gi');
  if (result === OPTIONS.flags['format'].replace(empty, 'Unknown')) return null;

  return OPTIONS.flags['sanitize'] ? sanitizeFilename(result + path.extname(input)) : result;
}
