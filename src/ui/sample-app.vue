<template>

<v-app id="sample-app" >
   <v-navigation-drawer temporary absolute v-model="drawer" enable-resize-watcher app>
      <v-list dense>
        <div v-for="(item,i) in sidebarMain" :key="i">
          <v-list-tile exact :to="item.href">
            <v-list-tile-action>
                <v-icon >{{item.icon}}</v-icon>
            </v-list-tile-action>
            <v-list-tile-content>
                <v-list-tile-title>{{ item.title }}</v-list-tile-title>
            </v-list-tile-content>
            <v-list-tile-action>
                <v-icon v-show='$route.path === item.href'>keyboard_arrow_right</v-icon>
            </v-list-tile-action>
          </v-list-tile>
        </div>
        <v-list-group v-model="showDeveloper">
            <v-list-tile slot="item">
              <v-list-tile-action> <v-icon >build</v-icon> </v-list-tile-action>
              <v-list-tile-content>
                <v-list-tile-title>Developer</v-list-tile-title>
              </v-list-tile-content>
              <v-list-tile-action>
                <v-icon dark>keyboard_arrow_down</v-icon>
              </v-list-tile-action>
            </v-list-tile>
            <div v-for="(item,i) in sidebarDeveloper" :key="i">
              <v-list-tile exact :to="item.href">
                <v-list-tile-content>
                    <v-list-tile-title>{{ item.title }}</v-list-tile-title>
                </v-list-tile-content>
                <v-list-tile-action>
                    <v-icon v-show='$route.path === item.href'>keyboard_arrow_right</v-icon>
                </v-list-tile-action>
              </v-list-tile>
            </div>
        </v-list-group>
      </v-list>
    </v-navigation-drawer>
    <v-toolbar app fixed flat class="black" >
        <v-toolbar-side-icon dark @click.stop="drawer = !drawer"></v-toolbar-side-icon>
        <v-toolbar-title class="grey--text text--lighten-1">
            <div class="mr-2 app-title" title="sample application">
                <div class="app-subtitle">sample application</div>
                {{package.name}} {{package.version}}
            </div>
        </v-toolbar-title>
        <v-spacer/>
        <rb-web-socket/>
    </v-toolbar>
    <v-content >
        <v-container fluid class="oya-content">
            <router-view> </router-view>
        </v-container>
    </v-content>
    <rb-alerts ></rb-alerts>
</v-app>

</template> 
<script>

import OyaDashboard from './oya-dashboard.vue';
import OyaNetwork from './oya-network.vue';
import OyaDeveloper from './oya-developer.vue';
import OyaChartPanel from './oya-chart-panel.vue';
import rbvue from "rest-bundle/index-vue";
import appvue from "../../index-vue";

export default {
    name: 'sample-app',
    props: {
        service: {
            default: "oyamist",
        },
    },
    data() {
        return {
            package: require("../../package.json"),
            drawer: false,
            sidebarMain: [{
                icon: "question_answer",
                title: "Home",
                href: "/dashboard",
            },{
                icon: "show_chart",
                title: "Charts",
                href: "/charts",
            },{
                icon: "network_check",
                title: "Network",
                href: "/network",
            }], 
            showDeveloper: false,
            sidebarDeveloper: [{
                icon: "build",
                title: "Client state",
                href: "/developer",
           }].concat(rbvue.methods.aboutSidebar(appvue.components)),
       };
    },
    methods: {
        productionUrl(path) {
            var host = location.port === "4000" 
                ? location.hostname + ":8080"
                : location.host;
            return "http://" + host + path;
        },
    },
    computed: {
    },
    components: {
        OyaDashboard,
        OyaChartPanel,
        OyaNetwork,
        OyaDeveloper,
    },
}

</script>
<style> 
.oya-content {
}
.app-title {
    position: relative;
    padding-bottom: 0.5em;
}
.app-subtitle {
    position: absolute;
    bottom: 0px;
    font-size: 10px;
}
</style>
