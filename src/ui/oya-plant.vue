<template>

<div>
    <rb-about v-if="about" :name="componentName">
        <p> OyaPlant status image
        </p>
        <rb-about-item name="about" value="false" slot="prop">Show this descriptive text</rb-about-item>
        <rb-about-item name="service" value="oyamist" slot="prop">RestBundle name</rb-about-item>
        <rb-about-item name="vesselIndex" value="0" slot="prop">
            index (0-based) of vessel for component</rb-about-item>
    </rb-about>

    <div class="pt-4 pb-4 oya-dashboard">
        <div v-if="!camera" class="oya-plant " :style="plantStyle">
            <img v-show="rbService.active" src="/assets/mist-off.svg" height=200px/>
            <img v-show="!rbService.active" src="/assets/inactive.svg" height=200px/>
        </div>
        <vmc-camera v-if="camera" service="vmc"></vmc-camera>
        <div class="oya-dashboard-controls">
            <div class="title text-xs-center">
                {{name}}
                <div class='caption oya-guid' >{{guid}}</div>
            </div>
            <oya-light :service='service' v-if="showLightCycle"/>
            <oya-progress :service='service' v-if="showPumpCycle"/>
            <div >
                <v-switch v-show="rbService.active"
                    value input-value="true"
                    color="light-green darken-1"
                    v-on:click.native.stop="clickActivate()"></v-switch>
                <v-switch v-show="!rbService.active"
                    v-on:click.native.stop="clickActivate()"></v-switch>
            </div>
        </div>
    </div>
</div>

</template>
<script>

import Vue from 'vue';
import rbvue from "rest-bundle/index-vue";
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
            activeToggle: false,
        }
    },
    methods: {
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
    },
    computed: {
        camera() {
            var rb = this.$store.state.restBundle;
            var service = rb && rb[this.service];
            var oyaConf = service && service['oya-conf'];
            var apiModel = oyaConf && oyaConf.apiModel;
            if (!apiModel) {
                return false;
            }
            return apiModel.camera != "none";
        },
        plantStyle() {
            var bgDark = `linear-gradient(to bottom, #ccc, #d4d4d4 40%, transparent 70%)`;
            var bgLight = `linear-gradient(to bottom, white, white 30%, transparent 70%)`;
            var bgMist = `repeating-linear-gradient(45deg, transparent, #bbddff 3px, blue 4px)`;
            var bgAir = `repeating-linear-gradient(45deg, transparent, #ccdfff 3px, #ccdfff 4px)`;
            var lights = this.rbService.lights;
            var light = lights && lights.white.active || !this.showLightCycle;
            var mist = this.rbService.Mist && this.showPumpCycle;
            var bg = [];
            if (this.rbService.active) {
                bg.push(light ? bgLight : bgDark);
                bg.push(mist ? bgMist : bgAir);
            }
            return bg.length ? `background: ${bg.join(',')};` : '';
        },
        vessel() {
            var vessels = this.apiModel && this.apiModel.vessels;
            return vessels && vessels[this.vesselIndex];
        },
        name() {
            return this.vessel && this.vessel.name;
        },
        guid() {
            return this.vessel && this.vessel.guid;
        },
        showLightCycle() {
            return this.apiModel && this.apiModel.lights.reduce((a,l) => a || l.pin>=0,false);
        },
        showPumpCycle() {
            return this.apiModel && this.apiModel.actuators.reduce((a,ac) => a || ac.pin>=0,false);
        },
    },
    components: {
        OyaProgress,
    },
    created() {
        this.restBundleResource();
        this.rbInitialized().then(r => {
            this.rbService.active != null && (this.activeToggle = this.rbService.active);
        }).catch(e => {
            console.error(e);
        });
    },
    mounted() {
    },
}

</script>
<style> 
.oya-plant {
    padding: 1em;
    padding-left: 2em;
    padding-right: 2em;
    border-radius: 1em;
    border-left: 1px solid #fff;
    border-right: 3px solid #ccc;
    border-bottom: 3px solid #ccc;
}
.oya-dashboard {
    background: linear-gradient(to bottom, #ccc, #ddd);
    display:flex;
    flex-flow: row wrap;
    justify-content: space-evenly;
}
.oya-dashboard-controls {
    padding: 1em;
    padding-top: 2em;
    display:flex;
    flex-flow: column nowrap;
    justify-content: space-around;
    align-items:center;
}
.oya-guid {
    color: #ccc;
}
div:hover>div.oya-guid {
    color: black;
}
</style>
