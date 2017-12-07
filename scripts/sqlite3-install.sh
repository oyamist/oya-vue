#!/bin/bash

echo -e "START\t: $0 `date`"
#pushd `dirname $0` >& /dev/null
SCRIPTS=`dirname $0`
echo -e "INSTALL\t: `pwd`"

SQLVER=`sqlite3 -version`
RC=$?
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

if [ -e oyamist.db ]; then
    echo -e "INSTALL\t: SQLite database exists:oyamist.db"
else
    echo -e "INSTALL\t: Creating SQLite database: oyamist.db"
    sqlite3 oyamist.db < ${SCRIPTS}/create.sql
fi

echo -e "END\t: $0 `date`"
