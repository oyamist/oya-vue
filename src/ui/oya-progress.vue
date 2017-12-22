<template>

<div>
    <rb-about v-if="about" :name="componentName">
        <p> Display cycle progress
        </p>
        <rb-about-item name="about" value="false" slot="prop">Show this descriptive text</rb-about-item>
        <rb-about-item name="service" value="test" slot="prop">RestBundle name</rb-about-item>
    </rb-about>

    <div class='oya-progress' v-if="rbService.active" >
        <v-progress-circular v-bind:value="cycleProgress" 
            v-bind:rotate="-90"
            v-show="rbService.Mist"
            size="40"
            class="blue--text text--darken-1">
            {{rbService.countdown}}
        </v-progress-circular>
        <v-progress-circular v-bind:value="cycleProgress" 
            v-bind:rotate="-90"
            size="40"
            v-show="!rbService.Mist"
            class="light-green--text text--darken-2">
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
    padding: 0.5em;
}
</style>
