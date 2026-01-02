const config = {
    type: Phaser.AUTO,
    width: window.innerWidth > 600 ? 400 : window.innerWidth, // Ancho móvil o ventana
    height: window.innerHeight > 900 ? 800 : window.innerHeight, // Alto móvil
    parent: 'game-container',
    backgroundColor: '#2d2d2d',
    physics: {
        default: 'matter', // Física avanzada para realismo (no arcade)
        matter: {
            gravity: { y: 0 }, // Vista superior, no hay gravedad hacia abajo
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
let graphics;
let arrow;
let isAiming = false;
let power = 0;

function preload() {
    // No cargamos imágenes externas para que funcione YA.
    // Generaremos texturas "de lujo" en memoria.
}

function create() {
    // 1. GENERAR TEXTURAS 3D (Para que no sea "plano")
    crearGraficosPremium(this);

    // 2. CREAR EL ESCENARIO (Hoyo 1)
    // El suelo: Césped sintético oscuro
    const ground = this.add.tileSprite(config.width/2, config.height/2, config.width, config.height, 'grassTexture');
    
    // Límites (Paredes de madera)
    const wallOptions = { isStatic: true, restitution: 0.6, friction: 0.1 };
    this.matter.add.rectangle(config.width/2, 0, config.width, 50, wallOptions); // Norte
    this.matter.add.rectangle(config.width/2, config.height, config.width, 50, wallOptions); // Sur
    this.matter.add.rectangle(0, config.height/2, 50, config.height, wallOptions); // Oeste
    this.matter.add.rectangle(config.width, config.height/2, 50, config.height, wallOptions); // Este

    // El Hoyo (Con efecto de profundidad)
    const hole = this.add.sprite(config.width/2, 150, 'holeTexture');
    // Sensor del hoyo (física invisible)
    const holeSensor = this.matter.add.circle(config.width/2, 150, 15, {
        isSensor: true, // La bola pasa por encima, no choca
        label: 'hole'
    });

    // 3. LA BOLA (El protagonista)
    ball = this.matter.add.image(config.width/2, config.height - 150, 'ballTexture', null, {
        shape: 'circle',
        restitution: 0.8, // Rebote realista
        friction: 0.05,   // Rueda mucho (césped fino)
        frictionAir: 0.02, // Resistencia del aire
        density: 0.04
    });

    // 4. CONTROLES (Arrastrar para tirar)
    this.input.on('pointerdown', (pointer) => {
        // Solo si la bola está casi quieta
        if (ball.body.speed < 0.2) {
            isAiming = true;
            arrow.setVisible(true);
            arrow.setPosition(ball.x, ball.y);
        }
    });

    this.input.on('pointermove', (pointer) => {
        if (isAiming) {
            const angle = Phaser.Math.Angle.Between(ball.x, ball.y, pointer.x, pointer.y);
            const dist = Phaser.Math.Distance.Between(ball.x, ball.y, pointer.x, pointer.y);
            power = Phaser.Math.Clamp(dist, 0, 200); // Limitar fuerza máxima
            
            arrow.setRotation(angle + Math.PI); // Apuntar al lado contrario
            arrow.setScale(power / 100, 1); // Estirar flecha según fuerza
            
            // Cambiar color flecha según fuerza (Verde -> Rojo)
            const color = Phaser.Display.Color.Interpolate.ColorWithColor(
                new Phaser.Display.Color(0, 255, 0),
                new Phaser.Display.Color(255, 0, 0),
                200, power
            );
            arrow.setTint(Phaser.Display.Color.GetColor(color.r, color.g, color.b));
        }
    });

    this.input.on('pointerup', (pointer) => {
        if (isAiming) {
            isAiming = false;
            arrow.setVisible(false);
            
            // CALCULAR EL TIRO
            const angle = Phaser.Math.Angle.Between(ball.x, ball.y, pointer.x, pointer.y);
            const velocityX = Math.cos(angle + Math.PI) * (power * 0.15); // Factor de potencia
            const velocityY = Math.sin(angle + Math.PI) * (power * 0.15);
            
            ball.setVelocity(velocityX, velocityY);
        }
    });

    // Flecha de dirección (oculta al inicio)
    arrow = this.add.sprite(0, 0, 'arrowTexture').setOrigin(0, 0.5).setVisible(false);

    // 5. DETECCIÓN DE VICTORIA
    this.matter.world.on('collisionstart', (event) => {
        event.pairs.forEach((pair) => {
            const bodyA = pair.bodyA;
            const bodyB = pair.bodyB;
            
            // Si la bola toca el sensor del hoyo Y va despacio
            if ((bodyA.label === 'hole' || bodyB.label === 'hole') && ball.body.speed < 2.5) {
                physicsWinEffect(this);
            }
        });
    });
}

function update() {
    // Lógica por frame (si es necesaria)
}

function physicsWinEffect(scene) {
    // Efecto de "caer" en el hoyo
    scene.tweens.add({
        targets: ball,
        scale: 0,
        duration: 300,
        onComplete: () => {
            alert("¡Hoyo en uno! - Nivel Completado");
            // Aquí reiniciamos la bola
            ball.setPosition(config.width/2, config.height - 150);
            ball.setScale(1);
            ball.setVelocity(0,0);
        }
    });
}

// --- FUNCIÓN MÁGICA PARA GRÁFICOS NO PLANOS ---
function crearGraficosPremium(scene) {
    const graphics = scene.make.graphics({ x: 0, y: 0, add: false });

    // 1. Textura de Bola (Esfera con brillo especular)
    graphics.fillStyle(0xffffff); // Base blanca
    graphics.fillCircle(16, 16, 16);
    graphics.generateTexture('ballTexture', 32, 32);
    graphics.clear();
    
    // (Nota: Para un efecto 3D real, usaremos sprites después, pero esto crea la base redonda perfecta)

    // 2. Textura del Hoyo (Sombra interior)
    graphics.fillStyle(0x000000);
    graphics.fillCircle(20, 20, 20);
    graphics.fillStyle(0x1a1a1a);
    graphics.fillCircle(20, 20, 18); // Borde oscuro
    graphics.generateTexture('holeTexture', 40, 40);
    graphics.clear();

    // 3. Textura de Flecha
    graphics.fillStyle(0xffffff);
    graphics.fillRect(0, -5, 100, 10);
    graphics.fillTriangle(100, -15, 100, 15, 130, 0);
    graphics.generateTexture('arrowTexture', 140, 30);
    graphics.clear();

    // 4. Textura de Césped (Un simple color sólido por ahora con ruido visual si pudiéramos)
    graphics.fillStyle(0x2d5a27); // Verde elegante oscuro
    graphics.fillRect(0, 0, 64, 64);
    graphics.generateTexture('grassTexture', 64, 64);
}
