import * as THREE from 'three';
import TWEEN, { update } from '@tweenjs/tween.js';

import Config from '../../data/config';

var STLLoader = require('three-stl-loader')(THREE);

const ROBOT_PREFIX = 'robot_';

export default class Robot {
    constructor(scene) {
        this.scene = scene;
        this.scale = scene_scale;
    }

    changeColor(id, R, G, B, ambient, callback) {
        var r = window.markerGroup.getObjectByName(ROBOT_PREFIX + id);
        if (r != undefined) {
            r.material.color.setRGB(R / 256, G / 256, B / 265);
            //console.log("Color> id:", id, " | R:", R, "G:", G, "B:", B);

            if (callback != null) callback('success');
        } else {
            if (callback != null) callback('undefined');
        }

        return r;
    }

    create(id, x, y, heading, callback) {
        var r = window.markerGroup.getObjectByName(ROBOT_PREFIX + id);
        if (r == undefined) {
            // Create only if not exists

            // Limit the arena that robot can go
            x = this.scale * Math.min(Math.max(x, Config.arena.minX), Config.arena.maxX);
            y = this.scale * Math.min(Math.max(y, Config.arena.minY), Config.arena.maxY);

            var loader = new STLLoader();
            loader.load('./assets/models/model.stl', function(geometry, scene){
                const material = new THREE.MeshStandardMaterial({ color: 0x666666 });
                const scale = window.scene_scale || 0.1;

                console.log('scale', scale);
                var r = new THREE.Mesh(geometry, material);
                r.receiveShadow = true;
                r.name = ROBOT_PREFIX + id;
                r.scale.set(scale, scale, scale);
                r.position.set(x, 0, -1*y);
                //r.rotation.x = -90 * THREE.Math.DEG2RAD;
                r.rotation.y = (heading - 90) * THREE.Math.DEG2RAD;

                window.markerGroup.add(r);

                r.clickEvent = function (m) {
                    window.robot.alert(m);
                };

                console.log('Created> Robot: id:', id, ' | x:', x, 'y:', y, 'heading:', heading);

                // Callback function
                if (callback != undefined) callback('success');
            });

        } else {
            this.move(id, x, y, heading, () => {
                if (callback != undefined) callback('already defined, so moved');
            });
        }
        return r;
    }

    delete(id, callback) {
        if (id != undefined) {
            var r = window.markerGroup.getObjectByName(ROBOT_PREFIX + id);

            if (r != undefined) {
                scene.remove(r);
                console.log('Deleted> id:', id);
                if (callback != undefined) callback('success');
            } else {
                if (callback != undefined) callback('not found');
            }
        } else {
            if (callback != undefined) callback('id not specified');
        }
    }

    deleteAll() {
        // Delete all robots
        const objects = window.markerGroup.children;

        Object.entries(objects).forEach((obj) => {
            const name = obj[1]['name'];

            if (name.startsWith(ROBOT_PREFIX)) {
                console.log('Deleted>', name);
                window.markerGroup.remove(obj[1]);
            }
        });
    }

    exists(id) {
        var r = window.markerGroup.getObjectByName(ROBOT_PREFIX + id);
        return r;
    }

    move(id, x, y, heading, callback) {
        var r = window.markerGroup.getObjectByName(ROBOT_PREFIX + id);
        if (r != undefined) {
            const currentHeading = r.rotation.y;
            const newHeading = (heading - 90) * THREE.Math.DEG2RAD;
            var position = { x: r.position.x, y: r.position.z, heading: r.rotation.y };

            // TODO: need a smoother way than this rough trick
            // If current and target rotations in different signs
            const rotationFlag = currentHeading * newHeading >= 0 ? true : false;

            // Limit the arena that robot can go
            x = this.scale * Math.min(Math.max(Math.round(x * 10) / 10, Config.arena.minX), Config.arena.maxX);
            y = -1* this.scale * Math.min(Math.max(Math.round(y * 10) / 10, Config.arena.minY), Config.arena.maxY);
            heading = Math.round(heading * 10) / 10;

            // const speed = 10;
            const distance = Math.sqrt(Math.pow(x - position.x, 2) + Math.pow(y - position.y, 2));

            const moveTime = 1; //distance / speed;
            // TODO: If distance is 0, need to handle only the rotation

            if (distance != 0) {
                var tween = new TWEEN.Tween(position)
                .to({ x: x, y: y, heading: newHeading }, 1000 * moveTime)
                /*.easing(TWEEN.Easing.Quartic.InOut)*/
                .onUpdate(function () {
                    r.position.x = position.x;
                    r.position.z = position.y;

                    if (rotationFlag) {
                        r.rotation.y = position.heading;
                    } else {
                        //console.log(currentHeading, newHeading);
                    }
                })
                .onComplete(() => {
                    //console.log('Moved> id:',id,'x:',x,'y:',y,'heading:',heading);
                    r.rotation.y = position.heading;
                    if (callback != null) callback('success');
                })
                .delay(50)
                .start();
            } else {
                // No move, only the rotation
                r.rotation.y = newHeading;
            }
            return r;
        } else {
            if (callback != null) callback('undefined');
        }
    }

    get_coordinates(id) {
        var r = window.markerGroup.getObjectByName(ROBOT_PREFIX + id);
        if (r != undefined) {
            console.log(`${r.position.x},${r.position.y},${r.position.z}`);
            return r;
        } else {
            return null;
        }
    }

    update() {
        TWEEN.update();
    }

    alert(mesh) {
        // Display an alert on window

        //alert(mesh.name);
        //console.log(mesh)
        let disp = document.querySelector('#msg-box');
        disp.innerHTML = mesh.name;
        disp.style.display = 'block';

        setTimeout(function () {
            document.querySelector('#msg-box').style.display = 'none';
        }, 1000);
    }
}
