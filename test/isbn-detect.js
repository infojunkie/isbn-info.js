const assert = require('assert');
const { isbnDetect } = require('../src/isbn-detect.js');
const fs = require('fs');

describe('isbn-detect', function() {
  let text = null;

  before(function() {
    text = fs.readFileSync('./test/test.txt', 'utf-8');
  });

  it('detects valid ISBNs', function() {
    assert.deepStrictEqual(isbnDetect(text, {
      flags: {
        'type': 'isbn'
      }
    }), ['9781493905874', '9781493905881']);
  });

  it('detects valid ISSNs', function() {
    assert.deepStrictEqual(isbnDetect(text, {
      flags: {
        'type': 'issn'
      }
    }), ['2191-5768', '2191-5776']);
  });
});
