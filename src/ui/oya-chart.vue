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

    <div class="pt-3" v-if='linechartData && linechartData.datasets.length'
        style="display:flex; flex-flow: row wrap; align-items: flex-start; justify-content: space-evenly ">
        <div style="width: 8em; display:flex; flex-flow: column; ">
            <p class="text-xs-center subheading">{{sensorLabels[sensorProp]}}</p>
            <oya-sensor :service='service' :sensorProp="sensorProp"/>
        </div>
        <div style="">
            <line-chart v-if="linechartData"
                ref="lineChart"
                :chartLabels="labelHours"
                :chartData="linechartData"
                xAxisLabel="time of day"
                :height="200"
            ></line-chart>
        </div>
    </div>
</div>

</template>
<script>

import Vue from 'vue';
import rbvue from "rest-bundle/index-vue";
import LineChart from "./line-chart.vue";

function dataByHour(data, options={}) {
    var precision = options.precision==null ? 2 : options.precision;
    var scale = options.scale || 1;
    var offset = options.offset || 0;

    data.sort((a,b)=> a.hr < b.hr ? -1 : (a.hr === b.hr ? 0 : 1));

    // null pad hours from 0000
    if (data == null || data.length === 0) {
        return [];
    }
    var date = data[0].hr.substr(0,10); 
    var hr0000 = date + " 0000";
    for (var i=0; i<24 && data[0].hr !== hr0000; i++) {
        var t = Math.max(0,Number(data[0].hr.substr(-4))-100);
        var hrt = ("0000" + t).substr(-4);
        data.unshift({
            hr: `${date} ${hrt}`,
            vavg: null,
            vmax: null,
            vmin: null,
        });
    }
    return data.map(d=>{
        if (d.vavg == null) {
            return null;
        }
        return (d.vavg*scale+offset).toFixed(precision);
    });
}

export default {
    mixins: [ 
        rbvue.mixins.RbAboutMixin, 
        rbvue.mixins.RbServiceMixin,
    ],
    props: {
        sensorProp: {
            default: 'tempInternal',
        },
        palette: {
            default: 'red',
        },
    },
    data: function() {
        return {
            linechartData: null,
        }
    },
    methods: {
        refresh(opts) {
            var url = [this.restOrigin(), this.service, 'sensor', 'data-by-hour', this.sensorProp].join('/');
            this.$http.get(url).then(res=>{
                var resData = res.data;
                this.linechartData.datasets = this.responseDatasets(resData, opts);
                this.$refs.lineChar && this.$refs.lineChart.update();
            }).catch(e=>{
                console.error(e);
            });
        },
        responseDatasets(res, opts={}) {
            var ds = [];
            var spanGaps = false;
            var chartOpts = {
                precision: 1,
            };
            if (opts.tempUnit === 'F') {
                chartOpts.scale = 1.8;
                chartOpts.offset = 32;
            };

            var data = res.data;
            data.sort((a,b) => a.hr > b.hr ? -1 : (a.hr === b.hr ? 0 : 1));
            var dataMap = {};
            console.log("palette",this.palette);
            data.forEach(d=>{
                var date = d.hr.substr(0,10);
                if (dataMap[date] == null) {
                    var n = ds.length;
                    dataMap[date] = {
                        label: date,
                        data: [],
                        borderColor: LineChart.colors(this.palette,n),
                        pointBackgroundColor: LineChart.colors(this.palette,n),
                        borderWidth: 3,
                        radius: 0,
                        pointBorderColor: LineChart.colors(this.palette,n),
                        backgroundColor: 'transparent',
                        spanGaps,
                    }
                    ds.unshift(dataMap[date]);
                }
                dataMap[date].data.unshift(d);
            });
            ds = ds.reverse();
            ds.forEach(d=>(d.data = dataByHour(d.data, chartOpts)));
            return ds;
        },
    },
    computed: {
        sensorLabels() {
            return {
                tempInternal: "Internal/Root Temperature",
                humidityInternal: "Internal/Root Humidity",
                tempExternal: "External/Root Temperature",
                humidityExternal: "External/Root Humidity",
                tempAmbient: "Ambient/Root Temperature",
                humidityAmbient: "Ambient/Root Humidity",
            };
        },
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
        this.linechartData = Object.assign({}, {
            labels: this.labelHours,
            datasets: [],
        });
        this.onApiModelLoaded('oya-conf').then(apiModel=>{
            this.refresh({
                tempUnit: apiModel.tempUnit,
            });
        });
    },
}

</script>
<style> 
.oya-chart {
    padding: 0.2em;
    text-align: center;
}
</style>
