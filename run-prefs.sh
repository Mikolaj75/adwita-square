#!/usr/bin/env bash
# Script to launch Adwita Square extension preferences window directly
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export GI_TYPELIB_PATH="/usr/lib64/gnome-shell/girepository-1.0:$GI_TYPELIB_PATH"

exec gjs -m "$DIR/standalone-prefs.js" "$@"
