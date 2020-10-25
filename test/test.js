var assert = require('assert');
var main = require('../lib/main.js');

const FORMAT = '%A - (%Y) %T';
const OPTIONS = {
  'q': true,
  's': false,
  'f': FORMAT
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
    assert.strictEqual(main.parseInput('0735619670', OPTIONS).codes.source, '0735619670');
    assert.strictEqual(main.parseInput('9781566199094', OPTIONS).codes.source, '9781566199094');
    assert.strictEqual(main.parseInput('978-1566199094', OPTIONS).codes.source, '9781566199094');
  });

  it('parses valid isbn filenames', function() {
    assert.strictEqual(main.parseInput('/media/rokanan/music/PRACTICE/SHEETS-TODO/0735619670.pdf', OPTIONS).codes.source, '0735619670');
    assert.strictEqual(main.parseInput('/media/rokanan/music/PRACTICE/SHEETS-TODO/fake title 1971 - ISBN0735619670.pdf', OPTIONS).codes.source, '0735619670');
    assert.strictEqual(main.parseInput('/media/rokanan/music/PRACTICE/SHEETS-TODO/fake title 1971 - ISBN123456789X.pdf', OPTIONS).codes.source, '123456789X');
    assert.strictEqual(main.parseInput('/media/rokanan/music/PRACTICE/SHEETS-TODO/fake title 1971 - (ISBN 9780136091813).pdf', OPTIONS).codes.source, '9780136091813');
  });

  it('rejects invalid isbns', function() {
    [
      'really bad string',
      '1234567890',
      '1234567890abc',
      '1735619670',
      'fake title with bad isbn 1234567890'
    ].forEach(function(badIsbn) {
      assert.strictEqual(main.parseInput(badIsbn, OPTIONS), null);
    });
  });

  it('formats simplest case', function() {
    assert.strictEqual(main.formatBook('0735619670', BOOK, FORMAT, OPTIONS), 'Steve McConnell - (2004) Code Complete');
  });

  it('formats to JSON', function() {
    assert.strictEqual(main.formatBook('0735619670', BOOK, '%J', OPTIONS), JSON.stringify(BOOK, null, '\t'));
  });

  it('does not crash on empty fields', function() {
    var book = Object.assign({}, BOOK);
    delete book.publishedDate;
    assert.strictEqual(main.formatBook('0735619670', book, FORMAT, OPTIONS), 'Steve McConnell - (Unknown) Code Complete');
  });

  it('returns null on empty result', function() {
    var book = Object.assign({}, BOOK);
    delete book.publishedDate;
    delete book.authors;
    delete book.title;
    assert.strictEqual(main.formatBook('0735619670', book, FORMAT, OPTIONS), null);
  });

  it('add isbn if not present in source', function() {
    var isbn = main.parseInput('0735619670', OPTIONS);
    var book = main.addIsbnIfNotThere(isbn, BOOK);
    assert.deepStrictEqual(book.industryIdentifiers[1], { type: 'ISBN_10', identifier: '0735619670' });
    assert.deepStrictEqual(book.industryIdentifiers[2], { type: 'ISBN_13', identifier: '9780735619678' });
  });

  it('sanitizes output on demand', function() {
    var book = Object.assign({}, BOOK);

    // Make an unsafe title
    book.authors = [ '/Steve\rMcConnell..' ];
    var options = Object.assign({}, OPTIONS);
    options['s'] = true;
    assert.strictEqual(main.formatBook('0735619670', book, FORMAT, options), 'Steve\\ McConnell..\\ -\\ (2004)\\ Code\\ Complete');

    // Make a long title
    book.title = new Array(512).join('A');
    var options = Object.assign({}, OPTIONS);
    options['s'] = true;
    assert.strictEqual(main.formatBook('0735619670', book, FORMAT, options).length, 255);
  });

});
