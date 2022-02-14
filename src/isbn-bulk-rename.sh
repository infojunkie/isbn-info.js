#!/bin/bash
set -eu

usage() {
  echo "Usage: $(basename $BASH_SOURCE) [-x] [-h] /path/to/folder" 1>&2; exit 1;
}

extract=false
while getopts xh option; do
  case "$option" in
    x)
      extract=true
      ;;
    h)
      usage
      ;;
  esac
done
shift $(($OPTIND-1))
folder="${1-}"
[ -z "$folder" ] && { usage; exit 1; }

if [ "$extract" = true ]; then
  find "$folder" -type f | while read f; do echo "$f"; isbn-extract "$f" | xargs -r -I % isbn-format -s "%" | xargs -d'\n' -r -I % mv -n "$f" "$(dirname "$f")/%.${f##*.}"; done
else
  find "$folder" -type f | egrep "/[0-9]+X?\..*$" | while read f; do echo "$f"; isbn-format -s "$f" | xargs -d'\n' -r -I % mv -n "$f" "$(dirname "$f")/%"; done
fi
