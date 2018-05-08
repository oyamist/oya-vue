<template>

<div>
    <rb-about v-if="about" :name="componentName">
        <p> OyaReactor status and configuration
        </p>
        <rb-about-item name="about" value="false" slot="prop">Show this descriptive text</rb-about-item>
        <rb-about-item name="service" value="oyamist" slot="prop">RestBundle name</rb-about-item>
            index (0-based) of vessel for component</rb-about-item>
    </rb-about>

    <div class="pl-2" style="display:flex; flex-wrap: wrap; flex-direction: row; justify-content: space-around; align-items:flex-start;">
        <v-card flat >
            <v-card-text class="text-xs-center" style="position:relative">
                <div v-if="showPumpCycle"
                    style="display:flex; flex-direction: row; justify-content:space-around; flex-wrap: wrap; cursor: default">
                    <div style="min-width: 20em">
                        <div v-if="curCycle " class="pl-3">
                            <v-select
                              v-bind:items="cycles"
                              v-model="curCycle"
                              label="Active cycle"
                              item-text="name"
                              item-value="key"
                              return-object
                              :hint="`${curCycle.desc}`"
                              persistent-hint
                             ></v-select>
                        </div>
                        <v-list v-show="vessel" dense subheader>
                            <v-list-tile v-for="(actuator,i) in actuators" :key="actuator.name+i" 
                                @click="actuator.pin >= 0 && clickActuator(actuator)"
                                v-show="actuator.pin >= 0"
                                >
                                <v-list-tile-action >
                                </v-list-tile-action >
                                <v-list-tile-content>
                                    <v-list-tile-title v-show="actuator.pin >= 0">
                                        {{actuator.name}}
                                    </v-list-tile-title>
                                </v-list-tile-content>
                                <v-list-tile-action v-show='rbService[actuator.name]' >
                                    <v-switch value input-value="true" color="blue darken-2" ></v-switch>
                                </v-list-tile-action>
                                <v-list-tile-action v-show='!rbService[actuator.name]' >
                                    <v-switch ></v-switch>
                                </v-list-tile-action>
                            </v-list-tile>
                        </v-list>
                    </div>
                </div>
                <v-btn color="primary" @click="clickSettings">Settings</v-btn>
                <v-btn color="primary" @click="clickUpdate">Update</v-btn>
                <v-btn color="error" @click="clickRestart">Restart</v-btn>
                <v-dialog persistent v-model="updateToggle">
                    <v-card>
                        <v-card-title>Update application and restart system?</v-card-title>
                        <v-card-actions >
                            <v-btn color="error" :disabled="alertUpdate" @click="confirmUpdate">Update</v-btn>
                            <v-btn @click="cancelUpdate">Cancel</v-btn>
                        </v-card-actions>
                        <v-alert type=warning v-show="alertUpdate && !updateStatus && !updateComplete" 
                            color="orange">
                            <div v-show="!updateStatus"> Update in progress:{{updateSeconds}} ...  </div>
                        </v-alert>
                        <v-alert type=error v-show="updateStatus">
                            <div v-show="updateStatus"> STATUS: {{updateStatus}} </div>
                        </v-alert>
                        <v-alert type=success v-show="updateComplete" color="green darken-3">
                            <div v-show="updateComplete"> 
                                <div v-for="line in updateComplete">
                                    {{line}}
                                </div>
                            </div>
                        </v-alert>
                    </v-card>
                </v-dialog>
                <v-dialog persistent v-model="restartToggle">
                    <v-card>
                        <v-card-title>Restart system?</v-card-title>
                        <v-card-actions >
                            <v-btn color="error" :disabled="alertRestarting" @click="confirmRestart">Restart</v-btn>
                            <v-btn @click="cancelRestart">Cancel</v-btn>
                        </v-card-actions>
                        <v-alert type=warning v-show="alertRestarting" color="orange">
                            <div > {{restartStatus}} {{updateSeconds}} ...  </div>
                        </v-alert>
                    </v-card>
                </v-dialog>
            </v-card-text>
            <v-system-bar v-if='httpErr' class='error' dark>
                <span >{{httpErr.response.data.error || httpErr.response.statusText}}</span>
            </v-system-bar>
        </v-card>
    </div>
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
                <div slot="header">General</div>
                <v-card>
                    <v-card-text>
                        <v-text-field v-model='apiModelCopy.vessel.name' 
                            label="Name" class="input-group--focused" />
                        <v-select v-bind:items="mcuHatItems" 
                            v-model='apiModelCopy.mcuHat' 
                            label="MCU hardware extension hats"
                            class="input-group"
                            ></v-select>
                        <v-select v-bind:items="cameraItems" 
                            v-model='apiModelCopy.camera' 
                            label="Camera"
                            class="input-group"
                            ></v-select>
                        <v-select v-bind:items="tempItems" 
                            v-model='apiModelCopy.tempUnit' 
                            label="Temperature unit"
                            class="input-group"
                            ></v-select>
                        <v-text-field v-model='apiModelCopy.hostTimeout'
                            type="number"
                            :label="`Network host HTTP timeout (ms)`" class="input-group" />
                    </v-card-text>
                </v-card>
            </v-expansion-panel-content>
            <v-expansion-panel-content>
                <div slot="header">Switches</div>
                <v-card>
                    <v-card-text>
                        <rb-dialog-row v-for="(sw,i) in mutableSwitches" :key="sw.name+i"
                            :label="sw.name" >
                            <v-select v-bind:items="switchEventItems" 
                                v-model='sw.event'
                                label="Activation Event"
                                class="input-group"
                                ></v-select>
                            <v-select v-bind:items="switchActionItems" 
                                v-model='sw.type'
                                label="MCU Input"
                                class="input-group"
                                ></v-select>
                            <v-text-field type="number" v-model="sw.pin"
                                required :rules="pinRules(sw.pin)"
                                label="MCU Pin" class="input-group" />
                        </rb-dialog-row>
                    </v-card-text>
                </v-card>
            </v-expansion-panel-content>
            <v-expansion-panel-content>
                <div slot="header">Light cycles</div>
                <v-card>
                    <v-card-text>
                        <rb-dialog-row v-for="(light,i) in mutableLights" :key="light.name+i"
                            :label="light.name" >
                            <div style="display:flex; flex-flow: row wrap;">
                                <v-text-field label="Hours on" class="pr-2" required
                                    v-model="light.cycleOn" 
                                    type="number" :rules="nonNegRules(light.cycleOn)" ></v-text-field>
                                <v-text-field label="Hours off" class="pr-2" required
                                    type="number" :rules="nonNegRules(light.cycleOff)"
                                    v-model="light.cycleOff" ></v-text-field>
                                <v-text-field label="Total hours" class="pr-2" 
                                    :append-icon="lightPeriodIcon(light)"
                                    readonly :value="lightPeriod(light)" ></v-text-field>
                            </div>
                            <div style="display:flex; flex-flow: row wrap;">
                                <v-select v-bind:items="dayOfWeekItems" v-model='light.cycleStartDay' 
                                    label="Start day" class="pr-2 input-group" ></v-select>
                                <v-text-field label="Start time" v-model="light.cycleStartTime" 
                                    required :rules="hhmmRules(light.cycleStartTime)"
                                    ></v-text-field>
                            </div>
                            <div style="display:flex; flex-flow: row wrap;">
                                <v-text-field label="Cycle days" class="pr-2"
                                    v-model="light.cycleDays" ></v-text-field>
                                <v-text-field type="number" v-model="light.pin"
                                    required :rules="pinRules(light.pin)"
                                    label="MCU Pin" class="input-group" />
                            </div>
                        </rb-dialog-row>
                    </v-card-text>
                </v-card>
            </v-expansion-panel-content>
            <v-expansion-panel-content>
                <div slot="header">Pump cycles</div>
                <v-card>
                    <v-card-text>
                        <rb-dialog-row label="General">
                            <v-text-field v-model='coolThreshold' 
                                type="number"
                                :label="`Cooling threshold (\u00b0${apiModelCopy.tempUnit})`" class="input-group" />
                        </rb-dialog-row>
                        <rb-dialog-row :label="`${cycleCopy.name}: ${cycleCopy.cycle.name}`" 
                            v-for="(cycleCopy,i) in editCycles" :key="cycleCopy.name+i">
                            <v-text-field v-model='cycleCopy.cycle.desc'
                                label="Description" class="input-group" />
                            <v-layout>
                                <v-flex xs3>
                                    <v-text-field v-model='cycleCopy.cycle.on' type="number"
                                        :label="'On seconds \u21d2'" class="input-group pr-1" />
                                </v-flex>
                                <v-flex xs3>
                                    <v-text-field v-model='cycleCopy.cycle.off' type="number"
                                        :label="'Off seconds \u21d2'" class="input-group pr-1" />
                                </v-flex>
                                <v-select v-bind:items="cycleItems" 
                                    v-model='cycleCopy.cycle.nextCycle' 
                                    label="Next cycle"
                                    class="input-group"
                                    ></v-select>
                            </v-layout>
                        </rb-dialog-row>
                    </v-card-text>
                </v-card>
            </v-expansion-panel-content>
            <v-expansion-panel-content>
                <div slot="header">Actuators</div>
                <v-card>
                    <v-card-text>
                        <rb-dialog-row v-for="(actuator,i) in mutableActuators" :key="actuator.name+i"
                            :label="actuator.name" >
                            <v-text-field type="number" v-model="actuator.pin"
                                required :rules="pinRules(actuator.pin)"
                                label="MCU Pin" class="input-group" />
                        </rb-dialog-row>
                        <rb-dialog-row v-for="(light,i) in mutableLights" :key="light.name+i"
                            :label="light.name" >
                            <v-text-field type="number" v-model="light.pin"
                                required :rules="pinRules(light.pin)"
                                label="MCU Pin" class="input-group" />
                        </rb-dialog-row>
                    </v-card-text>
                </v-card>
            </v-expansion-panel-content>
            <v-expansion-panel-content>
                <div slot="header">Sensors</div>
                <v-card>
                    <v-card-text>
                        <rb-dialog-row label="All Sensors">
                            <v-text-field v-model='apiModelCopy.vessel.sensorExpRate' 
                            type="number"
                            :label="`Trending sensitivity (exponential smoothing rate)`" class="input-group" />
                        </rb-dialog-row>
                        <rb-dialog-row v-for="(sensor,i) in mutableSensors" :key="name+i"
                            class="pb-5"
                            :label="`Sensor #${i+1}`" >
                            <v-select
                                v-bind:items="sensorTypes"
                                v-model="sensor.type"
                                label="Sensor type"
                                @input="clickSensorType(sensor)"
                                item-text="desc"
                                item-value="type"
                                ></v-select>
                            <v-text-field v-model="sensor.name" label="Name"/>
                            <v-select
                                v-bind:items="sensorLocations"
                                v-model="sensor.loc"
                                label="Location"
                                item-text="desc"
                                item-value="id"
                                ></v-select>
                            <div style="display:flex">
                                <v-checkbox v-if="sensor.readEC != null"
                                    label="Nutrient strength (EC/PPM/%)" v-model="sensor.readEC" light></v-checkbox>
                                <v-checkbox v-if="sensor.readTemp != null"
                                    label="Temperature" v-model="sensor.readTemp" light></v-checkbox>
                                <v-checkbox v-if="sensor.readHumidity != null"
                                    label="Humidity" v-model="sensor.readHumidity" light></v-checkbox>
                            </div>
                            <v-select v-if="sensor.addresses"
                                v-bind:items="sensorAddresses(sensor)"
                                v-model="sensor.address"
                                label="Address"
                                ></v-select>
                            <v-btn v-if="sensor.cmdCalDry" @click="calibrateDry(sensor)">
                                Calibrate Dry
                            </v-btn>
                            <v-alert type=error v-show='alertCalDryError'>
                                {{alertCalDryError}}
                            </v-alert>
                            <v-alert type=success color="green darken-4" v-show="alertCalDry">
                                {{alertCalDry}}
                            </v-alert>
                        </rb-dialog-row>
                    </v-card-text>
                </v-card>
            </v-expansion-panel-content>
        </v-expansion-panel>
    </rb-api-dialog>
    <v-btn class="amber" v-show="about" @click="mockSensors()">Mock Sensors </v-btn>
</div>

</template>
<script>

import Vue from 'vue';
import rbvue from "rest-bundle/index-vue";
const RbApiDialog = rbvue.components.RbApiDialog;
const RbDialogRow = rbvue.components.RbDialogRow;
import OyaChart from "./oya-chart.vue";
import OyaSensor from "./oya-sensor.vue";
import OyaProgress from "./oya-progress.vue";

export default {
    mixins: [ 
        rbvue.mixins.RbAboutMixin, 
        rbvue.mixins.RbApiMixin.createMixin("oya-conf"),
    ],
    props: {
    },
    data: function() {
        return {
            alertCalDry: null,
            alertCalDryError: null,
            alertRestarting: false,
            alertUpdate: false,
            apiEditDialog: false,
            cycleStartTimeMenu: false,
            cycleToggle: false,
            ecmenu: false,
            mcuHatItems: null,
            mockPhase: 0,
            msUpdate: null,
            restartStatus: "",
            restartToggle: false,
            updateComplete: null,
            updateSeconds: null,
            updateStatus: null,
            updateToggle: false,

        }
    },
    methods: {
        calibrateDry(sensor) {
            console.log("calibrate dry", sensor.name);
            this.alertCalDry = null;
            this.alertCalDryError = null;
            var url = [this.restOrigin(), this.service, 'sensor', 'calibrate'].join('/');
            this.$http.post(url, {
                sensor: sensor.name,
                calibrateDry: true,
            }).then(r => {
                this.alertCalDry = `${sensor.name} has been dry calibrated`;
                console.log(this.alertCalDry);
            }).catch(e => {
                var data = e.response && e.response.data;
                var error = data && data.error;
                this.alertCalDryError = `Could not perform dry calibration:${e.message} ${error}`;
                console.error(this.alertCalDryError);
            });
        },
        alertRestart() {
            var s1 = "";
            s1 += this.apiModel.mcuHat;
            s1 = this.apiModel.switches.reduce((acc,a)=>acc+a.pin,s1);  
            var s2 = "";
            s2 += this.apiModel.mcuHat;
            s2 = this.apiModelCopy.switches.reduce((acc,a)=>acc+a.pin,s2);  
            return s1 !== s2;
        },
        sensorAddresses(sensor) {
            var st =  this.sensorTypes.filter( st => st.type === sensor.type)[0];
            return st.addresses.map(a => {
                if (typeof a === "number") {
                    return {
                        value: a,
                        text: `${sensor.comm}: ${a} (= 0x${a.toString(16)}, ${a.toString(2)})`,
                    };
                } else {
                    return {
                        value: a,
                        text: `${sensor.comm}: ${a}`,
                    };
                }
            });
        },
        nonNegRules(value) {
            return [
                () => !!value || 'This field is required',
                () => !!value && Number(value)>=0 || 'Expected postiive number',
            ];
        },
        hhmmRules(value) {
            var pat = /^[0-9][0-9]:[0-9][0-9]$/;
            return [
                () => !!value || 'This field is required',
                () => !!value && pat.test(value) || 'Expected 24-hour time HH:MM',
            ];
        },
        pinRules(value) {
            return [
                () => !!value || 'This field is required',
                () => !!value && (Math.trunc(Number(value))+"") === (value+"") || 'Expected integer',
                () => !!value && Number(value) >= -1 || 'Expected positive number or -1 for no pin',
            ];
        },
        cycleDef(cycle) {
            var vessel = this.vessel;
            var cycle = cycle || this.rbService && this.rbService.cycle;
            return vessel && cycle && vessel.cycles[cycle];
        },
        clickSettings() {
            this.alertCalDry = null;
            this.alertCalDryError = null;
            this.rbDispatch("apiLoad").then(r => {
                this.apiEdit();
            });
        },
        clickRestart() {
            this.restartToggle = true;
            this.alertRestarting = false;
            this.restartStatus = "";
        },
        cancelRestart() {
            this.restartToggle = false;
        },
        confirmRestart() {
            this.alertRestarting = true;
            this.restartStatus = "Restart in progress...";
            this.msUpdate = Date.now();
            setInterval(()=>{
                this.updateSeconds = ((Date.now()-this.msUpdate)/1000).toFixed(0);
            }, 100);
            var url = [this.restOrigin(), this.service, 'app', 'restart'].join('/');
            this.$http.post(url, {
                // empty
            }).then(r => {
                console.log('restart response:',r);
                if (r.data.stderr) {
                    this.restartStatus = r.data.stderr;
                } else {
                    this.restartToggle = false;
                }
            }).catch(e => {
                this.restartStatus = `Restart failed:${e.message} ${JSON.stringify(e.response.data)}`;
                console.error("error", e);
            });
        },
        clickUpdate() {
            this.updateToggle = true;
            this.updateStatus = null;
            this.updateComplete = null;
            this.alertUpdate = false;
        },
        cancelUpdate() {
            this.updateToggle = false;
        },
        lightPeriod(light) {
            return Number(light.cycleOn) + Number(light.cycleOff);
        },
        lightPeriodIcon(light) {
            return this.lightPeriod(light) === 24 ? "check_circle" : "warning";
        },
        confirmUpdate() {
            this.alertUpdate = true;
            this.msUpdate = Date.now();
            setInterval(()=>{
                this.updateSeconds = ((Date.now()-this.msUpdate)/1000).toFixed(0);
            }, 100);
            var url = [this.restOrigin(), this.service, 'app', 'update'].join('/');
            this.$http.post(url, {
                // empty
            }).then(r => {
                console.log('update response:',r);
                if (r.data.stderr) {
                    this.updateStatus = r.data.stderr;
                } else {
                    this.updateComplete = r.data.stdout.split("\n");
                }
            }).catch(e => {
                if (e.message === 'Network Error') {
                    this.updateStatus = `Server has shut down for update...`;
                } else {
                    this.updateStatus = `Update failed:${e.message}`;
                    console.error("error", e);
                }
            });
        },
        clickActuator(actuator) {
            var url = [this.restOrigin(), this.service, 'actuator'].join('/');
            console.log("clicked", actuator);
            this.$http.post(url, {
                name: actuator.name,
                value: !this.rbService[actuator.name],
            }).then(r => {
                console.log("ok", r);
            }).catch(e => {
                console.error("error", e);
            });
        },
        mockSensors() {
            var url = [this.restOrigin(), this.service, 'sensor'].join('/');
            this.mockPhase += 2*Math.PI / 10;
            var mockFactor = 0.1*Math.sin(this.mockPhase);
            this.$http.post(url, {
                tempInternal: mockFactor + 20,
                ecInternal: mockFactor * 10,
                humidityInternal: 0.9 + mockFactor * 0.05,
            }).then(r => {
                this.rbService.cycle = r.data.cycle;
            }).catch(e => {
                console.error("error", e);
            });
        },
        clickSensorType(sensor) {
            var template = this.sensorTypes.filter(s => s.type === sensor.type)[0];
            Object.keys(template).forEach(key=>{
                sensor[key] = template[key];
            });
        },
    },
    computed: {
        showPumpCycle() {
            return this.apiModel && this.apiModel.actuators.reduce((a,ac) => a || ac.pin>=0,false);
        },
        coolThreshold: {
            get: function () {
                if (this.apiModelCopy == null) {
                    return null;
                }
                console.log("get cool",
                    this.apiModelCopy.vessel
                );
                var value = this.apiModelCopy.vessel.coolThreshold;
                if (this.apiModelCopy.tempUnit === 'F') {
                    value = value * 1.8 + 32;
                }
                return value;
            },
            set: function (value) {
                if (this.apiModelCopy) {
                    if (this.apiModelCopy.tempUnit === 'F') {
                        value = (value - 32)/1.8;
                    }
                    console.log("set cool", value);
                    this.apiModelCopy.vessel.coolThreshold = value;
                }
            },
        },
        switchActionItems() {
            return [{
                text: 'Activate on MCU high input (3.3-5V)',
                value: 'active:high',
            },{
                text: 'Activate on MCU low input (0V)',
                value: 'active:low',
            }];
        },
        switchEventItems() {
            return [{
                text: 'Prime misting system',
                value: 'event:cycle-prime',
            },{
                text: 'Start cooling cycle',
                value: 'event:cycle-cool',
            },{
                text: 'Start standard mist cycle',
                value: 'event:cycle-mist',
            }];
        },
        cycleItems() {
            return [{
                value: "Cycle #1",
                text: "Cycle #1: Standard",
            },{
                value: "Cycle #2",
                text: "Cycle #2: Prime",
            },{
                value: "Cycle #3",
                text: "Cycle #3: Cool",
            },{
                value: "Cycle #4",
                text: "Cycle #4: Conserve",
            }];
        },
        cameraItems() {
            return [{
                text: "No camera",
                value: 'none',
            },{
                text: "Camera: always on",
                value: 'always-on',
            },{
                text: "Camera: manually activated",
                value: 'manual',
            },{
                text: "Camera: active when light is on",
                value: 'when-lit',
            }];
        },
        dayOfWeekItems() {
            return [{
                text: "Sunday",
                value: 0,
            },{
                text: "Monday",
                value: 1,
            },{
                text: "Tuesday",
                value: 2,
            },{
                text: "Wednesday",
                value: 3,
            },{
                text: "Thursday",
                value: 4,
            },{
                text: "Friday",
                value: 5,
            },{
                text: "Saturday",
                value: 6,
            }]
        },
        tempItems() {
            return [{
                text: "Fahrenheit",
                value: "F",
            },{
                text: "Centigrade",
                value: "C",
            }]
        },
        curCycle: {
            get: function() {
                return this.vessel && this.rbService.cycle &&
                    this.vessel.cycles[this.rbService.cycle];
            },
            set: function(value) {
                var cycle = value.key;
                var url = [this.restOrigin(), this.service, 'reactor'].join('/');
                this.$http.post(url, {
                    cycle,
                }).then(r => {
                    console.log("changed cycle", r);
                    this.rbService.cycle = r.data.cycle;
                }).catch(e => {
                    console.error("error", e);
                });
            },
        },
        vessel() {
            return this.apiModel && this.apiModel.vessel;
        },
        mutableSwitches( ){
            return this.apiModelCopy && this.apiModelCopy.switches;
        },
        mutableActuators( ){
            return this.apiModelCopy && this.apiModelCopy.actuators;
        },
        mutableLights( ){
            return this.apiModelCopy && this.apiModelCopy.lights;
        },
        mutableSensors( ){
            return this.apiModelCopy && this.apiModelCopy.sensors;
        },
        actuators( ){
            return this.apiModel && this.apiModel.actuators;
        },
        name() {
            return this.vessel && this.vessel.name;
        },
        httpErr() {
            return this.rbResource.httpErr;
        },
        cycleKeys() {
            var vessel = this.vessel;
            if (vessel  == null) {
                return [];
            }
            return Object.keys(this.vessel.cycles).sort();
        },
        cycles() {
            var keys = this.cycleKeys;
            return this.cycleKeys.map(key => this.vessel.cycles[key]);
        },
        editCycles() {
            var cycleNames = Object.keys(this.vessel.cycles).sort();
            var vessel = this.apiModelCopy.vessel;
            return cycleNames.map(name => {
                return {
                    name: name,
                    cycle: vessel.cycles[name],
                }
            });
        },
    },
    components: {
        RbApiDialog,
        RbDialogRow,
        OyaChart,
        OyaSensor,
        OyaProgress,
    },
    created() {
        this.restBundleResource();
        this.rbDispatch("apiLoad").then(r => {
            console.log("OyaReactor apiLoad", r);
            this.selCycle = this.vessel.cycles[this.rbService.cycle];
        });
        var url = [this.restOrigin(), this.service, 'sensor/types'].join('/');
        this.sensorTypes = [];
        this.$http.get(url).then(r => {
            this.sensorTypes = r.data;
        }).catch(e => {
            console.error("error", e);
        });
        var url = [this.restOrigin(), this.service, 'sensor/locations'].join('/');
        this.sensorLocations = [];
        this.$http.get(url).then(r => {
            this.sensorLocations = r.data;
        }).catch(e => {
            console.error("error", e);
        });
        var url = [this.restOrigin(), this.service, 'mcu/hats'].join('/');
        this.$http.get(url).then(r => {
            this.mcuHatItems = r.data;
        }).catch(e => {
            console.error("error", e);
        });
    },
    mounted() {
    },
}

</script>
<style> 
.oya-desc {
    font-style: italic;
    font-size: xx-small;
}
.oya-desc:hover {
}
</style>
