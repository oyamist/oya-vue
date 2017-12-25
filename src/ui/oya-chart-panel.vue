<template>

    <div>
        <oya-chart palette="red" sensorProp="tempInternal" service="test"></oya-chart>
        <oya-chart palette="blue" sensorProp="humidityInternal" service="test"></oya-chart>
        <oya-chart palette="red" sensorProp="tempExternal" service="test"></oya-chart>
        <oya-chart palette="blue" sensorProp="humidityExternal" service="test"></oya-chart>
        <oya-chart palette="red" sensorProp="tempAmbient" service="test"></oya-chart>
        <oya-chart palette="blue" sensorProp="humidityAmbient" service="test"></oya-chart>
    </div>

</template><script>

export default {
    name: 'oya-chart-panel',
}

</script><style>

</style>
