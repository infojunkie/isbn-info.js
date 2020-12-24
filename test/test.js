var assert = require('assert');
var main = require('../src/index.js');

const OPTIONS = {
  input: ['0735619670'],
  flags: {
    'quiet': true,
    'sanitize': false,
    'format': '%A - (%Y) %T'
  }
};
const BOOK = {
  "title": "Code Complete",
  "authors": [
    "Steve McConnell"
  ],
  "publisher": "Microsoft Press",
  "publishedDate": "2004",
  "description": "Features the best practices in the art and...",
  "industryIdentifiers": [
    {
      "type": "OTHER",
      "identifier": "UCSC:32106018687688"
    }
  ],
  "readingModes": {
    "text": false,
    "image": false
  },
  "pageCount": 914,
  "printType": "BOOK",
  "categories": [
    "Computers"
  ],
  "averageRating": 4,
  "ratingsCount": 123,
  "contentVersion": "preview-1.0.0",
  "imageLinks": {
    "smallThumbnail": "http://books.google.com/books/content?id=QnghAQAAIAAJ&printsec=frontcover&img=1&zoom=5&source=gbs_api",
    "thumbnail": "http://books.google.com/books/content?id=QnghAQAAIAAJ&printsec=frontcover&img=1&zoom=1&source=gbs_api"
  },
  "language": "en",
  "previewLink": "http://books.google.es/books?id=QnghAQAAIAAJ&dq=isbn:0735619670&hl=&cd=1&source=gbs_api",
  "infoLink": "http://books.google.es/books?id=QnghAQAAIAAJ&dq=isbn:0735619670&hl=&source=gbs_api",
  "canonicalVolumeLink": "http://books.google.es/books/about/Code_Complete.html?hl=&id=QnghAQAAIAAJ"
}

describe('isbn-info', function() {
  it('parses valid isbns', function() {
    assert.strictEqual(main.parseInput('0735619670').codes.source, '0735619670');
    assert.strictEqual(main.parseInput('9781566199094').codes.source, '9781566199094');
    assert.strictEqual(main.parseInput('978-1566199094').codes.source, '9781566199094');
  });

  it('parses valid isbn filenames', function() {
    assert.strictEqual(main.parseInput('/media/rokanan/music/PRACTICE/SHEETS-TODO/0735619670.pdf').codes.source, '0735619670');
    assert.strictEqual(main.parseInput('/media/rokanan/music/PRACTICE/SHEETS-TODO/fake title 1971 - ISBN0735619670.pdf').codes.source, '0735619670');
    assert.strictEqual(main.parseInput('/media/rokanan/music/PRACTICE/SHEETS-TODO/fake title 1971 - ISBN123456789X.pdf').codes.source, '123456789X');
    assert.strictEqual(main.parseInput('/media/rokanan/music/PRACTICE/SHEETS-TODO/fake title 1971 - (ISBN 9780136091813).pdf').codes.source, '9780136091813');
  });

  it('rejects invalid isbns', function() {
    [
      'really bad string',
      '1234567890',
      '1234567890abc',
      '1735619670',
      'fake title with bad isbn 1234567890'
    ].forEach(function(badIsbn) {
      assert.strictEqual(main.parseInput(badIsbn), null);
    });
  });

  it('formats simplest case', function() {
    assert.strictEqual(main.formatBook(OPTIONS.input[0], BOOK, OPTIONS.flags['format'], OPTIONS.flags['quiet'], OPTIONS.flags['sanitize']), 'Steve McConnell - (2004) Code Complete');
  });

  it('formats to JSON', function() {
    assert.strictEqual(main.formatBook(OPTIONS.input[0], BOOK, '%J', OPTIONS.flags['quiet'], OPTIONS.flags['sanitize']), JSON.stringify(BOOK, null, '\t'));
  });

  it('does not crash on empty fields', function() {
    var book = Object.assign({}, BOOK);
    delete book.publishedDate;
    assert.strictEqual(main.formatBook(OPTIONS.input[0], book, OPTIONS.flags['format'], OPTIONS.flags['quiet'], OPTIONS.flags['sanitize']), 'Steve McConnell - (Unknown) Code Complete');
  });

  it('returns null on empty result', function() {
    var book = Object.assign({}, BOOK);
    delete book.publishedDate;
    delete book.authors;
    delete book.title;
    assert.strictEqual(main.formatBook(OPTIONS.input[0], book, OPTIONS.flags['format'], OPTIONS.flags['quiet'], OPTIONS.flags['sanitize']), null);
  });

  it('add isbn if not present in source', function() {
    var isbn = main.parseInput(OPTIONS.input[0]);
    var book = main.addIsbnIfNotThere(isbn, BOOK);
    assert.deepStrictEqual(book.industryIdentifiers[1], { type: 'ISBN_10', identifier: '0735619670' });
    assert.deepStrictEqual(book.industryIdentifiers[2], { type: 'ISBN_13', identifier: '9780735619678' });
  });

  it('sanitizes output on demand', function() {
    var book = Object.assign({}, BOOK);

    // Make an unsafe title
    book.authors = [ '/Steve\rMcConnell..' ];
    assert.strictEqual(main.formatBook(OPTIONS.input[0], book, OPTIONS.flags['format'], OPTIONS.flags['quiet'], true), 'Steve\\ McConnell..\\ -\\ (2004)\\ Code\\ Complete');

    // Make a long title
    book.title = new Array(512).join('A');
    assert.strictEqual(main.formatBook(OPTIONS.input[0], book, OPTIONS.flags['format'], OPTIONS.flags['quiet'], true).length, 255);
  });
});
