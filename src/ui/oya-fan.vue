<template>

<div>
    <rb-about v-if="about" :name="componentName">
        <p> Display fan speed
        </p>
        <rb-about-item name="about" value="false" slot="prop">Show this descriptive text</rb-about-item>
        <rb-about-item name="service" value="oyamist" slot="prop">RestBundle name</rb-about-item>
    </rb-about>

    <div class="oya-fan-container" v-if="rbService.active && fanType!='fan:none'" >
        <v-tooltip left >
            <div class="oya-fan" slot="activator">
                <v-progress-circular v-bind:value="fanSpeed" 
                    :rotate="fanAngle"
                    size="40"
                    color='white'
                    fill='transparent'
                    >
                </v-progress-circular>
            </div>
            <div class="text-xs-center">Fan speed {{(rbService.fan*100).toFixed(0)}}%</div>   
        </v-tooltip>
    </div>
</div>

</template>
<script>

import Vue from 'vue';
import rbvue from "rest-bundle/index-vue";

export default {
    mixins: [ 
        rbvue.mixins.RbAboutMixin, 
        rbvue.mixins.RbServiceMixin,
    ],
    props: {
    },
    data: function() {
        return {
        }
    },
    computed: {
        fanType() {
            var oyaConf = this.rbService['oya-conf'];
            var apiModel = oyaConf && oyaConf.apiModel;
            var fan = apiModel && apiModel.fan;
            return fan && fan.type;
        },
        fanSpeed() {
            return this.rbService.fan*100;
        },
        fanAngle() {
            var fanDegrees = 360 * this.rbService.fan;
            return 270-fanDegrees/2;
        },
    },
    created() {
        this.restBundleResource();
    },
}

</script>
<style> 
.oya-fan-container {
    padding: 0.5em;
    display: flex;
    flex-flow: row wrap;
    align-items: center;
}
.oya-fan {
    border-radius: 20px;
    height:40px;
    width: 40px;
    background: #aaa;
    background-image: url('/assets/fan-ccby-sika-danh-40.png');

}
</style>
