#!/usr/bin/env node
import isbn3 from 'isbn3';
import issn from 'issn';
import meow from 'meow';
import fs from 'fs';
import path from 'path';

// https://stackoverflow.com/a/54577682/209184
function isMochaRunning(context) {
  return ['afterEach','after','beforeEach','before','describe','it'].every(function(functionName) {
    return context[functionName] instanceof Function;
  });
}

if (!isMochaRunning(global)) {
  const OPTIONS = meow(`
  Usage: ${path.basename(process.argv[1])} < path/to/text-file

  Options:
    -t, --type=TYPE           type of information to extract:
                                ISBN (default)
                                ISSN
    -h, --help                show usage information
    -v, --version             show version information
  `, {
    flags: {
      type: {
        type: 'string',
        alias: 't',
        default: 'isbn'
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
  });
  switch (OPTIONS.flags['type'].toLowerCase()) {
    case 'isbn':
    case 'issn':
      OPTIONS.flags['type'] = OPTIONS.flags['type'].toLowerCase();
      break;
    default:
      OPTIONS.showHelp();
  }

  const text = fs.readFileSync('/dev/stdin', 'utf-8');
  if (OPTIONS.flags['help'] || !text.length) {
    OPTIONS.showHelp();
  }

  // Print out unique set of matches.
  const matches = isbnDetect(text, OPTIONS);
  if (!matches.length) process.exit(1);
  matches.forEach(match => { console.log(match); });
}

export function isbnDetect(text, OPTIONS) {
  // https://www.oreilly.com/library/view/regular-expressions-cookbook/9781449327453/ch04s13.html
  const regexes = {
    'isbn': /\b((?=[0-9X]{10}\b|(?=(?:[0-9]+[-– ]){3})[-– 0-9X]{13}\b|97[89][0-9]{10}\b|(?=(?:[0-9]+[-– ]){4})[-– 0-9]{17}\b)(?:97[89][-– ]?)?[0-9]{1,5}[-– ]?[0-9]+[-– ]?[0-9]+[-– ]?[0-9X]\b)/gi,
    'issn': /\b((?:\d{4})[-–]?(?:\d{3})(?:[\dX]))\b/gi
  }
  const matches = [...text.matchAll(regexes[OPTIONS.flags['type']])]
  .map(match => match[1].replace(/–/g, '-'))
  .reduce((matches, candidate) => {
    if (OPTIONS.flags['type'] === 'isbn') {
      const p = isbn3.parse(candidate);
      if (p) {
        matches.push(p.isbn13);
      }
    } else {
      if (issn(candidate)) {
        matches.push(candidate);
      }
    }
    return matches;
  }, []);
  return [...new Set(matches)];
}
