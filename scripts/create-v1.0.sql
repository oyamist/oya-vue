CREATE TABLE IF NOT EXISTS sensordata (
    utc text NOT NULL,
    evt text NOT NULL,
    ctx text,
    v real,
    primary key(utc, evt)
) WITHOUT ROWID;
