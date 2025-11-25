export const Input = {
    keys: {},
    mouse: { x: 0, y: 0 },
    isLeftMouseDown: false, // Sol tık basılı mı?
    isRightMouseDown: false, // Sağ tık basılı mı?
    isLocked: false,

    init() {
        // --- KLAVYE ---
        document.addEventListener('keydown', e => this.keys[e.code] = true);
        document.addEventListener('keyup', e => this.keys[e.code] = false);
        
        // --- MOUSE TIKLAMA DURUMU (En Önemli Kısım) ---
        // Pointer lock olsa da olmasa da basma durumunu global takip et
        document.addEventListener('mousedown', e => {
            // Sadece oyun içindeysek kilitlemeyi dene
            if (!this.isLocked && document.body.requestPointerLock) {
                document.body.requestPointerLock();
            }

            if(e.button === 0) this.isLeftMouseDown = true;
            if(e.button === 2) this.isRightMouseDown = true;
        });

        document.addEventListener('mouseup', e => {
            if(e.button === 0) this.isLeftMouseDown = false;
            if(e.button === 2) this.isRightMouseDown = false;
        });

        // Pencere odaktan çıkarsa (Alt-Tab vs.) takılı kalmasın diye sıfırla
        window.addEventListener('blur', () => {
            this.isLeftMouseDown = false;
            this.isRightMouseDown = false;
            Object.keys(this.keys).forEach(key => this.keys[key] = false);
        });

        // --- SAĞ TIK MENÜ ENGELLEME ---
        window.addEventListener('contextmenu', e => {
            e.preventDefault();
            return false;
        }, { passive: false });

        // --- MOUSE HAREKETİ ---
        document.addEventListener('mousemove', e => {
            // Eğer kilitli değilse hareketi oyun içine yansıtma
            if (this.isLocked) {
                this.mouse.x += e.movementX || 0;
                this.mouse.y += e.movementY || 0;
            }
        });

        // --- KİLİT DEĞİŞİMİ ---
        document.addEventListener('pointerlockchange', () => {
            this.isLocked = document.pointerLockElement === document.body;
            // Kilit değiştiğinde bazen tarayıcı 'mouseup' yollar, 
            // bunu engellemek zor ama kullanıcı tekrar tıklarsa düzelir.
            // Bizim için önemli olan mousedown'ın temiz çalışması.
        });
    },

    isDown(code) { return !!this.keys[code]; },
    
    resetMouseDelta() {
        this.mouse.x = 0;
        this.mouse.y = 0;
    }
};