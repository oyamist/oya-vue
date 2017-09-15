import Vue from 'vue';
import Vuex from 'vuex';
import Vuetify from 'vuetify';
import axios from 'axios';
import VueAxios from 'vue-axios';
import rbvue from 'rest-bundle/index-vue';
import Service from './Service.vue';
require('./stylus/main.styl')

Vue.use(VueAxios, axios);
Vue.use(Vuex);;
Vue.use(Vuetify);
Vue.use(rbvue);

const store = new Vuex.Store({
    // app store
});

new Vue({
    el: '#service',
    store: store,
    render: h => h(Service),
})