<template>

<div>
    <rb-about v-if="about" :name="componentName">
        <p> Display sensor chart
        </p>
        <rb-about-item name="about" value="false" slot="prop">Show this descriptive text</rb-about-item>
        <rb-about-item name="service" value="test" slot="prop">RestBundle name</rb-about-item>
        <rb-about-item name="sensorProp" value='"tempInternal"' slot="prop">
            property name of sensor</rb-about-item>
    </rb-about>

    <line-chart :chartLabels="labelHours"
       :height="200"
    ></line-chart>
</div>

</template>
<script>

import Vue from 'vue';
import rbvue from "rest-bundle/index-vue";
import LineChart from "./line-chart.vue";

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
        labelHours() {
            var result = [];
            for (var i=0; i<=2400; i+=100) {
                result.push(("000" + i).slice(-4));
            }
            return result;
        },
    },
    components: {
        LineChart,
    },
    created() {
    },
    mounted() {
    },
}

</script>
<style> 
.oya-chart {
    padding: 0.2em;
    text-align: center;
}
</style>
