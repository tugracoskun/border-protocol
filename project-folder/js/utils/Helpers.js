export const Helpers = {
    createSmokeTexture: () => {
        const canvas = document.createElement('canvas');
        canvas.width = 128; canvas.height = 128;
        const ctx = canvas.getContext('2d');
        const grad = ctx.createRadialGradient(64,64,0,64,64,64);
        grad.addColorStop(0, 'rgba(255,255,255,1)'); 
        grad.addColorStop(0.4, 'rgba(200,200,200,0.5)');
        grad.addColorStop(1, 'rgba(0,0,0,0)'); 
        ctx.fillStyle = grad; ctx.fillRect(0,0,128,128);
        return new THREE.CanvasTexture(canvas);
    },

    generateNoiseTexture: () => {
        const size = 512; const canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext('2d');
        const imgData = ctx.createImageData(size, size);
        for (let i = 0; i < imgData.data.length; i += 4) {
            const val = Math.floor(Math.random() * 255);
            imgData.data[i] = val; imgData.data[i+1] = val; imgData.data[i+2] = val; imgData.data[i+3] = 255;
        }
        ctx.putImageData(imgData, 0, 0); 
        return canvas.toDataURL();
    }
};