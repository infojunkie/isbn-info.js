const assert = require('assert');
const { isbnDetect } = require('../src/isbn-detect.js');
const fs = require('fs');

describe('isbn-detect', function() {
  it('detects valid ISBNs', function() {
    for (const test of [
      {
        text: fs.readFileSync('./test/data/test1.txt', 'utf-8'),
        isbns: ['9781492075455']
      },
      {
        text: fs.readFileSync('./test/data/test2.txt', 'utf-8'),
        isbns: ['9781493905874', '9781493905881']
      },
      {
        text: fs.readFileSync('./test/data/test3.txt', 'utf-8'),
        isbns: ['9781636391311', '9781636391328', '9781636391335']
      },
      {
        text: fs.readFileSync('./test/data/test4.txt', 'utf-8'),
        isbns: ['3540233385', '9783540233381']
      },
      {
        text: fs.readFileSync('./test/data/test5.txt', 'utf-8'),
        isbns: ['9780198836421', '9780192573513']
      },
    ]) {
      assert.deepStrictEqual(isbnDetect(test.text, {
        flags: {
          'type': 'isbn'
        }
      }), test.isbns);
    }
  });

  it('detects valid ISSNs', function() {
    for (const test of [
      {
        text: fs.readFileSync('./test/data/test2.txt', 'utf-8'),
        issns: ['2191-5768', '2191-5776']
      },
      {
        text: fs.readFileSync('./test/data/test3.txt', 'utf-8'),
        issns: ['2162-7258', '2162-7266']
      },
    ]) {
      assert.deepStrictEqual(isbnDetect(test.text, {
        flags: {
          'type': 'issn'
        }
      }), test.issns);
    }
  });
});
