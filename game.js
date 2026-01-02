const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    parent: 'game-container',
    backgroundColor: '#000000', // Fondo negro para cargar
    physics: {
        default: 'matter',
        matter: {
            gravity: { y: 0 },
            frictionAir: 0.02,
            bounce: 0.8
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

const game = new Phaser.Game(config);

let ball;
let arrow;
let isAiming = false;
let power = 0;
let textScore;
let particles;

function preload() {
    // Generaremos todo por código para máxima calidad sin descargar imágenes
}

function create() {
    // 1. CREAR ARTE DE LUJO (Procedural)
    crearArteDeLujo(this);

    // 2. AMBIENTE (Fondo con viñeta para dar profundidad)
    const bg = this.add.tileSprite(0, 0, config.width, config.height, 'feltTexture').setOrigin(0);
    const vignette = this.add.image(config.width/2, config.height/2, 'vignette').setDisplaySize(config.width, config.height);
    vignette.setAlpha(0.6); // Oscurecer esquinas

    // 3. LÍMITES (Paredes invisibles pero con rebote)
    this.matter.world.setBounds(0, 0, config.width, config.height, 32, true, true, true, true);

    // 4. EL HOYO (Con profundidad)
    const holeX = config.width / 2;
    const holeY = config.height * 0.2; // Al 20% de arriba
    
    // Sombra del hoyo
    this.add.image(holeX, holeY, 'holeTexture').setAlpha(0.8);
    
    // Sensor físico del hoyo
    const holeSensor = this.matter.add.circle(holeX, holeY, 20, {
        isSensor: true,
        label: 'hole'
    });

    // 5. LA BOLA (Esfera 3D)
    const startY = config.height * 0.8;
    ball = this.matter.add.image(config.width/2, startY, 'ballTexture', null, {
        shape: 'circle',
        restitution: 0.7,
        friction: 0.06,
        density: 0.05
    });

    // Emisor de partículas (polvo al rodar)
    particles = this.add.particles(0, 0, 'particle', {
        speed: 20,
        scale: { start: 0.5, end: 0 },
        alpha: { start: 0.5, end: 0 },
        lifespan: 400,
        blendMode: 'ADD',
        on: false 
    });
    particles.startFollow(ball);

    // 6. FLECHA DE TIRO (Elegante)
    arrow = this.add.sprite(0, 0, 'arrowTexture');
    arrow.setOrigin(0, 0.5);
    arrow.setVisible(false);
    arrow.setAlpha(0.8);

    // 7. INTERFAZ (UI Minimalista)
    const style = { font: 'bold 20px Arial', fill: '#ffffff', shadow: { offsetX: 2, offsetY: 2, color: '#000', blur: 4, stroke: true, fill: true } };
    textScore = this.add.text(20, 40, 'PAR 3 | HOYO 1', style);

    // 8. CONTROLES
    this.input.on('pointerdown', (pointer) => {
        if (ball.body.speed < 0.5) {
            isAiming = true;
            arrow.setPosition(ball.x, ball.y);
            arrow.setVisible(true);
        }
    });

    this.input.on('pointermove', (pointer) => {
        if (isAiming) {
            const angle = Phaser.Math.Angle.Between(ball.x, ball.y, pointer.x, pointer.y);
            const dist = Phaser.Math.Distance.Between(ball.x, ball.y, pointer.x, pointer.y);
            power = Phaser.Math.Clamp(dist, 0, 300);
            
            arrow.setRotation(angle + Math.PI);
            arrow.setScale(power / 100, 1 - (power/600)); // Se hace más fina al estirar
            
            // Cambio de color sutil (Blanco a Rojo Intenso)
            const tint = Phaser.Display.Color.Interpolate.ColorWithColor(
                new Phaser.Display.Color(255, 255, 255),
                new Phaser.Display.Color(255, 50, 50),
                300, power
            );
            arrow.setTint(Phaser.Display.Color.GetColor(tint.r, tint.g, tint.b));
        }
    });

    this.input.on('pointerup', (pointer) => {
        if (isAiming) {
            isAiming = false;
            arrow.setVisible(false);
            const angle = arrow.rotation;
            const force = power * 0.00035; // Calibración de fuerza
            ball.applyForce({ x: Math.cos(angle) * force, y: Math.sin(angle) * force });
        }
    });

    // 9. LÓGICA DE JUEGO
    this.matter.world.on('collisionstart', (event) => {
        event.pairs.forEach((pair) => {
            if ((pair.bodyA.label === 'hole' || pair.bodyB.label === 'hole') && ball.body.speed < 3) {
                winHole(this);
            }
        });
    });
}

function update() {
    // Activar partículas solo si se mueve rápido
    if (ball.body.speed > 1) {
        particles.emitting = true;
    } else {
        particles.emitting = false;
    }
}

function winHole(scene) {
    scene.matter.pause(); // Pausar física
    
    // Animación de entrada al hoyo
    scene.tweens.add({
        targets: ball,
        scale: 0,
        alpha: 0,
        duration: 400,
        ease: 'Power2',
        onComplete: () => {
            scene.cameras.main.fade(500, 0, 0, 0, false, function(camera, progress) {
                if (progress > 0.9) location.reload(); // Reiniciar por ahora
            });
        }
    });
}

// --- GENERADOR DE ARTE DE ALTA GAMA (SIN IMÁGENES EXTERNAS) ---
function crearArteDeLujo(scene) {
    // 1. Textura del Suelo (Fieltro Verde Oscuro con Ruido)
    const grass = scene.make.graphics({x:0, y:0, add:false});
    grass.fillStyle(0x0a4020); // Verde Inglés Profundo
    grass.fillRect(0,0,512,512);
    // Añadir "ruido" (puntos) para textura
    grass.fillStyle(0x0f552a);
    for(let i=0; i<3000; i++) {
        grass.fillCircle(Math.random()*512, Math.random()*512, 1);
    }
    grass.generateTexture('feltTexture', 512, 512);

    // 2. Textura de Bola (Gradiente Radial 3D)
    const b = scene.make.graphics({x:0, y:0, add:false});
    // Base oscura
    b.fillStyle(0xaaaaaa); 
    b.fillCircle(32,32,32);
    // Brillo Especular (El secreto del 3D)
    b.fillStyle(0xffffff);
    b.setAlpha(0.9);
    b.fillCircle(20, 20, 8); // Brillo principal
    b.setAlpha(0.4);
    b.fillCircle(25, 25, 15); // Brillo secundario
    b.generateTexture('ballTexture', 64, 64);

    // 3. Textura de Hoyo (Degradado hacia negro)
    const h = scene.make.graphics({x:0, y:0, add:false});
    h.fillStyle(0x000000);
    h.fillCircle(32,32,24);
    h.lineStyle(4, 0x333333, 0.5); // Borde
    h.strokeCircle(32,32,24);
    h.generateTexture('holeTexture', 64, 64);

    // 4. Flecha de Guía (Triángulo estilizado)
    const a = scene.make.graphics({x:0, y:0, add:false});
    a.fillStyle(0xffffff);
    a.fillTriangle(0, 10, 0, -10, 40, 0); // Punta
    a.fillRect(-100, -2, 100, 4); // Cola
    a.generateTexture('arrowTexture', 140, 20);

    // 5. Viñeta (Sombra en esquinas - Estilo Cine)
    const v = scene.make.graphics({x:0, y:0, add:false});
    v.fillStyle(0x000000, 1);
    v.fillCircle(256, 256, 300); // Círculo central transparente (hack inverso)
    // Nota: Phaser graphics no hace gradientes radiales transparentes fácil, 
    // usaremos una textura radial simple generada:
    const canvas = scene.textures.createCanvas('vignette', 512, 512).getSourceImage();
    const ctx = canvas.getContext('2d');
    const grd = ctx.createRadialGradient(256,256,150, 256,256,512);
    grd.addColorStop(0, "rgba(0,0,0,0)");
    grd.addColorStop(1, "rgba(0,0,0,0.8)");
    ctx.fillStyle = grd;
    ctx.fillRect(0,0,512,512);
    scene.textures.get('vignette').refresh();
    
    // 6. Partícula simple
    const p = scene.make.graphics({x:0, y:0, add:false});
    p.fillStyle(0xffffff, 1);
    p.fillCircle(4,4,4);
    p.generateTexture('particle', 8, 8);
}
