
<template>

<div>
    <rb-about v-if="about" :name="componentName">
        <p> Display network information
        </p>
        <rb-about-item name="about" value="false" slot="prop">Show this descriptive text</rb-about-item>
        <rb-about-item name="service" value="oyamist" slot="prop">RestBundle name</rb-about-item>
        <rb-about-item name="queryService" value="(service)" slot="prop">Service name to query</rb-about-item>
    </rb-about>

    <div class="oya-network-container">
        <v-card-title primary-title>
            <div class="title oya-network-title">Network {{service}} hosts</div>
            <v-spacer></v-spacer>
            <v-text-field append-icon="search" label="Search" single-line
                hide-details v-model="search" />
        </v-card-title>
        <v-data-table 
            v-bind:headers="headers" 
            v-bind:search="search" 
            :items="hosts" hide-actions class="elevation-1" >
            <template slot="items" slot-scope="hosts">
                <td class="text-xs-left" >
                    <a :href="link(hosts.item)" > {{ hosts.item.vessel }} </a>
                </td>
                <td class="text-xs-left" >
                    <oya-health :host="hosts.item.ip" :service="service"/> 
                </td>
                <td class="text-xs-left">
                    {{ hosts.item.version }} 
                </td>
                <td class="text-xs-left">
                    <a :href="link(hosts.item)" slot="activator"> {{ hosts.item.hostname }} </a>
                </td>
                <td class="text-xs-left">
                    <a :href="link(hosts.item)" > {{ hosts.item.ip }} </a>
                </td>
            </template>
        </v-data-table>
    </div>
</div>

</template>
<script>

import Vue from 'vue';
import rbvue from "rest-bundle/index-vue";

export default {
    mixins: [ 
        rbvue.mixins.RbAboutMixin, 
        rbvue.mixins.RbServiceMixin,
    ],
    props: {
        queryService: {
            default: null,
        },
        service: {
            default: 'oyamist',
        },
    },
    data: function() {
        return {
            hosts: [{
                name: 'oyamist',
            }],
            search: '',
        }
    },
    methods: {
        refresh(opts={}) {
            var url = [this.restOrigin(), this.service, 'net', 'hosts', 
                this.queryService || this.service].join('/');
            console.log('refreshing', this.queryService, url);
            this.$http.get(url).then(res=>{
                this.hosts = res.data;
            }).catch(e=>{
                console.error(e);
            });
        },
        link(host) {
            if (host.hostname === 'localhost') {
                return `http://${host.hostname}:8080`;
            } else {
                return `http://${host.hostname}`;
            }
        },
    },
    computed: {
        headers() {
            return [
                { text: 'Name', align: 'left', value: "vessel" },
                { text: 'Status', align: 'left', value: 'health' },
                { text: 'Version', align: 'left', value: 'version' },
                { text: 'Host', align: 'left', value: 'hostname' },
                { text: 'Address', align: 'left', value: 'ip' },
            ];
        },
    },
    created() {
        console.log('created()', this.service);
        this.restBundleResource(); // load apiModel
        //this.rbDispatch("apiLoad").then(r => {
            //console.log("OyaChartPanel apiLoad", r);
        //});
    },
    mounted() {
        this.refresh();
    },
}

</script>
<style> 
.oya-network-container {
    margin-top: -2.5em;
}
.oya-network-title {
    margin-left: -0.6em;
    padding-top: 0.8em;
}
</style>
