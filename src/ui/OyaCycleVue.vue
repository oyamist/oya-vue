<template>

<div>
    <rb-about v-if="about" :name="componentName">
        <p> OyaCycle status and configuration
        </p>
        <rb-about-item name="about" value="false" slot="prop">Show this descriptive text</rb-about-item>
        <rb-about-item name="service" value="test" slot="prop">RestBundle name</rb-about-item>
    </rb-about>

    <v-card flat hover>
        <v-card-text class="text-xs-center">
            <div style="display:flex; flex-direction: column">
                <div>
                    <img v-show="rbService.isActive && rbService.isOn" src="/assets/mist-on.svg" height=200px/>
                    <img v-show="rbService.isActive && !rbService.isOn" src="/assets/mist-off.svg" height=200px/>
                    <img v-show="!rbService.isActive" src="/assets/inactive.svg" height=200px/>
                    <h3>{{rbService.countdown}}</h3>
                </div>
                <div>
                    <v-btn-toggle v-bind:items="activeItems" v-model="activeToggle" 
                       @change="clickActivate()">
                    </v-btn-toggle>
                </div>
                <div>
                    <p>
                    <h5>
                        {{rbService.cycle}} cycle
                    </h5>
                    <i>
                        {{cycleDef && cycleDef.desc}}
                        <br>
                        on:{{cycleDef && cycleDef.on}}s off:{{cycleDef && cycleDef.off}}s
                    </i>
                    </p>
                </div>
            </div>
        </v-card-text>
        <v-card-text>
        </v-card-text>
        <v-card-text>Cycle#: {{rbService.cycles}}</v-card-text>
        <v-card-text>Misting: {{rbService.isOn}}</v-card-text>
        <v-card-text>{{apiModel}}</v-card-text>
        <v-card-text>{{rbService}}</v-card-text>
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
        }
    },
    computed: {
        httpErr() {
            return this.rbResource.httpErr;
        },
        cycleDef() {
            var cycle = this.rbService && this.rbService.cycle;
            var mist = this.apiModel && this.apiModel.mist;
            var def = cycle && mist && mist[cycle];
            return def;
        },
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
</style>
