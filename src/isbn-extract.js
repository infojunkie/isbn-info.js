#!/usr/bin/env node
import isbnParser from 'isbn3';
import issn from 'issn';
import meow from 'meow';
import fs from 'fs';
import path from 'path';

const OPTIONS = meow(`
  Usage: ${path.basename(process.argv[1])} < path/to/text-file

  Options:
    -t, --type=TYPE           type of information to extract:
                                ISBN
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
  }
);
switch (OPTIONS.flags['type'].toLowerCase()) {
  case 'isbn':
  case 'issn':
    OPTIONS.flags['type'] = OPTIONS.flags['type'].toLowerCase();
    break;
  default:
    OPTIONS.showHelp();
}

// https://stackoverflow.com/a/54577682/209184
function isMochaRunning(context) {
  return ['afterEach','after','beforeEach','before','describe','it'].every(function(functionName){
    return context[functionName] instanceof Function;
  });
}

const text = fs.readFileSync('/dev/stdin', 'utf-8');
if (OPTIONS.flags['help'] || (!text.length) && !isMochaRunning(global)) {
  OPTIONS.showHelp();
}

// https://www.oreilly.com/library/view/regular-expressions-cookbook/9781449327453/ch04s13.html
const regexIsbn = /\bISBN(?:-1[03])?:? ((?=[0-9X]{10}\b|(?=(?:[0-9]+[- ]){3})[- 0-9X]{13}\b|97[89][0-9]{10}\b|(?=(?:[0-9]+[- ]){4})[- 0-9]{17}\b)(?:97[89][- ]?)?[0-9]{1,5}[- ]?[0-9]+[- ]?[0-9]+[- ]?[0-9X]\b)/g;
const regexIssn = /\bISSN:? ((?:\d{4})-?(?:\d{3})(?:[\dX]))\b/g;
const matches = [...text.matchAll(OPTIONS.flags['type'] === 'isbn' ? regexIsbn : regexIssn)]
  .map(match => match[1])
  .reduce((matches, match) => {
    if (OPTIONS.flags['type'] === 'isbn') {
      const p = isbnParser.parse(match);
      if (p) {
        matches.push(p.isbn13);
      }
    } else {
      if (issn(match)) {
        matches.push(match);
      }
    }
    return matches;
  }, []);

// Print out unique set of matches.
[...new Set(matches)].forEach(match => { console.log(match); });