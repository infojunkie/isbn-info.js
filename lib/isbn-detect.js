#!/usr/bin/env node
"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isbnDetect = isbnDetect;

var _toConsumableArray2 = _interopRequireDefault(require("@babel/runtime/helpers/toConsumableArray"));

var _isbn = _interopRequireDefault(require("isbn3"));

var _issn = _interopRequireDefault(require("issn"));

var _meow = _interopRequireDefault(require("meow"));

var _fs = _interopRequireDefault(require("fs"));

var _path = _interopRequireDefault(require("path"));

// https://stackoverflow.com/a/54577682/209184
function isMochaRunning(context) {
  return ['afterEach', 'after', 'beforeEach', 'before', 'describe', 'it'].every(function (functionName) {
    return context[functionName] instanceof Function;
  });
}

if (!isMochaRunning(global)) {
  var OPTIONS = (0, _meow["default"])("\n  Usage: ".concat(_path["default"].basename(process.argv[1]), " < path/to/text-file\n\n  Options:\n    -t, --type=TYPE           type of information to extract:\n                                ISBN (default)\n                                ISSN\n    -h, --help                show usage information\n    -v, --version             show version information\n  "), {
    flags: {
      type: {
        type: 'string',
        alias: 't',
        "default": 'isbn'
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

  var text = _fs["default"].readFileSync('/dev/stdin', 'utf-8');

  if (OPTIONS.flags['help'] || !text.length) {
    OPTIONS.showHelp();
  } // Print out unique set of matches.


  var matches = isbnDetect(text, OPTIONS);
  if (!matches.length) process.exit(1);
  matches.forEach(function (match) {
    console.log(match);
  });
}

function isbnDetect(text, OPTIONS) {
  // Adapted from
  // https://www.oreilly.com/library/view/regular-expressions-cookbook/9781449327453/ch04s13.html
  var regexes = {
    // https://regex101.com/r/K0owvd/4/
    'isbn': /\b(?:(?:ISBN|International Standard Book Number|Library of Congress Control Number|LCCN)(?:[-–]1[03])?:?\s+)?((?=[0-9X]{10}\b|(?=(?:[0-9]+[-– ]){3})[-– 0-9X]{13}\b|97[89][0-9]{10}\b|(?=(?:[0-9]+[-– ]){4})[-– 0-9]{17}\b)(?:97[89][-– ]?)?[0-9]{1,5}[-– ]?[0-9]+[-– ]?[0-9]+[-– ]?[0-9X]\b)/gi,
    // https://regex101.com/r/Sl0PX3/2/
    'issn': /\b(?:(?:ISSN|International Standard Serial Number):?\s+)?((?:\d{4})[-–]?(?:\d{3})(?:[\dX]))\b/gi
  };
  var matches = (0, _toConsumableArray2["default"])(text.matchAll(regexes[OPTIONS.flags['type']])).filter(function (match) {
    return !match[0].match(/Library of Congress Control Number|LCCN/gi);
  }).map(function (match) {
    return match[1].replace(/–/g, '-');
  }).reduce(function (matches, candidate) {
    if (OPTIONS.flags['type'] === 'isbn') {
      var p = _isbn["default"].parse(candidate);

      if (p) {
        if (p.isIsbn13) matches.push(p.isbn13);
        if (p.isIsbn10) matches.push(p.isbn10);
      }
    } else {
      if ((0, _issn["default"])(candidate)) {
        matches.push(candidate);
      }
    }

    return matches;
  }, []);
  return (0, _toConsumableArray2["default"])(new Set(matches));
}