const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    parent: 'game-container',
    backgroundColor: '#000000',
    physics: {
        default: 'matter',
        matter: {
            gravity: { y: 1.5 }, // Gravedad hacia abajo
            debug: false // Pon true si quieres ver las líneas de colisión
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
let sling;
let isAiming = false;
let fired = false;

function preload() {
    // Aquí cargamos tus 3 imágenes
    this.load.image('bola', 'bola.png');
    this.load.image('caja', 'caja.png');
    this.load.image('fondo', 'fondo.jpg');
}

function create() {
    // 1. EL FONDO (Background)
    const bg = this.add.image(config.width / 2, config.height / 2, 'fondo');
    // Hacemos que la imagen cubra toda la pantalla sin deformarse (estilo CSS cover)
    const scaleX = config.width / bg.width;
    const scaleY = config.height / bg.height;
    const scale = Math.max(scaleX, scaleY);
    bg.setScale(scale).setScrollFactor(0);
    // Le bajamos el brillo un poco para que el juego resalte
    bg.setTint(0xdddddd);

    // 2. LÍMITES DEL MUNDO (Paredes invisibles)
    this.matter.world.setBounds(0, 0, config.width * 2, config.height, 64, true, true, true, true);
    
    // Cámara: Configurada para seguir la acción
    this.cameras.main.setBounds(0, 0, config.width * 2, config.height);

    // 3. EL SUELO (Plataforma donde se apoyan las cajas)
    const ground = this.matter.add.rectangle(config.width, config.height - 20, config.width * 2, 100, { 
        isStatic: true, 
        friction: 1 
    });
    
    // Dibujamos el suelo visualmente (un bloque oscuro industrial)
    const groundGraphics = this.add.graphics();
    groundGraphics.fillStyle(0x1a1a1a);
    groundGraphics.fillRect(0, config.height - 70, config.width * 2, 70);

    // 4. LA PIRÁMIDE DE CAJAS (El objetivo a destruir)
    // La colocamos a la derecha de la pantalla
    crearPiramide(this, config.width - 200, config.height - 70);

    // 5. TU BOLA DE DEMOLICIÓN
    ball = this.matter.add.image(150, config.height - 250, 'bola', null, {
        shape: 'circle',
        density: 0.05, // Peso pesado
        friction: 0.05,
        restitution: 0.6 // Rebote
    });
    // Ajustamos el tamaño visual para que no sea gigante (aprox 50px)
    const ballScale = 50 / ball.width; 
    ball.setScale(ballScale);
    ball.setStatic(true); // Se queda quieta hasta que dispares

    // Hacemos que la cámara siga a la bola
    this.cameras.main.startFollow(ball, true, 0.05, 0.05);

    // 6. SISTEMA DE DISPARO (Resortera Invisible)
    const graphics = this.add.graphics();
    
    this.input.on('pointerdown', (pointer) => {
        // Solo puedes disparar si no la has lanzado ya y tocas cerca de la bola
        if (!fired && Phaser.Math.Distance.Between(pointer.x, pointer.y, ball.x, ball.y) < 120) {
            isAiming = true;
        }
    });

    this.input.on('pointermove', (pointer) => {
        if (isAiming) {
            graphics.clear();
            
            // Dibujar la "cuerda" de la resortera
            graphics.lineStyle(4, 0xffffff, 0.5);
            graphics.lineBetween(ball.x, ball.y, pointer.x, pointer.y);
            
            // Efecto de arrastre visual (simulado)
            // Limitamos qué tan lejos puedes estirar
            const dist = Phaser.Math.Distance.Between(150, config.height - 250, pointer.x, pointer.y);
            if (dist < 150) {
                ball.setPosition(pointer.x, pointer.y);
            }
        }
    });

    this.input.on('pointerup', (pointer) => {
        if (isAiming) {
            isAiming = false;
            fired = true;
            graphics.clear();
            
            // Lógica de lanzamiento: Calculamos la fuerza opuesta
            const startX = 150;
            const startY = config.height - 250;
            const forceX = (startX - ball.x) * 0.002; // Ajuste de potencia
            const forceY = (startY - ball.y) * 0.002;

            ball.setStatic(false); // Activamos la física (gravedad)
            ball.applyForce({ x: forceX, y: forceY });
        }
    });

    // Botón flotante para reiniciar nivel
    const btn = this.add.text(20, 20, ' REINICIAR ', { 
        backgroundColor: '#cc0000', 
        fontSize: '20px', 
        padding: { x:10, y:10 } 
    })
    .setScrollFactor(0) // Se queda fijo en pantalla
    .setInteractive()
    .on('pointerdown', () => this.scene.restart());
}

function update() {
    // Si la bola se cae del mundo, reiniciamos
    if (ball.y > config.height + 100) {
        this.scene.restart();
    }
}

// Función auxiliar para construir pirámides
function crearPiramide(scene, x, y) {
    const boxSize = 55; // Tamaño de las cajas
    const filas = 6; // Altura de la torre

    for (let i = 0; i < filas; i++) {
        for (let j = 0; j <= i; j++) {
            const col = j;
            const row = filas - 1 - i;
            
            // Coordenadas matemáticas para apilar
            const xPos = x + (j * boxSize) - (i * boxSize * 0.5);
            const yPos = y - (boxSize / 2) - ((filas - 1 - i) * boxSize);

            const box = scene.matter.add.image(xPos, yPos, 'caja', null, {
                shape: 'rectangle',
                density: 0.005, // Madera ligera
                friction: 0.5,
                restitution: 0.1
            });
            
            // Ajustar tamaño de la caja a 55px
            const scale = boxSize / box.width;
            box.setScale(scale);
        }
    }
}
