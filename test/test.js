var assert = require('assert');
var main = require('../build/main.bundle.js');

const OPTIONS = {
  'q': true,
  's': false
};
const FORMAT = '%A - (%Y) %T';
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
    assert.equal('0735619670', main.parseInput('0735619670', OPTIONS).codes.source);
    assert.equal('9781566199094', main.parseInput('9781566199094', OPTIONS).codes.source);
    assert.equal('9781566199094', main.parseInput('978-1566199094', OPTIONS).codes.source);
  });

  it('parses valid isbn filenames', function() {
    assert.equal('0735619670', main.parseInput('/media/rokanan/music/PRACTICE/SHEETS-TODO/0735619670.pdf', OPTIONS).codes.source);
    assert.equal('0735619670', main.parseInput('/media/rokanan/music/PRACTICE/SHEETS-TODO/fake title 1971 - ISBN0735619670.pdf', OPTIONS).codes.source);
    assert.equal('123456789X', main.parseInput('/media/rokanan/music/PRACTICE/SHEETS-TODO/fake title 1971 - ISBN123456789X.pdf', OPTIONS).codes.source);
    assert.equal('9780136091813', main.parseInput('/media/rokanan/music/PRACTICE/SHEETS-TODO/fake title 1971 - (ISBN 9780136091813).pdf', OPTIONS).codes.source);
  });

  it('rejects invalid isbns', function() {
    [
      'really bad string',
      '1234567890',
      '1234567890abc',
      '1735619670',
      'fake title with bad isbn 1234567890'
    ].forEach(function(badIsbn) {
      assert.equal(null, main.parseInput(badIsbn, OPTIONS));
    });
  });

  it('formats simplest case', function() {
    assert.equal('Steve McConnell - (2004) Code Complete', main.formatBook(BOOK, FORMAT, OPTIONS));
  });

  it('formats to JSON', function() {
    assert.equal(JSON.stringify(BOOK, null, '\t'), main.formatBook(BOOK, '%J', OPTIONS));
  });

  it('does not crash on empty fields', function() {
    var book = Object.assign({}, BOOK);
    delete book.publishedDate;
    assert.equal('Steve McConnell - () Code Complete', main.formatBook(book, FORMAT, OPTIONS));
  });

  it('returns null on empty result', function() {
    var book = Object.assign({}, BOOK);
    delete book.publishedDate;
    delete book.authors;
    delete book.title;
    assert.equal(null, main.formatBook(book, FORMAT, OPTIONS));
  });

  it('add isbn if not present in source', function() {
    var isbn = main.parseInput('0735619670', OPTIONS);
    var book = main.addIsbnIfNotThere(isbn, BOOK);
    assert.deepEqual({ type: 'ISBN_10', identifier: '0735619670' }, book.industryIdentifiers[1]);
    assert.deepEqual({ type: 'ISBN_13', identifier: '9780735619678' }, book.industryIdentifiers[2]);
  });

  it('sanitizes output on demand', function() {
    var book = Object.assign({}, BOOK);
    book.authors = [ '/Steve\rMcConnell..' ];
    var options = Object.assign({}, OPTIONS);
    options['s'] = true;
    assert.equal('Steve McConnell - (2004) Code Complete', main.formatBook(book, FORMAT, options));
  });

});
