#!/bin/bash

sqlite3 oyamist-v1.0.db <<HEREIS1
select substr( strftime("%Y-%m-%d %H%M",utc,"localtime"), 0, 15) hr, avg(v) vavg, evt
from sensordata
where
    utc between '2018-01-31' and '2018-02-01' 
    and evt in ('sense: ec-internal','sense: temp-internal')
group by evt, hr
order by evt, hr desc
limit 24;
HEREIS1
RC=$?; if [ "$RC" != "0" ]; then
    echo -e "ERROR\t: failed $RC"
    exit $RC
fi

