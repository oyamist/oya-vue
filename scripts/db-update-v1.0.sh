#!/bin/bash

if [ ! -e oyamist.db ]; then
    echo -e "UPDATE\t: No database to update"
    exit 0
fi

sqlite3 oyamist.db <<HEREIS1
.headers on
.mode csv
.output oyamist.csv
select 
    utc,
    evt,
    vessel ctx,
    v
from sensordata;
HEREIS1
RC=$?; if [ "$RC" != "0" ]; then
    echo -e "ERROR\t: export failed $RC"
    exit $RC
fi

sqlite3 oyamist-v1.0.db <<HEREIS2
.mode csv
.import oyamist.csv sensordata
HEREIS2
RC=$?; if [ "$RC" != "0" ]; then
    echo -e "ERROR\t: import failed $RC"
    exit $RC
fi

mv oyamist.csv /tmp
#mv oyamist.db /tmp

echo -e "UPDATE\t: updated oyamist.db to oyamist-v1.0.db"
