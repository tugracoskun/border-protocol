import { AudioSys } from '../core/AudioSys.js';
import { GameState } from '../core/GameState.js';
import { DroneSystem } from '../entities/DroneSystem.js';
import { EnemyManager } from '../entities/EnemyManager.js';

export const UIManager = {
    init() {
        this.canvas = document.getElementById('tactical-canvas');
        if(this.canvas) this.canvas.addEventListener('click', (e) => this.onMapClick(e));
        
        this.minimapCanvas = document.getElementById('minimap-canvas');
        this.minimapCtx = this.minimapCanvas.getContext('2d');
    },

    speak(text) {
        const container = document.getElementById('ai-msg-container');
        const el = document.getElementById('ai-msg');
        el.innerText = text; container.style.opacity = 1;
        AudioSys.playRadioSquelch();
        setTimeout(() => { container.style.opacity = 0; }, 3000);
    },

    updateScore() {
        document.getElementById('kill-count').innerText = GameState.score;
        this.checkLevelUp();
    },

    checkLevelUp() {
        let targetXp = GameState.xpThresholds[GameState.level-1] || 9999;
        if (GameState.score >= targetXp) {
            GameState.level++;
            document.getElementById('level-num').innerText = GameState.level;
            if(GameState.level === 2) {
                document.getElementById('cluster-status').classList.replace('opacity-40', 'weapon-active');
                document.getElementById('cluster-status').classList.add('text-yellow-200');
                this.speak("Misket bombası yetkisi verildi.");
            }
        }
        let prevXp = GameState.level === 1 ? 0 : GameState.xpThresholds[GameState.level-2];
        let progress = (GameState.score - prevXp) / (targetXp - prevXp);
        document.getElementById('xp-fill').style.width = `${Math.min(100, progress*100)}%`;
    },

    toggleMap() {
        GameState.isMapOpen = !GameState.isMapOpen;
        const mapLayer = document.getElementById('tactical-map-layer');
        if(GameState.isMapOpen) {
            mapLayer.style.display = 'flex';
            document.exitPointerLock();
            this.drawTacticalMap();
        } else {
            mapLayer.style.display = 'none';
            document.body.requestPointerLock();
        }
    },

    drawTacticalMap() {
        if(!GameState.isMapOpen) return;
        const ctx = this.canvas.getContext('2d');
        ctx.fillStyle = '#001100'; ctx.fillRect(0, 0, 600, 600);
        ctx.strokeStyle = '#004400'; ctx.lineWidth = 1;
        
        // Grid
        for(let i=0; i<600; i+=50) {
            ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,600); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0,i); ctx.lineTo(600,i); ctx.stroke();
        }
        
        // Base
        ctx.fillStyle = '#00ff00'; ctx.beginPath(); ctx.arc(300, 550, 10, 0, Math.PI*2); ctx.fill();
        
        // Enemies
        EnemyManager.enemies.forEach(e => {
            const mapX = 300 + e.position.x / 2; 
            const mapY = 550 + e.position.z / 2; 
            if(mapX>0 && mapX<600 && mapY>0 && mapY<600) {
                ctx.fillStyle = '#ff0000';
                const size = e.userData.type === 'vehicle' ? 8 : 4;
                ctx.fillRect(mapX-size/2, mapY-size/2, size, size);
            }
        });
        requestAnimationFrame(() => this.drawTacticalMap());
    },

    onMapClick(e) {
        const rect = e.target.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const worldX = (mouseX - 300) * 2;
        const worldZ = (mouseY - 550) * 2;
        DroneSystem.launch(new THREE.Vector3(worldX, 0, worldZ));
        this.toggleMap();
    },

    updateMinimap(watchtowerPos) {
        const ctx = this.minimapCtx;
        ctx.clearRect(0, 0, 200, 200);
        ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 1;
        
        // Radar Circles
        ctx.beginPath(); ctx.arc(100, 100, 40, 0, Math.PI*2); ctx.stroke();
        ctx.beginPath(); ctx.arc(100, 100, 80, 0, Math.PI*2); ctx.stroke();
        
        // Sweep
        const angle = (Date.now() * 0.002) % (Math.PI*2);
        ctx.save(); ctx.translate(100,100); ctx.rotate(angle);
        ctx.fillStyle = 'rgba(0, 255, 0, 0.1)'; ctx.beginPath(); ctx.moveTo(0,0); ctx.arc(0,0,90,0,0.5); ctx.fill(); ctx.restore();
        
        // Center
        ctx.fillStyle = '#00ff00'; ctx.beginPath(); ctx.arc(100, 100, 3, 0, Math.PI*2); ctx.fill();
        
        // Enemies
        const range = 800;
        EnemyManager.enemies.forEach(e => {
            const relX = e.position.x - watchtowerPos.x;
            const relZ = e.position.z - watchtowerPos.z;
            const mapX = 100 + (relX / range) * 100;
            const mapY = 100 + (relZ / range) * 100; 
            if(mapX > 0 && mapX < 200 && mapY > 0 && mapY < 200) {
                ctx.fillStyle = '#ff0000';
                const size = e.userData.type === 'vehicle' ? 5 : 2;
                ctx.fillRect(mapX-size/2, mapY-size/2, size, size);
            }
        });
    }
};