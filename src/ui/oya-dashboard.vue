<template>

<div>
    <div class="oya-dashboard">
        <div class="pr-2 pt-1 oya-dashboard-header">
            <div class="pl-2 title">{{title}}</div>
            <oya-health service="oyamist" width="20em"/>
            <v-icon @click="showAdvanced=!showAdvanced">settings</v-icon>
        </div>
        <oya-plant service="oyamist" />
        <div style="flex-grow:1">&nbsp;</div>
        <oya-reactor service="oyamist" v-show="showAdvanced"></oya-reactor>
        <table>
            <tr>
                <th>&nbsp;</th>
                <th>Internal</th>
                <th>Canopy</th>
                <th>Ambient</th>
            </tr>
            <tr >
                <th>Temperature</th>
                <td><oya-sensor service='oyamist' sensorProp="tempInternal"/> </td>
                <td><oya-sensor service='oyamist' sensorProp="tempCanopy"/> </td>
                <td><oya-sensor service='oyamist' sensorProp="tempAmbient"/> </td>
            </tr>
            <tr >
                <th>Humidity</th>
                <td><oya-sensor service='oyamist' sensorProp="humidityInternal"/> </td>
                <td><oya-sensor service='oyamist' sensorProp="humidityCanopy"/> </td>
                <td><oya-sensor service='oyamist' sensorProp="humidityAmbient"/> </td>
            </tr>
            <tr>
                <th>Nutrient strength</th>
                <td> <oya-sensor service='oyamist' sensorProp="ecInternal"/> </td><td>
                <oya-sensor service='oyamist' sensorProp="ecCanopy"/> </td><td>
                <oya-sensor service='oyamist' sensorProp="ecAmbient"/>
                </td>
            </tr>
        </table>
    </div>
</div>

</template><script>

export default {
    name: 'oya-dashboard',
    data() {
        return {
            showAdvanced: false,
        };
    },
    methods: {
        clickSettings() {
        },
    },
    computed: {
        title() {
            var restBundle = this.$store.state.restBundle;
            var oyamist = restBundle && restBundle.oyamist;
            var oyaConf = oyamist && oyamist['oya-conf'];
            var apiModel = oyaConf && oyaConf.apiModel;
            var vessel = apiModel && apiModel.vessel;
            return vessel && vessel.name || "Dashboard";
        },
        host() {
            var host = location.host;
            return host.match(/:4000/) ? 'localhost:8080' : host;
        },
    },
}

</script><style>
.oya-dashboard {
    display: flex;
    flex-flow: column;
    justify-content: space-between;
}
.oya-dashboard-header {
    display: flex;
    flex-flow: row nowrap;
    justify-content: space-between;
    align-items: flex-start;
}
</style>
