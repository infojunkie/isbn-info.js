# isbn-info

[![npm version](https://badge.fury.io/js/isbn-info.svg)](https://badge.fury.io/js/isbn-info)
![GitHub Build Status](https://github.com/infojunkie/isbn-info/workflows/Test/badge.svg)

Console tools to identify books by their ISBN and output formatted metadata.

```
npm i -g isbn-info
isbn-format 0735619670
// => Steve McConnell - Code Complete (2004) 0735619670
```

## Usage

### isbn-format
```
  Identify a book by its ISBN and output formatted metadata.

  Usage: isbn-format <isbn>

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

### isbn-detect
```
  Detect and output all ISBNs or ISSNs in the input block of text.

  Usage: isbn-detect < path/to/text-file

  Options:
    -t, --type=TYPE           type of information to extract:
                                ISBN (default)
                                ISSN
    -h, --help                show usage information
    -v, --version             show version information

```
### isbn-extract
To extract ISBN / ISSN from an ebook's contents:
```
isbn-extract [-p <pages>] [-h] [-a] [-t isbn|issn] /path/to/ebook
// => First found match (or all matches using -a) or exit code 1
```

Supported formats:
- epub using `mutool`
- pdf using `pdftotext`
- djvu using `djvutxt`

### isbn-bulk-rename
To rename the ebooks with ISBN filenames in a given folder:
```
isbn-bulk-rename /path/to/folder
```

To rename the ebooks by extracting ISBNs from the content in a given folder:
```
isbn-bulk-rename -x /path/to/folder
```

### Nautilus script
To wire `isbn-bulk-rename` into a GNOME Nautilus script:
- Install `libnotify-bin` or equivalent package that includes the `notify-send` command
- Create the following `~/.xsessionrc` file:
```
if [ -d "$HOME/.nvm" ]; then
  export NVM_DIR="$HOME/.nvm"

  # This loads nvm
  [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
fi
```
- Restart your X session `sudo systemctl restart display-manager` (on modern Ubuntu systems)
- Create the following [Nautilus script](https://askubuntu.com/a/236415/54112) with an explanatory filename:
```
#!/bin/sh
for f in "$@"; do isbn-bulk-rename "$f"; done
notify-send -t 3000 "ISBN renaming done"
```

## Development

```
git clone https://github.com/infojunkie/isbn-info
npm install
npm test
npm run build
npm run link
```
