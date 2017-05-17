# isbn-info

[![Travis build](https://travis-ci.org/infojunkie/isbn-info.svg?branch=master)](https://travis-ci.org/infojunkie/isbn-info)

A console tool to identify a book by its ISBN and output formatted metadata.

```
npm i -g isbn-info
isbn-info 0735619670
```

## command-line options

```
isbn-info isbn1 [isbn2 /path/to/isbn3.ext ...] [-q] [-s] [-f "format string"]
```

- `isbn1 isbn2 /path/to/isbn3.ext` any number of ISBNs, including pathnames whose filename is a valid ISBN
- `-q` quiet mode: don't output errors
- `-s` to sanitize the output as a valid filename
- `-f "format string"` format string:
  - `%I0` for ISBN-10
  - `%I3` for ISBN-13
  - `%IS` for ISSN
  - `%T` for title + subtitle
  - `%Y` for publication date
  - `%A` for author(s)
  - `%D` for description
  - `%P` for publisher
  - `%J` for raw JSON
  - default is `"%A - (%Y) %T"`

## development

```
git clone https://github.com/infojunkie/isbn-info
npm install
npm test
npm link
```
