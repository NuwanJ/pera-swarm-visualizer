import * as THREE from 'three';
import TWEEN, { update } from '@tweenjs/tween.js';

import Config from '../../data/config';
import MQTT from 'paho-mqtt';

import Obstacle from '../components/obstacle';
import Robot from '../components/robot';

// -----------------------------------------------------------------------------
// MQTT Topics
// -----------------------------------------------------------------------------
// This will provide location data to the GUI
const TOPIC_LOC_INFO = 'localization/info';

// Create and delete robot objects
const TOPIC_CREATE = 'robot/create';
const TOPIC_DELETE = 'robot/delete';

// This will request the localization data update from the server
const TOPIC_LOC_REQUEST = 'localization/?';

// This will request obstacle data from the server
const TOPIC_OBSTACLE_REQUEST = 'obstacles/?';

// This will send obstacle data as a JSON list
const TOPIC_OBSTACLES_LIST = 'obstacles';
const TOPIC_OBSTACLES_DELETE = 'obstacles/delete';
const TOPIC_OBSTACLES_DELETE_ALL = 'obstacles/delete/all';

const TOPIC_CHANGE_COLOR = 'output/neopixel';

// This will help to remote update the parameters in here
const TOPIC_MANAGEMENT_VISUALIZER = 'management/visualizer';

// -----------------------------------------------------------------------------

export default class MQTTClient {
    constructor(scene, markerGroup) {
        this.markerGroup = markerGroup;
        this.scene = scene;
        this.robot = new Robot(scene);
        this.obstacles = new Obstacle(scene);

        this.updateChannel();

        // create a random client Id
        const client_id = 'client_' + Math.random().toString(36).substring(2, 15);
        this.client = new MQTT.Client(Config.mqtt.server, Config.mqtt.port, Config.mqtt.path, client_id);

        window.mqtt = this.client;

        this.client.connect({
            userName: Config.mqtt.user,
            password: Config.mqtt.password,
            reconnect: true,
            useSSL: true,
            cleanSession: false,
            onSuccess: () => {
                console.log('MQTT: connected');

                // Subscribe to topics
                this.subscribe(TOPIC_LOC_INFO);
                this.subscribe(TOPIC_CREATE);
                this.subscribe(TOPIC_DELETE);
                this.subscribe(TOPIC_CHANGE_COLOR);
                this.subscribe(TOPIC_OBSTACLES_LIST);
                this.subscribe(TOPIC_OBSTACLES_DELETE);
                this.subscribe(TOPIC_OBSTACLES_DELETE_ALL);
                this.subscribe(TOPIC_MANAGEMENT_VISUALIZER);

                // Request for obstacle data
                this.publish(TOPIC_OBSTACLE_REQUEST, '?');

                // Request for coordinate data
                this.publish(TOPIC_LOC_REQUEST, '?');

                // Access globally
                window.robot = this.robot;
                window.obstacles = this.obstacles;

                this.client.onMessageArrived = this.onMessageArrived;
                this.client.onConnectionLost = this.onConnectionLost;
            },
            onFailure: () => {
                console.log('MQTT: connection failed');
            }
        });
    }

    updateChannel() {
        const channelHash = window.location.hash;
        if ((channelHash != '') & (channelHash.length > 1)) {
            window.channel = channelHash.substring(1);
        } else {
            window.channel = Config.mqtt.channel;
        }
        console.log('MQTT: channel=', window.channel);
        return true;
    }

    onConnectionLost(responseObject) {
        if (responseObject.errorCode !== 0) {
            console.log('MQTT: onConnectionLost:' + responseObject.errorMessage);
            console.log('MQTT: reconnecting');
        }
    }

    onMessageArrived(packet) {
        const msg = packet.payloadString.trim();
        const t = packet.destinationName;
        const topic = t.substring(t.indexOf('/') + 1);

        // console.log('MQTT: ' + topic + ' > ' + msg);

        if (topic == TOPIC_CREATE) {
            try {
                var data = JSON.parse(msg);
                window.robot.create(data.id, data.x, data.y, data.heading);
            } catch (e) {
                console.error(e);
            }
        } else if (topic == TOPIC_DELETE) {
            try {
                var data = JSON.parse(msg);
                window.robot.delete(data.id);
            } catch (e) {
                console.error(e);
            }
        } else if (topic == TOPIC_LOC_INFO) {
            //console.log('MQTT: ' + topic + ' > ' + msg);
            try {
                const data = JSON.parse(msg);

                Object.entries(data).forEach((entry) => {
                    // Update each robot
                    const r = entry[1];

                    if (window.robot.exists(r.id) == undefined) {
                        window.robot.create(r.id, r.x, r.y, r.heading);
                    } else {
                        window.robot.move(r.id, r.x, r.y, r.heading);
                    }
                });
            } catch (e) {
                console.error(e);
            }
        } else if (topic == TOPIC_OBSTACLES_LIST) {
            // Create obstacles in the arena
            try {
                const data = JSON.parse(msg);
                window.obstacles.createList(data);
            } catch (e) {
                console.error(e);
            }
        } else if (topic == TOPIC_OBSTACLES_DELETE) {
            // Delete obstacle given in the id
            const data = JSON.parse(msg);
            console.log(data);

            window.obstacles.deleteIfExists(data.id);
        } else if (topic == TOPIC_OBSTACLES_DELETE_ALL) {
            // Delete all obstacles
            window.obstacles.deleteAll();
        } else if (topic == TOPIC_CHANGE_COLOR) {
            try {
                const data = JSON.parse(msg);
                window.robot.changeColor(data.id, data.R, data.G, data.B, data.ambient);
            } catch (e) {
                console.error(e);
            }
        } else if (topic == TOPIC_MANAGEMENT_VISUALIZER) {

            if(msg === 'Refresh' ){
                console.log('page refresh request');
                location.reload();
            }else{
                console.log('>Management:', msg);
            }

        }
    }

    subscribe(topic, callback) {
        const subTopic = window.channel + '/' + topic;
        this.client.subscribe(subTopic);
        console.log('MQTT: subscribed', subTopic);
        if (callback != null) callback();
    }

    publish(topic, message, callback) {
        var payload = new MQTT.Message(message);
        const pubTopic = window.channel + '/' + topic;
        payload.destinationName = pubTopic;
        this.client.send(payload);
        console.log('MQTT: published', pubTopic);

        if (callback != null) callback();
    }
}
