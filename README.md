# isbn-info

A console tool to identify a book by its ISBN and output formatted metadata.

```
npm install
npm test
npm link
isbn-info 0735619670
```

## command-line options
- `isbn1 isbn2 /path/to/isbn3.ext` any number of ISBNs, including pathnames whose filename is a valid ISBN
- `-q` quiet mode: don't output errors
- `-f "format string"` format string:
  - `%T` for title
  - `%Y` for publication date
  - `%A` for author(s)
  - default is `"%A - (%Y) %T"`
