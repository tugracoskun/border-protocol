import { UIManager } from '../ui/UIManager.js';

export const EnemyManager = {
    scene: null,
    enemies: [],

    init(scene) {
        this.scene = scene;
        this.enemies = [];
    },

    spawnSquad() {
        const x = (Math.random() - 0.5) * 800; const z = -500;
        const group = new THREE.Group(); 
        const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const chassis = new THREE.Mesh(new THREE.BoxGeometry(4, 2, 7), mat); chassis.position.y = 1; group.add(chassis);
        const turret = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 2), mat); turret.position.y = 2.5; group.add(turret);
        group.position.set(x, 2, z); group.lookAt(x, 2, 100);
        group.userData = { hp: 40, speed: 0.04, type: 'vehicle' }; group.name = "Enemy";
        this.scene.add(group); this.enemies.push(group);
        [[ -3, -3], [3, -3], [-3, -6], [3, -6]].forEach(off => this.spawnEnemy(x + off[0], z + off[1]));
    },

    spawnEnemy(startX, startZ) {
        const group = new THREE.Group();
        const mat = new THREE.MeshBasicMaterial({ color: 0xffffff }); 
        const torso = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.4, 0.5), mat); torso.position.y = 1.1; group.add(torso);
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.4), mat); head.position.y = 2.0; group.add(head);
        const x = startX !== undefined ? startX : (Math.random() - 0.5) * 800;
        const z = startZ !== undefined ? startZ : -450;
        
        // Raycast ile yere oturtma
        const ray = new THREE.Raycaster(new THREE.Vector3(x, 200, z), new THREE.Vector3(0,-1,0));
        const hits = ray.intersectObject(this.scene.getObjectByName("Ground"));
        if(hits.length > 0) group.position.y = hits[0].point.y;
        
        group.position.set(x, group.position.y, z); group.lookAt(x, group.position.y, 100);
        group.userData = { hp: 4, speed: 0.06 + Math.random() * 0.03, walkOffset: Math.random() * 100, type: 'infantry' }; 
        group.name = "Enemy";
        this.scene.add(group); this.enemies.push(group);
    },

    update(time) {
        this.enemies.forEach(e => {
            e.position.z += e.userData.speed;
            if(e.userData.type === 'infantry') {
                e.position.y = (e.position.y * 0.9) + (Math.sin((time*0.01)+e.userData.walkOffset)*0.1 + 1.0) * 0.1;
            } else {
                e.position.y = 2 + Math.sin(time * 0.005)*0.1;
            }
            
            if(e.position.z > 20) {
                this.removeEnemy(e);
                UIManager.speak("Sınır ihlali!");
            }
        });
    },

    removeEnemy(enemy) {
        this.scene.remove(enemy);
        this.enemies = this.enemies.filter(e => e !== enemy);
    }
};