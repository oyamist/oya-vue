<template>

    <div>
        <div class="pt-3 pl-5 pr-4 text-sm-center">
            <v-menu lazy :close-on-content-click="false" v-model="menu"
                 transition="scale-transition" offset-y  
                 :nudge-right="40" max-width="290px" min-width="290px" >
                <v-text-field slot="activator" label="Chart End Date" readonly
                    @blur="date = parseDate(dateFormatted)"
                    v-model="dateFormatted" prepend-icon="event" >
                </v-text-field>
                <v-date-picker v-model="date" scrollable actions
                    @input="dateFormatted = formatDate($event)">
                  <template slot-scope="{ save, cancel }">
                    <v-card-actions>
                      <v-spacer></v-spacer>
                      <v-btn flat color="primary" @click="cancel">Cancel</v-btn>
                      <v-btn flat color="primary" @click="save">OK</v-btn>
                    </v-card-actions>
                  </template>
                </v-date-picker>
            </v-menu>
        </div>
        <oya-chart palette="red" sensorProp="tempInternal" :date="date" :service='service'></oya-chart>
        <oya-chart palette="blue" sensorProp="humidityInternal" :date="date" :service='service'></oya-chart>
        <oya-chart palette="blue" sensorProp="ecInternal" :date="date" :service='service'></oya-chart>
        <oya-chart palette="red" sensorProp="tempCanopy" :date="date" :service='service'></oya-chart>
        <oya-chart palette="blue" sensorProp="humidityCanopy" :date="date" :service='service'></oya-chart>
        <oya-chart palette="blue" sensorProp="ecCanopy" :date="date" :service='service'></oya-chart>
        <oya-chart palette="red" sensorProp="tempAmbient" :date="date" :service='service'></oya-chart>
        <oya-chart palette="blue" sensorProp="humidityAmbient" :date="date" :service='service'></oya-chart>
        <oya-chart palette="blue" sensorProp="ecAmbient" :date="date" :service='service'></oya-chart>
    </div>

</template><script>

const Vue = require('vue').default;
import rbvue from "rest-bundle/index-vue";

export default {
    name: 'oya-chart-panel',
    mixins: [ 
        rbvue.mixins.RbAboutMixin, 
        rbvue.mixins.RbServiceMixin,
    ],
    data: function() {
        var date = new Date().toISOString().substr(0,10);
        var dateFormatted = this.formatDate(date);
        return {
            date,
            dateFormatted,
            menu: false,
        }
    },
    props: {
    },
    methods: {
        formatDate (date = new Date().toISOString().substr(0,10)) {
            const [year, month, day] = date.split('-')
            var result = `${month}/${day}/${year}`
            this.rbService && Vue.set(this.rbService, 'reportDate', date);
            return result;
        },
        parseDate (date) {
            if (!date) {
                return null;
            }

            const [month, day, year] = date.split('/');
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        },
    },
    mounted() {
        var reportDate = new Date().toISOString().substr(0,10);
        Vue.set(this.rbService, 'reportDate', reportDate);
    },
}
</script><style>
</style>
