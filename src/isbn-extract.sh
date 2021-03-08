#!/bin/bash
set -euo pipefail

usage() {
  echo "Usage: $(basename $BASH_SOURCE) [-p <pages>] [-h] [-t isbn,issn] /path/to/ebook" 1>&2; exit 1;
}

pages=10
type=isbn
while getopts p:ht: option; do
  case "$option" in
    p)
      pages=$OPTARG
      ;;
    h)
      usage
      ;;
    t)
      type=$OPTARG
      ;;
  esac
done
shift $(($OPTIND-1))
file="${1-}"
[ -z "$file" ] && { usage; exit 1; }

tmp_file=$(mktemp -t isbn-XXXXXXXX.txt)
trap "{ rm -f "$tmp_file"; }" EXIT

case "$file" in
  *.epub)
    $(mutool convert -o "$tmp_file" "$file" 1-$pages &>/dev/null)
    ;;
  *.pdf)
    $(pdftotext -f 1 -l "$pages" "$file" "$tmp_file" &>/dev/null)
    ;;
  *.djvu)
    $(djvutxt -page=1-$pages "$file" > "$tmp_file" &>/dev/null)
    ;;
  *)
    echo "Unhandled file type $file" 1>&2
    exit 1
    ;;
esac

isbn-detect --type "$type" < "$tmp_file" | head -n 1
