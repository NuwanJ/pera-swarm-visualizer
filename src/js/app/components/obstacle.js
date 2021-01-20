import * as THREE from 'three';
import TWEEN, { update } from '@tweenjs/tween.js';

import Config from '../../data/config';

const OBSTACLE_PREFIX = 'obstacle_';

export default class Obstacle {
    constructor(scene, callback) {
        this.scene = scene;
        this.scale = scene_scale;

        if (callback != undefined) {
            callback();
        }
    }

    // Create a given list of obstacles
    createList(obstacles) {
        Object.entries(obstacles).forEach((obs) => {
            if (obs != undefined) {
                //console.log(obs[1]);
                this.create(obs[1]);
            }
        });
    }

    // Create a obstacle
    create(obstacle) {
        const geometry = this.createGeometry(obstacle.geometry);
        const material = this.createMaterial(obstacle.material);
        const id = obstacle.id || 1000 + Math.floor(900 * Math.random());

        const mesh = new THREE.Mesh(geometry, material);

        mesh.name = OBSTACLE_PREFIX + id;

        // Remove if object is already defined
        this.deleteIfExists(id);

        // Add the mesh object to arena
        window.markerGroup.add(mesh);

        // update the position of the object
        if (obstacle.position != undefined) {
            const { x, y } = obstacle.position;
            const z = this.calculateZ(obstacle);
            mesh.scale.set(this.scale,this.scale,this.scale);
            mesh.position.set(this.scale*x,this.scale*z,-1*this.scale*y);
        }

        // Rotate the object, after translate degrees into radians
        if (obstacle.rotation != undefined) {
            const { x, y, z } = obstacle.rotation;
            const radX = (x / 360) * 2 * Math.PI; // transformation due to coordinate system
            const radY = (y / 360) * 2 * Math.PI;
            const radZ = (z / 360) * 2 * Math.PI;

            mesh.rotation.set(radX, radY, radZ);
        }

        // Enable shadows for the object
        if (Config.shadow.enabled) mesh.receiveShadow = true;

        console.log('Created>', mesh.name);
    }

    createGeometry(g) {
        if (g.type == undefined) throw new TypeError('type unspecified');

        if (g.type == 'BoxGeometry') {
            return this.createBoxGeometry(g.width, g.height, g.depth);

        } else if (g.type == 'CylinderGeometry') {
            return this.createCylinderGeometry(g.radiusTop,g.radiusBottom,g.height);

        } else if (g.type == 'SphereGeometry') {
            return this.createSphereGeometry(g.radius);

        } else {
            throw new TypeError('unsupported geometry type');
        }
    }

    createBoxGeometry(width, height, depth) {
        if (width == undefined) throw new TypeError('width unspecified');
        if (height == undefined) throw new TypeError('height unspecified');
        if (depth == undefined) throw new TypeError('depth unspecified');

        // https://threejs.org/docs/#api/en/geometries/BoxGeometry
        return new THREE.BoxGeometry(width, height, depth);
    }

    createCylinderGeometry(radiusTop,radiusBottom,height){
        if (radiusTop == undefined) throw new TypeError('radiusTop unspecified');
        if (radiusBottom == undefined) throw new TypeError('radiusBottom unspecified');
        if (height == undefined) throw new TypeError('height unspecified');

        // https://threejs.org/docs/#api/en/geometries/CylinderGeometry
        const heightSegments = heightSegments || 2;
        const radialSegments = radialSegments || 16;

        return new THREE.CylinderGeometry(radiusTop, radiusBottom, height, radialSegments, heightSegments);
    }

    createSphereGeometry(radius){
        if (radius == undefined) throw new TypeError('radius unspecified');

        // https://threejs.org/docs/#api/en/geometries/SphereGeometry
        const widthSegments = widthSegments || 16;
        const heightSegments = heightSegments || 16;
        return new THREE.SphereGeometry(radius, widthSegments, heightSegments);
    }

    createMaterial(m) {
        if (m.type == 'MeshBasicMaterial') {
            // https://threejs.org/docs/#api/en/materials/MeshBasicMaterial
            return new THREE.MeshBasicMaterial(m.properties);
        } else if (m.type == 'MeshNormalMaterial') {
            // https://threejs.org/docs/api/en/materials/MeshNormalMaterial.html
            return new THREE.MeshNormalMaterial(m.properties);
        } else if (m.type == 'MeshPhongMaterial') {
            // https://threejs.org/docs/#api/en/materials/MeshPhongMaterial
            return new THREE.MeshPhongMaterial(m.properties);
        } else if (m.type == 'MeshPhysicalMaterial') {
            // https://threejs.org/docs/#api/en/materials/MeshPhysicalMaterial
            return new THREE.MeshPhysicalMaterial(m.properties);
        } else if (m.type == 'MeshStandardMaterial') {
            // https://threejs.org/docs/#api/en/materials/MeshStandardMaterial
            return new THREE.MeshStandardMaterial(m.properties);
        } else {
            // Default material type
            return new THREE.MeshStandardMaterial(m.properties);
        }
    }

    calculateZ(obstacle) {
        // If z is undefined, place the object in top of the arena
        if (obstacle.position.z == undefined) {
            if (obstacle.geometry.height != undefined) {
                // Box and Cylinder objects
                return obstacle.geometry.height / 2;
            } else if (obstacle.geometry.radius != undefined) {
                // Sphere objects
                return obstacle.geometry.radius;
            } else {
                return 0;
            }
        }
        return obstacle.position.z;
    }

    deleteIfExists(id) {
        // Delete obstacle if it already exists

        const name = OBSTACLE_PREFIX + id;
        const obstacle = window.markerGroup.getObjectByName(name);

        if (obstacle != undefined) {
            window.markerGroup.remove(obstacle);
            console.log('Deleted>', name);
        }
    }

    deleteAll() {
        // Delete all obstacles
        const objects = window.markerGroup.children;

        Object.entries(objects).forEach((obj) => {
            const name = obj[1]['name'];

            if (name.startsWith(OBSTACLE_PREFIX)) {
                console.log('Deleted>', name);
                window.markerGroup.remove(obj[1]);
            }
        });
    }
}
