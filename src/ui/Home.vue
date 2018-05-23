<template>

    <div class="oya-dashboard">
        <div class="pl-3 pt-3 title" >Dashboard</div>
        <oya-plant service="oyamist" />
        <div style="flex-grow:1">&nbsp;</div>
        <div class="pt-5 text-xs-center">
            <v-icon @click="showAdvanced=!showAdvanced">more_horiz</v-icon>
        </div>
        <oya-reactor service="oyamist" v-show="showAdvanced"></oya-reactor>
        <div class="oya-dashboard-footer">&nbsp;</div>
    </div>

</template><script>

export default {
    name: 'introduction',
    data() {
        return {
            showAdvanced: false,
        };
    },
    methods: {
        clickSettings() {
        },
    },
}

</script><style>
.oya-dashboard {
    display: flex;
    flex-flow: column;
    justify-content: space-between;
    background: #ddd;
}
.oya-dashboard-footer {
    background: linear-gradient(#ddd,#fff);
    height: 20em;
}
</style>
