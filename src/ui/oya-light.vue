<template>

<div>
    <rb-about v-if="about" :name="componentName">
        <p> Display light progress
        </p>
        <rb-about-item name="about" value="false" slot="prop">Show this descriptive text</rb-about-item>
        <rb-about-item name="service" value="oyavue" slot="prop">RestBundle name</rb-about-item>
    </rb-about>

    <div class="oya-light-container" v-if="rbService.active" >
        <v-tooltip left v-if="rbService.lights && lightActive">
            <div class="oya-light oya-light-on" slot="activator">
                <v-progress-circular v-bind:value="cycleLight" 
                    v-bind:rotate="lightAngle"
                    size="40"
                    color='white'
                    fill='transparent'
                    >
                    <v-icon dark >lightbulb_outline</v-icon>
                </v-progress-circular>
            </div>
            <div class="text-xs-center">Lights out at {{timeUntil}}<br>{{timeRemaining}} remaining</div>   
        </v-tooltip>
        <v-tooltip left v-if="rbService.lights && !lightActive">
            <div class="oya-light oya-light-off" slot="activator">
                <v-progress-circular v-bind:value="100-cycleLight" 
                    v-bind:rotate="lightAngle"
                    size="40"
                    color='black'
                    fill='transparent'
                    >
                    <v-icon light >lightbulb_outline</v-icon>
                </v-progress-circular>
            </div>
            <div class="text-xs-center">Lights on at {{timeUntil}}<br>{{timeRemaining}} remaining</div>   
        </v-tooltip>
        </div>
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
    },
    data: function() {
        return {
        }
    },
    computed: {
        lightActive() {
            return this.rbService.lights.white.active;
        },
        countdown() {
            return this.rbService.lights.white.countdown;
        },
        lightAngle() {
            if (this.rbService.lights == null) {
                return 0;
            }
            var countdown = this.countdown;
            var apiModel = this.rbService['oya-conf'].apiModel;
            if (apiModel == null) {
                return 50;
            }
            var lights = apiModel.lights;
            var cycleOn = Number(lights[0].cycleOn);
            var cycleOff = Number(lights[0].cycleOff);
            var cycleOnSec = Math.round(cycleOn * 3600);
            var cycleOffSec = Math.round(cycleOff * 3600);
            var periodSec = cycleOnSec + cycleOffSec;
            if (this.lightActive) {
                var cycleAngle = 360*cycleOnSec/periodSec;
                var remainingAngle = cycleAngle*(countdown/cycleOnSec);
            } else {
                var cycleAngle = 360*cycleOffSec/periodSec;
                var remainingAngle = cycleAngle*(countdown/cycleOffSec);
            }
            return 270-remainingAngle;
        },
        timeUntil() {
            var countdown = this.rbService.lights.white.countdown;
            var date = new Date(Date.now() + countdown*1000);
            var hh = ('0'+date.getHours()).slice(-2);
            var mm = ('0'+date.getMinutes()).slice(-2);
            var ss = ('0'+date.getSeconds()).slice(-2);
            return `${hh}:${mm}:${ss}`;
        },
        timeRemaining() {
            var countdown = this.rbService.lights.white.countdown;
            var hh = Math.trunc(countdown / 3600);
            countdown -= hh*3600;
            var mm = Math.trunc(countdown / 60);
            countdown -= mm*60;
            var ss = Math.round(countdown);
            return `${hh}:${('0'+mm).slice(-2)}:${('0'+ss).slice(-2)}`;
        },
        cycleLight() {
            var apiModel = this.rbService['oya-conf'].apiModel;
            if (apiModel == null) {
                return 50;
            }
            var lights = apiModel.lights;
            var cycleOn = Number(lights[0].cycleOn);
            var cycleOff = Number(lights[0].cycleOff);
            var cycleOnSec = Math.round(cycleOn * 3600);
            var cycleOffSec = Math.round(cycleOff * 3600);
            var periodSec = cycleOnSec + cycleOffSec;
            return Math.round(cycleOnSec*100/periodSec);
        },
    },
    created() {
        this.restBundleResource();
    },
}

</script>
<style> 
.oya-light-container {
    padding: 0.5em;
    display: flex;
    flex-flow: row wrap;
}
.oya-light {
    border-radius: 20px;
    height:40px;
    width: 40px;
}
.oya-light-on {
    background: #aaa;

}
.oya-light-off {
    background: #aaa;

}
</style>
