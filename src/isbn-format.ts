#!/usr/bin/env node
import isbn3 from 'isbn3';
import path from 'path';
import meow from 'meow';
import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';

// TypeScript Interfaces
interface IndustryIdentifier {
  type: 'ISBN_10' | 'ISBN_13' | 'ISSN' | string;
  identifier: string;
}

interface BookMetadata {
  title: string;
  subtitle?: string;
  authors: string[];
  publishedDate: string;
  publisher: string;
  description?: string | null;
  industryIdentifiers: IndustryIdentifier[];
  pageCount?: number | null;
  printType?: string;
  categories?: string[];
  language?: string;
  imageLinks?: {
    smallThumbnail?: string;
    thumbnail?: string;
  };
  previewLink?: string;
  infoLink?: string;
}

interface RequestOptions {
  timeout?: number;
  poll?: {
    maxSockets?: number;
  };
  url?: string;
  headers?: Record<string, string>;
}

type ProviderResolver = (isbn: string, options?: RequestOptions) => Promise<BookMetadata>;

type ProviderCallback = (err: Error | null, book: BookMetadata | null) => void;

interface ISBN3Result {
  isbn10?: string;
  isbn13?: string;
}

interface MeowOptions {
  flags: {
    format: string;
    sanitize: boolean;
    quiet: boolean;
    help?: boolean;
    version?: boolean;
  };
  input: string[];
  showHelp: () => void;
}

const defaultOptions: Partial<RequestOptions> = {
  poll: {
    maxSockets: 500,
  },
  timeout: 5000
};

const GOOGLE_BOOKS_API_BASE = 'https://www.googleapis.com';
const GOOGLE_BOOKS_API_BOOK = '/books/v1/volumes';

const OPENLIBRARY_API_BASE = 'https://openlibrary.org';
const OPENLIBRARY_API_BOOK = '/api/books';

const OCLC_CLASSIFY_API_BASE = 'http://classify.oclc.org';
const OCLC_CLASSIFY_API_BOOK = '/classify2/Classify';

const PROVIDER_NAMES = {
  GOOGLE: 'google',
  OPENLIBRARY: 'openlibrary',
  OCLC_CLASSIFY: 'oclc-classify'
}

const DEFAULT_PROVIDERS = [
  PROVIDER_NAMES.GOOGLE,
  PROVIDER_NAMES.OPENLIBRARY,
  PROVIDER_NAMES.OCLC_CLASSIFY
]

const PROVIDER_RESOLVERS = {
  [PROVIDER_NAMES.GOOGLE]: _resolveGoogle,
  [PROVIDER_NAMES.OPENLIBRARY]: _resolveOpenLibrary,
  [PROVIDER_NAMES.OCLC_CLASSIFY]: _resolveOclcClassify
}

function _resolveGoogle(isbn: string, options?: RequestOptions): Promise<BookMetadata> {
  const requestOptions = Object.assign({}, defaultOptions, options, {
    url: `${GOOGLE_BOOKS_API_BASE + GOOGLE_BOOKS_API_BOOK}?q=isbn:${isbn}&key=${process.env.GOOGLE_BOOKS_API_KEY || ''}`
  });

  return axios.request(requestOptions).then(({status, data}) => {
    if (status !== 200) {
      throw new Error(`wrong response code: ${status}`);
    }

    const books = data;

    if (!books.totalItems) {
      throw new Error(`no books found with isbn: ${isbn}`);
    }

    // In very rare circumstances books.items[0] is undefined (see #2)
    if (!books.items || books.items.length === 0) {
      throw new Error(`no volume info found for book with isbn: ${isbn}`);
    }

    const book = books.items[0].volumeInfo;
    return book;
  });
}

function _resolveOpenLibrary(isbn: string, options?: RequestOptions): Promise<BookMetadata> {

  const standardize = function standardize(book: any): BookMetadata {
    const standardBook: BookMetadata = {
      'title': book.details.title,
      'publishedDate': book.details.publish_date,
      'authors': [],
      'description': book.details.subtitle,
      'industryIdentifiers': [],
      'pageCount': book.details.number_of_pages,
      'printType': 'BOOK',
      'categories': [],
      'imageLinks': {
          'smallThumbnail': book.thumbnail_url,
          'thumbnail': book.thumbnail_url
      },
      'previewLink': book.preview_url,
      'infoLink': book.info_url,
      'publisher': book.details.publishers ? book.details.publishers[0] : ''
    };

    if (book.details.authors) {
      book.details.authors.forEach(({name}: {name: string}) => {
        standardBook.authors.push(name);
      });
    }

    if (book.details.languages) {
      book.details.languages.forEach(({key}: {key: string}) => {
        switch (key) {
          case '/languages/eng':
            standardBook.language = 'en';
            break;
          case '/languages/spa':
            standardBook.language = 'es';
            break;
          case '/languages/fre':
            standardBook.language = 'fr';
            break;
          default:
            standardBook.language = 'unknown';
            break;
        }
      });
    } else {
      standardBook.language = 'unknown';
    }

    return standardBook;
  };

  const requestOptions = Object.assign({}, defaultOptions, options, {
    url: `${OPENLIBRARY_API_BASE + OPENLIBRARY_API_BOOK}?bibkeys=ISBN:${isbn}&format=json&jscmd=details`
  });

  return axios.request(requestOptions).then(({status, data}) => {
    if (status !== 200) {
      throw new Error(`wrong response code: ${status}`);
    }

    const books = data;
    const book = books[`ISBN:${isbn}`];

    if (!book) {
      throw new Error(`no books found with isbn: ${isbn}`);
    }

    return standardize(book);
  });
}

function _resolveOclcClassify(isbn: string, options?: RequestOptions): Promise<BookMetadata> {

  const standardize = function standardize(classifyData: any): BookMetadata {
    const standardBook: BookMetadata = {
      'title': '',
      'publishedDate': '',
      'authors': [],
      'description': null,
      'industryIdentifiers': [],
      'pageCount': null,
      'printType': 'BOOK',
      'categories': [],
      'imageLinks': {},
      'publisher': ''
    };

    // Extract work information
    if (classifyData.work) {
      const work = Array.isArray(classifyData.work) ? classifyData.work[0] : classifyData.work;

      standardBook.title = work['@_title'] || '';

      if (work['@_author']) {
        standardBook.authors.push(work['@_author'] as string);
      }

      // Extract edition information
      if (work.editions && work.editions.edition) {
        const editions = Array.isArray(work.editions.edition)
          ? work.editions.edition
          : [work.editions.edition];

        // Use the first edition for metadata
        const firstEdition = editions[0];
        if (firstEdition) {
          if (firstEdition['@_publisher']) {
            standardBook.publisher = firstEdition['@_publisher'];
          }
          if (firstEdition['@_year']) {
            standardBook.publishedDate = firstEdition['@_year'];
          }
          if (firstEdition['@_language']) {
            const lang = firstEdition['@_language'];
            switch (lang) {
              case 'eng':
                standardBook.language = 'en';
                break;
              case 'spa':
                standardBook.language = 'es';
                break;
              case 'fre':
                standardBook.language = 'fr';
                break;
              default:
                standardBook.language = lang;
                break;
            }
          }
        }
      }
    }

    return standardBook;
  };

  const requestOptions = Object.assign({}, defaultOptions, options, {
    url: `${OCLC_CLASSIFY_API_BASE + OCLC_CLASSIFY_API_BOOK}?isbn=${isbn}&summary=true`
  });

  return axios.request(requestOptions).then(({status, data}) => {
    if (status !== 200) {
      throw new Error(`wrong response code: ${status}`);
    }

    // Parse XML response
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_'
    });
    const result = parser.parse(data);

    if (!result.classify) {
      throw new Error(`invalid XML response for isbn: ${isbn}`);
    }

    const classify = result.classify;

    // Check response code
    const responseCode = classify.response && classify.response['@_code'];
    if (responseCode === '0' || responseCode === '2') {
      // 0 = single work found, 2 = multiple works found (we'll use the first)
      if (!classify.work) {
        throw new Error(`no books found with isbn: ${isbn}`);
      }
      return standardize(classify);
    } else {
      throw new Error(`no books found with isbn: ${isbn} (response code: ${responseCode})`);
    }
  });
}

/**
 * Calls the resolvers and returns the information based on isbn
 * @param {*} providers
 * @param {*} isbn
 * @param {*} options
 */
function _getBookInfo(providers: string[], isbn: string, options?: RequestOptions): Promise<BookMetadata> {
  const [firstProvider, ...remainingProviders] = providers;

  // Try the first provider..
  const seed = PROVIDER_RESOLVERS[firstProvider](isbn, options);

  // If there are no more providers, get out quickly! 🏃‍♂️
  if (!remainingProviders.length) return seed;

  // ...and set remaining providers as fallbacks!
  return remainingProviders
    .reduce((promise: Promise<BookMetadata>, provider: string) => {
      return promise.catch((err: Error) => PROVIDER_RESOLVERS[provider](isbn, options));
    }, seed);
}

/**
 * Parses arguments passed to `isbn.resolve`
 *
 * TODO: Reduce complexity by moving `options` to the last argument
 *
 * @param {*} args
 */
function _parseResolveArgs(args: any[]): { options: RequestOptions | null, callback: ProviderCallback | null } {
  let options = null
  let callback = null

  // resolve(isbn)
  if (args.length === 1) {
    options = null
    callback = null
  }
  // resolve(isbn, options), resolve(isbn, callback)
  else if (args.length === 2) {
    const isCallbackFn = typeof args[1] === 'function'

    options = isCallbackFn ? null : args[1]
    callback = isCallbackFn ? args[1] : null
  }
  // resolve(isbn, options, callback)
  else if (args.length === 3) {
    options = args[1]
    callback = args[2]
  }

  return { options, callback }
}

class Isbn {
  public PROVIDER_NAMES: typeof PROVIDER_NAMES;
  private _providers: string[];

  constructor() {
    // For usage outside this package!
    this.PROVIDER_NAMES = PROVIDER_NAMES;
    this._providers = [];
    this._resetProviders();
  }

  /**
   * Resets providers to the default set
   */
  _resetProviders(): void {
    this._providers = DEFAULT_PROVIDERS;
  }

  /**
   * Provider API that gets chained before `resolve`. If this is specified, the
   * `resolve` fn will honor this order.
   *
   * @param {Array} providers - Array of providers. Must be one of more from `isbn.PROVIDER_NAMES`
   *
   * @example
   *
   * ```
   * isbn
   *  .provider([isbn.PROVIDER_NAMES.OPENLIBRARY, isbn.PROVIDER_NAMES.GOOGLE])
   *  .resolve(...)
   * ```
   */
  provider(providers: string[]): this {
    const providerValid = Array.isArray(providers);
    if (!providerValid) throw new Error('`providers` must be an array.');

    // If there is nothing in the providers array, do nothing.
    if (!providers.length) return this;

    // remove duplicates, if any
    providers = [...new Set(providers)];

    // Check to see if there are any unsupported providers in the list.
    const providersSupported = providers.reduce((acc: boolean, p: string) => {
      return acc && DEFAULT_PROVIDERS.includes(p);
    }, true);
    if (!providersSupported) throw new Error('Please pass in supported providers.');

    // All good, reset provider list
    this._providers = providers;
    return this;
  }

  /**
   * Resolves book info, given an isbn
   * @param {string} isbn
   */
  resolve(isbn: string, options?: RequestOptions | ProviderCallback, callback?: ProviderCallback): Promise<BookMetadata> | void {
    const parsedArgs = _parseResolveArgs(Array.from(arguments));
    const opts = parsedArgs.options;
    const cb = parsedArgs.callback;

    if (typeof (cb) === 'function') {
      // Callback mode - return void
      _getBookInfo(this._providers, isbn, opts || undefined)
        .then((book: BookMetadata) => {
          cb(null, book);
        })
        .catch((err: Error) => {
          cb(err, null);
        })
        .finally(() => {
          this._resetProviders();
        });
      return;
    } else {
      // Promise mode - return promise
      const promise = _getBookInfo(this._providers, isbn, opts || undefined)
        .finally(() => {
          this._resetProviders();
        });
      return promise;
    }
  }
}

// https://stackoverflow.com/a/54577682/209184
function isMochaRunning(context: any): boolean {
  return ['afterEach','after','beforeEach','before','describe','it'].every(function(functionName) {
    return context[functionName] instanceof Function;
  });
}

if (!isMochaRunning(global)) {
  const DEFAULT_FORMAT = '%A - %T (%Y) %I';
  const OPTIONS = meow(`
    Usage: ${path.basename(process.argv[1])} <isbn>

    Options:
      -f, --format=FORMAT       output format for book information
                                  %I0 for ISBN-10
                                  %I3 for ISBN-13
                                  %IS for ISSN
                                  %I for ISBN-13 or ISBN-10, whichever comes first
                                  %T for title + subtitle
                                  %Y for publication date
                                  %A for author(s)
                                  %D for description
                                  %P for publisher
                                  %J for raw JSON
                                  default is "${DEFAULT_FORMAT}"
      -s, --sanitize            sanitize the output as a valid filename
      -q, --quiet               quiet mode: don't output errors
      -h, --help                show usage information
      -v, --version             show version information
    `, {
      description: 'Identify a book by its ISBN and output formatted metadata.',
      importMeta: import.meta,
      flags: {
        format: {
          type: 'string',
          alias: 'f',
          default: DEFAULT_FORMAT
        },
        sanitize: {
          type: 'boolean',
          alias: 's',
          default: false
        },
        quiet: {
          type: 'boolean',
          alias: 'q',
          default: false
        },
        help: {
          type: 'boolean',
          alias: 'h'
        },
        version: {
          type: 'boolean',
          alias: 'v'
        }
      }
    }
  );

  if (OPTIONS.flags['help'] || !OPTIONS.input.length) {
    OPTIONS.showHelp();
  }

  (async () => {
    try {
      const output = await isbnFormat(OPTIONS.input[0], OPTIONS);
      console.log(output);
    } catch (e) {
      if (!OPTIONS.flags['quiet']) {
        console.error((e as Error).message);
      }
      process.exit(1);
    }
  })();
}

export async function isbnFormat(input: string, OPTIONS: MeowOptions): Promise<string | null> {
  return new Promise(function(resolve, reject) {
    const isbn = parseInput(input);
    if (!isbn) {
      reject(new Error(`Not a valid ISBN: ${input}`));
    } else {
      const isbnApi = new Isbn();
      isbnApi.resolve(isbn.isbn13 ?? isbn.isbn10 ?? '', function(err: Error | null, book: BookMetadata | null) {
        if (err) {
          reject(new Error(`Failed to query ${input}: ${err}`));
        }
        else {
          try {
            resolve(formatBook(input, addIsbnIfNotThere(isbn, book!), OPTIONS));
          }
          catch (e) {
            reject(e);
          }
        }
      });
    }
  });
}

function parseInput(input: string): ISBN3Result | null {
  // Extract ISBN from input.
  const filename = path.basename(input, path.extname(input)).replace('-', '');
  const isbn = filename.match(/(?=[0-9X]{10}|(?=(?:[0-9]+[-– ]){3})[-– 0-9X]{13}|97[89][0-9]{10}|(?=(?:[0-9]+[-– ]){4})[-– 0-9]{17})(?:97[89][-– ]?)?[0-9]{1,5}[-– ]?[0-9]+[-– ]?[0-9]+[-– ]?[0-9X]/i);

  // Ignore invalid ISBN strings.
  return isbn ? isbn3.parse(isbn[0]) : null;
}

function addIsbnIfNotThere(isbn: ISBN3Result, book: BookMetadata): BookMetadata {
  if (!book.industryIdentifiers) {
    book.industryIdentifiers = [];
  }
  [
    { type: 'ISBN_10', identifier: () => isbn.isbn10 || '' },
    { type: 'ISBN_13', identifier: () => isbn.isbn13 || '' }
  ].forEach(i => {
    if (!book.industryIdentifiers.filter(id => id.type === i.type).length) {
      book.industryIdentifiers.push({ type: i.type, identifier: i.identifier() });
    }
  });

  return book;
}

function sanitizeFilename(title: string): string {
  // Unicode-aware string length because filesystems expect 255 _bytes_.
  const ellipsis = '…';
  const truncation = ((255 - Buffer.byteLength(ellipsis)) / 2) >> 0;
  const truncated = Buffer.byteLength(title) <= 255 ? title : `${title.slice(0, truncation)}${ellipsis}${title.slice(-truncation)}`;

  // Copied from https://github.com/parshap/node-sanitize-filename because we do our own truncation.
  const illegalRe = /[\/\?<>\\:\*\|"]/g;
  const controlRe = /[\x00-\x1f\x80-\x9f]/g;
  const reservedRe = /^\.+$/;
  const windowsReservedRe = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])(\..*)?$/i;
  const windowsTrailingRe = /[\. ]+$/;
  const replacement = ' ';

  return truncated
    .replace(illegalRe, replacement)
    .replace(controlRe, replacement)
    .replace(reservedRe, replacement)
    .replace(windowsReservedRe, replacement)
    .replace(windowsTrailingRe, replacement)
    .trim()
}

function formatBook(input: string, book: BookMetadata, OPTIONS: MeowOptions): string | null {
  // https://developers.google.com/books/docs/v1/reference/volumes
  const replacements: Record<string, (book: BookMetadata) => string> = {
    '%I0': (book: BookMetadata) => book.industryIdentifiers.filter(id => id.type === 'ISBN_10')[0].identifier,
    '%I3': (book: BookMetadata) => book.industryIdentifiers.filter(id => id.type === 'ISBN_13')[0].identifier,
    '%IS': (book: BookMetadata) => book.industryIdentifiers.filter(id => id.type === 'ISSN')[0].identifier,
    '%I': (book: BookMetadata) => book.industryIdentifiers.filter(id => id.type === 'ISBN_13' || id.type === 'ISBN_10')[0].identifier,
    '%T': (book: BookMetadata) => [].concat(book.title as any, book.subtitle as any).filter(v => v).join('. ').replace(':', '.').replace(/[\r\n\s]+/g, ' '),
    '%Y': (book: BookMetadata) => book.publishedDate.match(/\d{4}/)![0],
    '%A': (book: BookMetadata) => book.authors.join(', '),
    '%D': (book: BookMetadata) => book.description || '',
    '%P': (book: BookMetadata) => book.publisher,
    '%J': (book: BookMetadata) => JSON.stringify(book, null, '\t')
  }
  const result = Object.keys(replacements).reduce((result, pattern) => {
    const regex = new RegExp(pattern, 'gi');
    return result.replace(regex, function() {
      try {
        const field = replacements[pattern]!(book);
        if (!field) {
          if (!OPTIONS.flags['quiet']) console.warn(`Pattern ${pattern} empty for ${input}`);
          return 'Unknown';
        }
        return field;
      }
      catch (e) {
        if (e instanceof TypeError) {
          if (!OPTIONS.flags['quiet']) console.warn(`Pattern ${pattern} broke for ${input}`);
          return 'Unknown';
        }
        else {
          throw e;
        }
      }
    });
  }, OPTIONS.flags['format']);

  // Discard empty result.
  const empty = new RegExp(Object.keys(replacements).join('|'), 'gi');
  if (result === OPTIONS.flags['format'].replace(empty, 'Unknown')) return null;

  return OPTIONS.flags['sanitize'] ? sanitizeFilename(result + path.extname(input)) : result;
}
