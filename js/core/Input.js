export const Input = {
    keys: {},
    isTriggerPulled: false,
    
    init() {
        document.addEventListener('keydown', e => this.keys[e.code] = true);
        document.addEventListener('keyup', e => this.keys[e.code] = false);
        
        document.addEventListener('mousedown', e => {
            if(e.button === 0) this.isTriggerPulled = true;
        });
        document.addEventListener('mouseup', () => this.isTriggerPulled = false);
    },

    isDown(code) { return !!this.keys[code]; }
};