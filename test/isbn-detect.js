const assert = require('assert');
const { isbnDetect } = require('../src/isbn-detect.js');
const fs = require('fs');

describe('isbn-detect', function() {
  it('detects valid ISBNs', function() {
    for (const test of [
      {
        text: './test/data/test1.txt',
        isbns: ['9781492075455']
      },
      {
        text: './test/data/test2.txt',
        isbns: ['9781493905874', '9781493905881']
      },
      {
        text: './test/data/test3.txt',
        isbns: ['9781636391311', '9781636391328', '9781636391335']
      },
      {
        text: './test/data/test4.txt',
        isbns: ['3540233385', '9783540233381']
      },
      {
        text: './test/data/test5.txt',
        isbns: ['9780198836421', '9780192573513']
      },
      {
        text: './test/data/test6.txt',
        isbns: ['9780190692681', '9780190692698', '9780190692704', '9780190692674']
      },
    ]) {
      assert.deepStrictEqual(isbnDetect(fs.readFileSync(test.text, 'utf-8'), {
        flags: {
          'type': 'isbn'
        }
      }), test.isbns, test.text);
    }
  });

  it('detects valid ISSNs', function() {
    for (const test of [
      {
        text: './test/data/test2.txt',
        issns: ['2191-5768', '2191-5776']
      },
      {
        text: './test/data/test3.txt',
        issns: ['2162-7258', '2162-7266']
      },
    ]) {
      assert.deepStrictEqual(isbnDetect(fs.readFileSync(test.text, 'utf-8'), {
        flags: {
          'type': 'issn'
        }
      }), test.issns, test.text);
    }
  });
});
