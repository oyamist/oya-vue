<template>

<div>
    <rb-about v-if="about" :name="componentName">
        <p> OyaCycle status and configuration
        </p>
        <rb-about-item name="about" value="false" slot="prop">Show this descriptive text</rb-about-item>
        <rb-about-item name="service" value="test" slot="prop">RestBundle name</rb-about-item>
    </rb-about>

    <v-card hover>
        <v-card-title >
            <div class="headline ">{{name}}</div>
        </v-card-title>
        <v-card-text class="text-xs-center">
            <div style="display:flex; flex-direction: row; justify-content:space-around; flex-wrap: wrap">
                <div style="display:flex; flex-direction: column">
                    <div>
                        <img v-show="rbService.isActive && rbService.isOn" src="/assets/mist-on.svg" height=200px/>
                        <img v-show="rbService.isActive && !rbService.isOn" src="/assets/mist-off.svg" height=200px/>
                        <img v-show="!rbService.isActive" src="/assets/inactive.svg" height=200px/>
                        <h5>{{rbService.countdown}}</h5>
                    </div>
                    <div>
                        <v-btn v-show="!rbService.isActive" @click="clickActivate()" class="green darken-3" dark>
                            Run
                        </v-btn>
                        <v-btn error v-show="rbService.isActive" @click="clickActivate()">
                            Stop
                        </v-btn>
                    </div>
                </div>
                <v-list v-show="actuator" two-line subheader>
                    <v-subheader inset>Timer cycle </v-subheader>
                    <v-list-tile v-for="cycle in cycles" key="cycle" @click="clickCycle(cycle)"
                        v-tooltip:left='{ html: cycleDef(cycle).desc}'
                        >
                        <v-list-tile-action >
                            <v-icon v-bind:class='[cycle===rbService.cycle?  "green--text text--darken-3" : "grey--text text--lighten-2"]'>face</v-icon>
                        </v-list-tile-action>
                        <v-list-tile-content >
                            <v-list-tile-title>
                                {{cycle}}
                            </v-list-tile-title>
                            <v-list-tile-sub-title class="cycle-desc">
                                {{cycleDef(cycle).on}}s on 
                                <span v-show="cycleDef(cycle).off >= 0">+ {{cycleDef(cycle).off}}s off&nbsp;&#x21bb;</span>
                                <span v-show="cycleDef(cycle).off < 0">&#x279b; stop</span>
                            </v-list-tile-sub-title>
                        </v-list-tile-content>
                    </v-list-tile>
                </v-list>
            </div>
        </v-card-text>
        <!--
        <v-card-text>Cycle#: {{rbService.cycleNumber}}</v-card-text>
        <v-card-text>Misting: {{rbService.isOn}}</v-card-text>
        <v-card-text>{{apiModel}}</v-card-text>
        <v-card-text>{{rbService}}</v-card-text>
        -->
        <v-system-bar v-if='httpErr' 
            v-tooltip:above='{html:`${httpErr.config.url} \u2794 HTTP${httpErr.response.status} ${httpErr.response.statusText}`}'
            class='error' dark>
            <span >{{httpErr.response.data.error || httpErr.response.statusText}}</span>
        </v-system-bar>
    </v-card>

</div>

</template>
<script>

import Vue from 'vue';
import rbvue from "rest-bundle/index-vue";
const RbApiDialog = rbvue.components.RbApiDialog;

export default {
    mixins: [ 
        rbvue.mixins.RbAboutMixin, 
        rbvue.mixins.RbApiMixin.createMixin("oya-conf"),
    ],
    props: {
        actuatorIndex: {
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
            var actuator = this.actuator;
            var cycle = cycle || this.rbService && this.rbService.cycle;
            return actuator && cycle && actuator.cycles[cycle];
        },
        clickActivate() {
            var url = [this.restOrigin(), this.service, 'oya-cycle'].join('/');
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
            var url = [this.restOrigin(), this.service, 'oya-cycle'].join('/');
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
        actuator() {
            var actuators = this.apiModel && this.apiModel.actuators;
            return actuators && actuators[this.actuatorIndex];
        },
        name() {
            return this.actuator && this.actuator.name;
        },
        httpErr() {
            return this.rbResource.httpErr;
        },
        cycles() {
            var actuator = this.actuator;
            if (actuator  == null) {
                return [];
            }
            return Object.keys(this.actuator.cycles).sort();
        }
    },
    components: {
        RbApiDialog,
    },
    created() {
        this.restBundleResource();
        this.rbDispatch("apiLoad").then(r => {
            console.log("OyaCycleVue apiLoad", r);
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
</style>
