#!/bin/sh
set -e

DATA_DIR="${DATA_DIR:-/app/data}"
# `tmp` is where SQLite spills the sorter of a full statistics pass. It has to
# be on the data volume: the root filesystem is read-only and /tmp is a tmpfs,
# so spilling there would cost memory rather than save it.
mkdir -p "$DATA_DIR/sqlite" "$DATA_DIR/tmp" \
  "$DATA_DIR/sdf/to_process" "$DATA_DIR/sdf/processed" \
  "$DATA_DIR/smiles/to_process" "$DATA_DIR/smiles/processed"

# A database written by 1.1.x lives in /app/sqlite; adopt it when mounted.
if [ -f /app/sqlite/db.sqlite ] && [ ! -f "$DATA_DIR/sqlite/db.sqlite" ]; then
  echo "Moving database from /app/sqlite to $DATA_DIR/sqlite"
  mv /app/sqlite/db.sqlite* "$DATA_DIR/sqlite/"
fi

exec "$@"
