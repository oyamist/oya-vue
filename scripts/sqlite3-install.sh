#!/bin/bash

echo -e "START\t: $0 `date`"
SCRIPTS=`dirname $0`
echo -e "INSTALL\t: `pwd`"

SQLVER=`sqlite3 -version`
RC=$?
VER=v1.0
DB=oyamist-${VER}.db
if [ "$RC" == "0" ]; then
    echo -e "INSTALL\t: SQlite ($SQLVER) is already installed => OK"
else
    echo -e "INSTALL\t: Installing SQLite"
    sudo apt-get install sqlite3
    RC=$?; if [ "$RC" != "0" ]; then 
        echo -e "INSTALL\t: SQLite  installation failed RC:$RC"
        exit $RC;
    fi
    echo -e "INSTALL\t: SQLite (`sqlite3 --version`) installed => OK"
fi

if [ -e ${DB} ]; then
    echo -e "INSTALL\t: SQLite database exists:${DB}"
else
    echo -e "INSTALL\t: Creating SQLite database: ${DB}"
    sqlite3 ${DB} < ${SCRIPTS}/create-${VER}.sql
    ${SCRIPTS}/db-update-${VER}.sh
fi

echo -e "END\t: $0 `date`"
