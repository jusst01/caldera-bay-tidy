import * as THREE from './three.module.min.js';

function groundHeight(x, z) { return 0; }

export const VEHICLE_ROSTER = [
    { id: 'colibri', name: 'Colibrí', topSpeed: 130, grip: 0.72, class: 'compact', chop: 50, colour: 0xFF0000 },
    { id: 'sirena', name: 'Sirena', topSpeed: 150, grip: 0.75, class: 'taxi', chop: 80, colour: 0xFFFF00 },
    { id: 'caiman', name: 'Caimán', topSpeed: 120, grip: 0.65, class: 'van', chop: 100, colour: 0x888888 },
    { id: 'mula', name: 'Mula', topSpeed: 140, grip: 0.80, class: 'pickup', chop: 120, colour: 0x444400 },
    { id: 'boxer', name: 'Bóxer', topSpeed: 95, grip: 0.55, class: 'truck', chop: 90, colour: 0x333333 },
    { id: 'fantasma', name: 'Fantasma', topSpeed: 180, grip: 0.78, class: 'luxury', chop: 300, colour: 0x0000FF },
    { id: 'corsario', name: 'Corsario S', topSpeed: 190, grip: 0.70, class: 'muscle', chop: 220, colour: 0xFF00FF },
    { id: 'zorro', name: 'Zorro GT', topSpeed: 220, grip: 0.85, class: 'sports', chop: 320, colour: 0x00FFFF },
    { id: 'relampago', name: 'Relámpago', topSpeed: 260, grip: 0.90, class: 'super', chop: 400, colour: 0xFFFFFF },
    { id: 'fenix', name: 'Fénix', topSpeed: 200, grip: 0.82, class: 'police', chop: 0, colour: 0xFFFFFF },
    { id: 'perro', name: 'Perro', topSpeed: 150, grip: 0.75, class: 'swat', chop: 0, colour: 0x000000 },
    { id: 'halcon', name: 'Halcón', topSpeed: 0, grip: 0.00, class: 'heli', chop: 0, colour: 0x000000 }
];

export function createVehicleMesh(id) {
    const group = new THREE.Group();
    const data = VEHICLE_ROSTER.find(v => v.id === id);
    const body = new THREE.Mesh(new THREE.BoxGeometry(2, 0.8, 4), new THREE.MeshLambertMaterial({ color: data.colour }));
    body.position.y = 0.4;
    group.add(body);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.6, 2), new THREE.MeshLambertMaterial({ color: 0x222222 }));
    cabin.position.y = 1.1;
    cabin.position.z = -0.5;
    group.add(cabin);

    for (let i = 0; i < 4; i++) {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.4, 8), new THREE.MeshLambertMaterial({ color: 0x111111 }));
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(i % 2 === 0 ? -1.1 : 1.1, 0.2, i < 2 ? -1.5 : 1.5);
        group.add(wheel);
    }
    if (id === 'fenix' || id === 'perro') {
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.1, 4.1), new THREE.MeshLambertMaterial({ color: 0xFFFFFF }));
        stripe.position.y = 0.45;
        group.add(stripe);
        const lightBar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.2, 0.4), new THREE.MeshLambertMaterial({ color: 0xFF0000 }));
        lightBar.position.y = 1.5;
        group.add(lightBar);
    }
    if (id === 'halcon') {
        const rotor = new THREE.Mesh(new THREE.BoxGeometry(5, 0.1, 0.2), new THREE.MeshLambertMaterial({ color: 0x333333 }));
        rotor.position.y = 2;
        group.add(rotor);
        const spotlight = new THREE.SpotLight(0xFFFFFF, 2);
        spotlight.position.set(0, 1.5, 0);
        spotlight.target.position.set(0, 0, 5);
        group.add(spotlight);
        group.add(spotlight.target);
    }
    return group;
}

export function spawnVehicle(id, x, z, heading, scene) {
    const data = VEHICLE_ROSTER.find(v => v.id === id);
    const mesh = createVehicleMesh(id);
    mesh.position.set(x, groundHeight(x, z), z);
    mesh.rotation.y = heading;
    scene.add(mesh);
    return { id, x, z, angle: heading, speed: 0, mesh, durability: 100, stolen: false, mass: 1500, engineForce: 1000 };
}

export function updateVehicle(vehicle, dt) {
    if (vehicle.durability <= 0) return;
    const drag = 0.1;
    const friction = 0.5;
    const engineForce = vehicle.engineForce;
    const accel = (engineForce - (drag * vehicle.speed * vehicle.speed) - (friction * vehicle.speed)) / vehicle.mass;
    vehicle.speed += accel * dt;
    if (vehicle.speed < 0) vehicle.speed = 0;
    if (vehicle.speed > 50) vehicle.speed = 50;

    vehicle.x += Math.sin(vehicle.angle) * vehicle.speed * dt;
    vehicle.z += Math.cos(vehicle.angle) * vehicle.speed * dt;

    vehicle.mesh.position.set(vehicle.x, groundHeight(vehicle.x, vehicle.z), vehicle.z);
    vehicle.mesh.rotation.y = vehicle.angle;
}

export function damageVehicle(vehicle, amount) {
    vehicle.durability -= amount;
    if (vehicle.durability < 0) vehicle.durability = 0;
    if (vehicle.durability === 0) {
        vehicle.speed = 0;
        // add smoke
    }
}

export function markStolen(vehicle) {
    vehicle.stolen = true;
}
