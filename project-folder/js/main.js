import { SceneManager } from './scene/SceneManager.js';
import { GameState } from './core/GameState.js';
import { Input } from './core/Input.js';
import { AudioSys } from './core/AudioSys.js';
import { EnemyManager } from './entities/EnemyManager.js';
import { WeaponSystem } from './entities/WeaponSystem.js';
import { DroneSystem } from './entities/DroneSystem.js';
import { UIManager } from './ui/UIManager.js';

let clock, raycaster;
let lastShotTime = 0;

function init() {
    // Sistemleri Başlat
    const { scene, camera, renderer, watchtower } = SceneManager.init();
    Input.init();
    UIManager.init();
    
    // Entity Yöneticilerini Başlat
    EnemyManager.init(scene);
    WeaponSystem.init(scene, camera, watchtower.position);
    DroneSystem.init(scene, watchtower.position);

    clock = new THREE.Clock();
    raycaster = new THREE.Raycaster();

    // Event Listeners
    document.getElementById('start-btn').addEventListener('click', startGame);
    document.addEventListener('keydown', (e) => {
        if(e.code === 'KeyM') UIManager.toggleMap();
    });
    document.addEventListener('mousedown', (e) => {
        if(!GameState.isGameActive || GameState.isMapOpen) return;
        if(e.button === 2) WeaponSystem.fireClusterBomb();
    });
    
    // Zoom & Mouse Look
    document.addEventListener('wheel', (e) => {
        if(!GameState.isGameActive || GameState.isMapOpen) return;
        GameState.targetFov += e.deltaY * 0.05;
        GameState.targetFov = Math.max(10, Math.min(60, GameState.targetFov));
    });

    document.addEventListener('mousemove', (e) => {
        if(!GameState.isGameActive || GameState.isMapOpen) return;
        const sens = (GameState.currentFov / 60) * 0.002;
        camera.rotation.order = "YXZ";
        camera.rotation.y -= e.movementX * sens;
        camera.rotation.x -= e.movementY * sens;
        camera.rotation.y = Math.max(-1.2, Math.min(1.2, camera.rotation.y));
        camera.rotation.x = Math.max(-0.6, Math.min(0.4, camera.rotation.x));
    });

    animate();
}

function startGame() {
    document.getElementById('start-screen').style.display = 'none';
    AudioSys.init();
    AudioSys.startHeliSound();
    GameState.isGameActive = true;
    UIManager.speak("Bölge savunması başladı.");

    // Düşman Spawner Loop
    setInterval(() => {
        if(GameState.isGameActive && !GameState.isMapOpen && EnemyManager.enemies.length < 40) {
            if(Math.random() > 0.6) EnemyManager.spawnSquad(); 
            else EnemyManager.spawnEnemy();
        }
    }, 2000);
}

function animate() {
    requestAnimationFrame(animate);
    if(!GameState.isGameActive || GameState.isMapOpen) {
        if(SceneManager.renderer) SceneManager.renderer.render(SceneManager.scene, SceneManager.camera);
        return;
    }

    const dt = clock.getDelta();
    const now = Date.now();

    // Zoom Logic
    GameState.currentFov += (GameState.targetFov - GameState.currentFov) * 0.1;
    SceneManager.camera.fov = GameState.currentFov;
    SceneManager.camera.updateProjectionMatrix();
    
    // UI Updates
    document.getElementById('zoom-level').innerText = (60 / GameState.currentFov).toFixed(1);
    const scale = GameState.currentFov / 60;
    document.querySelector('.reticle-svg').style.transform = `scale(${scale})`;

    // Kamera Sallanma (Nefes)
    SceneManager.camera.position.y = 45 + Math.sin(now * 0.002) * 0.1;

    // Ateş Etme
    if(Input.isTriggerPulled && now - lastShotTime > 60) {
        lastShotTime = now;
        WeaponSystem.fireGun();
        SceneManager.camera.position.x += (Math.random()-0.5) * 0.1;
    }

    // Güncellemeler
    EnemyManager.update(now);
    WeaponSystem.update();
    DroneSystem.update(dt);
    UIManager.updateMinimap(SceneManager.watchtower.position);
    updateTargetBox();

    SceneManager.renderer.render(SceneManager.scene, SceneManager.camera);
}

function updateTargetBox() {
    raycaster.setFromCamera(new THREE.Vector2(0,0), SceneManager.camera);
    const hits = raycaster.intersectObjects(SceneManager.scene.children, true);
    const box = document.getElementById('target-box');
    
    let hitData = null;
    for(let hit of hits) {
        let obj = hit.object;
        while(obj.parent && obj.parent !== SceneManager.scene) {
            if(obj.name === "Enemy" || (obj.parent && obj.parent.name === "Enemy")) {
                hitData = hit;
                break;
            }
            obj = obj.parent;
        }
        if(hitData) break;
    }
    
    if(hitData) {
        box.style.display = 'block';
        const vec = hitData.point.clone().project(SceneManager.camera);
        const x = (vec.x * .5 + .5) * window.innerWidth;
        const y = (-(vec.y * .5) + .5) * window.innerHeight;
        box.style.left = (x - 40) + 'px'; 
        box.style.top = (y - 60) + 'px';
    } else {
        box.style.display = 'none';
    }
}

// Başlat
init();