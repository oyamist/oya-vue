import OyaReactor from "./src/ui/oya-reactor.vue";
import OyaChart from "./src/ui/oya-chart.vue";
import OyaSensor from "./src/ui/oya-sensor.vue";
import OyaProgress from "./src/ui/oya-progress.vue";

var components = {
    OyaReactor,
    OyaChart,
    OyaSensor,
    OyaProgress,
}
function plugin(Vue, options) {
    Object.keys(components).forEach( key => Vue.component(key, components[key]));
}

export default {
    install: plugin,
    components,
}
