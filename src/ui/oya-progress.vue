<template>

<div>
    <rb-about v-if="about" :name="componentName">
        <p> Display cycle progress
        </p>
        <rb-about-item name="about" value="false" slot="prop">Show this descriptive text</rb-about-item>
        <rb-about-item name="service" value="oyamist" slot="prop">RestBundle name</rb-about-item>
    </rb-about>

    <div class='oya-progress' v-if="rbService.active" >
        <v-progress-circular v-bind:value="cycleProgress" 
            v-bind:rotate="-90"
            v-show="rbService.Mist"
            size="40"
            class="oya-progress-on">
            {{rbService.countdown}}
        </v-progress-circular>
        <v-progress-circular v-bind:value="cycleProgress" 
            v-bind:rotate="-90"
            size="40"
            v-show="!rbService.Mist"
            class="oya-progress-off">
            {{rbService.countdown}}
        </v-progress-circular>
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
        cycleProgress() {
            var countstart = this.rbService.countstart;
            var countdown = this.rbService.countdown;
            return countstart ? (countstart - countdown) * 100 / countstart : 100;
        },
    },
    created() {
        this.restBundleResource();
    },
}

</script>
<style> 
.oya-progress {
    border: 1px solid #ddd;
    border-radius: 24px;
    padding: 0;
    margin: 0;
    line-height: 9px;
}
.oya-progress-on {
    border-radius: 20px;
    background-color: #1e88e5;
    color: white;
}
.oya-progress-off {
    border-radius: 20px;
    background-color: #689f38;
    color: white;
}
</style>
