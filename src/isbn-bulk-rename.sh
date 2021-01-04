#!/bin/bash
find "$@" | egrep "/[0-9]+X?\..*$" | while read f; do echo "$f"; isbn-info -s "$f" | xargs -d'\n' -r -I % mv -n "$f" "$(dirname "$f")/%"; done
