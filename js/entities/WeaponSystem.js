import { AudioSys } from '../core/AudioSys.js';
import { Helpers } from '../utils/Helpers.js';
import { GameState } from '../core/GameState.js';
import { UIManager } from '../ui/UIManager.js';
import { EnemyManager } from './EnemyManager.js';

export const WeaponSystem = {
    scene: null,
    camera: null,
    projectiles: [],
    particles: [],
    raycaster: new THREE.Raycaster(),
    smokeTexture: null,
    watchtowerPos: null,

    init(scene, camera, watchtowerPos) {
        this.scene = scene;
        this.camera = camera;
        this.watchtowerPos = watchtowerPos;
        this.smokeTexture = Helpers.createSmokeTexture();
    },

    fireGun() {
        const rayDir = new THREE.Vector3(0,0,-1).applyQuaternion(this.camera.quaternion);
        rayDir.x += (Math.random()-0.5) * 0.002; 
        rayDir.y += (Math.random()-0.5) * 0.002;
        
        this.raycaster.set(this.camera.position, rayDir);
        const hits = this.raycaster.intersectObjects(this.scene.children, true);
        
        // Tracer Efekti
        const tracer = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 20), new THREE.MeshBasicMaterial({ color: 0xffffaa, transparent: true, opacity: 0.8 }));
        tracer.position.copy(this.watchtowerPos.clone().add(new THREE.Vector3(0,-2,0)));
        let target = hits.length > 0 ? hits[0].point : this.camera.position.clone().add(rayDir.multiplyScalar(600));
        tracer.lookAt(target);
        this.scene.add(tracer);
        
        let t = 0;
        const anim = () => { t+=0.3; tracer.position.lerp(target, t); if(t<1) requestAnimationFrame(anim); else this.scene.remove(tracer); };
        requestAnimationFrame(anim);

        AudioSys.playMachineGun();

        if(hits.length > 0 && hits[0].distance < 600) {
            this.createExplosion(hits[0].point, 0.6, true);
            EnemyManager.enemies.forEach(e => {
                if (e.position.distanceTo(hits[0].point) < 6) {
                    this.damageEnemy(e, 5);
                }
            });
        }
    },

    fireClusterBomb() {
        if(GameState.level < 2) return;
        const bomb = new THREE.Mesh(new THREE.SphereGeometry(0.5), new THREE.MeshBasicMaterial({color: 0xffff00}));
        bomb.position.copy(this.watchtowerPos);
        const dir = new THREE.Vector3(); this.camera.getWorldDirection(dir);
        bomb.userData = { velocity: dir.multiplyScalar(4.0).add(new THREE.Vector3(0, 1, 0)), type: 'cluster_main' };
        this.scene.add(bomb); this.projectiles.push(bomb);
        UIManager.speak("Misket paketi bırakıldı.");
    },

    splitCluster(pos) {
        for(let i=0; i<15; i++) {
            const sub = new THREE.Mesh(new THREE.SphereGeometry(0.15), new THREE.MeshBasicMaterial({color:0xffaa00}));
            sub.position.copy(pos);
            sub.userData = { 
                velocity: new THREE.Vector3((Math.random()-0.5)*3, Math.random()*1, (Math.random()-0.5)*3).add(new THREE.Vector3(0,-1,0)), 
                type: 'cluster_sub',
                delay: Math.random() * 0.5 
            };
            this.scene.add(sub); this.projectiles.push(sub);
        }
        this.createExplosion(pos, 0.5, true);
    },

    createExplosion(pos, scale=1.0, isSmokeOnly=false) {
        if(!isSmokeOnly) AudioSys.playExplosion();
        const flash = new THREE.PointLight(0xffffff, 3, 50 * scale);
        flash.position.copy(pos); this.scene.add(flash); setTimeout(()=>this.scene.remove(flash), 80);
        
        const count = isSmokeOnly ? 5 : 15 * scale;
        const mat = new THREE.SpriteMaterial({ map: this.smokeTexture, color: 0xffffff, transparent: true, opacity: 0.6 });
        for(let i=0; i<count; i++) {
            const sprite = new THREE.Sprite(mat.clone());
            sprite.position.copy(pos);
            sprite.position.x += (Math.random()-0.5) * 3 * scale;
            sprite.position.z += (Math.random()-0.5) * 3 * scale;
            const size = (Math.random() * 5 + 2) * scale;
            sprite.scale.set(size, size, 1);
            sprite.userData = {
                vel: new THREE.Vector3((Math.random()-0.5)*0.5, Math.random()*0.8, (Math.random()-0.5)*0.5),
                life: 1.0, decay: 0.01, grow: 0.1
            };
            this.scene.add(sprite); this.particles.push(sprite);
        }
    },

    damageEnemy(enemy, amount, isExplosion = false) {
        enemy.userData.hp -= amount;
        if(enemy.userData.hp <= 0) {
            const scale = enemy.userData.type === 'vehicle' ? 3.0 : 1.0;
            this.createExplosion(enemy.position, scale);
            EnemyManager.removeEnemy(enemy);
            GameState.score++;
            UIManager.updateScore();
        }
    },

    update() {
        // Projectiles Update
        for(let i=this.projectiles.length-1; i>=0; i--) {
            const p = this.projectiles[i];
            if (p.userData.type === 'cluster_main') {
                p.userData.velocity.y -= 0.05; p.position.add(p.userData.velocity);
                if (p.position.y < 20) {
                    this.splitCluster(p.position);
                    this.scene.remove(p); this.projectiles.splice(i, 1);
                }
            } else if (p.userData.type === 'cluster_sub') {
                p.userData.velocity.y -= 0.1; p.position.add(p.userData.velocity);
                if(p.position.y < 0) {
                    setTimeout(() => {
                        this.createExplosion(p.position, 1.2);
                        AudioSys.playClusterPop();
                        EnemyManager.enemies.forEach(e => { if(e.position.distanceTo(p.position) < 15) this.damageEnemy(e, 5); });
                    }, p.userData.delay * 1000);
                    this.scene.remove(p); this.projectiles.splice(i, 1);
                }
            }
        }

        // Particles Update
        for(let i=this.particles.length-1; i>=0; i--) {
            const p = this.particles[i];
            p.userData.life -= p.userData.decay;
            p.position.add(p.userData.vel);
            const s = p.scale.x + p.userData.grow;
            p.scale.set(s, s, 1);
            p.material.opacity = p.userData.life * 0.5;
            if(p.userData.life <= 0) { this.scene.remove(p); this.particles.splice(i, 1); }
        }
    }
};