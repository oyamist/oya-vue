<template>

    <div>
        <div class="pt-3 pl-5 pr-4 oya-chart-panel-header">
            <v-menu lazy :close-on-content-click="false" v-model="reportDateMenu"
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
            <v-btn icon @click="clickSettings"><v-icon>settings</v-icon></v-btn>
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
        <rb-api-dialog :apiSvc="apiSvc" v-if="apiModelCopy && apiModelCopy.rbHash">
            <div slot="title">Chart Settings</div>
            <v-card flat>
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
                    </rb-dialog-row>
                </v-card-text>
            </v-card>
        </rb-api-dialog>
    </div>

</template><script>

const Vue = require('vue').default;
import rbvue from "rest-bundle/index-vue";

export default {
    name: 'oya-chart-panel',
    mixins: [ 
        rbvue.mixins.RbAboutMixin, 
        rbvue.mixins.RbApiMixin.createMixin("oya-conf"),
    ],
    data: function() {
        var calPickerDate = new Date().toISOString().substr(0,10);
        var calDate = this.fromPickerDate(calPickerDate);
        var date = new Date().toISOString().substr(0,10);
        var dateFormatted = this.formatDate(date);
        return {
            calText: null,
            alertCalWait: null,
            alertCalError: null,
            calDate,
            calPickerDate,
            date,
            dateFormatted,
            reportDateMenu: false,
            ecmenu: false,
        }
    },
    props: {
    },
    methods: {
        calibrate(field) {
            this.alertCalWait = "Calibration in progress...";
            var opts = {
                startDate: this.calPickerDate,
                unit: '%',
                name: this.calText,
            };
            console.log('calibrate', opts);
            var url = [this.restOrigin(), this.service, 'sensor', 'calibrate'].join('/');
            this.$http.post(url, opts).then(r => {
                this.alertCalWait = null;
                var cal = r.data;
                var msg = `${cal.name} completed. Nominal:${cal.nominal}`; 
                console.log(msg);
                this.alertSuccess(msg);
                this.apiCancel();
            }).catch(e => {
                this.alertCalWait = null;
                this.alertCalError = e;
                this.alertError(e.message);
            });
        },
        fromPickerDate (date = new Date().toISOString().substr(0,10)) {
            const [year, month, day] = date.split('-')
            return `${month}/${day}/${year}`
        },
        toPickerDate (date) {
            if (!date) {
                return null;
            }

            const [month, day, year] = date.split('/');
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        },
        nutrientUnits() {
            return [{
                text: "% of calibration solution",
                value: "%",
            },{
                text: "parts/million (ppm)",
                value: "ppm",
            },{
                text: "conductivity (microsiemens)",
                value: "\u00b5S",
            }];
        },
        clickSettings() {
            this.rbDispatch("apiLoad").then(r => {
                this.apiEdit({
                    onSave: () => {
                        window.location.reload();
                    },
                });
            });
        },
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
.oya-chart-panel-header {
    display: flex;
    flex-flow: wrap; 
    justify-content: space-between;
    align-items:center;
}
</style>
