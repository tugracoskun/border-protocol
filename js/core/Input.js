export const Input = {
    keys: {},
    mouse: { x: 0, y: 0 },
    isLeftMouseDown: false, 
    isRightMouseDown: false, 
    isLocked: false,

    init() {
        // --- KLAVYE ---
        document.addEventListener('keydown', e => this.keys[e.code] = true);
        document.addEventListener('keyup', e => this.keys[e.code] = false);
        
        // --- MOUSE YÖNETİMİ (Fixed) ---
        // Mouse Down: Kesinlikle basıldığını kaydet
        document.addEventListener('mousedown', e => {
            // Oyun başlamamışsa pointer lock iste
            if (!this.isLocked && document.body.requestPointerLock) {
                document.body.requestPointerLock();
            }

            if(e.button === 0) this.isLeftMouseDown = true;
            if(e.button === 2) this.isRightMouseDown = true;
        });

        // Mouse Up: Sadece gerçekten bırakıldığında çalışsın
        document.addEventListener('mouseup', e => {
            if(e.button === 0) this.isLeftMouseDown = false;
            if(e.button === 2) this.isRightMouseDown = false;
        });

        // Sağ tık menüsünü engelle
        window.addEventListener('contextmenu', e => {
            e.preventDefault();
            return false;
        }, { passive: false });

        // Mouse hareketi
        document.addEventListener('mousemove', e => {
            if (this.isLocked) {
                this.mouse.x += e.movementX || 0;
                this.mouse.y += e.movementY || 0;
            }
        });

        // Kilit durumu
        document.addEventListener('pointerlockchange', () => {
            this.isLocked = document.pointerLockElement === document.body;
            // DİKKAT: Kilit değiştiğinde 'mouseup' tetiklenmemeli, 
            // oyuncu hala basılı tutuyor olabilir. O yüzden burayı boş bırakıyoruz.
        });
        
        // Pencere odağını kaybederse güvenli sıfırlama
        window.addEventListener('blur', () => {
             this.isLeftMouseDown = false;
             this.isRightMouseDown = false;
        });
    },

    isDown(code) { return !!this.keys[code]; },
    
    resetMouseDelta() {
        this.mouse.x = 0;
        this.mouse.y = 0;
    }
};