import OyaReactor from "./src/ui/oya-reactor.vue";
import OyaPlant from "./src/ui/oya-plant.vue";
import OyaChart from "./src/ui/oya-chart.vue";
import OyaLight from "./src/ui/oya-light.vue";
import OyaSensor from "./src/ui/oya-sensor.vue";
import OyaProgress from "./src/ui/oya-progress.vue";

var components = {
    OyaChart,
    OyaLight,
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
