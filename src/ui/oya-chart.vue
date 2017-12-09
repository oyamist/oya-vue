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

    <line-chart v-if="linechartData"
        ref="lineChart"
        :chartLabels="labelHours"
        :chartData="linechartData"
        :height="200"
    ></line-chart>
    <v-btn color="primary" @click="addData()">AddData</v-btn>
</div>

</template>
<script>

import Vue from 'vue';
import rbvue from "rest-bundle/index-vue";
import LineChart from "./line-chart.vue";

function mockResponse(date1,date2=date1) {
    const data = [
        {"hr":"2017-12-08 2300","vavg":17.57570134387154,"vmin":17.430819409475856,"vmax":17.951177487856373},
        {"hr":"2017-12-08 2200","vavg":18.074496982104563,"vmin":17.99795274789553,"vmax":18.104765901172403},
        {"hr":"2017-12-08 2100","vavg":18.046810122665583,"vmin":17.889626408280566,"vmax":18.294492764680456},
        {"hr":"2017-12-08 2000","vavg":18.233284905335875,"vmin":18.170589506879264,"vmax":18.26574222425677},
        {"hr":"2017-12-08 1900","vavg":17.951575070149122,"vmin":17.69429185422547,"vmax":18.167607639683627},
        {"hr":"2017-12-08 1800","vavg":17.998155989589954,"vmin":17.647383077744703,"vmax":18.26965870654359},
        {"hr":"2017-12-08 1700","vavg":18.311335122029796,"vmin":18.269347168179863,"vmax":18.33704000406908},
        {"hr":"2017-12-08 1600","vavg":18.32903731520527,"vmin":18.29622847842121,"vmax":18.344961979603788},
        {"hr":"2017-12-08 1500","vavg":18.202546667175298,"vmin":18.07561481142393,"vmax":18.293558149589284},
        {"hr":"2017-12-08 1400","vavg":17.941329166772633,"vmin":17.820731924416986,"vmax":18.067692835889215},
        {"hr":"2017-12-08 1300","vavg":17.721687617648566,"vmin":17.63447648839041,"vmax":17.81596983800005},
        {"hr":"2017-12-08 1200","vavg":17.524715588786314,"vmin":17.411904580249743,"vmax":17.632206708883285},
        {"hr":"2017-12-08 1100","vavg":17.301133406237547,"vmin":17.170462348363476,"vmax":17.410213371989528},
        {"hr":"2017-12-08 1000","vavg":16.985471169716096,"vmin":16.86835914651204,"vmax":17.159380483711},
        {"hr":"2017-12-08 0900","vavg":16.585187834320934,"vmin":16.247329671168085,"vmax":16.893148699168396},
        {"hr":"2017-12-08 0800","vavg":16.961387468952132,"vmin":16.2511126370133,"vmax":17.168682129142198},
        {"hr":"2017-12-08 0700","vavg":16.80251625509694,"vmin":16.506574095267172,"vmax":17.048294804303044},
        {"hr":"2017-12-08 0600","vavg":15.852391808577723,"vmin":15.383834337885611,"vmax":16.488682892093287},
        {"hr":"2017-12-08 0500","vavg":15.500926031891359,"vmin":15.426426082754752,"vmax":15.578234276849516},
        {"hr":"2017-12-08 0400","vavg":15.695764349838507,"vmin":15.583663945474422,"vmax":15.796533658859138},
        {"hr":"2017-12-08 0300","vavg":15.922902822013858,"vmin":15.80067266854862,"vmax":16.054932478828103},
        {"hr":"2017-12-08 0200","vavg":16.191324716224575,"vmin":16.058759950153856,"vmax":16.342126344701295},
        {"hr":"2017-12-08 0100","vavg":16.56332451700958,"vmin":16.348535133897908,"vmax":16.88998881005062},
        {"hr":"2017-12-08 0000","vavg":17.621862579145397,"vmin":16.903251443249165,"vmax":18.170055441112883},
        {"hr":"2017-12-07 2300","vavg":18.212470647575934,"vmin":18.169521375346505,"vmax":18.266320795503685},
        {"hr":"2017-12-07 2200","vavg":18.331628879394383,"vmin":18.26810101472497,"vmax":18.394051524630605},
        {"hr":"2017-12-07 2100","vavg":18.4533984514248,"vmin":18.39810152335902,"vmax":18.50282291905088},
        {"hr":"2017-12-07 2000","vavg":18.539847770063503,"vmin":18.505137204038544,"vmax":18.55845476971592},
        {"hr":"2017-12-07 1900","vavg":18.49345377364089,"vmin":18.411364156557568,"vmax":18.553336639454734},
        {"hr":"2017-12-07 1800","vavg":18.260343709468227,"vmin":18.155413138017856,"vmax":18.410340530505337},
        {"hr":"2017-12-07 1700","vavg":18.374200571652963,"vmin":18.160620279240103,"vmax":18.433216347498792},
        {"hr":"2017-12-07 1600","vavg":18.408438662970593,"vmin":18.356399888100523,"vmax":18.42716360214644},
        {"hr":"2017-12-07 1500","vavg":18.184228953146324,"vmin":18.02590218966965,"vmax":18.357200986750097},
        {"hr":"2017-12-07 1400","vavg":17.865331608216135,"vmin":17.722419317921712,"vmax":18.01918186210931},
        {"hr":"2017-12-07 1300","vavg":17.56605798686948,"vmin":17.458368301925177,"vmax":17.71739019862159},
        {"hr":"2017-12-07 1200","vavg":17.40458936276629,"vmin":17.368867780575272,"vmax":17.454852368963145},
        {"hr":"2017-12-07 1100","vavg":17.33248974254639,"vmin":17.27896670990057,"vmax":17.407587548638137},
        {"hr":"2017-12-07 1000","vavg":17.190492831923596,"vmin":17.04019480684622,"vmax":17.27246890974288},
        {"hr":"2017-12-07 0900","vavg":17.049391122640156,"vmin":16.686376236616564,"vmax":17.39913150733705},
        {"hr":"2017-12-07 0800","vavg":17.382844726736344,"vmin":17.35021998423235,"vmax":17.39881996897332},
        {"hr":"2017-12-07 0700","vavg":17.22438593033409,"vmin":16.969253070878157,"vmax":17.350843060959797},
        {"hr":"2017-12-07 0600","vavg":16.220778003214743,"vmin":15.7107715978739,"vmax":16.950649780015777},
    ];
    
    return {
        sql:"select strftime(\"%Y-%m-%d %H00\",utc,\"localtime\") hr, avg(v) vavg, min(v) vmin, max(v) vmax\nfrom sensordata\nwhere utc between '2017-12-07 08:00:00.000' and '2017-12-08 08:00:00.000'\ngroup by hr\norder by hr desc\nlimit 24;",
        data: data.filter(d=>date1 < d.hr && d.hr < date2 + " 2400"),
    }
}

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
            default: 'temp-internal',
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
        addData() {
            var res = mockResponse("2017-12-07","2017-12-08");
            this.linechartData.datasets = this.responseDatasets(res);
            this.$refs.lineChart.update();
        },
        responseDatasets(res, opts) {
            var ds = [];
            var spanGaps = false;
            opts = Object.assign({
                precision: 1,
                scale: 1.8,
                offset: 32,
            },opts);

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
            ds.forEach(d=>(d.data = dataByHour(d.data, opts)));
            return ds;
        },
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
        this.linechartData = Object.assign({}, {
            labels: this.labelHours,
            datasets: [],
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
