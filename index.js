module.exports = {
    Actuator: require("./src/actuator"),
    Sensor: require("./src/sensor"),
    DbFacade: require("./src/db-facade"),
    SystemFacade: require("./src/system-facade"),
    DbSqlite3: require('./src/db-sqlite3'),
    OyaConf: require("./src/oya-conf"),
    OyaVessel: require("./src/oya-vessel"),
    OyaReactor: require("./src/oya-reactor"),
};
