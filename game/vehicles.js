import * as THREE from './three.module.min.js';
import { groundHeight } from './city.js';

export const VEHICLE_ROSTER = [
  {id: 'colibri', name: 'Colibrí compact', topSpeed: 130, acc: 9.5, grip: 0.72, class: 'compact', mass: 900, chop: 50},
  {id: 'sirena', name: 'Sirena taxi', topSpeed: 150, acc: 8.0, grip: 0.75, class: 'taxi', mass: 1200, chop: 80},
  {id: 'caiman', name: 'Caimán van', topSpeed: 120, acc: 10.5, grip: 0.65, class: 'van', mass: 1900, chop: 100},
  {id: 'mula', name: 'Mula 4x4 pickup', topSpeed: 140, acc: 8.8, grip: 0.80, class: 'pickup', mass: 1600, chop: 120},
  {id: 'boxer', name: 'Bóxer truck', topSpeed: 95, acc: 13.0, grip: 0.55, class: 'truck', mass: 3200, chop: 90},
  {id: 'fantasma', name: 'Fantasma luxury', topSpeed: 180, acc: 6.0, grip: 0.78, class: 'luxury', mass: 1600, chop: 300},
  {id: 'corsario', name: 'Corsario S muscle', topSpeed: 190, acc: 5.2, grip: 0.70, class: 'muscle', mass: 1500, chop: 220},
  {id: 'zorro', name: 'Zorro GT sports', topSpeed: 220, acc: 4.1, grip: 0.85, class: 'sports', mass: 1300, chop: 320},
  {id: 'relampago', name: 'Relámpago super', topSpeed: 260, acc: 3.2, grip: 0.90, class: 'super', mass: 1200, chop: 400},
  {id: 'fenix', name: 'Fénix police cruiser', topSpeed: 200, acc: 4.8, grip: 0.82, class: 'police', mass: 1500, chop: 0, stealHeat: 40},
  {id: 'perro', name: 'Perro SWAT van', topSpeed: 150, acc: 7.0, grip: 0.75, class: 'police', mass: 2600, chop: 0},
  {id: 'halcon', name: 'Halcón police heli', topSpeed: 0, acc: 0, grip: 0, class: 'heli', mass: 0, chop: 0}
];

const createBody = () => new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.6, 4.0), new THREE.MeshStandardMaterial({ color: 0x333333 }));
const createCabin = () => new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 2.0), new THREE.MeshStandardMaterial({ color: 0x333333 }));
const createWheel = () => new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.4, 8), new THREE.MeshStandardMaterial({ color: 0x111111 }));

export const createVehicleMesh = (id, scene) => {
    const group = new THREE.Group();
    group.add(createBody());
    const cabin = createCabin();
    cabin.position.set(0, 0.5, 0);
    group.add(cabin);

    for (let i = 0; i < 4; i++) {
        const wheel = createWheel();
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set((i % 2 === 0 ? -0.8 : 0.8), -0.2, (i < 2 ? -1.2 : 1.2));
        group.add(wheel);
    }

    if (id === 'fenix' || id === 'perro') {
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.1, 4.0), new THREE.MeshStandardMaterial({ color: 0xffffff }));
        stripe.position.set(0, 0.35, 0);
        group.add(stripe);
        const light = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.2, 0.2), new THREE.MeshStandardMaterial({ color: 0xff0000 }));
        light.position.set(0, 0.8, 0);
        group.add(light);
    }

    if (id === 'halcon') {
        const heli = new THREE.Mesh(new THREE.SphereGeometry(1.0, 16, 16), new THREE.MeshStandardMaterial({ color: 0x000000 }));
        group.add(heli);
        const light = new THREE.Mesh(new THREE.ConeGeometry(0.5, 2.0, 16), new THREE.MeshBasicMaterial({ color: 0xffff00, transparent: true, opacity: 0.5 }));
        light.rotation.x = Math.PI / 2;
        light.position.set(0, -1.0, 1.0);
        group.add(light);
    }

    scene.add(group);
    return group;
};

export const spawnVehicle = (id, x, z, heading, scene) => {
    const specs = VEHICLE_ROSTER.find(v => v.id === id);
    const mesh = createVehicleMesh(id, scene);
    const vehicle = {
        ...specs,
        x, z, heading,
        vx: 0, vz: 0,
        speed: 0,
        mesh,
        durability: 100,
        stolen: false,
        smoke: null
    };
    mesh.position.set(x, groundHeight(x, z), z);
    mesh.rotation.y = heading;
    return vehicle;
};

const updatePhysics = (vehicle, dt, controls) => {
    const accel = controls ? controls.throttle : 0;
    const brake = controls ? controls.brake : 0;
    const steer = controls ? controls.steer : 0;

    // Engine force
    const force = accel * vehicle.acc;
    vehicle.speed += force * dt;

    // Drag
    vehicle.speed *= (1 - 0.1 * dt);

    // Handbrake + Scrub
    if (brake) {
        vehicle.speed *= (1 - 0.5 * dt);
        vehicle.heading += steer * (vehicle.grip * 0.35) * dt;
    } else {
        vehicle.heading += steer * vehicle.grip * (vehicle.speed / vehicle.topSpeed) * dt;
    }

    vehicle.x += Math.sin(vehicle.heading) * vehicle.speed * dt;
    vehicle.z += Math.cos(vehicle.heading) * vehicle.speed * dt;
};

export const updateVehicle = (vehicle, dt, controls) => {
    if (vehicle.durability <= 0) {
        if (!vehicle.smoke) {
            // Add smoke particle system
            vehicle.smoke = new THREE.Group();
            vehicle.mesh.add(vehicle.smoke);
        }
        return;
    }

    updatePhysics(vehicle, dt, controls);

    vehicle.mesh.position.set(vehicle.x, groundHeight(vehicle.x, vehicle.z), vehicle.z);
    vehicle.mesh.rotation.y = vehicle.heading;
};

export const damageVehicle = (vehicle, relativeSpeed, otherMass) => {
    const impact = relativeSpeed * (otherMass / vehicle.mass);
    vehicle.durability -= impact;
    if (vehicle.durability < 0) vehicle.durability = 0;
};

export const markStolen = (vehicle) => {
    vehicle.stolen = true;
};
