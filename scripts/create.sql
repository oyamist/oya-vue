CREATE TABLE IF NOT EXISTS sensordata (
    vessel text NOT NULL,
    evt text NOT NULL,
    utc text NOT NULL,
    v real,
    primary key(vessel,evt,utc)
) WITHOUT ROWID;
