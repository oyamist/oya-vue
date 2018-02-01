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
        <div v-if="this.rbService['oya-conf'].apiModel">
            <oya-chart palette="red" sensorProp="tempInternal" :date="date" 
                :stepSize="stepSize('temp')" :service='service'></oya-chart>
            <oya-chart palette="blue" sensorProp="humidityInternal" :date="date" 
                :stepSize="stepSize('humidity')" :service='service'></oya-chart>
            <oya-chart palette="blue" sensorProp="ecInternal" :date="date" 
                :stepSize="stepSize('ec')" :service='service'></oya-chart>
            <oya-chart palette="red" sensorProp="tempCanopy" :date="date" 
                :stepSize="stepSize('temp')" :service='service'></oya-chart>
            <oya-chart palette="blue" sensorProp="humidityCanopy" :date="date" 
                :stepSize="stepSize('humidity')" :service='service'></oya-chart>
            <oya-chart palette="blue" sensorProp="ecCanopy" :date="date" 
                :stepSize="stepSize('ec')" :service='service'></oya-chart>
            <oya-chart palette="red" sensorProp="tempAmbient" :date="date" 
                :stepSize="stepSize('temp')" :service='service'></oya-chart>
            <oya-chart palette="blue" sensorProp="humidityAmbient" :date="date" 
                :stepSize="stepSize('humidity')" :service='service'></oya-chart>
            <oya-chart palette="blue" sensorProp="ecAmbient" :date="date" 
                :stepSize="stepSize('ec')" :service='service'></oya-chart>
        </div>
        <!--
        <rb-api-dialog :apiSvc="apiSvc" v-if="apiModelCopy && apiModelCopy.rbHash">
            <div slot="title">Bioreactor Settings</div>
            <v-footer fixed dark v-show="alertRestart() ">
                <div style="width:100%">
                    <v-alert type=warning color="orange " v-show="alertRestart()">
                        NOTE: Pin configuration changes require system restart
                    </v-alert>
                </div>
            </v-footer>
            <v-expansion-panel >
                <v-expansion-panel-content>
                    <div slot="header">Charts</div>
                    <v-card>
                        <v-card-text>
                            <rb-dialog-row label="Display">
                                <v-text-field type="number" v-model="apiModelCopy.chart.tempStepSize"
                                    label="Temperature chart step size" class="input-group" />
                                <v-text-field type="number" v-model="apiModelCopy.chart.humidityStepSize"
                                    label="Humidity chart step size" class="input-group" />
                                <v-text-field type="number" v-model="apiModelCopy.chart.ecStepSize"
                                    label="Nutrient/EC chart step size" class="input-group" />
                                <v-checkbox label="Display raw sensor values" 
                                    v-model="apiModelCopy.chart.showRaw" light>
                                </v-checkbox>
                            </rb-dialog-row>
                            <rb-dialog-row label="Nutrients">
                                <v-select 
                                    v-bind:items="nutrientUnits()"
                                    v-model="apiModelCopy.chart.ecUnits"
                                    label="Units"
                                    ></v-select>
                                <v-text-field type="number" v-model="apiModelCopy.chart.ecStepSize"
                                    label="Calibration solution value" class="input-group" />
                                <v-text-field type="text" v-model="calText"
                                    placeholder="Enter solution name"
                                    label="Calibration solution" class="input-group" />
                                <v-menu lazy :close-on-content-click="false" v-model="ecmenu"
                                     transition="scale-transition" offset-y  
                                     :nudge-right="40" max-width="290px" min-width="290px" >
                                    <v-text-field slot="activator" readonly v-model="calDate"
                                        label="Calibration start date" prepend-icon="event" 
                                        @blur="calPickerDate = toPickerDate(calDate)"
                                    ></v-text-field>
                                    <v-date-picker v-model="calPickerDate" scrollable actions
                                        @input="calDate = fromPickerDate($event)">
                                      <template slot-scope="{ save, cancel }">
                                        <v-card-actions>
                                          <v-spacer></v-spacer>
                                          <v-btn flat color="primary" @click="cancel">Cancel</v-btn>
                                          <v-btn flat color="primary" @click="save">OK</v-btn>
                                        </v-card-actions>
                                      </template>
                                    </v-date-picker>
                                </v-menu>
                                <v-btn color="primary" @click="calibrate('ecInternal')">Calibrate</v-btn>
                                <v-alert type=warning v-show="alertCalWait" color="orange">
                                    {{alertCalWait}}
                                </v-alert>
                                <v-alert type=error v-show="alertCalError">
                                    <div v-show="alertCalError"> {{alertCalError}} </div>
                                </v-alert>
                                <v-alert type=success v-show="alertCal" color="green darken-3">
                                    <div v-show="alertCal"> {{alertCal}} </div>
                                </v-alert>
                            </rb-dialog-row>
                        </v-card-text>
                    </v-card>
                </v-expansion-panel-content>
            </v-expansion-panel>
        </rb-api-dialog>
        -->
    </div>

</template><script>

const Vue = require('vue').default;
import rbvue from "rest-bundle/index-vue";

export default {
    name: 'oya-chart-panel',
    mixins: [ 
        rbvue.mixins.RbAboutMixin, 
        rbvue.mixins.RbServiceMixin,
        rbvue.mixins.RbApiMixin.createMixin("oya-conf"),
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
        stepSize(prefix) {
            var key = `${prefix}StepSize`;
            var oyaConf = this.rbService['oya-conf'];
            var apiModel = oyaConf && oyaConf.apiModel;
            var chart = apiModel && apiModel.chart;
            return Number(chart && chart[key] || 10);
        },
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
