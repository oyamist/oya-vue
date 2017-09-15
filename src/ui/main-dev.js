import Vue from 'vue';
import Vuex from 'vuex';
import VueRouter from 'vue-router';
import Vuetify from 'vuetify';
import axios from 'axios';
import VueAxios from 'vue-axios';
import rbvue from 'rest-bundle/index-vue';

import Dev from './Dev.vue';
import Introduction from './Introduction.vue';
import AllServices from './AllServices.vue';
import Service from './Service.vue';
import appvue from "../../index-vue";
require('./stylus/main.styl')

Vue.use(VueAxios, axios);
Vue.use(Vuex);
Vue.use(Vuetify);
Vue.use(VueRouter);
Vue.use(rbvue);
Vue.use(appvue);

var routes = [{
        path: '/',
        redirect: "/introduction"
    },
    {
        path: '/introduction',
        component: Introduction
    },
    {
        path: '/all-services',
        component: AllServices
    },
    {
        path: '/service',
        component: Service
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
    el: '#dev',
    router,
    store,
    render: h => h(Dev),
    components: {
        Introduction,
        AllServices,
        Service,
    },
})
