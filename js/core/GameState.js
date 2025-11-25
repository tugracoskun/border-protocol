export const GameState = {
    isGameActive: false,
    isMapOpen: false,
    score: 0,
    level: 1,
    xpThresholds: [10, 30, 60],
    
    // Zoom ayarları
    targetFov: 60,
    currentFov: 60,

    reset() {
        this.isGameActive = false;
        this.score = 0;
        this.level = 1;
        this.currentFov = 60;
        this.targetFov = 60;
    }
};