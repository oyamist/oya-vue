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
        <v-list-group value="sidebarRestBundle">
            <v-list-tile slot="item">
              <v-list-tile-action> <v-icon >help</v-icon> </v-list-tile-action>
              <v-list-tile-content>
                <v-list-tile-title>rest-bundle</v-list-tile-title>
              </v-list-tile-content>
              <v-list-tile-action>
                <v-icon dark>keyboard_arrow_down</v-icon>
              </v-list-tile-action>
            </v-list-tile>
            <div v-for="(item,i) in sidebarRestBundle" :key="i">
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
        <v-list-group value="sidebarAppRest">
            <v-list-tile slot="item">
              <v-list-tile-action> <v-icon >help</v-icon> </v-list-tile-action>
              <v-list-tile-content>
                <v-list-tile-title>{{package.name}}</v-list-tile-title>
              </v-list-tile-content>
              <v-list-tile-action>
                <v-icon dark>keyboard_arrow_down</v-icon>
              </v-list-tile-action>
            </v-list-tile>
            <div v-for="(item,i) in sidebarAppRest" :key="i">
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
            <div style="display:flex; flex-flow:column; ">
                <span class="mr-2" >{{package.name}} {{package.version}}</span>
                <span class="caption">sample application</span>
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

import Home from './Home.vue';
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
                title: "Dashboard",
                href: "/home",
            },{
                icon: "show_chart",
                title: "Charts",
                href: "/charts",
            },{
                icon: "network_check",
                title: "Network",
                href: "/network",
            },{
                icon: "build",
                title: "Developer",
                href: "/developer",
            }],
            sidebarRestBundle: rbvue.methods.aboutSidebar(rbvue.components),
            sidebarAppRest: rbvue.methods.aboutSidebar(appvue.components),
        }
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
        Home,
        OyaChartPanel,
        OyaNetwork,
        OyaDeveloper,
    },
}

</script>
<style> 
.oya-content {
    padding: 0px;
}
</style>
