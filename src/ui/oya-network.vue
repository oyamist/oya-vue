
<template>

<div>
    <rb-about v-if="about" :name="componentName">
        <p> Display network informationprogress
        </p>
        <rb-about-item name="about" value="false" slot="prop">Show this descriptive text</rb-about-item>
        <rb-about-item name="service" value="test" slot="prop">RestBundle name</rb-about-item>
        <rb-about-item name="queryService" value="(service)" slot="prop">Service name to query</rb-about-item>
    </rb-about>

    <v-card>
        <v-card-title primary-title>
            <h3> Network hosts: {{service}}</h3>
        </v-card-title>
        <v-data-table v-bind:headers="headers" :items="hosts" hide-actions class="elevation-1" >
            <template slot="items" slot-scope="hosts">
                <td class="text-xs-left" >
                    <a :href="link(hosts.item)" > {{ hosts.item.vessel }} </a>
                </td>
                <td class="text-xs-left">
                    <a :href="link(hosts.item)" > {{ hosts.item.version }} </a>
                </td>
                <td class="text-xs-left">
                    <a :href="link(hosts.item)" > {{ hosts.item.hostname }} </a>
                </td>
                <td class="text-xs-left">
                    <a :href="link(hosts.item)" > {{ hosts.item.ip }} </a>
                </td>
            </template>
        </v-data-table>
    </v-card>
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
    },
    data: function() {
        return {
            hosts: [{
                name: 'test',
            }],
        }
    },
    methods: {
        refresh(opts={}) {
            console.log('refreshing', this.queryService);
            var url = [this.restOrigin(), this.service, 'net', 'hosts', 
                this.queryService || this.service].join('/');
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
                { text: 'Vessel', align: 'left', value: 'vessel' },
                { text: 'Version', align: 'left', value: 'version' },
                { text: 'Host', align: 'left', value: 'hostname' },
                { text: 'Address', align: 'left', value: 'ip' },
            ];
        },
    },
    mounted() {
        this.refresh();
    },
}

</script>
<style> 
</style>
