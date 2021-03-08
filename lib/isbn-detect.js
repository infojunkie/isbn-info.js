#!/usr/bin/env node
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isbnDetect = isbnDetect;

var _isbn = _interopRequireDefault(require("isbn3"));

var _issn = _interopRequireDefault(require("issn"));

var _meow = _interopRequireDefault(require("meow"));

var _fs = _interopRequireDefault(require("fs"));

var _path = _interopRequireDefault(require("path"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _iterableToArray(iter) { if (typeof Symbol !== "undefined" && Symbol.iterator in Object(iter)) return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) return _arrayLikeToArray(arr); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

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
  // https://www.oreilly.com/library/view/regular-expressions-cookbook/9781449327453/ch04s13.html
  var regexes = {
    'isbn': /\b(?:ISBN|International Standard Book Number)(?:[-–]1[03])?:?\s+((?=[0-9X]{10}\b|(?=(?:[0-9]+[-– ]){3})[-– 0-9X]{13}\b|97[89][0-9]{10}\b|(?=(?:[0-9]+[-– ]){4})[-– 0-9]{17}\b)(?:97[89][-– ]?)?[0-9]{1,5}[-– ]?[0-9]+[-– ]?[0-9]+[-– ]?[0-9X]\b)/gi,
    'issn': /\b(?:ISSN|International Standard Serial Number):?\s+((?:\d{4})[-–]?(?:\d{3})(?:[\dX]))\b/gi
  };

  var matches = _toConsumableArray(text.matchAll(regexes[OPTIONS.flags['type']])).map(function (match) {
    return match[1].replace(/–/g, '-');
  }).reduce(function (matches, candidate) {
    if (OPTIONS.flags['type'] === 'isbn') {
      var p = _isbn["default"].parse(candidate);

      if (p) {
        matches.push(p.isbn13);
      }
    } else {
      if ((0, _issn["default"])(match)) {
        matches.push(candidate);
      }
    }

    return matches;
  }, []);

  return _toConsumableArray(new Set(matches));
}