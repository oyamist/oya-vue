<template>

<div>
    <rb-about v-if="about" :name="componentName">
        <p> Display health status of a host service 
        </p>
        <rb-about-item name="about" value="false" slot="prop">Show this descriptive text</rb-about-item>
        <rb-about-item name="service" value="oyamist" slot="prop">RestBundle name</rb-about-item>
        <rb-about-item name="host" value="(localhost)" slot="prop">Computer hostname or address</rb-about-item>
    </rb-about>

    <div :class="healthClass" @click="showDetail=!showDetail">
        <div v-for="(h,i) in health" :key="i" 
            :title="   h.text   " :class="h.class">
            {{h.symbol}}
            <div class="oya-health-detail" v-show="showDetail">{{h.text}}</div>
        </div>
    </div>


</div>

</template>
<script>

import Vue from 'vue';
import rbvue from "rest-bundle/index-vue";

const healthGood = {
    class: 'health-good',
    symbol: "\u2714",
};
const healthBad = {
    class: 'health-bad',
    symbol: "\u274c",
};
const healthUnavailable = {
    class: 'health-unavailable',
    symbol: "\u2205",
};
const healthWaiting = {
    text: 'Waiting for server...',
    symbol: '\u22ef',
};

export default {
    mixins: [ 
        rbvue.mixins.RbAboutMixin, 
        rbvue.mixins.RbServiceMixin,
    ],
    props: {
        host: null,
        vertical: false,
        showVessel: false,
    },
    data: function() {
        return {
            health: [ 
                healthWaiting ,
            ],
            showDetail: false,
        }
    },
    methods: {
        refresh() {
            if (this.host) {
                var port = this.host === '127.0.0.1' ? ":8080" : "";
                var host = `http://${this.host}${port}`;
                var url = [host, this.service, 'identity'].join('/');
            } else {
                var url = [this.restOrigin(), this.service, 'identity'].join('/');
            }
            console.log(`refresh() http GET:`, url);
            this.$http.get(url).then(res=>{
                var health = res.data && res.data.health;
                if (health) {
                    var keys = Object.keys(health).sort();
                    this.health = keys.reduce((a,k) => {
                        var v = health[k];
                        var vessel = this.showVessel ? `${res.data.vessel} ` : '';
                        var text = `${vessel}${k}: `;
                        if (v === true) {
                            var h = healthGood;
                            text += `ok`;
                        } else if (v === false) {
                            var h = healthBad;
                            text += `fault (no further information)`;
                        } else if (v) {
                            var h = healthBad;
                            text += `${v}`;
                        } else if (v == null) {
                            var h = healthUnavailable;
                            text += `unavailable`;
                        }
                        a.unshift(Object.assign({}, h, {
                            text,
                        }));
                        return a;
                    }, []);
                } else {
                    this.health = [
                        Object.assign({}, healthBad, {
                            text: "Health status unavailable",
                        }),
                    ];
                }
            }).catch(e=>{
                this.health = [
                    Object.assign({}, healthBad, {
                        text: e.message,
                    }),
                ];
                console.error(e);
            });
        },
    },
    computed: {
        healthClass() {
            return 'oya-health ' + 
                (this.vertical || this.showDetail 
                    ? 'oya-health-vertical' 
                    : 'oya-health-horizontal');
        },
    },
    components: {
    },
    created() {
    },
    mounted() {
        this.onApiModelLoaded('oya-conf').then(apiModel=>{
            this.refresh();
            var healthPoll = (apiModel.healthPoll || 60) * 1000;
            setInterval(() => this.refresh(), healthPoll);
        });
    },
}

</script>
<style> 
.health-good {
    color: green;
}
.health-bad {
    color: red;
}
.health-unavailable {
    color: gray;
}
.oya-health {
    display: flex;
}
.oya-health-vertical {
    flex-flow: column;
}
.oya-health-horizontal {
    flex-flow: row;
}
.oya-health-detail {
    color: black;
    width: 13em;
}
</style>
