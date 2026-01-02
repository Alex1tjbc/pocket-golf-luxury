const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    parent: 'game-container',
    backgroundColor: '#000000',
    scale: {
        mode: Phaser.Scale.RESIZE, // Se adapta si giras el celular
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
        default: 'matter',
        matter: {
            gravity: { y: 1.5 },
            debug: false
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
let isAiming = false;
let fired = false;
// Detectar si es celular (pantalla angosta)
const isMobile = window.innerWidth < 600;

function preload() {
    this.load.image('bola', 'bola.png');
    this.load.image('caja', 'caja.png');
    this.load.image('fondo', 'fondo.jpg');
}

function create() {
    // 1. EL FONDO
    const bg = this.add.image(this.scale.width / 2, this.scale.height / 2, 'fondo');
    const scaleX = this.scale.width / bg.width;
    const scaleY = this.scale.height / bg.height;
    const scale = Math.max(scaleX, scaleY);
    bg.setScale(scale).setScrollFactor(0);
    bg.setTint(0xcccccc); // Un poco oscuro para resaltar el juego

    // 2. LÍMITES (Paredes)
    this.matter.world.setBounds(0, 0, this.scale.width, this.scale.height, 32, true, true, true, true);

    // 3. EL SUELO
    const groundHeight = 80;
    this.matter.add.rectangle(this.scale.width / 2, this.scale.height - 20, this.scale.width, groundHeight, { 
        isStatic: true, 
        friction: 1 
    });
    
    // Gráfico del suelo
    const groundGraphics = this.add.graphics();
    groundGraphics.fillStyle(0x222222);
    groundGraphics.fillRect(0, this.scale.height - groundHeight, this.scale.width, groundHeight);

    // 4. POSICIONES RESPONSIVAS (Aquí corregimos el error)
    // La bola al 15% del ancho, las cajas al 85% del ancho
    const startX = this.scale.width * 0.15;
    const pyramidX = this.scale.width * 0.85; 
    const startY = this.scale.height - 150;

    // 5. LA BOLA
    ball = this.matter.add.image(startX, startY, 'bola', null, {
        shape: 'circle',
        density: 0.05,
        friction: 0.05,
        restitution: 0.6
    });

    // Ajustamos tamaño: En celular más pequeña (40px), en PC (60px)
    const targetBallSize = isMobile ? 35 : 60;
    const ballScale = targetBallSize / ball.width; 
    ball.setScale(ballScale);
    ball.setStatic(true); // Quieta al inicio

    // 6. LA PIRÁMIDE (Lejos de la bola)
    crearPiramide(this, pyramidX, this.scale.height - groundHeight);

    // 7. SISTEMA DE DISPARO MEJORADO
    const graphics = this.add.graphics();
    
    this.input.on('pointerdown', (pointer) => {
        // Aumentamos el radio de toque para que sea fácil en celular (150px)
        if (!fired && Phaser.Math.Distance.Between(pointer.x, pointer.y, ball.x, ball.y) < 150) {
            isAiming = true;
        }
    });

    this.input.on('pointermove', (pointer) => {
        if (isAiming) {
            graphics.clear();
            
            // Línea de resortera
            graphics.lineStyle(isMobile ? 3 : 5, 0xffffff, 0.7);
            graphics.lineBetween(ball.x, ball.y, pointer.x, pointer.y);
            
            // Mover la bola visualmente (limitado para no romperla)
            const dist = Phaser.Math.Distance.Between(startX, startY, pointer.x, pointer.y);
            const maxDist = isMobile ? 100 : 200;
            
            if (dist < maxDist) {
                ball.setPosition(pointer.x, pointer.y);
            }
        }
    });

    this.input.on('pointerup', (pointer) => {
        if (isAiming) {
            isAiming = false;
            fired = true;
            graphics.clear();
            
            // Calcular fuerza del tiro
            const velocityX = (startX - ball.x) * (isMobile ? 0.25 : 0.15); // Más fuerza en celular
            const velocityY = (startY - ball.y) * (isMobile ? 0.25 : 0.15);

            ball.setStatic(false); 
            ball.setVelocity(velocityX, velocityY);
        }
    });

    // Botón Reiniciar
    const btn = this.add.text(20, 20, ' REINICIAR ', { 
        backgroundColor: '#cc0000', 
        fontSize: isMobile ? '16px' : '24px', 
        padding: { x:10, y:10 } 
    })
    .setInteractive()
    .on('pointerdown', () => this.scene.restart());
}

function update() {
    // Si la bola sale de la pantalla, reiniciar
    if (ball.y > this.scale.height + 100 || ball.x > this.scale.width + 100 || ball.x < -100) {
        this.scene.restart();
    }
}

function crearPiramide(scene, x, y) {
    // Cajas más pequeñas en celular para que quepan
    const boxSize = isMobile ? 30 : 55; 
    const filas = 5; 

    for (let i = 0; i < filas; i++) {
        for (let j = 0; j <= i; j++) {
            // Posición matemática piramidal
            const xPos = x + (j * boxSize) - (i * boxSize * 0.5);
            const yPos = y - (boxSize / 2) - ((filas - 1 - i) * boxSize);

            const box = scene.matter.add.image(xPos, yPos, 'caja', null, {
                shape: 'rectangle',
                density: 0.005,
                friction: 0.5
            });
            
            // Escalar caja
            const scale = boxSize / box.width;
            box.setScale(scale);
        }
    }
}
