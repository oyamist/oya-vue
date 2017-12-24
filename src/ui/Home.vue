<template>

    <v-expansion-panel>
        <v-expansion-panel-content >
            <div slot="header">Controls</div>
            <oya-reactor service="test"></oya-reactor>
        </v-expansion-panel-content>
        <v-expansion-panel-content >
            <div slot="header">Charts</div>
            <oya-chart palette="red" sensorProp="tempInternal" service="test"></oya-chart>
            <oya-chart palette="blue" sensorProp="humidityInternal" service="test"></oya-chart>
            <oya-chart palette="red" sensorProp="tempExternal" service="test"></oya-chart>
            <oya-chart palette="blue" sensorProp="humidityExternal" service="test"></oya-chart>
            <oya-chart palette="red" sensorProp="tempAmbient" service="test"></oya-chart>
            <oya-chart palette="blue" sensorProp="humidityAmbient" service="test"></oya-chart>
        </v-expansion-panel-content>
    </v-expansion-panel>

</template><script>

export default {
    name: 'introduction',
}

</script><style>


</style>
