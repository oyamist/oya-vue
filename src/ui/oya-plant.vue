<template>

<div>
    <rb-about v-if="about" :name="componentName">
        <p> OyaPlant status image
        </p>
        <rb-about-item name="about" value="false" slot="prop">Show this descriptive text</rb-about-item>
        <rb-about-item name="service" value="test" slot="prop">RestBundle name</rb-about-item>
        <rb-about-item name="vesselIndex" value="0" slot="prop">
            index (0-based) of vessel for component</rb-about-item>
    </rb-about>

    <div class="pt-4 pb-4 grey lighten-4" 
        style='display:flex; flex-flow; row wrap; justify-content: space-evenly'>
        <div>
            <img v-show="rbService.active && rbService.Mist" 
                src="/assets/mist-on.svg" height=200px/>
            <img v-show="rbService.active && !rbService.Mist" 
                src="/assets/mist-off.svg" height=200px/>
            <img v-show="!rbService.active" src="/assets/inactive.svg" height=200px/>
        </div>
        <div style='display:flex; flex-flow: column nowrap; justify-content: center; align-items:center; '>
            <div class="title pb-3">{{name}}</div>
            <div >
                <v-switch v-show="rbService.active"
                    value input-value="true"
                    color="light-green darken-2"
                    v-on:click.native.stop="clickActivate()"></v-switch>
                <v-switch v-show="!rbService.active"
                    v-on:click.native.stop="clickActivate()"></v-switch>
            </div>
            <div>
                <oya-progress :service='service'/>
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
        vessel() {
            var vessels = this.apiModel && this.apiModel.vessels;
            return vessels && vessels[this.vesselIndex];
        },
        name() {
            return this.vessel && this.vessel.name;
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
</style>
