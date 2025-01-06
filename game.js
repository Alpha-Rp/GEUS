class TempleRun {
  constructor() {
    // Clean up existing game if any
    if (window.currentGame) {
      window.currentGame.cleanup();
    }
    window.currentGame = this;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.renderer = new THREE.WebGLRenderer();
    this.score = 0;
    this.speed = 0.2;
    this.gameOver = false;
    this.isPaused = false;
    this.currentTheme = 'jungle';
    this.timeOfDay = 0; // 0-1 represents full day cycle
    this.weather = 'clear';
    this.weatherParticles = [];
    this.backgroundMusic = new Audio('https://assets.mixkit.co/active_storage/sfx/123/123-preview.mp3');
    this.backgroundMusic.loop = true;
    this.ambientSounds = {
      jungle: new Audio('https://assets.mixkit.co/active_storage/sfx/124/124-preview.mp3'),
      desert: new Audio('https://assets.mixkit.co/active_storage/sfx/125/125-preview.mp3'),
      snow: new Audio('https://assets.mixkit.co/active_storage/sfx/126/126-preview.mp3'),
      night: new Audio('https://assets.mixkit.co/active_storage/sfx/127/127-preview.mp3')
    };
    Object.values(this.ambientSounds).forEach(sound => {
      sound.loop = true;
      sound.volume = 0.3;
    });
    
    // Theme-specific properties
    this.themes = {
      jungle: {
        fogColor: 0x458B00,
        fogDensity: 0.02,
        groundColor: 0x355E3B,
        skyColor: 0x87CEEB
      },
      desert: {
        fogColor: 0xFFE4B5,
        fogDensity: 0.01,
        groundColor: 0xDEB887,
        skyColor: 0xFFA07A
      },
      snow: {
        fogColor: 0xFFFFFF,
        fogDensity: 0.03,
        groundColor: 0xF0FFFF,
        skyColor: 0xF0F8FF
      },
      night: {
        fogColor: 0x000000,
        fogDensity: 0.04,
        groundColor: 0x0F0F0F,
        skyColor: 0x000033
      }
    };

    this.paths = [];
    this.obstacles = [];
    this.coins = [];
    this.difficultyInterval = 1000;
    this.lastObstaclePosition = 0;
    this.textureLoader = new THREE.TextureLoader();
    this.particles = [];
    this.trees = [];
    this.hasDoubleJump = false;
    this.jumpCount = 0;
    this.gravity = 0.015; // Fine-tuned gravity
    this.jumpForce = 0.4; // Fine-tuned jump force
    this.isJumping = false; // New property to track jump state
    this.pathSegments = []; // Track active path segments
    this.lastPathZ = 0; // Track last path position
    this.powerUps = [];
    this.hasSpeedBoost = false;
    this.isInvincible = false;
    this.powerUpDuration = 5000; // 5 seconds
    this.sounds = {
      jump: new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3'),
      coin: new Audio('https://assets.mixkit.co/active_storage/sfx/2020/2020-preview.mp3'),
      powerUp: new Audio('https://assets.mixkit.co/active_storage/sfx/2578/2578-preview.mp3'),
      rain: new Audio('https://assets.mixkit.co/active_storage/sfx/2579/2579-preview.mp3')
    };
    this.playerModel = null;
    this.runningSpeed = 0.2;
    this.laneWidth = 2;
    this.maxSpeed = 0.5;
    this.cameraOffset = new THREE.Vector3(0, 3, 8);
    this.isMoving = false;
    this.targetX = 0;
    this.currentLane = 0; // -1: left, 0: center, 1: right
    this.lanePositions = [-2, 0, 2]; // Restored wider lane positions
    this.movementSpeed = 0.25; // Increased movement speed
    this.obstacleTypes = ['box', 'spike', 'rotating', 'floating'];
    this.plantTypes = ['tree', 'bush', 'flower', 'rock'];
    this.distanceTraveled = 0;
    this.powerUpTypes = ['speed', 'invincible', 'magnet', 'shield', 'timeSlowdown', 'multiplier', 'doubleJump'];
    this.powerUpColors = {
      speed: 0x00ff00,
      invincible: 0xff00ff,
      magnet: 0x00ffff,
      shield: 0x0000ff,
      timeSlowdown: 0x8800ff,
      multiplier: 0xff8800,
      doubleJump: 0xff0000
    };
    this.magnetRadius = 5; // Magnet power-up radius
    this.coinMultiplier = 1; // Coin multiplier

    // Enable shadows
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.settings = {
      sound: false,
      music: true,
      particles: true
    };

    // Initialize settings controls
    this.initializeSettings();

    // Start weather change timer
    this.weatherChangeTimer = setInterval(() => {
      this.changeWeather();
    }, 15000); // 15 seconds

    this.init();
  }

  initializeSettings() {
    const settingsButton = document.getElementById('settings');
    const settingsMenu = document.getElementById('settingsMenu');
    const soundToggle = document.getElementById('soundToggle');
    const musicToggle = document.getElementById('musicToggle');
    const particlesToggle = document.getElementById('particlesToggle');

    // Toggle settings menu
    settingsButton.addEventListener('click', () => {
      settingsMenu.style.display = settingsMenu.style.display === 'none' ? 'block' : 'none';
    });

    // Close settings when clicking outside
    document.addEventListener('click', (e) => {
      if (!settingsMenu.contains(e.target) && !settingsButton.contains(e.target)) {
        settingsMenu.style.display = 'none';
      }
    });

    // Initialize toggles
    soundToggle.checked = this.settings.sound;
    musicToggle.checked = this.settings.music;
    particlesToggle.checked = this.settings.particles;

    // Sound toggle
    soundToggle.addEventListener('change', (e) => {
      this.settings.sound = e.target.checked;
      Object.values(this.sounds).forEach(sound => {
        if (sound !== this.backgroundMusic) {
          sound.muted = !this.settings.sound;
        }
      });
    });

    // Music toggle
    musicToggle.addEventListener('change', (e) => {
      this.settings.music = e.target.checked;
      if (this.backgroundMusic) {
        this.backgroundMusic.muted = !this.settings.music;
      }
    });

    // Particles toggle
    particlesToggle.addEventListener('change', (e) => {
      this.settings.particles = e.target.checked;
      this.weatherParticles.forEach(particle => {
        particle.visible = this.settings.particles;
      });
    });
  }

  changeWeather() {
    const weathers = ['clear', 'rain', 'snow', 'fog'];
    let newWeather;
    do {
      newWeather = weathers[Math.floor(Math.random() * weathers.length)];
    } while (newWeather === this.weather);
    
    this.weather = newWeather;
    
    // Update weather icon and text
    const weatherIcon = document.querySelector('#weather i');
    const weatherText = document.getElementById('weatherText');
    
    // Update weather display
    weatherText.textContent = this.weather.charAt(0).toUpperCase() + this.weather.slice(1);
    
    // Update weather icon
    weatherIcon.className = 'fas ' + (
      this.weather === 'clear' ? 'fa-sun' :
      this.weather === 'rain' ? 'fa-cloud-rain' :
      this.weather === 'snow' ? 'fa-snowflake' :
      'fa-fog'
    );

    // Play weather sound effects
    if (this.weather === 'rain' && this.settings.sound) {
      this.sounds.rain.play();
    } else {
      this.sounds.rain.pause();
    }
  }

  cleanup() {
    // Remove event listeners
    document.removeEventListener("keydown", this.handleControls.bind(this));
    
    // Remove game over screen if it exists
    const existingGameOver = document.getElementById('gameOverScreen');
    if (existingGameOver) {
      document.body.removeChild(existingGameOver);
    }

    // Remove renderer and canvas
    if (this.renderer && this.renderer.domElement) {
      document.body.removeChild(this.renderer.domElement);
    }

    // Dispose of all geometries and materials
    this.scene.traverse(object => {
      if (object.geometry) {
        object.geometry.dispose();
      }
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach(material => material.dispose());
        } else {
          object.material.dispose();
        }
      }
    });

    // Clear arrays
    this.obstacles = [];
    this.coins = [];
    this.powerUps = [];
    this.particles = [];
    this.trees = [];
    this.pathSegments = [];

    // Clear scene
    while(this.scene.children.length > 0) { 
      this.scene.remove(this.scene.children[0]); 
    }

    // Dispose of renderer
    if (this.renderer) {
      this.renderer.dispose();
    }

    // Clear the weather change timer when game is destroyed
    if (this.weatherChangeTimer) {
      clearInterval(this.weatherChangeTimer);
    }
  }

  createPlayer() {
    // Simplify player model for better stability
    const player = new THREE.Group();

    // Body
    const bodyGeometry = new THREE.BoxGeometry(0.5, 1, 0.3);
    const bodyMaterial = new THREE.MeshPhongMaterial({ color: 0x1E90FF });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.5;
    player.add(body);

    // Head
    const headGeometry = new THREE.BoxGeometry(0.3, 0.3, 0.3);
    const headMaterial = new THREE.MeshPhongMaterial({ color: 0xFFE4C4 });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 1.15;
    player.add(head);

    // Legs
    const legGeometry = new THREE.BoxGeometry(0.15, 0.4, 0.15);
    const legMaterial = new THREE.MeshPhongMaterial({ color: 0x4169E1 });

    const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(-0.15, 0.2, 0);
    player.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    rightLeg.position.set(0.15, 0.2, 0);
    player.add(rightLeg);

    player.traverse(child => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
      }
    });

    this.playerModel = player;
    player.position.y = 1;
    this.scene.add(player);
    return player;
  }

  init() {
    // Setup renderer
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(this.renderer.domElement);

    // Setup camera
    this.camera.position.set(0, 7, 15);
    this.camera.rotation.x = -0.4;

    // Create player
    this.playerModel = this.createPlayer();
    
    // Adjust camera settings
    this.camera.position.set(0, 7, 15);
    this.camera.rotation.x = -0.3;

    // Initial path
    for (let i = 0; i < 3; i++) {
      this.createPath();
    }

    // Add lighting
    const light = new THREE.AmbientLight(0xffffff, 1.5);
    this.scene.add(light);

    // Add directional light for shadows
    const dirLight = new THREE.DirectionalLight(0xffffff, 2);
    dirLight.position.set(-10, 10, -10);
    dirLight.castShadow = true;
    this.scene.add(dirLight);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
    this.scene.add(hemiLight);

    // Add fog for depth
    this.scene.fog = new THREE.Fog(0x000000, 1, 50);

    // Create skybox
    this.createSkybox();

    // Create environment
    this.createEnvironment();

    this.createObstacle();
    this.createCoin();

    // Setup controls
    document.addEventListener("keydown", this.handleControls.bind(this));

    // Start game loop
    this.animate();
  }

  createSkybox() {
    const skyboxGeometry = new THREE.BoxGeometry(1000, 1000, 1000);
    const skyboxMaterials = [
      new THREE.MeshBasicMaterial({ color: 0x87CEEB, side: THREE.BackSide }), // front
      new THREE.MeshBasicMaterial({ color: 0x87CEEB, side: THREE.BackSide }), // back
      new THREE.MeshBasicMaterial({ color: 0x87CEEB, side: THREE.BackSide }), // up
      new THREE.MeshBasicMaterial({ color: 0x4B5320, side: THREE.BackSide }), // down
      new THREE.MeshBasicMaterial({ color: 0x87CEEB, side: THREE.BackSide }), // right
      new THREE.MeshBasicMaterial({ color: 0x87CEEB, side: THREE.BackSide })  // left
    ];
    const skybox = new THREE.Mesh(skyboxGeometry, skyboxMaterials);
    this.scene.add(skybox);
  }

  createEnvironment() {
    // Create varied environment objects
    for (let i = 0; i < 20; i++) {
      const type = this.plantTypes[Math.floor(Math.random() * this.plantTypes.length)];
      const x = (Math.random() > 0.5 ? 1 : -1) * (8 + Math.random() * 10);
      const z = Math.random() * -50;
      this.createEnvironmentObject(type, x, z);
    }
  }

  createTree() {
    const trunkGeometry = new THREE.CylinderGeometry(0.2, 0.2, 2, 8);
    const leavesGeometry = new THREE.ConeGeometry(1, 2, 8);

    const trunkMaterial = new THREE.MeshPhongMaterial({ color: 0x4A2B0F });
    const leavesMaterial = new THREE.MeshPhongMaterial({ color: 0x0F4A0F });

    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);

    trunk.castShadow = true;
    leaves.castShadow = true;

    leaves.position.y = 2;

    const tree = new THREE.Group();
    tree.add(trunk);
    tree.add(leaves);

    this.scene.add(tree);
    this.trees.push(tree);

    return tree;
  }

  createPath() {
    const geometry = new THREE.BoxGeometry(5, 1, 50);
    const material = new THREE.MeshPhongMaterial({
      color: this.themes[this.currentTheme].groundColor,
      shininess: 10
    });

    const path = new THREE.Mesh(geometry, material);
    path.receiveShadow = true;
    path.position.z = this.lastPathZ - 50;
    path.position.y = 0;
    
    this.lastPathZ = path.position.z;
    this.scene.add(path);
    this.pathSegments.push(path);

    if (this.pathSegments.length > 3) {
      const oldPath = this.pathSegments.shift();
      this.scene.remove(oldPath);
    }

    // Add themed decorations
    if (Math.random() < 0.3) {
      const decorationType = this.currentTheme === 'desert' ? 'cactus' :
                           this.currentTheme === 'snow' ? 'snowman' :
                           this.currentTheme === 'night' ? 'lamppost' : 'tree';
      this.createEnvironmentObject(decorationType, Math.random() * 20 - 10, path.position.z);
    }
  }

  createObstacle() {
    const type = this.obstacleTypes[Math.floor(Math.random() * this.obstacleTypes.length)];
    let obstacle;

    switch(type) {
      case 'spike':
        const spikeGeo = new THREE.ConeGeometry(0.5, 2, 4);
        const spikeMat = new THREE.MeshPhongMaterial({ color: 0xff4444 });
        obstacle = new THREE.Mesh(spikeGeo, spikeMat);
        obstacle.rotation.x = Math.PI;
        break;
      
      case 'rotating':
        const rotatingGeo = new THREE.BoxGeometry(3, 0.5, 0.5);
        const rotatingMat = new THREE.MeshPhongMaterial({ color: 0xff8800 });
        obstacle = new THREE.Mesh(rotatingGeo, rotatingMat);
        obstacle.isRotating = true;
        break;
      
      case 'floating':
        const floatingGeo = new THREE.SphereGeometry(0.7);
        const floatingMat = new THREE.MeshPhongMaterial({ 
          color: 0x00ff88,
          transparent: true,
          opacity: 0.7
        });
        obstacle = new THREE.Mesh(floatingGeo, floatingMat);
        obstacle.isFloating = true;
        break;
      
      default: // box
        const boxGeo = new THREE.BoxGeometry(1.5, 1.5, 1.5);
        const boxMat = new THREE.MeshPhongMaterial({ color: 0xff0000 });
        obstacle = new THREE.Mesh(boxGeo, boxMat);
    }

    obstacle.position.x = Math.random() > 0.5 ? 2 : -2;
    obstacle.position.y = type === 'floating' ? 2.5 : 1;
    obstacle.position.z = -50;
    obstacle.castShadow = true;
    
    this.scene.add(obstacle);
    this.obstacles.push(obstacle);
  }

  createCoin() {
    const geometry = new THREE.TorusGeometry(0.5, 0.2, 8, 16);
    const material = new THREE.MeshBasicMaterial({ color: 0xFFD700 });
    const coin = new THREE.Mesh(geometry, material);

    coin.position.x = Math.random() * 4 - 2;
    coin.position.y = 2;
    coin.position.z = -50;
    coin.rotation.y = Math.PI / 2;

    this.scene.add(coin);
    this.coins.push(coin);
  }

  createPowerUp() {
    const type = this.powerUpTypes[Math.floor(Math.random() * this.powerUpTypes.length)];
    
    const geometry = new THREE.OctahedronGeometry(0.5);
    const material = new THREE.MeshPhongMaterial({ 
      color: this.powerUpColors[type],
      emissive: this.powerUpColors[type],
      emissiveIntensity: 0.5
    });
    
    const powerUp = new THREE.Mesh(geometry, material);
    powerUp.position.set(
      Math.random() * 4 - 2,
      2,
      -50
    );
    powerUp.type = type;
    
    // Add floating animation
    powerUp.floatOffset = Math.random() * Math.PI * 2;
    
    this.scene.add(powerUp);
    this.powerUps.push(powerUp);
  }

  activatePowerUp(type) {
    this.sounds.powerUp.play();
    
    switch(type) {
      case 'speed':
        this.hasSpeedBoost = true;
        this.speed *= 1.5;
        setTimeout(() => {
          this.speed /= 1.5;
          this.hasSpeedBoost = false;
        }, this.powerUpDuration);
        break;

      case 'invincible':
        this.isInvincible = true;
        if (this.playerModel) {
          this.playerModel.traverse(child => {
            if (child.isMesh) {
              child.material.emissive.setHex(0xff00ff);
              child.material.emissiveIntensity = 0.5;
            }
          });
        }
        setTimeout(() => {
          this.isInvincible = false;
          if (this.playerModel) {
            this.playerModel.traverse(child => {
              if (child.isMesh) {
                child.material.emissive.setHex(0);
                child.material.emissiveIntensity = 0;
              }
            });
          }
        }, this.powerUpDuration);
        break;

      case 'magnet':
        this.hasMagnet = true;
        setTimeout(() => {
          this.hasMagnet = false;
        }, this.powerUpDuration);
        break;

      case 'shield':
        this.hasShield = true;
        if (this.playerModel) {
          const shieldGeo = new THREE.SphereGeometry(1.2, 32, 32);
          const shieldMat = new THREE.MeshPhongMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.3
          });
          this.shield = new THREE.Mesh(shieldGeo, shieldMat);
          this.playerModel.add(this.shield);
        }
        setTimeout(() => {
          this.hasShield = false;
          if (this.shield && this.playerModel) {
            this.playerModel.remove(this.shield);
            this.shield.geometry.dispose();
            this.shield.material.dispose();
            this.shield = null;
          }
        }, this.powerUpDuration);
        break;

      case 'timeSlowdown':
        this.timeSlowdown = true;
        const originalSpeed = this.speed;
        this.speed *= 0.5;
        setTimeout(() => {
          this.timeSlowdown = false;
          this.speed = originalSpeed;
        }, this.powerUpDuration);
        break;

      case 'multiplier':
        this.coinMultiplier = 2;
        setTimeout(() => {
          this.coinMultiplier = 1;
        }, this.powerUpDuration);
        break;

      case 'doubleJump':
        this.hasDoubleJump = true;
        setTimeout(() => {
          this.hasDoubleJump = false;
        }, this.powerUpDuration);
        break;
    }

    // Create power-up effect
    if (this.playerModel) {
      const effectGeo = new THREE.RingGeometry(1, 1.2, 32);
      const effectMat = new THREE.MeshBasicMaterial({
        color: this.powerUpColors[type],
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide
      });
      const effect = new THREE.Mesh(effectGeo, effectMat);
      effect.rotation.x = Math.PI / 2;
      
      this.playerModel.add(effect);
      
      // Animate and remove effect
      const startTime = Date.now();
      const animate = () => {
        const elapsed = Date.now() - startTime;
        if (elapsed < 1000) {
          effect.scale.setScalar(1 + elapsed / 500);
          effect.material.opacity = 0.5 * (1 - elapsed / 1000);
          requestAnimationFrame(animate);
        } else {
          this.playerModel.remove(effect);
          effect.geometry.dispose();
          effect.material.dispose();
        }
      };
      animate();
    }
  }

  createParticles(position) {
    for (let i = 0; i < 5; i++) {
      const geometry = new THREE.SphereGeometry(0.1, 8, 8);
      const material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
      const particle = new THREE.Mesh(geometry, material);

      particle.position.copy(position);
      particle.velocity = new THREE.Vector3(
        Math.random() * 0.2 - 0.1,
        Math.random() * 0.2,
        Math.random() * 0.2 - 0.1
      );

      this.scene.add(particle);
      this.particles.push(particle);
    }
  }

  handleControls(event) {
    if (this.gameOver) return;

    switch (event.key) {
      case "Escape":
        this.togglePause();
        break;
      case "ArrowLeft":
        if (!this.isPaused && this.currentLane > -1) {
          this.currentLane--;
          const targetX = this.lanePositions[this.currentLane + 1];
          if (this.playerModel) {
            this.playerModel.position.x = targetX;
            this.playerModel.rotation.z = 0.2;
          }
        }
        break;
      case "ArrowRight":
        if (!this.isPaused && this.currentLane < 1) {
          this.currentLane++;
          const targetX = this.lanePositions[this.currentLane + 1];
          if (this.playerModel) {
            this.playerModel.position.x = targetX;
            this.playerModel.rotation.z = -0.2;
          }
        }
        break;
      case " ":
        event.preventDefault();
        if (!this.isPaused) {
          if (!this.isJumping) {
            this.jump();
            this.jumpCount = 1;
          } else if (this.hasDoubleJump && this.jumpCount === 1) {
            this.playerVelocity = this.jumpForce * 0.8;
            this.jumpCount = 2;
            this.createJumpEffect();
            this.sounds.jump.currentTime = 0;
            this.sounds.jump.play();
          }
        }
        break;
    }
  }

  movePlayerToPosition(targetX) {
    // Smooth movement interpolation
    const currentX = this.player.position.x;
    const distance = targetX - currentX;
    this.player.position.x += Math.sign(distance) * this.movementSpeed;
    
    // Snap to position if close enough
    if (Math.abs(this.player.position.x - targetX) < this.movementSpeed) {
      this.player.position.x = targetX;
    }
  }

  jump() {
    if (this.playerModel) {
      this.playerVelocity = this.jumpForce;
      this.isJumping = true;
      this.createJumpEffect();
      this.sounds.jump.currentTime = 0;
      this.sounds.jump.play();
    }
  }

  createJumpEffect() {
    const particles = [];
    for (let i = 0; i < 5; i++) {
      const particle = new THREE.Mesh(
        new THREE.SphereGeometry(0.1, 4, 4),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
      );
      particle.position.copy((this.playerModel || this.player).position);
      particle.position.y -= 0.5;
      particle.velocity = new THREE.Vector3(
        Math.random() * 0.2 - 0.1,
        Math.random() * 0.1,
        Math.random() * 0.2 - 0.1
      );
      this.scene.add(particle);
      particles.push(particle);
    }
    
    setTimeout(() => {
      particles.forEach(p => this.scene.remove(p));
    }, 1000);
  }

  checkCollisions() {
    const playerBox = new THREE.Box3().setFromObject(this.playerModel || this.player);

    // Check obstacle collisions
    this.obstacles.forEach(obstacle => {
      const obstacleBox = new THREE.Box3().setFromObject(obstacle);
      if (playerBox.intersectsBox(obstacleBox)) {
        this.gameOver = true;
        alert(`Game Over! Score: ${this.score}`);
      }
    });

    // Check coin collisions
    this.coins.forEach(coin => {
      const coinBox = new THREE.Box3().setFromObject(coin);
      if (playerBox.intersectsBox(coinBox)) {
        this.createParticles(coin.position);
        this.score += 100;
        this.scene.remove(coin);
        this.coins.splice(this.coins.indexOf(coin), 1);
        this.sounds.coin.play();
      }
    });

    // Return true if collision occurred
    return false;
  }

  handleGameOver() {
    this.gameOver = true;
    
    const gameOverDiv = document.createElement('div');
    gameOverDiv.id = 'gameOverScreen';
    gameOverDiv.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.8);
      padding: 20px;
      border-radius: 10px;
      color: white;
      text-align: center;
      z-index: 1000;
    `;
    
    gameOverDiv.innerHTML = `
      <h1>Game Over!</h1>
      <p>Score: ${this.score}</p>
      <p>Press SPACE to play again</p>
    `;
    
    document.body.appendChild(gameOverDiv);

    // Add one-time event listener for space key
    const restartHandler = (event) => {
      if (event.code === 'Space') {
        event.preventDefault();
        document.removeEventListener('keydown', restartHandler);
        new TempleRun();
      }
    };
    document.addEventListener('keydown', restartHandler);
  }

  animatePlayer() {
    if (!this.playerModel) return;

    const runningCycle = Date.now() * 0.01;
    
    // Simplify animation to just legs
    this.playerModel.children.forEach((part, index) => {
      if (index >= 2) { // legs only
        part.position.z = Math.sin(runningCycle + (index === 2 ? 0 : Math.PI)) * 0.2;
      }
    });
  }

  updatePowerUpIndicators() {
    document.getElementById('doubleJump').style.display = this.hasDoubleJump ? 'block' : 'none';
    document.getElementById('magnet').style.display = this.hasMagnet ? 'block' : 'none';
    document.getElementById('shield').style.display = this.hasShield ? 'block' : 'none';
    document.getElementById('timeSlowdown').style.display = this.timeSlowdown ? 'block' : 'none';
    document.getElementById('multiplier').style.display = this.coinMultiplier > 1 ? 'block' : 'none';
  }

  updateEnvironment() {
    if (this.isPaused) return;

    // Update time of day
    this.timeOfDay += 0.0001;
    if (this.timeOfDay > 1) this.timeOfDay = 0;

    // Update lighting based on time of day
    const sunIntensity = Math.sin(this.timeOfDay * Math.PI);
    const ambientIntensity = 0.5 + sunIntensity * 0.5;
    
    this.scene.traverse(object => {
      if (object instanceof THREE.AmbientLight) {
        object.intensity = ambientIntensity;
      }
      if (object instanceof THREE.DirectionalLight) {
        object.intensity = sunIntensity * 2;
      }
    });

    // Update fog and sky colors based on theme and time
    const theme = this.themes[this.currentTheme];
    let fogColor = new THREE.Color(theme.fogColor);
    let skyColor = new THREE.Color(theme.skyColor);
    
    if (this.currentTheme === 'night') {
      // Add stars at night
      if (Math.random() < 0.1) {
        const star = new THREE.Mesh(
          new THREE.SphereGeometry(0.05),
          new THREE.MeshBasicMaterial({ color: 0xFFFFFF })
        );
        star.position.set(
          Math.random() * 100 - 50,
          Math.random() * 30 + 20,
          Math.random() * 100 - 50
        );
        this.scene.add(star);
        setTimeout(() => this.scene.remove(star), 1000);
      }
    }

    // Update weather effects
    this.updateWeather();
  }

  updateWeather() {
    if (Math.random() < 0.001) {
      this.weather = ['clear', 'rain', 'snow', 'fog'][Math.floor(Math.random() * 4)];
      // Play weather sound effects
      if (this.weather === 'rain') {
        this.sounds.rain.play();
      } else {
        this.sounds.rain.pause();
      }
    }

    // Clear old weather particles
    this.weatherParticles = this.weatherParticles.filter(particle => {
      if (particle.position.y < 0) {
        this.scene.remove(particle);
        particle.geometry.dispose();
        particle.material.dispose();
        return false;
      }
      return true;
    });

    switch (this.weather) {
      case 'rain':
        // Create more raindrops for better visibility
        for (let i = 0; i < 5; i++) {
          if (Math.random() < 0.3) {
            const raindrop = new THREE.Mesh(
              new THREE.CylinderGeometry(0.02, 0.02, 0.5),
              new THREE.MeshBasicMaterial({ 
                color: 0x6666ff,
                transparent: true,
                opacity: 0.6
              })
            );
            
            // Position raindrops in a larger area around the player
            raindrop.position.set(
              this.playerModel.position.x + (Math.random() * 40 - 20),
              20,
              this.playerModel.position.z + (Math.random() * 40 - 20)
            );
            
            // Add some random variation to raindrop angles
            raindrop.rotation.x = Math.PI / 2 + (Math.random() * 0.2 - 0.1);
            raindrop.rotation.z = Math.random() * 0.2 - 0.1;
            
            // Faster velocity for more realistic rain
            raindrop.velocity = new THREE.Vector3(
              Math.random() * 0.1 - 0.05, // slight sideways motion
              -0.8 - Math.random() * 0.4,  // varying fall speed
              0.2  // forward motion to match game speed
            );
            
            this.scene.add(raindrop);
            this.weatherParticles.push(raindrop);

            // Add splash effect when raindrop hits ground
            if (Math.random() < 0.1) {
              const splash = new THREE.Mesh(
                new THREE.CircleGeometry(0.1, 8),
                new THREE.MeshBasicMaterial({
                  color: 0x6666ff,
                  transparent: true,
                  opacity: 0.4
                })
              );
              splash.position.set(
                raindrop.position.x,
                0.01,
                raindrop.position.z
              );
              splash.rotation.x = -Math.PI / 2;
              splash.scale.set(0.1, 0.1, 0.1);
              
              this.scene.add(splash);
              
              // Animate splash
              const startScale = 0.1;
              const endScale = 1;
              const duration = 500;
              const startTime = Date.now();
              
              const animateSplash = () => {
                const elapsed = Date.now() - startTime;
                const progress = elapsed / duration;
                
                if (progress < 1) {
                  const scale = startScale + (endScale - startScale) * progress;
                  splash.scale.set(scale, scale, scale);
                  splash.material.opacity = 0.4 * (1 - progress);
                  requestAnimationFrame(animateSplash);
                } else {
                  this.scene.remove(splash);
                  splash.geometry.dispose();
                  splash.material.dispose();
                }
              };
              
              animateSplash();
            }
          }
        }
        break;

      case 'snow':
        if (Math.random() < 0.2) {
          const snowflake = new THREE.Mesh(
            new THREE.SphereGeometry(0.05),
            new THREE.MeshBasicMaterial({ color: 0xFFFFFF, transparent: true, opacity: 0.8 })
          );
          snowflake.position.set(
            this.playerModel.position.x + (Math.random() * 20 - 10),
            15,
            this.playerModel.position.z + (Math.random() * 20 - 10)
          );
          snowflake.velocity = new THREE.Vector3(
            Math.random() * 0.02 - 0.01,
            -0.1,
            Math.random() * 0.02 - 0.01
          );
          this.scene.add(snowflake);
          this.weatherParticles.push(snowflake);
        }
        break;

      case 'fog':
        this.scene.fog.density = this.themes[this.currentTheme].fogDensity * 2;
        break;

      default:
        this.scene.fog.density = this.themes[this.currentTheme].fogDensity;
        break;
    }

    // Update weather particles
    this.weatherParticles.forEach(particle => {
      particle.position.add(particle.velocity);
      if (this.weather === 'snow') {
        particle.rotation.x += 0.01;
        particle.rotation.y += 0.01;
      }
    });
  }

  update() {
    if (this.gameOver || this.isPaused) return;

    // Update environment and weather
    this.updateEnvironment();

    // Basic player animation
    this.animatePlayer();

    // Handle magnet power-up
    if (this.hasMagnet) {
      this.coins.forEach(coin => {
        const distance = this.playerModel.position.distanceTo(coin.position);
        if (distance < this.magnetRadius) {
          const direction = new THREE.Vector3()
            .subVectors(this.playerModel.position, coin.position)
            .normalize();
          coin.position.add(direction.multiplyScalar(0.5));
        }
      });
    }

    // Update power-up visual effects
    this.powerUps.forEach(powerUp => {
      powerUp.rotation.y += 0.05;
      powerUp.position.y = 2 + Math.sin(Date.now() * 0.003 + powerUp.floatOffset) * 0.2;
    });

    // Check collisions
    const playerBox = new THREE.Box3().setFromObject(this.playerModel);
    
    // Coin collection with multiplier
    this.coins.forEach((coin, index) => {
      const coinBox = new THREE.Box3().setFromObject(coin);
      if (playerBox.intersectsBox(coinBox)) {
        this.createParticles(coin.position);
        this.score += 100 * this.coinMultiplier;
        this.scene.remove(coin);
        this.coins.splice(index, 1);
        this.sounds.coin.currentTime = 0;
        this.sounds.coin.play();
      }
    });

    // Obstacle collision with shield protection
    if (!this.isInvincible && !this.hasShield) {
      this.obstacles.forEach(obstacle => {
        const obstacleBox = new THREE.Box3().setFromObject(obstacle);
        if (playerBox.intersectsBox(obstacleBox)) {
          this.handleGameOver();
        }
      });
    }

    // Add lane-based body tilt
    if (this.playerModel) {
      const targetRotation = this.currentLane * -0.2;
      this.playerModel.rotation.z = THREE.MathUtils.lerp(
        this.playerModel.rotation.z,
        targetRotation,
        0.1
      );
    }

    // Simple camera follow
    this.camera.position.x = this.playerModel.position.x * 0.3;
    this.camera.lookAt(this.playerModel.position);

    // Gradually increase speed
    if (this.speed < this.maxSpeed) {
      this.speed += 0.00001;
    }

    // Update particles
    this.particles.forEach((particle, index) => {
      particle.position.add(particle.velocity);
      particle.velocity.y -= 0.01;
      if (particle.position.y < 0) {
        this.scene.remove(particle);
        this.particles.splice(index, 1);
      }
    });

    // Update trees
    this.trees.forEach(tree => {
      tree.position.z += this.speed;
      if (tree.position.z > 20) {
        tree.position.z = -50;
        tree.position.x = Math.random() > 0.5 ?
          -10 - Math.random() * 10 :
          10 + Math.random() * 10;
      }
    });

    // Move paths
    this.pathSegments.forEach(path => {
      path.position.z += this.speed;
    });

    // Check if we need a new path segment
    const lastPath = this.pathSegments[this.pathSegments.length - 1];
    if (lastPath.position.z > -25) {
      this.createPath();
    }

    // Handle jumping physics
    if (this.isJumping || this.playerModel.position.y > 1) {
      this.playerVelocity = this.playerVelocity || 0;
      this.playerVelocity -= this.gravity;
      this.playerModel.position.y += this.playerVelocity;

      // Ground check
      if (this.playerModel.position.y <= 1) {
        this.playerModel.position.y = 1;
        this.playerVelocity = 0;
        this.isJumping = false;
      }
    }

    // Add running animation when on ground
    if (this.playerModel.position.y === 1) {
      this.playerModel.rotation.x = Math.sin(Date.now() * 0.01) * 0.1;
    }

    // Move and remove obstacles
    this.obstacles.forEach(obstacle => {
      obstacle.position.z += this.speed;
      if (obstacle.position.z > 10) {
        this.scene.remove(obstacle);
        this.obstacles.splice(this.obstacles.indexOf(obstacle), 1);
      }
    });

    // Move and remove coins
    this.coins.forEach(coin => {
      coin.position.z += this.speed;
      coin.rotation.x += 0.05;
      if (coin.position.z > 10) {
        this.scene.remove(coin);
        this.coins.splice(this.coins.indexOf(coin), 1);
      }
    });

    // Update power-ups
    this.powerUps.forEach((powerUp, index) => {
      powerUp.position.z += this.speed;
      powerUp.rotation.y += 0.05;
      
      if (powerUp.position.z > 10) {
        this.scene.remove(powerUp);
        this.powerUps.splice(index, 1);
      }
    });

    // Speed effect
    if (this.hasSpeedBoost) {
      this.scene.fog.near = 1 - Math.sin(Date.now() * 0.01) * 0.5;
    } else {
      this.scene.fog.near = 1;
    }

    // Check power-up collisions
    this.powerUps.forEach((powerUp, index) => {
      const powerUpBox = new THREE.Box3().setFromObject(powerUp);
      if (playerBox.intersectsBox(powerUpBox)) {
        this.activatePowerUp(powerUp.type);
        this.scene.remove(powerUp);
        this.powerUps.splice(index, 1);
      }
    });

    // Generate power-ups
    if (Math.random() < 0.001) {
      this.createPowerUp();
    }

    // Generate new obstacles and coins
    if (this.score % 100 === 0) {
      this.createObstacle();
      this.createCoin();
      this.speed += 0.01;
    }

    // Update score
    this.score += 1;
    document.getElementById("score").textContent = `Score: ${this.score}`;

    // Update rotating obstacles
    this.obstacles.forEach(obstacle => {
      if (obstacle.isRotating) {
        obstacle.rotation.z += 0.05;
      }
      if (obstacle.isFloating) {
        obstacle.position.y = 2.5 + Math.sin(Date.now() * 0.003) * 0.5;
      }
    });

    // Update distance traveled
    this.distanceTraveled += this.speed;
    document.getElementById('distance').textContent = 
      `Distance: ${Math.floor(this.distanceTraveled)}m`;
  }

  createEnvironmentObject(type, x, z) {
    let object;

    switch(type) {
      case 'cactus':
        object = new THREE.Group();
        const cactusBody = new THREE.Mesh(
          new THREE.CylinderGeometry(0.3, 0.4, 2.5),
          new THREE.MeshPhongMaterial({ color: 0x2F4F4F })
        );
        object.add(cactusBody);

        // Add arms
        const arm1 = new THREE.Mesh(
          new THREE.CylinderGeometry(0.2, 0.2, 1),
          new THREE.MeshPhongMaterial({ color: 0x2F4F4F })
        );
        arm1.position.set(0.3, 0.5, 0);
        arm1.rotation.z = Math.PI / 4;
        object.add(arm1);

        const arm2 = arm1.clone();
        arm2.position.set(-0.3, 0.3, 0);
        arm2.rotation.z = -Math.PI / 4;
        object.add(arm2);
        break;

      case 'snowman':
        object = new THREE.Group();
        // Bottom sphere
        const bottom = new THREE.Mesh(
          new THREE.SphereGeometry(0.6),
          new THREE.MeshPhongMaterial({ color: 0xFFFFFF })
        );
        bottom.position.y = 0.6;
        object.add(bottom);

        // Middle sphere
        const middle = new THREE.Mesh(
          new THREE.SphereGeometry(0.4),
          new THREE.MeshPhongMaterial({ color: 0xFFFFFF })
        );
        middle.position.y = 1.5;
        object.add(middle);

        // Head
        const head = new THREE.Mesh(
          new THREE.SphereGeometry(0.3),
          new THREE.MeshPhongMaterial({ color: 0xFFFFFF })
        );
        head.position.y = 2.1;
        object.add(head);

        // Carrot nose
        const nose = new THREE.Mesh(
          new THREE.ConeGeometry(0.1, 0.3),
          new THREE.MeshPhongMaterial({ color: 0xFF6F00 })
        );
        nose.position.set(0, 2.1, 0.3);
        nose.rotation.x = Math.PI / 2;
        object.add(nose);
        break;

      case 'lamppost':
        object = new THREE.Group();
        // Post
        const post = new THREE.Mesh(
          new THREE.CylinderGeometry(0.1, 0.1, 4),
          new THREE.MeshPhongMaterial({ color: 0x333333 })
        );
        object.add(post);

        // Lamp
        const lamp = new THREE.Mesh(
          new THREE.SphereGeometry(0.3),
          new THREE.MeshPhongMaterial({ 
            color: 0xFFFF00,
            emissive: 0xFFFF00,
            emissiveIntensity: 1
          })
        );
        lamp.position.y = 2;
        object.add(lamp);

        // Add light
        const light = new THREE.PointLight(0xFFFF00, 1, 10);
        light.position.copy(lamp.position);
        object.add(light);
        break;

      case 'bush':
        const bushGeo = new THREE.SphereGeometry(0.8);
        const bushMat = new THREE.MeshPhongMaterial({ 
          color: this.currentTheme === 'snow' ? 0xFFFFFF : 0x0F5F0F 
        });
        object = new THREE.Mesh(bushGeo, bushMat);
        object.position.y = 0.8;
        break;

      case 'flower':
        object = new THREE.Group();
        const stemGeo = new THREE.CylinderGeometry(0.05, 0.05, 1);
        const stemMat = new THREE.MeshPhongMaterial({ color: 0x0F6F0F });
        const stem = new THREE.Mesh(stemGeo, stemMat);
        
        const petalGeo = new THREE.SphereGeometry(0.2);
        const petalMat = new THREE.MeshPhongMaterial({ 
          color: this.currentTheme === 'desert' ? 0xFF8C00 : 
                 this.currentTheme === 'snow' ? 0xE0FFFF :
                 Math.random() > 0.5 ? 0xff88ff : 0xffff88 
        });
        const petal = new THREE.Mesh(petalGeo, petalMat);
        petal.position.y = 0.6;
        
        object.add(stem);
        object.add(petal);
        break;

      case 'rock':
        const rockGeo = new THREE.DodecahedronGeometry(0.5);
        const rockMat = new THREE.MeshPhongMaterial({ color: 0x888888 });
        object = new THREE.Mesh(rockGeo, rockMat);
        object.rotation.set(
          Math.random() * Math.PI,
          Math.random() * Math.PI,
          Math.random() * Math.PI
        );
        break;

      case 'tree':
      default:
        object = new THREE.Group();
        const trunkGeo = new THREE.CylinderGeometry(0.2, 0.2, 2, 8);
        const trunkMat = new THREE.MeshPhongMaterial({ color: 0x4A2B0F });
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        
        let leavesGeo, leavesMat;
        if (this.currentTheme === 'snow') {
          leavesGeo = new THREE.ConeGeometry(1, 2, 8);
          leavesMat = new THREE.MeshPhongMaterial({ color: 0xFFFFFF });
        } else if (this.currentTheme === 'desert') {
          leavesGeo = new THREE.SphereGeometry(0.8);
          leavesMat = new THREE.MeshPhongMaterial({ color: 0x8B4513 });
        } else {
          leavesGeo = new THREE.ConeGeometry(1, 2, 8);
          leavesMat = new THREE.MeshPhongMaterial({ color: 0x0F4A0F });
        }
        
        const leaves = new THREE.Mesh(leavesGeo, leavesMat);
        leaves.position.y = 2;
        
        object.add(trunk);
        object.add(leaves);
        break;
    }

    object.position.set(x, 0, z);
    object.castShadow = true;
    object.receiveShadow = true;
    this.scene.add(object);
    return object;
  }

  togglePause() {
    this.isPaused = !this.isPaused;
    
    if (this.isPaused) {
      this.backgroundMusic.pause();
      Object.values(this.ambientSounds).forEach(sound => sound.pause());
      
      // Create pause menu
      const pauseDiv = document.createElement('div');
      pauseDiv.id = 'pauseScreen';
      pauseDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.8);
        padding: 20px;
        border-radius: 10px;
        color: white;
        text-align: center;
        z-index: 1000;
      `;
      
      pauseDiv.innerHTML = `
        <h2>Game Paused</h2>
        <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 20px;">
          <button id="resumeButton" style="padding: 10px 20px; background: #4CAF50; border: none; color: white; border-radius: 5px; cursor: pointer;">Resume</button>
          <button id="restartButton" style="padding: 10px 20px; background: #f44336; border: none; color: white; border-radius: 5px; cursor: pointer;">Restart</button>
        </div>
      `;
      
      document.body.appendChild(pauseDiv);
      
      // Add button event listeners
      document.getElementById('resumeButton').addEventListener('click', () => this.togglePause());
      document.getElementById('restartButton').addEventListener('click', () => {
        this.cleanup();
        new TempleRun();
      });
    } else {
      // Remove pause menu
      const pauseScreen = document.getElementById('pauseScreen');
      if (pauseScreen) {
        document.body.removeChild(pauseScreen);
      }
      
      this.backgroundMusic.play();
      this.ambientSounds[this.currentTheme].play();
    }
  }

  animate() {
    requestAnimationFrame(this.animate.bind(this));
    this.update();
    // Use regular renderer instead of composer
    this.renderer.render(this.scene, this.camera);
  }
}

// Start the game
new TempleRun();
