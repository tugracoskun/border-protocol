import { SceneManager } from './scene/SceneManager.js';
import { GameState } from './core/GameState.js';
import { Input } from './core/Input.js';
import { AudioSys } from './core/AudioSys.js';
import { EnemyManager } from './entities/EnemyManager.js';
import { WeaponSystem } from './entities/WeaponSystem.js';
import { DroneSystem } from './entities/DroneSystem.js';
import { UIManager } from './ui/UIManager.js';

let clock, raycaster;

// KAMERA AYARLARI
const CAMERA_SENSITIVITY = 0.002;
const SMOOTH_FACTOR = 0.2; 
let targetRotationX = 0;
let targetRotationY = 0;

function init() {
    const { scene, camera, renderer, watchtower } = SceneManager.init();
    targetRotationY = camera.rotation.y; 
    
    Input.init();
    UIManager.init();
    
    EnemyManager.init(scene);
    WeaponSystem.init(scene, camera, watchtower.position);
    DroneSystem.init(scene, watchtower.position);

    clock = new THREE.Clock();
    raycaster = new THREE.Raycaster();

    document.getElementById('start-btn').addEventListener('click', startGame);
    
    document.addEventListener('keydown', (e) => {
        if(e.code === 'KeyM') UIManager.toggleMap();
    });

    // --- KRİTİK DEĞİŞİKLİK: Tıklama Tepkisi ---
    // Döngüyü beklemeden, event gelir gelmez ateş et
    document.addEventListener('mousedown', (e) => {
        if (!GameState.isGameActive || GameState.isMapOpen) return;
        
        // Sol Tık (Anında Ateş)
        if (e.button === 0) {
            const shotFired = WeaponSystem.trigger(false); // isAuto = false
            if (shotFired) applyRecoil();
        }
    });

    document.addEventListener('wheel', (e) => {
        if(!GameState.isGameActive || GameState.isMapOpen) return;
        GameState.targetFov += e.deltaY * 0.05;
        GameState.targetFov = Math.max(10, Math.min(60, GameState.targetFov));
    });

    animate();
}

function startGame() {
    document.getElementById('start-screen').style.display = 'none';
    document.body.requestPointerLock();
    AudioSys.init();
    AudioSys.startHeliSound();
    GameState.isGameActive = true;
    UIManager.speak("Bölge savunması başladı.");

    setInterval(() => {
        if(GameState.isGameActive && !GameState.isMapOpen && EnemyManager.enemies.length < 40) {
            if(Math.random() > 0.6) EnemyManager.spawnSquad(); 
            else EnemyManager.spawnEnemy();
        }
    }, 2000);
}

function applyRecoil() {
    targetRotationX += 0.003; 
    targetRotationY += (Math.random() - 0.5) * 0.002;
}

function updateCamera() {
    if (!GameState.isGameActive || GameState.isMapOpen) return;
    const zoomSensitivity = GameState.currentFov / 60;
    
    targetRotationY -= Input.mouse.x * CAMERA_SENSITIVITY * zoomSensitivity;
    targetRotationX -= Input.mouse.y * CAMERA_SENSITIVITY * zoomSensitivity;

    targetRotationX = Math.max(-0.6, Math.min(0.4, targetRotationX));
    targetRotationY = Math.max(-1.5, Math.min(1.5, targetRotationY)); 

    SceneManager.camera.rotation.order = "YXZ";
    SceneManager.camera.rotation.y += (targetRotationY - SceneManager.camera.rotation.y) * SMOOTH_FACTOR;
    SceneManager.camera.rotation.x += (targetRotationX - SceneManager.camera.rotation.x) * SMOOTH_FACTOR;

    Input.resetMouseDelta();
}

function animate() {
    requestAnimationFrame(animate);

    if(GameState.isMapOpen) {
        if(SceneManager.renderer) SceneManager.renderer.render(SceneManager.scene, SceneManager.camera);
        return;
    }

    if(!GameState.isGameActive) {
        if(SceneManager.renderer) SceneManager.renderer.render(SceneManager.scene, SceneManager.camera);
        return;
    }

    const dt = clock.getDelta();
    const now = Date.now();

    updateCamera();

    GameState.currentFov += (GameState.targetFov - GameState.currentFov) * 0.1;
    SceneManager.camera.fov = GameState.currentFov;
    SceneManager.camera.updateProjectionMatrix();
    
    document.getElementById('zoom-level').innerText = (60 / GameState.currentFov).toFixed(1);
    const scale = GameState.currentFov / 60;
    const reticle = document.querySelector('.reticle-svg');
    if(reticle) reticle.style.transform = `scale(${scale})`;

    SceneManager.camera.position.y = 45 + Math.sin(now * 0.002) * 0.1;

    // --- OTOMATİK ATEŞ (Basılı Tutma) ---
    // Eğer mouse basılıysa ve ilk tık değilse, WeaponSystem.trigger hız sınırına göre ateş eder
    if(Input.isLeftMouseDown) {
        const shotFired = WeaponSystem.trigger(true); // isAuto = true
        if (shotFired) applyRecoil();
    }
    
    if(Input.isRightMouseDown) {
        if (now - (WeaponSystem.lastClusterTime || 0) > 1000) { 
             WeaponSystem.fireClusterBomb();
             WeaponSystem.lastClusterTime = now;
        }
    }

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
    
    if(!box) return;

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

init();