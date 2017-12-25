<template>

    <v-expansion-panel>
        <v-expansion-panel-content >
            <div slot="header">Controls</div>
            <oya-reactor service="test"></oya-reactor>
        </v-expansion-panel-content>
        <v-expansion-panel-content>
            <div slot="header">Charts</div>
            <oya-chart-panel/>
        </v-expansion-panel-content>
    </v-expansion-panel>

</template><script>

export default {
    name: 'introduction',
}

</script><style>


</style>
