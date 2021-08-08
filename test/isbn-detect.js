const assert = require('assert');
const { isbnDetect } = require('../src/isbn-detect.js');
const fs = require('fs');

describe('isbn-detect', function() {
  it('detects valid ISBNs', function() {
    for (const test of [
      {
        text: fs.readFileSync('./test/springer.txt', 'utf-8'),
        isbns: ['9781493905874', '9781493905881']
      },
      {
        text: fs.readFileSync('./test/oreilly.txt', 'utf-8'),
        isbns: ['9781492075455']
      }
    ]) {
      assert.deepStrictEqual(isbnDetect(test.text, {
        flags: {
          'type': 'isbn'
        }
      }), test.isbns);
    }
  });

  it('detects valid ISSNs', function() {
    const text = fs.readFileSync('./test/springer.txt', 'utf-8');
    assert.deepStrictEqual(isbnDetect(text, {
      flags: {
        'type': 'issn'
      }
    }), ['2191-5768', '2191-5776']);
  });
});
