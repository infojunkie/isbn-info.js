import assert from 'assert';
import sinon, { SinonStub } from 'sinon';
import fs from 'fs';
import axios, { AxiosResponse } from 'axios';
import { isbnFormat } from '../src/isbn-format.ts';

interface FormatOptions {
  flags: {
    quiet: boolean;
    sanitize: boolean;
    format: string;
  };
}

interface BookData {
  title?: string;
  authors?: string[];
  publishedDate?: string;
  industryIdentifiers?: Array<{
    type: string;
    identifier: string;
  }>;
  [key: string]: any;
}

describe('isbn-format', function() {
  let requestStub: SinonStub | null = null;

  beforeEach(function() {
    requestStub = sinon.stub(axios, 'request');
    const bookData: BookData = JSON.parse(fs.readFileSync('./test/data/book.json', 'utf-8'));
    requestStub.resolves({
      status: 200,
      data: {
        totalItems: 1,
        items: [{
          volumeInfo: bookData
        }]
      }
    } as AxiosResponse);
  });

  afterEach(function() {
    if (requestStub) {
      requestStub.restore();
    }
  });

  it('formats valid ISBNs', async function() {
    const tests: string[] = [
      '9780735619678',
      '978-0-735-61967-8',
      '/path/to/ebook/9780735619678.pdf',
      '/path/to/ebook/978-0-735-61967-8.pdf',
      '/path/to/ebook/Steve McConnell - Code Complete (2004) 9780735619678.pdf',
      '/path/to/ebook/Steve McConnell - Code Complete (2004) 978-0-735-61967-8.pdf',
    ];

    const options: FormatOptions = {
      flags: {
        'quiet': true,
        'sanitize': false,
        'format': '%A - (%Y) %T'
      }
    };

    for (const test of tests) {
      assert.strictEqual(await isbnFormat(test, options), 'Steve McConnell - (2004) Code Complete');
    }
  });

  it('rejects invalid and missing ISBNs', async function() {
    const tests: string[] = [
      '9780735619677',
      '/path/to/ebook/9780735619677.pdf',
      '/path/to/ebook/Steve McConnell - Code Complete (2004) 9780735619677.pdf',
      '/path/to/ebook/Steve McConnell - Code Complete (2004).pdf',
    ];

    const options: FormatOptions = {
      flags: {
        'quiet': true,
        'sanitize': false,
        'format': '%A - (%Y) %T'
      }
    };

    for (const test of tests) {
      await assert.rejects(isbnFormat(test, options));
    }
  });

  it('does not crash on empty fields', async function() {
    const book: BookData = JSON.parse(fs.readFileSync('./test/data/book.json', 'utf-8'));
    delete book.publishedDate;
    requestStub!.resolves({
      status: 200,
      data: {
        totalItems: 1,
        items: [{ volumeInfo: book }]
      }
    } as AxiosResponse);

    const options: FormatOptions = {
      flags: {
        'quiet': true,
        'sanitize': false,
        'format': '%A - (%Y) %T'
      }
    };

    assert.strictEqual(await isbnFormat('9780735619678', options), 'Steve McConnell - (Unknown) Code Complete');
  });

  it('returns null on empty result', async function() {
    const book: BookData = JSON.parse(fs.readFileSync('./test/data/book.json', 'utf-8'));
    delete book.publishedDate;
    delete book.authors;
    delete book.title;
    requestStub!.resolves({
      status: 200,
      data: {
        totalItems: 1,
        items: [{ volumeInfo: book }]
      }
    } as AxiosResponse);

    const options: FormatOptions = {
      flags: {
        'quiet': true,
        'sanitize': false,
        'format': '%A - (%Y) %T'
      }
    };

    assert.strictEqual(await isbnFormat('9780735619678', options), null);
  });

  it('add ISBN if not present in source', async function() {
    const options: FormatOptions = {
      flags: {
        'quiet': true,
        'sanitize': false,
        'format': '%J'
      }
    };

    const result = await isbnFormat('9780735619678', options);
    const book: BookData = JSON.parse(result!);
    assert.deepStrictEqual(book.industryIdentifiers![1], { type: 'ISBN_10', identifier: '0735619670' });
    assert.deepStrictEqual(book.industryIdentifiers![2], { type: 'ISBN_13', identifier: '9780735619678' });
  });

  it('sanitizes output on demand', async function() {
    const book: BookData = JSON.parse(fs.readFileSync('./test/data/book.json', 'utf-8'));
    book.title = `
      Lorem ipsum dolor sit amet, consectetur adipiscing elit. Praesent eleifend, elit ut molestie consequat, elit lectus eleifend sem, sit amet malesuada nulla justo et nisi. Ut ut risus mi. Nam quis risus ac eros lacinia maximus in eu nisl. Fusce a interdum augue. Sed blandit neque sed scelerisque rutrum. Ut eros mauris, efficitur non purus facilisis, convallis eleifend lectus. Sed pretium mauris lectus, ac posuere metus blandit ut. Interdum et malesuada fames ac ante ipsum primis in faucibus. Phasellus elementum, metus in imperdiet molestie, tortor nisl convallis odio, vitae sollicitudin nisl est vitae nulla. Fusce lobortis aliquam quam id ullamcorper. Maecenas in ipsum id ligula tempor scelerisque nec ac mauris. Mauris porttitor nunc sem, vel pellentesque dui gravida lobortis. Maecenas faucibus tristique egestas. Integer: dictum sapien dignissim venenatis consequat
      `.trim();
    requestStub!.resolves({
      status: 200,
      data: {
        totalItems: 1,
        items: [{ volumeInfo: book }]
      }
    } as AxiosResponse);

    const options: FormatOptions = {
      flags: {
        'quiet': true,
        'sanitize': true,
        'format': '%A - (%Y) %T'
      }
    };

    const filename = await isbnFormat('9780735619678.pdf', options);
    assert.strictEqual(Buffer.byteLength(filename!), 255);
    const expected = /Integer. dictum sapien dignissim venenatis consequat.pdf$/;
    assert(filename!.match(expected), `Expected value to match regex:\n\n${filename}\n\n${expected}`);
  });
});
