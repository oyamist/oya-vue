<template>

<div>
    <rb-about v-if="about" :name="componentName">
        <p> OyaPlant status image
        </p>
        <rb-about-item name="about" value="false" slot="prop">Show this descriptive text</rb-about-item>
        <rb-about-item name="service" value="oyamist" slot="prop">RestBundle name</rb-about-item>
    </rb-about>

    <div class="pt-4 pb-4 oya-plant">
        <div v-if="!camera" class="oya-plant-img " :style="plantStyle">
            <img v-show="rbService.active" src="/assets/mist-off.svg" height=200px/>
            <img v-show="!rbService.active" src="/assets/inactive.svg" height=200px/>
        </div>
        <vmc-camera v-if="camera" service="vmc"></vmc-camera>
        <div class="oya-plant-controls">
            <!--div class="pt-1 title text-xs-center">
                {{name}}
            </div-->
            <div class="oya-gauges">
                <oya-light :service='service' v-if="showLightCycle"/>
                <oya-progress :service='service' v-if="showPumpCycle"/>
                <oya-fan :service='service'/>
            </div>
            <div style="margin-bottom: -1em">
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
        host() {
            var host = location.host;
            return host.match(/:4000/) ? 'localhost:8080' : host;
        },
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
            return this.apiModel && this.apiModel.vessel;
        },
        name() {
            return this.vessel && this.vessel.name;
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
.oya-plant-img {
    border-radius: 1em;
    border-left: 1px solid #fff;
    border-right: 3px solid #ccc;
    border-bottom: 3px solid #ccc;
}
.oya-plant {
    display:flex;
    flex-flow: row wrap;
    justify-content: space-evenly;
    align-items: center;
}
.oya-gauges {
    display:flex;
    flex-flow: row nowrap;
    align-items: center;
    justify-content: space-between;
    width: 150px;
}
.oya-plant-controls {
    display:flex;
    flex-flow: column nowrap;
    justify-content: space-around;
    align-items:center;
    height: 13em;
}
</style>
