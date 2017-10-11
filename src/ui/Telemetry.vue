<template>

<div class="subheading primary--text oya-telemetry">
    {{sensorDisplay()}}
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
            if (value == null) {
                return "n/a";
            }
            if (propName.startsWith('temp')) {
                var temp = value;
                if (this.rbService.tempUnit === 'F') {
                    temp = temp*1.8+32;
                    return `${temp.toFixed(1)}\u2109`;
                }
                return `${temp.toFixed(1)}\u2103`;
            } else if (propName.startsWith('humidity')) {
                var rh = value;
                return `${(rh*100).toFixed(1)}%RH`;
            }
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
.oya-telemetry {
    padding: 0.2em;
    text-align: center;
}
</style>
