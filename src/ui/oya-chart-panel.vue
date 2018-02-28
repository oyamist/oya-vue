<template>

    <div>
        <div class="pt-3 pl-5 pr-4 oya-chart-panel-header">
            <v-menu lazy :close-on-content-click="false" v-model="reportDateMenu"
                 transition="scale-transition" offset-y  
                 :nudge-right="40" max-width="290px" min-width="290px" >
                <v-text-field slot="activator" label="Chart End Date" readonly
                    @blur="date = parseDate(dateFormatted)"
                    v-model="dateFormatted" >
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
            <div>
                <v-menu offset-y>
                  <v-btn slot=activator icon><v-icon>settings</v-icon></v-btn>
                  <v-list>
                    <v-list-tile @click="clickSettings">
                      <v-list-tile-title>Edit Chart Settings</v-list-tile-title>
                    </v-list-tile>
                    <v-list-tile @click="calDialog=true">
                      <v-list-tile-title>Calibrate nutrient sensor</v-list-tile-title>
                    </v-list-tile>
                  </v-list>
                </v-menu>
            </div>
        </div>
        <div v-if="this.rbService['oya-conf'].apiModel">
            <oya-chart palette="red" sensorProp="tempInternal" :date="date" 
                :stepSize="stepSize('temp')" :service='service'></oya-chart>
            <oya-chart palette="blue" sensorProp="humidityInternal" :date="date" 
                :stepSize="stepSize('humidity')" :service='service'></oya-chart>
            <oya-chart palette="green" sensorProp="ecInternal" :date="date" 
                :stepSize="stepSize('ec')" :service='service'></oya-chart>
            <oya-chart palette="red" sensorProp="tempCanopy" :date="date" 
                :stepSize="stepSize('temp')" :service='service'></oya-chart>
            <oya-chart palette="blue" sensorProp="humidityCanopy" :date="date" 
                :stepSize="stepSize('humidity')" :service='service'></oya-chart>
            <oya-chart palette="green" sensorProp="ecCanopy" :date="date" 
                :stepSize="stepSize('ec')" :service='service'></oya-chart>
            <oya-chart palette="red" sensorProp="tempAmbient" :date="date" 
                :stepSize="stepSize('temp')" :service='service'></oya-chart>
            <oya-chart palette="blue" sensorProp="humidityAmbient" :date="date" 
                :stepSize="stepSize('humidity')" :service='service'></oya-chart>
            <oya-chart palette="green" sensorProp="ecAmbient" :date="date" 
                :stepSize="stepSize('ec')" :service='service'></oya-chart>
        </div>
        <v-dialog v-if="ecSensor" v-model="calDialog" max-width="90%" persistent>
            <v-card class="pl-3 pr-3">
                <v-card-title class="title">Calibrate nutrient sensor {{ecSensor.name}}</v-card-title>
                <v-card-text>
                    <div>Nutrient recipe affects conductivity measurement.</div>
                    <v-text-field type="text" v-model="calText"
                        placeholder='Enter description (e.g., "GH Flora Grow/Micro/Bloom 2:2:2")'
                        class="input-group pl-3" />
                    <div>Choose date with large temperature variations for training nutrient sensor AI.</div>
                    <v-menu lazy :close-on-content-click="false" v-model="ecmenu" class="pl-3"
                         transition="scale-transition" 
                         :nudge-right="40" max-width="290px" min-width="290px" >
                        <v-text-field slot="activator" readonly v-model="calDate"
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
                    <div>Choose measurement unit.</div>
                    <v-select class="pl-3" v-bind:items="nutrientUnits()" 
                        v-model="ecUnit"></v-select>
                    <div v-if="ecUnit!=='%'">
                        Enter nominal measurement value to display for calibration solution
                        <v-text-field type="number" v-model="ecNominal" class="input-group pl-3" />
                    </div>
                </v-card-text>
                <v-alert type=error v-show="alertCalError">
                    <div v-show="alertCalError"> {{alertCalError}} </div>
                </v-alert>
                <v-card-actions>
                    <v-spacer/>
                    <div v-show="alertCalWait">{{alertCalWait}}</div>
                    <v-btn color="grey lighten-2" @click="calDialog=false">Cancel</v-btn>
                    <v-btn color="primary" @click="calibrate('ecInternal')">Calibrate</v-btn>
                </v-card-actions>
                <v-card-text>
                    <a @click="calDialogMore=!calDialogMore">more...</a>
                </v-card-text>
                <v-card-text v-show="calDialogMore">
                    <h3>Why calibrate?</h3>
                    Nutrient conductivity measurement is affected
                    by temperature, time, and nutrient recipes.
                    Calibration provides temperature independent measurement.

                    <h3>What calibration solution should I use?</h3>
                    For convenience, calibrate sensor using actual nutrient solution.
                    Use a reference solution for calibration if nutrient recipes will
                    change during crop cycle.

                    <h3>How much calibration solution do I need?</h3>
                    Use 1 cup or 250ml of calibration solution to ensure largest temperature variation.
                    Larger amounts of calibration solution will eliminate the temperature variations
                    required for optimal calibration.

                    <h3>What probes do I need?</h3>
                    Immerse the following probes together directly into the calibration solution:
                    <div class="pl-4">
                        <ul>
                            <li>Temperature sensor (location: Internal)</li>
                            <li>Conductivity sensor such as Atlas Scientific EZO EC K1. (location: Internal)</li>
                        </ul>
                    </div>

                    <h3>What about 1-point and 2-point calibration?</h3>
                    Linear 1-point and 2-point calibrations are inaccurate. They are inaccurate because
                    the relationship between nutrient conductivity and temperature is non-linear.
                    The OyaMist sensor AI uses a day of training data for calibration.

                </v-card-text>
            </v-card>
        </v-dialog>
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
        var now = new Date();
        var calPickerDate = `${now.getFullYear()}-${now.getMonth()+1}-${now.getDate()}`;
        var calDate = this.fromPickerDate(calPickerDate);
        var date = calPickerDate;
        var dateFormatted = this.formatDate(date);
        return {
            calDialog: false,
            calDialogMore: false,
            calText: null,
            alertCalWait: null,
            alertCalError: null,
            calDate,
            calPickerDate,
            date,
            dateFormatted,
            ecUnit: '%',
            ecNominal: 100,
            reportDateMenu: false,
            ecmenu: false,
        }
    },
    props: {
    },
    computed: {
        ecSensor() {
            var oyaConf = this.rbService['oya-conf'];
            var apiModel = oyaConf && oyaConf.apiModel;
            var sensors = apiModel && apiModel.sensors;
            return sensors && sensors.filter(s=>s.readEC)[0];
        }
    },
    methods: {
        calibrate(field) {
            this.alertCalWait = "Calibrating...";
            var opts = {
                startDate: this.calPickerDate,
                nominal: this.ecUnit === '%' ? 100 : this.ecNominal,
                unit: this.ecUnit,
                name: this.calText || "(unknown solution)",
            };
            console.log('calibrate', opts);
            var url = [this.restOrigin(), this.service, 'sensor', 'calibrate'].join('/');
            this.$http.post(url, opts).then(r => {
                this.alertCalWait = null;
                var cal = r.data;
                var msg = `Calibrated ${cal.name} = ${cal.nominal} ${cal.unit}`; 
                console.log(msg);
                this.alertSuccess(msg);
                this.calDialog = false;
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
                text: "Nutrients available (100%)",
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
        var now = new Date();
        var reportDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        console.log('now', now, now.getDate());
        Vue.set(this.rbService, 'reportDate', reportDate);
        this.onApiModelLoaded('oya-conf').then(apiModel => {
            console.log('ecSensor', this.ecSensor);
            if (this.ecSensor) {
                this.calText = this.ecSensor.tempCal.name;
                this.ecNominal = this.ecSensor.tempCal.nominal;
                this.ecUnit = this.ecSensor.tempCal.unit;
                this.calPickerDate = this.ecSensor.tempCal.startDate.split("T")[0];
            }
            this.calDate = this.fromPickerDate(this.calPickerDate);
        }).catch(e => {
            console.error(e);
        });
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
