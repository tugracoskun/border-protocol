import { Helpers } from '../utils/Helpers.js';

export const SceneManager = {
    scene: null,
    camera: null,
    renderer: null,
    watchtower: null,

    init() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x222222); 
        this.scene.fog = new THREE.FogExp2(0x222222, 0.004);

        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1200);
        
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);

        // Efektleri ayarla
        document.getElementById('thermal-noise').style.backgroundImage = `url(${Helpers.generateNoiseTexture()})`;

        this.createLighting();
        this.createEnvironment();
        this.createWatchtower();
        
        window.addEventListener('resize', () => this.onResize());

        return { scene: this.scene, camera: this.camera, renderer: this.renderer, watchtower: this.watchtower };
    },

    createLighting() {
        const ambient = new THREE.AmbientLight(0xffffff, 0.8); 
        this.scene.add(ambient);
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.5); 
        dirLight.position.set(0, 100, 50); 
        this.scene.add(dirLight);
    },

    createEnvironment() {
        const geo = new THREE.PlaneGeometry(1200, 1200, 128, 128);
        const pos = geo.attributes.position;
        for(let i=0; i<pos.count; i++){
            const x = pos.getX(i); const y = pos.getY(i);
            const z = (Math.sin(x*0.02)*Math.cos(y*0.02)*5) + (Math.random()-0.5);
            pos.setZ(i, z);
        }
        geo.computeVertexNormals();
        const mat = new THREE.MeshLambertMaterial({ color: 0x333333 });
        const terrain = new THREE.Mesh(geo, mat);
        terrain.rotation.x = -Math.PI/2; 
        terrain.name = "Ground";
        this.scene.add(terrain);

        const grid = new THREE.GridHelper(1200, 60, 0x44ff44, 0x225522);
        grid.position.y = 0.5;
        grid.material.opacity = 0.15;
        grid.material.transparent = true;
        this.scene.add(grid);

        const wall = new THREE.Mesh(
            new THREE.BoxGeometry(1200, 20, 5), 
            new THREE.MeshBasicMaterial({ color: 0x111111, wireframe: true })
        );
        wall.position.set(0, 10, 20); 
        this.scene.add(wall);
    },

    createWatchtower() {
        this.watchtower = new THREE.Group();
        this.watchtower.position.set(0, 45, 25); 
        this.scene.add(this.watchtower);
        this.camera.position.copy(this.watchtower.position);
        this.camera.lookAt(0, 0, -200);
    },

    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
};