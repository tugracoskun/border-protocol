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
    
    // --- SERİ ATIŞ AYARI ---
    lastShotTime: 0,
    fireRate: 50, // 50ms = Saniyede 20 mermi (Daha seri!)

    init(scene, camera, watchtowerPos) {
        this.scene = scene;
        this.camera = camera;
        this.watchtowerPos = watchtowerPos;
        this.smokeTexture = Helpers.createSmokeTexture();
    },

    trigger(isAutoFire = false) {
        const now = Date.now();
        // Süre dolmadıysa ateş etme
        if (now - this.lastShotTime < this.fireRate) return false;

        this.lastShotTime = now;
        this.fireGun();
        return true; 
    },

    fireGun() {
        this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
        const ray = this.raycaster.ray;

        let bestTarget = null;
        let minDistanceToCamera = Infinity;
        // Hitbox'ı biraz daha genişlettim, vurmak daha kolay olsun
        const baseHitThreshold = 4.0; 

        EnemyManager.enemies.forEach(enemy => {
            const enemyCenter = enemy.position.clone();
            enemyCenter.y += 1.5; 

            const vecToEnemy = enemyCenter.clone().sub(this.camera.position);
            const distanceToCam = vecToEnemy.length();
            if (vecToEnemy.dot(this.camera.getWorldDirection(new THREE.Vector3())) < 0) return;

            const distanceToRay = ray.distanceSqToPoint(enemyCenter);
            
            if (distanceToRay < (baseHitThreshold * baseHitThreshold)) {
                if (distanceToCam < minDistanceToCamera) {
                    minDistanceToCamera = distanceToCam;
                    bestTarget = enemy;
                }
            }
        });

        const groundHits = this.raycaster.intersectObjects(this.scene.children.filter(o => o.name === "Ground"), true);
        let hitPoint = null;

        if (groundHits.length > 0) {
            if (!bestTarget || groundHits[0].distance < minDistanceToCamera) {
                hitPoint = groundHits[0].point;
                bestTarget = null; 
            } else {
                hitPoint = bestTarget.position.clone().add(new THREE.Vector3(0, 1.5, 0));
            }
        } else {
            if (bestTarget) hitPoint = bestTarget.position.clone().add(new THREE.Vector3(0, 1.5, 0));
            else hitPoint = this.camera.position.clone().add(ray.direction.multiplyScalar(600)); 
        }

        this.createTracer(hitPoint);
        
        // Ses efekti her seferinde yeniden başlamasın, hafif randomize edilsin (Makine tüfek sesi takılmasın)
        AudioSys.playMachineGun();

        if (bestTarget) {
            this.createExplosion(hitPoint, 0.8, true); 
            this.damageEnemy(bestTarget, 10); 
        } else if (groundHits.length > 0 && (!bestTarget)) {
            this.createExplosion(hitPoint, 0.5, true); 
        }
    },

    createTracer(targetPos) {
        const geometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, -5)
        ]);
        const material = new THREE.LineBasicMaterial({ color: 0xffffaa, transparent: true, opacity: 0.8 });
        const tracer = new THREE.Line(geometry, material);
        
        const startPos = this.watchtowerPos.clone().add(new THREE.Vector3(0, -2, 0));
        tracer.position.copy(startPos);
        tracer.lookAt(targetPos);
        
        this.scene.add(tracer);

        // Mermi hızı 40.0 -> Çok hızlı
        const targetVec = targetPos.clone();
        let progress = 0;
        
        // Tracer animasyonu (Hafif bir mermi yolu efekti)
        const animateTracer = () => {
            progress += 0.3; // Daha hızlı gitsin
            if (progress >= 1) {
                this.scene.remove(tracer);
            } else {
                tracer.position.lerp(targetVec, progress);
                requestAnimationFrame(animateTracer);
            }
        };
        requestAnimationFrame(animateTracer);
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
                life: 1.0, decay: 0.05, grow: 0.3
            };
            this.scene.add(sprite); this.particles.push(sprite);
        }
    },

    damageEnemy(enemy, amount) {
        if (!enemy || !enemy.userData) return;
        enemy.userData.hp -= amount;
        enemy.children.forEach(mesh => {
            if(mesh.material) {
                const oldColor = mesh.material.color.getHex();
                mesh.material.color.setHex(0xff0000); 
                setTimeout(() => {
                    if(mesh && mesh.material) mesh.material.color.setHex(oldColor);
                }, 50);
            }
        });

        if(enemy.userData.hp <= 0) {
            const scale = enemy.userData.type === 'vehicle' ? 3.0 : 1.0;
            this.createExplosion(enemy.position, scale);
            EnemyManager.removeEnemy(enemy);
            GameState.score++;
            UIManager.updateScore();
        }
    },

    update() {
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