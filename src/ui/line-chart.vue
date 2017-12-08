<script>
    import { Line } from 'vue-chartjs';

    export default {
        extends: Line,
        props: {
            chartData: {
                type: Array | Object,
                required: false,
                default: () => [ 10,50,30,35, ],
            },
            chartLabels: {
                type: Array,
                required: false,
                default: () => [ 'a','b','c', ],
            }
        },
        data () {
            return {
                options: {
                    scales: {
                        yAxes: [{
                            ticks: {
                                beginAtZero: false,
                            },
                            gridLines: {
                                display: true
                            }
                        }],
                        xAxes: [ {
                            gridLines: {
                                display: true
                            },
                            stepSize: 1,
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
                datasets: [{
                    label: 'downloads',
                    borderColor: '#249EBF',
                    pointBackgroundColor: 'white',
                    borderWidth: 1,
                    pointBorderColor: '#249EBF',
                    backgroundColor: 'transparent',
                    data: this.chartData
                }]
            }, this.options);
        }
    }
</script>
