<template>

<div>
    <rb-about v-if="about" :name="componentName">
        <p> Display sensor value
        </p>
        <rb-about-item name="about" value="false" slot="prop">Show this descriptive text</rb-about-item>
        <rb-about-item name="service" value="test" slot="prop">RestBundle name</rb-about-item>
        <rb-about-item name="sensorProp" value='"tempInternal"' slot="prop">
            property name of sensor</rb-about-item>
    </rb-about>

    <div class="subheading primary--text oya-sensor">
        {{sensorDisplay()}}
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
        sensorProp: {
            default: 'tempInternal',
        },
    },
    data: function() {
        return {
        }
    },
    methods: {
        sensorDisplay(propName = this.sensorProp) {
            var value = this.rbService[propName];
            var result = '\u254d';
            var suffix = '';
            if (propName.startsWith('temp')) {
                suffix = this.rbService.tempUnit === 'F' ? '\u2109' : '\u2103';
                if (value == null) {
                    // do nothing
                } else if (this.rbService.tempUnit === 'F') {
                    result = (value * 1.8 + 32).toFixed(1);
                } else {
                    result = value.toFixed(1);
                }
            } else if (propName.startsWith('humidity')) {
                suffix = '%RH';
                value != null && (result = (value*100).toFixed(1));
            } else {
                result = value.toFixed(1);
            }
            return result + suffix;
        },
    },
    computed: {
    },
    components: {
    },
    created() {
    },
    mounted() {
    },
}

</script>
<style> 
.oya-sensor {
    padding: 0.2em;
    text-align: center;
}
</style>
