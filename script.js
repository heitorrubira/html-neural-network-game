//
// Constants
//

const DEFAULT_VIEW_WIDTH = 600;
const DEFAULT_VIEW_HEIGHT = 450;
const GRAVITY_VELOCITY = 0.00256;
const GROUND_BOTTOM_OFFSET = 20;
const BOX_VELOCITY_FACTOR = 0.005;
const BOX_MAX_VELOCITY = 0.75;

const KeyCode = Object.freeze({
  SPACE: 'Space',  
});

//
// Helper functions
//

const loadSpriteAsync = (src) => new Promise((resolve, reject) => {
  const sprite = new Image(src);
  sprite.onerror = (err) => {
    console.error('Error on load sprite!', { src, err });
    reject(err);
  };
  sprite.onload = (_ev) => {
    console.info('Sprite loaded!', { src });
    resolve(sprite);
  };
  sprite.src = src;
});

//
// Game classes
//

class Keyboard {
  static #btnsDown = new Set();
  static #btnsUp = new Set();

  static #onButtonDown(evt) {
    Keyboard.#btnsDown.add(evt.code);
  }

  static #onButtonUp(evt) {
    Keyboard.#btnsDown.delete(evt.code);
    Keyboard.#btnsUp.add(evt.code);
  }

  static isButtonDown(code) {
    return Keyboard.#btnsDown.has(code);
  }

  static isButtonUp(code) {
    return Keyboard.#btnsUp.has(code);
  }

  static onUpdateEnd() {
    Keyboard.#btnsUp.clear();
  }

  static dispose() {
    Keyboard.#btnsDown = null;
    Keyboard.#btnsUp = null;

    document.removeEventListener('keydown', Keyboard.#onButtonDown);
    document.removeEventListener('keyup', Keyboard.#onButtonUp);
  }

  static init() {
    document.addEventListener('keydown', Keyboard.#onButtonDown);
    document.addEventListener('keyup', Keyboard.#onButtonUp);
  }
}

class GameObject {
  constructor() {
    this.position = { x: 0, y: 0 };
    this.game = null;
  }
  update(deltaTime) {}
  draw(ctx) {}
}

class Sprite extends GameObject {
  constructor(sprite) {
    super();
    this.sprite = sprite;
  }

  get rect() {
    return {
      left: this.position.x,
      top: this.position.y,
      right: this.position.x + this.sprite.naturalWidth,
      bottom: this.position.y + this.sprite.naturalHeight,
    };
  }

  draw(ctx) {
    ctx.drawImage(
      this.sprite,
      this.position.x,
      this.position.y,
    );
  }
}

class AnimatedSprite extends Sprite {
  constructor(sprite) {
    super(sprite);
    this.numFrames = 4;
    this.frameWidth = 64;
    this.frameHeight = 64;
    this.currentFrame = 0;
    this.timer = 0;
    this.frameRate = 100;
  }

  get rect() {
    return {
      left: this.position.x,
      top: this.position.y,
      right: this.position.x + this.frameWidth,
      bottom: this.position.y + this.frameHeight,
    };
  }

  update(deltaTime) {
    this.timer += deltaTime;

    if (this.timer >= this.frameRate) {
      const nextFrame = this.currentFrame + 1;
      this.currentFrame = nextFrame >= this.numFrames
        ? 0
        : nextFrame;

      this.timer = 0;
    }
  }
  
  draw(ctx) {
    ctx.drawImage(
      this.sprite,
      this.currentFrame * this.frameWidth,
      0,
      this.frameWidth,
      this.frameHeight,
      this.position.x,
      this.position.y,
      this.frameWidth,
      this.frameHeight,
    );
  }
}

//
// Game stuff
//

class Platfom extends GameObject {
  constructor(color = '#999999', w = DEFAULT_VIEW_WIDTH, h = 4) {
    super();
    this.color = color;
    this.width = w;
    this.height = h;
  }

  draw(ctx) {
    ctx.fillStyle = this.color;
    ctx.fillRect(
      this.position.x,
      this.position.y,
      this.width,
      this.height,
    );
  }

  static create() {
    return new Platfom();
  }
}

class Box extends Sprite {
  constructor(sprite) {
    super(sprite);
    this.velocity = 0.15;
  }

  update(deltaTime) {
    const newPos = {
      x: this.position.x - this.velocity * deltaTime,
      y: this.position.y,
    };

    if (newPos.x <= -32) {
      newPos.x = this.game.viewWidth;
      this.velocity = Math.min(
        BOX_MAX_VELOCITY,
        this.velocity + BOX_VELOCITY_FACTOR *  deltaTime);
    }

    this.position = newPos;
  }

  static async create() {
    const sprite = await loadSpriteAsync('./assets/box.png');
    return new Box(sprite);
  }
}

class Robot extends AnimatedSprite {
  constructor(sprite) {
    super(sprite);
    this.isAlive = true;
    this.isJumping = false;
    this.jumpForce = 0.9;
    this.groundPos = DEFAULT_VIEW_HEIGHT - (super.frameHeight + GROUND_BOTTOM_OFFSET);
    this.velocity = { x: 0, y: 0 };
  }

  get rect() {
    return {
      left: this.position.x + 16,
      top: this.position.y,
      right: this.position.x + this.frameWidth - 16,
      bottom: this.position.y + this.frameHeight,
    };
  }

  update(deltaTime) {
    super.update(deltaTime);
    const rect = this.rect;

    const isSpaceUp = Keyboard.isButtonUp(KeyCode.SPACE);
    if (!this.isJumping && isSpaceUp) {
      this.velocity = {
        x: this.velocity.x,
        y: -this.jumpForce,
      };
      this.isJumping = true;
    }

    this.position = {
      x: this.position.x + (this.velocity.x * deltaTime),
      y: this.position.y + (this.velocity.y * deltaTime),
    };

    this.velocity = {
      x: this.velocity.x,
      y: this.isJumping
        ? this.velocity.y + GRAVITY_VELOCITY * deltaTime
        : 0.0,
    };
  
    if (this.isJumping && this.position.y + this.frameHeight >= this.groundPos) {
      this.position = {
        x: this.position.x,
        y: this.groundPos - this.frameHeight,
      };
      this.velocity = {
        x: this.velocity.x,
        y: 0,
      };
      this.isJumping = false;
    }
  
    const box = this.game.getGameObject('box');
    const boxRect = box.rect;
    const robotRect = this.rect;
    const intersects = !(
      robotRect.bottom < boxRect.top ||
      robotRect.right < boxRect.left ||
      robotRect.left > boxRect.right ||
      robotRect.top > boxRect.bottom
    );

    // if (intersects) {
    //   this.isAlive = false;
    // }
  }

  static async create() {
    const sprite = await loadSpriteAsync('./assets/robot_run.png');
    return new Robot(sprite);
  }
}

//
// The Game class
//

class Game {
  #objs = new Map();
  #pause = false;

  constructor(canvasId) {
    this.ctx = document.getElementById(canvasId).getContext('2d');
    this.ctx.canvas.width = DEFAULT_VIEW_WIDTH;
    this.ctx.canvas.height = DEFAULT_VIEW_HEIGHT;
  }

  get viewWidth() { return this.ctx.canvas.width; }
  get viewHeight() { return this.ctx.canvas.height; }

  addGameObject(key, go) {
    go.game = this;
    this.#objs.set(key, go);
  }

  getGameObject(key) {
    return this.#objs.get(key);
  }

  removeGameObject(key) {
    this.#objs.delete(key);
  }

  async loadContent() {
    const platform = Platfom.create();
    platform.position = { x: 0, y: this.viewHeight - GROUND_BOTTOM_OFFSET };

    const robot = await Robot.create();
    robot.position = {
      x: 10,
      y: platform.position.y - robot.frameHeight,
    };
    robot.groundPos = platform.position.y;     

    const box = await Box.create();
    box.position = {
      x: this.viewWidth + 100,
      y: platform.position.y - box.sprite.naturalHeight,
    };

    this.addGameObject('platform', platform);
    this.addGameObject('box', box);
    this.addGameObject('robot', robot);
  }

  update(deltaTime) {
    if (this.#pause) {
      return;
    }
  
    for (const obj of this.#objs.values()) {
      obj.update(deltaTime);
    }

    if (!this.getGameObject('robot').isAlive) {
      this.#pause = true;
    }

    Keyboard.onUpdateEnd();
  }

  render(fps) {
    this.ctx.clearRect(0, 0, this.viewWidth, this.viewHeight);

    // Show the FPS:
    this.ctx.font = '9px Arial';
    this.ctx.fillStyle = 'black';
    this.ctx.fillText(`FPS: ${fps}`, 5, 10);

    // Draw game objects
    for (const obj of this.#objs.values()) {
      obj.draw(this.ctx);
      const rect = obj.rect;
      if (rect) {
        this.ctx.beginPath();
        this.ctx.strokeStyle = "blue";
        this.ctx.strokeRect(
          rect.left,
          rect.top,
          rect.right - rect.left,
          rect.bottom - rect.top);
        this.ctx.stroke();
      }
    }
  }
}

//
// Entry point
//

async function init() {
  const game = new Game('my-canvas');
  let lastTimeStamp = 0;
  let deltaTime = 0;
  let secondsPassed = 0;
  let fps = 0;

  Keyboard.init();
  await game.loadContent();

  const gameLoop = (timeStamp) => {
    secondsPassed = (timeStamp - lastTimeStamp) / 1000;
    deltaTime = timeStamp - lastTimeStamp;
    lastTimeStamp = timeStamp;

    fps = Math.round(1 / secondsPassed);

    game.update(deltaTime);
    game.render(fps);

    window.requestAnimationFrame(gameLoop);
  };
  window.requestAnimationFrame(gameLoop);
}
window.onload = init;
