#!/bin/bash
set -euo pipefail

usage() {
  echo "Usage: [-p <pages>] [-h] $(basename $BASH_SOURCE) /path/to/ebook" 1>&2; exit 1;
}

pages=10
while getopts p:h option; do
  case "$option" in
    p)
      pages=$OPTARG
      ;;
    h)
      usage
      ;;
  esac
done
shift $(($OPTIND-1))
file="${1-}"
[ -z "$file" ] && { usage; exit 1; }

tmp_file=$(mktemp -t isbn-XXXXXXXX.txt)
trap "{ rm -f "$tmp_file"; }" EXIT

case "$file" in
  *.pdf | *.epub)
    $(mutool convert -o "$tmp_file" "$file" 1-$pages &>/dev/null)
    ;;
  *.djvu)
    $(djvutxt -page=1-$pages "$file" > "$tmp_file" &>/dev/null)
    ;;
  *)
    echo "Unhandled file type $file" 1>&2
    exit 1
    ;;
esac

# https://www.oreilly.com/library/view/regular-expressions-cookbook/9781449327453/ch04s13.html
regex="(?:ISBN(?:-1[03])?:?\s+)?((?=[0-9X]{10}|(?=(?:[0-9]+[-\s]){3})[-\s0-9X]{13}|97[89][0-9]{10}|(?=(?:[0-9]+[-\s]){4})[-\s0-9]{17})(?:97[89][-\s]?)?[0-9]{1,5}[-\s]?[0-9]+[-\s]?[0-9]+[-\s]?[0-9X])"
NODE_PATH="$(npm root -g):${NODE_PATH-}" node -e "f=require('fs'); i=require('isbn3'); t=f.readFileSync('/dev/stdin', 'utf-8'); if (m=t.match(/$regex/)) console.log(i.asIsbn13(m[1])); else process.exit(1);" < "$tmp_file"
