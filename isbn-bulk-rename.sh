#!/bin/bash
find "$@" | egrep "/[0-9]+X?\..*$" | while read f; do echo "$f"; isbn-info -s "$f" | xargs -r -I % mv "$f" $(dirname "$f")/"%.${f##*.}"; done
