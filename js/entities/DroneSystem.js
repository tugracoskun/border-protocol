import { AudioSys } from '../core/AudioSys.js';
import { UIManager } from '../ui/UIManager.js';
import { WeaponSystem } from './WeaponSystem.js';
import { EnemyManager } from './EnemyManager.js';

export const DroneSystem = {
    scene: null,
    drone: null,
    watchtowerPos: null,

    init(scene, watchtowerPos) {
        this.scene = scene;
        this.watchtowerPos = watchtowerPos;
    },

    launch(targetPos) {
        if(this.drone) return; 
        const group = new THREE.Group();
        const body = new THREE.Mesh(new THREE.ConeGeometry(0.3, 1.5, 8).rotateX(Math.PI/2), new THREE.MeshBasicMaterial({color:0x444444, wireframe:true}));
        group.add(body);
        this.drone = group;
        this.drone.position.copy(this.watchtowerPos).add(new THREE.Vector3(0, 5, 0));
        this.drone.lookAt(targetPos);
        this.drone.userData = { target: targetPos, state: 'launch', speed: 15.0 };
        this.scene.add(this.drone);
        
        AudioSys.playDroneMotor(true);
        document.getElementById('drone-ui').style.display = 'block';
        UIManager.speak("Koordinat alındı. Kamikaze yolda.");
    },

    update(dt) {
        if(!this.drone) return;
        const data = this.drone.userData;
        const target = data.target;

        if(data.state === 'launch') {
            this.drone.position.y += 20 * dt; 
            this.drone.position.add(new THREE.Vector3(0,0,-1).applyQuaternion(this.drone.quaternion).multiplyScalar(15 * dt)); 
            if(this.drone.position.y > 120) data.state = 'cruise';
        } 
        else if (data.state === 'cruise') {
            this.drone.lookAt(target.x, this.drone.position.y, target.z);
            this.drone.translateZ(50 * dt); 
            const dist = new THREE.Vector2(this.drone.position.x, this.drone.position.z).distanceTo(new THREE.Vector2(target.x, target.z));
            if(dist < 30) data.state = 'dive';
        }
        else if (data.state === 'dive') {
            this.drone.lookAt(target);
            this.drone.translateZ(80 * dt); 
            if(this.drone.position.y < 2) {
                WeaponSystem.createExplosion(this.drone.position, 5.0);
                EnemyManager.enemies.forEach(e => { 
                    if(e.position.distanceTo(this.drone.position) < 40) WeaponSystem.damageEnemy(e, 50); 
                });
                
                this.scene.remove(this.drone);
                this.drone = null;
                AudioSys.playDroneMotor(false);
                document.getElementById('drone-ui').style.display = 'none';
                UIManager.speak("Vuruş teyit edildi.");
            }
        }
    }
};