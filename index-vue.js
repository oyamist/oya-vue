import OyaCycleVue from "./src/ui/OyaCycleVue.vue";

var components = {
    OyaCycleVue,
}
function plugin(Vue, options) {
    Object.keys(components).forEach( key => Vue.component(key, components[key]));
}

export default {
    install: plugin,
    components,
}
