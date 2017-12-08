<script>
    import { Line } from 'vue-chartjs';

    export default {
        extends: Line,
        props: {
            xAxisLabel: {
                type: String,
                default: "time of day",
            },
            yAxisLabel: {
                type: String,
                default: "internal temperature",
            },
            palette: {
                type: String,
                default: "red",
            },
            chartLabels: {
                type: Array,
                default: () => [ 'a','b','c', ],
            },
            datasets: {
                type: Array,
                default: () => [{
                    label: "2017-12-14",
                    data: [ 39,45,50,52, ],
                },{
                    label: "2017-12-13",
                    data: [ 41,46,50,55,56, ],
                },{
                    label: "2017-12-12",
                    data: [ 41,47,52,51,54, ],
                },{
                    label: "2017-12-11",
                    data: [ 42,48,51,52,53, ],
                },{
                    label: "2017-12-10",
                    data: [ 42,50,55,52,52, ],
                },{
                    label: "2017-12-09",
                    data: [ 42,51,56,52,51, ],
                },{
                    label: "2017-12-08",
                    data: [ 43,52,57,52,50, ],
                }],
            },
        },
        methods: {
            colors(i) {
                const palettes = {
                    red: [
                        'hsl(0,100%,40%)',
                        'hsl(45,100%,50%)',
                        'hsl(45,100%,57%)',
                        'hsl(45,100%,64%)',
                        'hsl(45,100%,71%)',
                        'hsl(45,100%,78%)',
                        'hsl(45,100%,85%)',
                    ],
                    blue: [
                        'hsl(240,100%,40%)',
                        'hsl(200,100%,50%)',
                        'hsl(200,100%,57%)',
                        'hsl(200,100%,64%)',
                        'hsl(200,100%,71%)',
                        'hsl(200,100%,78%)',
                        'hsl(200,100%,85%)',
                    ],
                    green: [
                        'hsl(120,50%,40%)',
                        'hsl(70,90%,50%)',
                        'hsl(70,85%,57%)',
                        'hsl(70,80%,64%)',
                        'hsl(70,75%,71%)',
                        'hsl(70,70%,78%)',
                        'hsl(70,65%,85%)',
                    ],
                };
                var palette = palettes[this.palette] || palettes.red;
                return palette[i] || palette[palette.length-1];
            },
        },
        data () {
            return {
                options: {
                    tooltips: {
                        mode: 'index',
                        intersect: false,
                    },
                    scales: {
                        yAxes: [{
                            ticks: {
                                beginAtZero: false,
                            },
                            gridLines: {
                                display: true
                            },
                            scaleLabel: {
                                labelString: this.yAxisLabel,
                                display: true,
                            },
                        }],
                        xAxes: [ {
                            scaleLabel: {
                                labelString: this.xAxisLabel,
                                display: true,
                            },
                            gridLines: {
                                display: true
                            },
                            ticks: {
                                maxTicksLimit: 12,
                                stepSize: 2,
                            },
                        }]
                    },
                    legend: {
                        display: false
                    },
                    responsive: false,
                    maintainAspectRatio: false,
                }
            }
        },
        mounted () {
            this.renderChart({
                labels: this.chartLabels,
                backgroundColor: 'rgb(50,50,50)',
                datasets: this.datasets.map((d,i) => Object.assign({},d,{
                    borderColor: this.colors(i),
                    pointBackgroundColor: this.colors(i),
                    borderWidth: 3,
                    radius: 0,
                    pointBorderColor: this.colors(i),
                    backgroundColor: 'transparent',
                })),
            }, this.options);
        }
    }
</script>
