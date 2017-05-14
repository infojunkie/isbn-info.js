var assert = require('assert');
var main = require('../index.js');

const OPTIONS = {
  'q': true
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

describe('node-info', function() {

  it('parses valid isbns', function() {
    assert.equal('0735619670', main.parseInput('0735619670', OPTIONS));
    assert.equal('9781566199094', main.parseInput('9781566199094', OPTIONS));
    assert.equal('9781566199094', main.parseInput('978-1566199094', OPTIONS));
  });

  it('parses valid isbn filenames', function() {
    assert.equal('0735619670', main.parseInput('/media/rokanan/music/PRACTICE/SHEETS-TODO/0735619670.pdf', OPTIONS));
  });

  it('rejects invalid isbns', function() {
    [
      'really bad string',
      '1234567890',
      '1234567890abc',
      '1735619670'
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
    var book = BOOK;
    delete book.publishedDate;
    assert.equal('Steve McConnell - () Code Complete', main.formatBook(book, FORMAT, OPTIONS));
  });

  it('returns null on empty result', function() {
    var book = BOOK;
    delete book.publishedDate;
    delete book.authors;
    delete book.title;
    assert.equal(null, main.formatBook(book, FORMAT, OPTIONS));
  })

});
