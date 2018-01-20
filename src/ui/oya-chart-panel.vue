<template>

    <div>
        <oya-chart palette="red" sensorProp="tempInternal" :service='service'></oya-chart>
        <oya-chart palette="blue" sensorProp="humidityInternal" :service='service'></oya-chart>
        <oya-chart palette="blue" sensorProp="ecInternal" :service='service'></oya-chart>
        <oya-chart palette="red" sensorProp="tempCanopy" :service='service'></oya-chart>
        <oya-chart palette="blue" sensorProp="humidityCanopy" :service='service'></oya-chart>
        <oya-chart palette="blue" sensorProp="ecCanopy" :service='service'></oya-chart>
        <oya-chart palette="red" sensorProp="tempAmbient" :service='service'></oya-chart>
        <oya-chart palette="blue" sensorProp="humidityAmbient" :service='service'></oya-chart>
        <oya-chart palette="blue" sensorProp="ecAmbient" :service='service'></oya-chart>
    </div>

</template><script>

export default {
    name: 'oya-chart-panel',
    props: {
        service: {
            default: 'test',
        },
    },
}

</script><style>

</style>
