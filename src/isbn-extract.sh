#!/bin/bash
set -euo pipefail

usage() {
  echo "Usage: $(basename $BASH_SOURCE) [-p <pages>] [-h] [-a] [-t isbn,issn] /path/to/ebook" 1>&2; exit 1;
}

pages=30
type=isbn
all=false
while getopts ap:ht: option; do
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
    a)
      all=true
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

detected=$(isbn-detect --type "$type" < "$tmp_file")
if $all; then
  echo "$detected"
else
  echo "$detected" | head -n 1
fi
