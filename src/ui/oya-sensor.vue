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
            const deltaPrecision = 2;
            const smallDelta = 0.05;
            const largeDelta = 0.1;
            var apiModel = this.rbService && this.rbService['oya-conf'].apiModel;
            if (apiModel == null) {
                return null;
            }
            var data = this.rbService[this.sensorProp];
            if (data == null) {
                return null;
            }
            var result = '\u254d';
            var delta = 0;
            var suffix = '';
            if (data.unit === 'C') {
                suffix = apiModel.tempUnit === 'F' ? '\u2109' : '\u2103';
                if (data.value == null) {
                    // do nothing
                } else if (apiModel.tempUnit === 'F') {
                    var f = data.value * 1.8 + 32;
                    var avg = data.avg * 1.8 + 32;
                    result = f.toFixed(1);
                    delta = f-avg;
                } else {
                    var c = data.value;
                    var avg = data.avg;
                    result = c.toFixed(1);
                    delta = c - avg;
                }
            } else if (data.unit === "%RH") {
                suffix = '%RH';
                if (data.value != null) {
                    var rh = data.value * 100;
                    var avg = data.avg * 100;
                    result = rh.toFixed(1);
                    delta = rh - avg;
                }
            } else {
                result = data.value.toFixed(1);
                delta = data.value - data.avg;
            }
            result += suffix;
            if (delta > smallDelta) {
                result += delta > largeDelta ? "\u2b06" : "\u21e7";
            } else if (delta < -smallDelta) {
                result += delta < -largeDelta ? "\u2b07" : "\u21e9";
            }
            //result += delta.toFixed(deltaPrecision);
            return result;
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
