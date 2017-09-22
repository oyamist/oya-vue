<template>

<div>
    <rb-about v-if="about" :name="componentName">
        <p> OyaReactor status and configuration
        </p>
        <rb-about-item name="about" value="false" slot="prop">Show this descriptive text</rb-about-item>
        <rb-about-item name="service" value="test" slot="prop">RestBundle name</rb-about-item>
        <rb-about-item name="vesselIndex" value="0" slot="prop">
            Index (0-based) of timer for component</rb-about-item>
    </rb-about>

    <v-card hover>
        <v-toolbar class="green darken-3">
            <v-toolbar-title class="white--text">{{name}}</v-toolbar-title>
            <v-spacer></v-spacer>
            <v-toolbar-side-icon dark @click="clickMenu"></v-toolbar-side-icon>
        </v-toolbar> 
        <v-card-text class="text-xs-center">
            <div style="display:flex; flex-direction: row; justify-content:space-around; flex-wrap: wrap">
                <div style="display:flex; flex-direction: column">
                    <div>
                        <img v-show="rbService.isActive && rbService.isOn" 
                            src="/assets/mist-on.svg" height=200px/>
                        <img v-show="rbService.isActive && !rbService.isOn" 
                            src="/assets/mist-off.svg" height=200px/>
                        <img v-show="!rbService.isActive" src="/assets/inactive.svg" height=200px/>
                        <h5>{{rbService.countdown}}</h5>
                    </div>
                    <div>
                        <v-btn v-show="!rbService.isActive" @click="clickActivate()" 
                            class="green darken-3" dark>
                            Run
                        </v-btn>
                        <v-btn error v-show="rbService.isActive" @click="clickActivate()">
                            Stop
                        </v-btn>
                    </div>
                </div>
                <v-list v-show="timer" subheader>
                    <v-subheader >Mist cycle </v-subheader>
                    <v-list-tile v-for="cycle in cycles" key="cycle" @click="clickCycle(cycle)"
                        unused-v-tooltip:left='{ html: `${cycleDef(cycle).on}s on; ${cycleDef(cycle).off}s off`}'
                        >
                        <v-list-tile-action v-show='cycle===rbService.cycle' >
                            <v-icon class='green--text text--darken-3'>face</v-icon>
                        </v-list-tile-action>
                        <v-list-tile-action 
                            v-show='cycle!==rbService.nextCycle && cycle!==rbService.cycle' >
                            <v-icon class='grey--text text--lighten-1'>face</v-icon>
                        </v-list-tile-action>
                        <v-list-tile-action 
                            v-show='rbService.nextCycle!==rbService.cycle && cycle===rbService.nextCycle' >
                            <v-icon class='green--text text--darken-3'>hourglass_full</v-icon>
                        </v-list-tile-action>
                        <v-list-tile-content >
                            <v-list-tile-title>
                                {{cycleDef(cycle).name}}
                            </v-list-tile-title>
                            <v-list-tile-sub-title class="cycle-desc">
                                {{cycleDef(cycle).desc}}
                            </v-list-tile-sub-title>
                        </v-list-tile-content>
                    </v-list-tile>
                </v-list>
            </div>
        </v-card-text>
        <v-system-bar v-if='httpErr' 
            v-tooltip:above='{html:`${httpErr.config.url} \u2794 HTTP${httpErr.response.status} ${httpErr.response.statusText}`}'
            class='error' dark>
            <span >{{httpErr.response.data.error || httpErr.response.statusText}}</span>
        </v-system-bar>
    </v-card>
    <rb-api-dialog :apiSvc="apiSvc" v-if="apiModelCopy && apiModelCopy.rbHash">
        <div slot="title">Bioreactor Settings</div>
            <rb-dialog-row label="Vessel">
                <v-text-field v-model='apiModelCopy.vessels[vesselIndex].name' 
                    label="Name" class="input-group--focused" />
            </rb-dialog-row>
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
            <rb-dialog-row label="Advanced">
                <v-text-field v-model='apiModelCopy.vessels[vesselIndex].fanThreshold' 
                    :label="`Fan threshold (\u00b0${apiModelCopy.tempUnit})`" class="input-group--focused" />
                <v-text-field v-model='apiModelCopy.vessels[vesselIndex].pin' 
                    label="MCU Pin" class="input-group--focused" />
            </rb-dialog-row>
    </rb-api-dialog>

</div>

</template>
<script>

import Vue from 'vue';
import rbvue from "rest-bundle/index-vue";
const RbApiDialog = rbvue.components.RbApiDialog;
const RbDialogRow = rbvue.components.RbDialogRow;

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
            activeItems: [{
                text: "Stop",
                value: false,
            },{
                text: "Run",
                value: true,
            }],
            apiRules: {
                required: (value) => !!value || 'Required',
                gt0: (value) => Number(value) > 0 || 'Positive number',
            },
        }
    },
    methods: {
        cycleDef(cycle) {
            var timer = this.timer;
            var cycle = cycle || this.rbService && this.rbService.cycle;
            return timer && cycle && timer.cycles[cycle];
        },
        clickMenu() {
            this.apiEdit();
        },
        clickActivate() {
            var url = [this.restOrigin(), this.service, 'control'].join('/');
            console.log("activate");
            this.$http.post(url, {
                activate:!this.rbService.isActive,
            }).then(r => {
                console.log("ok", r);
                this.activeToggle = r.data.activate;
            }).catch(e => {
                console.error("error", e);
                this.activeToggle = r.data.activate;
            });;
        },
        clickCycle(cycle) {
            var url = [this.restOrigin(), this.service, 'control'].join('/');
            console.log("clicked", cycle);
            this.$http.post(url, {
                cycle,
            }).then(r => {
                console.log("ok", r);
                this.rbService.cycle = r.data.cycle;
            }).catch(e => {
                console.error("error", e);
            });;
        },
    },
    computed: {
        timer() {
            var vessels = this.apiModel && this.apiModel.vessels;
            return vessels && vessels[this.vesselIndex];
        },
        name() {
            return this.timer && this.timer.name;
        },
        httpErr() {
            return this.rbResource.httpErr;
        },
        cycles() {
            var timer = this.timer;
            if (timer  == null) {
                return [];
            }
            return Object.keys(this.timer.cycles).sort();
        },
        editCycles() {
            var cycleNames = Object.keys(this.timer.cycles).sort();
            var timer = this.apiModelCopy.vessels[this.vesselIndex];
            return cycleNames.map(name => {
                return {
                    name: name,
                    cycle: timer.cycles[name],
                }
            });
        },
    },
    components: {
        RbApiDialog,
        RbDialogRow,
    },
    created() {
        this.restBundleResource();
        this.rbDispatch("apiLoad").then(r => {
            console.log("OyaReactor apiLoad", r);
        });
        this.rbInitialized().then(r => {
            this.rbService.isActive != null && (this.activeToggle = this.rbService.isActive);
        }).catch(e => {
            console.error(e);
        });
    },
    mounted() {
    },
}

</script>
<style> 
.cycle-desc {
    font-style: italic;
}
.cycle-desc:hover {
}
</style>
