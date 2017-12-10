<script>
    import { Line } from 'vue-chartjs';

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

    function colors(paletteName, i) {
        var palette = palettes[paletteName] || palettes.red;
        return palette[i] || palette[palette.length-1];
    }

    export default {
        extends: Line,
        props: {
            xAxisLabel: {
                type: String,
                default: "",
            },
            yAxisLabel: {
                type: String,
                default: "",
            },
            palette: {
                type: String,
                default: "red",
            },
            chartData: null,
        },
        methods: {
            update() {
                this.$data._chart.update();
            },
        },
        colors: (palette,i) => colors(palette,i),
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
            this.renderChart(this.chartData, this.options);
        },

    }
</script>
