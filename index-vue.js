import OyaChart from "./src/ui/oya-chart.vue";
import OyaChartPanel from "./src/ui/oya-chart-panel.vue";
import OyaHealth from "./src/ui/oya-health.vue";
import OyaLight from "./src/ui/oya-light.vue";
import OyaFan from "./src/ui/oya-fan.vue";
import OyaNetwork from "./src/ui/oya-network.vue";
import OyaPlant from "./src/ui/oya-plant.vue";
import OyaProgress from "./src/ui/oya-progress.vue";
import OyaReactor from "./src/ui/oya-reactor.vue";
import OyaSensor from "./src/ui/oya-sensor.vue";

var components = {
    OyaChart,
    OyaChartPanel,
    OyaHealth,
    OyaFan,
    OyaLight,
    OyaNetwork,
    OyaPlant,
    OyaProgress,
    OyaReactor,
    OyaSensor,

}
function plugin(Vue, options) {
    Object.keys(components).forEach( key => Vue.component(key, components[key]));
}

export default {
    install: plugin,
    components,
}
