import Vue from 'vue';
import Vuex from 'vuex';
import VueRouter from 'vue-router';
import Vuetify from 'vuetify';
import axios from 'axios';
import VueAxios from 'vue-axios';
import rbvue from 'rest-bundle/index-vue';
import vmc from 'vue-motion-cam/index-vue';

import SampleApp from './sample-app.vue';
import Home from './Home.vue';
import OyaNetwork from './oya-network.vue';
import OyaDeveloper from './oya-developer.vue';
import OyaChartPanel from './oya-chart-panel.vue';
import appvue from "../../index-vue";
require('./stylus/main.styl')

Vue.use(VueAxios, axios);
Vue.use(Vuex);
Vue.use(Vuetify);
Vue.use(VueRouter);
Vue.use(rbvue);
Vue.use(vmc);
Vue.use(appvue);

var routes = [{
        path: '/',
        redirect: "/home"
    },{
        path: '/home',
        component: Home,
    },{
        path: '/charts',
        component: OyaChartPanel,
    },{
        path: '/network',
        component: OyaNetwork,
    },{
        path: '/developer',
        component: OyaDeveloper,
    },
];
routes = routes.concat(rbvue.methods.aboutRoutes());
routes = routes.concat(rbvue.methods.aboutRoutes(appvue.components));

const router = new VueRouter({
    routes
})

const store = new Vuex.Store({
    // your application store
});

new Vue({
    el: '#sample-app',
    router,
    store,
    data: {
        service: 'oyamist-hello',
    },
    render: h => h(SampleApp),
    components: {
        Home,
        OyaChartPanel,
    },
})
