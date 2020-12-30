# isbn-info

[![npm version](https://badge.fury.io/js/isbn-info.svg)](https://badge.fury.io/js/isbn-info)
![GitHub Build Status](https://github.com/infojunkie/isbn-info/workflows/Test/badge.svg)

A console tool to identify a book by its ISBN and output formatted metadata.

```
npm i -g isbn-info
isbn-info 0735619670
// => Steve McConnell - Code Complete (2004) 9780735619678
```

## Usage

```
  Usage: isbn-info <isbn>

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
                                default is "%A - %T (%Y) %I"
    -s, --sanitize            sanitize the output as a valid filename
    -q, --quiet               quiet mode: don't output errors
    -h, --help                show usage information
    -v, --version             show version information
```

To rename the ebooks with ISBN filenames in a given folder:
```
isbn-bulk-rename /path/to/folder
```

## Development

```
git clone https://github.com/infojunkie/isbn-info
npm install
npm test
npm run build
npm run link
```
