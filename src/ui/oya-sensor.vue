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

    <div v-if="sensorDisplay" class="subheading primary--text oya-sensor">
        {{sensorDisplay}}
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
    },
    computed: {
        sensorDisplay() {
            var apiModel = this.rbService && this.rbService['oya-conf'].apiModel;
            if (apiModel == null) {
                return null;
            }
            var value = this.rbService[this.sensorProp];
            var result = '\u254d';
            var suffix = '';
            if (this.sensorProp.startsWith('temp')) {
                suffix = apiModel.tempUnit === 'F' ? '\u2109' : '\u2103';
                if (value == null) {
                    // do nothing
                } else if (apiModel.tempUnit === 'F') {
                    result = (value * 1.8 + 32).toFixed(1);
                } else {
                    result = value.toFixed(1);
                }
            } else if (this.sensorProp.startsWith('humidity')) {
                suffix = '%RH';
                value != null && (result = (value*100).toFixed(1));
            } else {
                result = value.toFixed(1);
            }
            return result + suffix;
        },
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
