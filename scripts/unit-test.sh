#/bin/bash

echo -e "START\t: $0 `date`"

PREFIX=unit-test
VER=v1.0
DB=$PREFIX-${VER}.db
if [ -e $DB ]; then
    echo -e "DB\t: Removing $DB"
    rm -f $DB
fi
DIR=`dirname $0`
$DIR/sqlite3-install.sh $PREFIX

echo -e "END\t: $0 `date`"
