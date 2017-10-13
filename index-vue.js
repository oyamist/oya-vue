import OyaReactor from "./src/ui/OyaReactor.vue";
import OyaSensor from "./src/ui/oya-sensor.vue";

var components = {
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
