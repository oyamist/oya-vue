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

    <v-card hover>
        <v-toolbar class="green darken-3" flat>
            <v-toolbar-title class="white--text">{{name}}</v-toolbar-title>
            <v-spacer></v-spacer>
            <v-toolbar-side-icon dark @click="clickMenu"></v-toolbar-side-icon>
        </v-toolbar> 
        <v-card-text class="text-xs-center" style="position:relative">
            <div style="display:flex; flex-direction: row; justify-content:space-around; flex-wrap: wrap; cursor: default">
                <div style="display:flex; flex-direction: column; justify-content: center">
                    <div style="position:relative">
                        <img v-show="rbService.active && rbService.Mist" 
                            src="/assets/mist-on.svg" height=200px/>
                        <img v-show="rbService.active && !rbService.Mist" 
                            src="/assets/mist-off.svg" height=200px/>
                        <img v-show="!rbService.active" src="/assets/inactive.svg" height=200px/>
                    </div>
                    <div style="display: flex; flex-direction:row;justify-content; space-between; flex-wrap: wrap">
                        <oya-sensor :service='service' sensorProp="tempInternal"/>
                        <v-spacer/>
                        <oya-sensor :service='service' sensorProp="humidityInternal"/>
                    </div>
                    <div class="pl-2" style="display:flex; flex-direction: row">
                        <v-switch label="Bioreactor" v-show="rbService.active"
                            value input-value="true"
                            color="blue darken-2"
                            v-on:click.native.stop="clickActivate()"></v-switch>
                        <v-switch label="Bioreactor" v-show="!rbService.active"
                            v-on:click.native.stop="clickActivate()"></v-switch>
                        <oya-progress :service='service'/>
                    </div>
                </div>
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
                        <v-subheader @click='actuatorToggle=!actuatorToggle'
                            style="cursor: pointer">
                            Advanced...
                            <v-spacer/>
                            <v-icon v-show="actuatorToggle">keyboard_arrow_up</v-icon>
                            <v-icon v-show="!actuatorToggle">keyboard_arrow_down</v-icon>
                        </v-subheader>
                        <v-list-tile v-for="actuator in actuators" key="actuator.name" 
                            @click="actuator.pin >= 0 && clickActuator(actuator)"
                            v-show="actuatorToggle && actuator.vesselIndex === vesselIndex && actuator.pin >= 0"
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
        </v-card-text>
        <v-system-bar v-if='httpErr' class='error' dark>
            <span >{{httpErr.response.data.error || httpErr.response.statusText}}</span>
        </v-system-bar>
    </v-card>
    <rb-api-dialog :apiSvc="apiSvc" v-if="apiModelCopy && apiModelCopy.rbHash">
        <div slot="title">Bioreactor Settings</div>
        <v-expansion-panel >
            <v-expansion-panel-content>
                <div slot="header">Vessel</div>
                <v-card>
                    <v-card-text>
                        <v-text-field v-model='apiModelCopy.vessels[vesselIndex].name' 
                            label="Name" class="input-group--focused" />
                        <v-text-field v-model='apiModelCopy.vessels[vesselIndex].coolThreshold' 
                            :label="`Cool threshold (\u00b0${apiModelCopy.tempUnit})`" class="input-group--focused" />
                    </v-card-text>
                </v-card>
            </v-expansion-panel-content>
            <v-expansion-panel-content>
                <div slot="header">Cycles</div>
                <v-card>
                    <v-card-text>
                        <rb-dialog-row :label="cycleCopy.name" v-for="cycleCopy in editCycles" key="name">
                            <v-text-field v-model='cycleCopy.cycle.desc'
                                label="Description" class="input-group--focused" />
                            <v-layout>
                                <v-flex xs3>
                                    <v-text-field v-model='cycleCopy.cycle.on'
                                        label="On seconds" class="input-group--focused" />
                                </v-flex>
                                <v-flex xs3>
                                    <v-text-field v-model='cycleCopy.cycle.off'
                                        label="Off seconds" class="input-group--focused" />
                                </v-flex>
                            </v-layout>
                        </rb-dialog-row>
                    </v-card-text>
                </v-card>
            </v-expansion-panel-content>
            <v-expansion-panel-content>
                <div slot="header">Actuators</div>
                <v-card>
                    <v-card-text>
                        <rb-dialog-row v-for="actuator in mutableActuators" key="name"
                            :label="actuator.name" >
                            <v-text-field 
                                type="number"
                                v-model="actuator.pin"
                                required
                                :rules="posIntRules(actuator.pin)"
                                label="MCU Pin" class="input-group--focused" />
                        </rb-dialog-row>
                    </v-card-text>
                </v-card>
            </v-expansion-panel-content>
            <v-expansion-panel-content>
                <div slot="header">Sensors</div>
                <v-card>
                    <v-card-text>
                        <rb-dialog-row v-for="(sensor,i) in mutableSensors" key="name"
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
            activeToggle: false,
            actuatorToggle: false,
            cycleToggle: false,
            activeItems: [{
                text: "Stop",
                value: false,
            },{
                text: "Run",
                value: true,
            }],
        }
    },
    methods: {
        sensorAddresses(sensor) {
            return sensor.addresses.map(a => ({
                value: a,
                text: `${sensor.comm}: ${a} (= 0x${a.toString(16)}, ${a.toString(2)})`,
            }));
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
        posIntRules(value) {
            return [
                () => !!value || 'This field is required',
                () => !!value && (Math.trunc(Number(value))+"") === (value+"") || 'Expected integer',
                () => !!value && Number(value) >= 0 || 'Expected positive number',
            ];
        },
        cycleDef(cycle) {
            var vessel = this.vessel;
            var cycle = cycle || this.rbService && this.rbService.cycle;
            return vessel && cycle && vessel.cycles[cycle];
        },
        clickMenu() {
            this.apiEdit();
        },
        clickActivate() {
            var url = [this.restOrigin(), this.service, 'reactor'].join('/');
            console.log("activate");
            this.$http.post(url, {
                activate:!this.rbService.active,
            }).then(r => {
                console.log("ok", r);
                this.activeToggle = r.data.activate;
            }).catch(e => {
                console.error("error", e);
                this.activeToggle = r.data.activate;
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
            this.$http.post(url, {
                tempInternal: Math.random() * 5 + 20,
                humidityInternal: Math.random(),
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
        OyaSensor,
        OyaProgress,
    },
    created() {
        this.restBundleResource();
        this.rbDispatch("apiLoad").then(r => {
            console.log("OyaReactor apiLoad", r);
            this.selCycle = this.vessel.cycles[this.rbService.cycle];
        });
        this.rbInitialized().then(r => {
            this.rbService.active != null && (this.activeToggle = this.rbService.active);
        }).catch(e => {
            console.error(e);
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
