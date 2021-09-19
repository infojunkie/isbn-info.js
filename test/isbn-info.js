const assert = require('assert');
const sinon = require('sinon');
const fs = require('fs');
const isbnApi = require('node-isbn');
const { isbnInfo }  = require('../src/isbn-info.js');

describe('isbn-info', function() {
  let requestStub = null;

  beforeEach(function() {
    requestStub = sinon.stub(isbnApi, 'resolve');
    requestStub.callsFake(function(_, callback) {
      callback(null, JSON.parse(fs.readFileSync('./test/data/book.json', 'utf-8')));
    });
  });

  afterEach(function() {
    requestStub.restore();
  });

  it('formats valid ISBNs', async function() {
    [
      '9780735619678',
      '/path/to/ebook/9780735619678.pdf',
      '/path/to/ebook/Steve McConnell - Code Complete (2004) 9780735619678.pdf',
    ].forEach(async (test) => {
      assert.strictEqual(await isbnInfo(test, {
        flags: {
          'quiet': true,
          'sanitize': false,
          'format': '%A - (%Y) %T'
        }
      }), 'Steve McConnell - (2004) Code Complete');
    });
  });

  it('rejects invalid and missing ISBNs', async function() {
    [
      '9780735619677',
      '/path/to/ebook/9780735619677.pdf',
      '/path/to/ebook/Steve McConnell - Code Complete (2004) 9780735619677.pdf',
      '/path/to/ebook/Steve McConnell - Code Complete (2004).pdf',
    ].forEach(async (test) => {
      assert.rejects(isbnInfo(test, {
        flags: {
          'quiet': true,
          'sanitize': false,
          'format': '%A - (%Y) %T'
        }
      }));
    });
  });

  it('does not crash on empty fields', async function() {
    requestStub.callsFake(function(_, callback) {
      const book = JSON.parse(fs.readFileSync('./test/data/book.json', 'utf-8'));
      delete book.publishedDate;
      callback(null, book);
    });
    assert.strictEqual(await isbnInfo('9780735619678', {
      flags: {
        'quiet': true,
        'sanitize': false,
        'format': '%A - (%Y) %T'
      }
    }), 'Steve McConnell - (Unknown) Code Complete');
  });

  it('returns null on empty result', async function() {
    requestStub.callsFake(function(_, callback) {
      const book = JSON.parse(fs.readFileSync('./test/data/book.json', 'utf-8'));
      delete book.publishedDate;
      delete book.authors;
      delete book.title;
      callback(null, book);
    });
    assert.strictEqual(await isbnInfo('9780735619678', {
      flags: {
        'quiet': true,
        'sanitize': false,
        'format': '%A - (%Y) %T'
      }
    }), null);
  });

  it('add ISBN if not present in source', async function() {
    const book = JSON.parse(await isbnInfo('9780735619678', {
      flags: {
        'quiet': true,
        'sanitize': false,
        'format': '%J'
      }
    }));
    assert.deepStrictEqual(book.industryIdentifiers[1], { type: 'ISBN_10', identifier: '0735619670' });
    assert.deepStrictEqual(book.industryIdentifiers[2], { type: 'ISBN_13', identifier: '9780735619678' });
  });

  it('sanitizes output on demand', async function() {
    requestStub.callsFake(function(_, callback) {
      const book = JSON.parse(fs.readFileSync('./test/data/book.json', 'utf-8'));
      book.title = `
      Lorem ipsum dolor sit amet, consectetur adipiscing elit. Praesent eleifend, elit ut molestie consequat, elit lectus eleifend sem, sit amet malesuada nulla justo et nisi. Ut ut risus mi. Nam quis risus ac eros lacinia maximus in eu nisl. Fusce a interdum augue. Sed blandit neque sed scelerisque rutrum. Ut eros mauris, efficitur non purus facilisis, convallis eleifend lectus. Sed pretium mauris lectus, ac posuere metus blandit ut. Interdum et malesuada fames ac ante ipsum primis in faucibus. Phasellus elementum, metus in imperdiet molestie, tortor nisl convallis odio, vitae sollicitudin nisl est vitae nulla. Fusce lobortis aliquam quam id ullamcorper. Maecenas in ipsum id ligula tempor scelerisque nec ac mauris. Mauris porttitor nunc sem, vel pellentesque dui gravida lobortis. Maecenas faucibus tristique egestas. Integer dictum sapien dignissim venenatis consequat
      `.trim();
      callback(null, book);
    });
    const filename = await isbnInfo('9780735619678.pdf', {
      flags: {
        'quiet': true,
        'sanitize': true,
        'format': '%A - (%Y) %T'
      }
    });
    assert.strictEqual(Buffer.byteLength(filename), 255);
    const expected = /Integer dictum sapien dignissim venenatis consequat.pdf$/;
    assert(filename.match(expected), `Expected value to match regex:\n\n${filename}\n\n${expected}`);
  });
});
