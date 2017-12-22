<template>

<div>
    <rb-about v-if="about" :name="componentName">
        <p> OyaReactor status and configuration
        </p>
        <rb-about-item name="about" value="false" slot="prop">Show this descriptive text</rb-about-item>
        <rb-about-item name="service" value="test" slot="prop">RestBundle name</rb-about-item>
        <rb-about-item name="vesselIndex" value="0" slot="prop">
            index (0-based) of vessel for component</rb-about-item>
    </rb-about>

    <div class="pl-2" style="display:flex; flex-wrap: wrap; flex-direction: row; justify-content: space-around; align-items:flex-start;">
        <v-card flat >
            <v-card-text class="text-xs-center" style="position:relative">
                <div style="display:flex; flex-direction: row; justify-content:space-around; flex-wrap: wrap; cursor: default">
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
                                v-show="actuator.vesselIndex === vesselIndex && actuator.pin >= 0"
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
                <v-btn color="primary" @click="clickMenu">Settings</v-btn>
            </v-card-text>
            <v-system-bar v-if='httpErr' class='error' dark>
                <span >{{httpErr.response.data.error || httpErr.response.statusText}}</span>
            </v-system-bar>
        </v-card>
    </div>
    <rb-api-dialog :apiSvc="apiSvc" v-if="apiModelCopy && apiModelCopy.rbHash">
        <div slot="title">Bioreactor Settings</div>
        <v-expansion-panel >
            <v-expansion-panel-content>
                <div slot="header">General</div>
                <v-card>
                    <v-card-text>
                        <v-text-field v-model='apiModelCopy.vessels[vesselIndex].name' 
                            label="Name" class="input-group--focused" />
                        <v-text-field v-model='coolThreshold' 
                            type="number"
                            :label="`Cooling threshold (\u00b0${apiModelCopy.tempUnit})`" class="input-group--focused" />
                        <v-select v-bind:items="tempItems" 
                            v-model='apiModelCopy.tempUnit' 
                            label="Temperature unit"
                            class="input-group--focused"
                            ></v-select>
                        <v-text-field v-model='apiModelCopy.vessels[vesselIndex].sensorExpRate' 
                            type="number"
                            :label="`Sensor trend sensitivity (exponential smoothing rate)`" class="input-group--focused" />
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
                        <rb-dialog-row :label="cycleCopy.name" 
                            v-for="(cycleCopy,i) in editCycles" :key="cycleCopy.name+i">
                            <v-text-field v-model='cycleCopy.cycle.desc'
                                label="Description" class="input-group--focused" />
                            <v-layout>
                                <v-flex xs3>
                                    <v-text-field v-model='cycleCopy.cycle.on' type="number"
                                        label="On seconds" class="input-group--focused pr-1" />
                                </v-flex>
                                <v-flex xs3>
                                    <v-text-field v-model='cycleCopy.cycle.off' type="number"
                                        label="Off seconds" class="input-group--focused pr-1" />
                                </v-flex>
                                <v-select v-bind:items="cycleItems" 
                                    v-model='cycleCopy.cycle.nextCycle' 
                                    label="Next cycle"
                                    class="input-group--focused"
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
                        <rb-dialog-row v-for="(sensor,i) in mutableSensors" :key="name+i"
                            :label="`Sensor #${i+1}`" >
                            <v-select
                                v-bind:items="sensorTypes"
                                v-model="sensor.type"
                                label="Sensor type"
                                @input="clickSensorType(sensor)"
                                :rules="sensorRules(sensor)"
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
                                <v-checkbox v-if="sensor.readTemp != null"
                                    label="Temperature" v-model="sensor.readTemp" light></v-checkbox>
                                <v-checkbox v-if="sensor.readHumidity != null"
                                    label="Humidity" v-model="sensor.readHumidity" light></v-checkbox>
                            </div>
                            <v-select v-if="sensor.addresses"
                                v-bind:items="sensorAddresses(sensor)"
                                v-model="sensor.address"
                                label="Address"
                                :rules="sensorRules(sensor)"
                                ></v-select>
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
        vesselIndex: {
            default: 0,
        },
    },
    data: function() {
        return {
            apiEditDialog: false,
            cycleToggle: false,
            mockPhase: 0,
            cycleStartTimeMenu: false,
        }
    },
    methods: {
        sensorAddresses(sensor) {
            return sensor.addresses.map(a => {
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
        sensorRules(sensor) {
            return [
                () => {
                    var valid = this.mutableSensors.reduce((a,s) => 
                        a && (s === sensor || s.address == null || sensor.address !== s.address)
                    , true);
                    return valid || `${sensor.comm} address conflict: ${sensor.address}`;
                },
            ];
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
        clickMenu() {
            this.rbDispatch("apiLoad").then(r => {
                this.apiEdit();
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
        coolThreshold: {
            get: function () {
                if (this.apiModelCopy == null) {
                    return null;
                }
                console.log("get cool",
                    this.apiModelCopy.vessels[this.vesselIndex]
                );
                var value = this.apiModelCopy.vessels[this.vesselIndex].coolThreshold;
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
                    this.apiModelCopy.vessels[this.vesselIndex].coolThreshold = value;
                }
            },
        },
        cycleItems() {
            return [
                "Cycle #1",
                "Cycle #2",
                "Cycle #3",
                "Cycle #4",
            ];
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
            var vessels = this.apiModel && this.apiModel.vessels;
            return vessels && vessels[this.vesselIndex];
        },
        mutableActuators( ){
            return this.apiModelCopy && this.apiModelCopy.actuators.filter(a => 
                a.vesselIndex === this.vesselIndex);
        },
        mutableLights( ){
            return this.apiModelCopy && this.apiModelCopy.lights;
        },
        mutableSensors( ){
            return this.apiModelCopy && this.apiModelCopy.sensors.filter(a => 
                a.vesselIndex === this.vesselIndex);
        },
        actuators( ){
            return this.apiModel && this.apiModel.actuators.filter(a => 
                a.vesselIndex === this.vesselIndex);
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
            var vessel = this.apiModelCopy.vessels[this.vesselIndex];
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
