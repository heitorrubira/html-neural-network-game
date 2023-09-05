//
// Constants
//

const DEFAULT_VIEW_WIDTH = 600;
const DEFAULT_VIEW_HEIGHT = 450;
const GRAVITY_VELOCITY = 0.00256;
const GROUND_BOTTOM_OFFSET = 20;
const BOX_VELOCITY_FACTOR = 0.005;
const BOX_MAX_VELOCITY = 0.75;
const BOX_INIT_VELOCITY = 0.15;

const NUM_OF_ROBOTS = 1000;

const DEFAULT_NN_CONFIG = [
  { size: 5, funcName: 'SIGMOID' },
  { size: 10, funcName: 'SIGMOID' },
  { size: 5, funcName: 'SIGMOID' },
  { size: 2, funcName: 'SIGMOID' },
  { size: 1, funcName: 'SIGMOID' },
];
const MIN_JUMP_PROBABILITY = 0.5;
const MUTATION_MULT = 0.1;

//
// Enums
//

const KeyCode = Object.freeze({
  SPACE: 'Space',
});

//
// Activation functions:
//

/**
 * Sigmoid
 * Most used in hidden and output layers for problems of binary classification.
 * @param {number} x 
 * @returns 
 */
function sigmoid(x) {
  return 1 / (1 + Math.exp(-x));
}

/**
 * Linear
 * Used in output layers, most for regression problems.
 * @param {number} x 
 * @returns 
 */
function linear(x) {
  return x;
}

/**
 * Tanh Hiperbolic Tangent
 * Used in hidden layers, similar to Sigmoid, but centered in zero.
 * @param {numer} x 
 * @returns 
 */
function tanh(x) {
  return Math.tanh(x);
}

/**
 * ReLU
 * Used in hidden layers of Convolutional neural network and Deep convolutional network.
 * @param {number} x 
 * @returns 
 */
function relu(x) {
  return Math.max(0, x);
}

/**
 * Leaky ReLU
 * Same as ReLU, but avoiding neuron death
 * @param {number} x 
 * @param {number} alpha 
 * @returns 
 */
function leakyRelu(x, alpha = 0.01) {
  return Math.max(alpha * x, x);
}

/**
 * Softmax
 * Used in the output layer for classification problems
 * @param {*} arr 
 * @returns 
 */
function softmax(arr) {
  const expArr = arr.map(x => Math.exp(x));
  const sum = expArr.reduce((acc, val) => acc + val, 0);
  return expArr.map(x => x / sum);
}

const NeuralActivationFunc = Object.freeze({
  SIGMOID: sigmoid,
  RELU: relu,
  LEAKY_RELU: leakyRelu,
  LINEAR: linear,
  TANH: tanh,
  SOFTMAX: softmax, // FIXME: need some changes on clas Neuron class to use this!
});

//
// Neural Network
//

/**
 * Neuron class.
 */
class Neuron {
  constructor(weights, bias, activationFunc = NeuralActivationFunc.SIGMOID) {
    this.weights = weights;
    this.bias = bias;
    this.activationFunc = activationFunc;
  }

  activate(entries = []) {
    let result = 0;

    for (let i = 0; i < this.weights.length; i++) {
      result += this.weights[i] * entries[i];
    }
    result += this.bias;

    return this.activationFunc(result);
  }

  static create(weightsSize = 1, activationFunc = undefined) {
    const weights = [];
    for (let i = 0; i < weightsSize; i++) {
      weights.push(Math.random());
    }
    return new Neuron(weights, Math.random(), activationFunc);
  }

  // Create a simple mutation:
  static createMutation(weight, mut) {
    let result = weight - mut;
    if (Math.random() >= 0.5) {
      result = weight + mut;
    }
    return Math.max(0.01, result);
  }
}

/**
 * Layer class.
 */
class NeuralLayer {
  constructor(neurons, isOutputLayer = false) {
    this.neurons = neurons;
    this.isOutputLayer = isOutputLayer;
  }

  get size() { return this.neurons.length; }

  static create(
    size = 1,
    weightsSize = 1,
    isOutputLayer = false,
    activationFunc = undefined) {
    const neurons = [];
    for (let i = 0; i < size; i++) {
      neurons.push(Neuron.create(weightsSize, activationFunc));
    }
    return new NeuralLayer(neurons, isOutputLayer);
  }
}

/**
 * Neural Network class.
 */
class NeuralNetwork {
  constructor() {
    this.layers = [];
  }

  get size() { return this.layers.length; }

  /**
   * Add a new layer to the neural network.
   * @param {{ size: number; funcName?: string }[]} layersConfig 
   */
  createLayers(layersConfig) {
    if (!layersConfig?.length) {
      throw new Error('The layers config must be valid and non-null!');
    }

    this.layers = [];
    for (let i = 0; i < layersConfig.length; i++) {
      const { size, funcName } = layersConfig[i];
      const func = NeuralActivationFunc[funcName];
      if (!func) {
        throw new Error(`Unknow activation function! func=${funcName}. e.g. RELU, SIGMOID, LEAKY_RELU, LINEAR...`);
      }

      if (i == 0) {
        this.layers.push(NeuralLayer.create(size, 1, false, func));
      } else {
        this.layers.push(
          NeuralLayer.create(
            size,
            layersConfig[i - 1].size,
            i === layersConfig.length - 1,
            func,
          )
        );
      }
    }
  }

  /**
   * Clear all layers.
   */
  clear() {
    this.layers = [];
  }

  /**
   * The predict function.
   * @param {number[]} values Input values.
   * @returns 
   */
  predict(values) {
    if (values.length !== this.layers[0].size) {
      throw new Error('The predict input must have same length as input array!');
    }

    // hold the value for each layer result:
    let layerInput = [];

    // First calc the result from input layer:
    const firstLayer = this.layers[0];
    for (let neuronIndex = 0; neuronIndex < firstLayer.size; neuronIndex++) {
      const neuron = firstLayer.neurons[neuronIndex];
      layerInput.push(neuron.activate([values[neuronIndex]]));
    } // End of neurons.

    // For all other layers:
    for (let layerIndex = 1; layerIndex < this.size; layerIndex++) {
      const layer = this.layers[layerIndex];
      const temp = [];

      for (let neuronIndex = 0; neuronIndex < layer.size; neuronIndex++) {
        const neuron = layer.neurons[neuronIndex];
        temp.push(neuron.activate(layerInput));
      } // End of neurons.

      // get the current results for the next layer:
      layerInput = temp;
    } // End of layers.

    // Send the last iteration as result:
    return layerInput;
  }
}

//
// Game Helper functions
//

const loadSpriteAsync = (src) => new Promise((resolve, reject) => {
  const sprite = new Image(src);
  sprite.onerror = (err) => {
    console.error('Error on load sprite!', { src, err });
    reject(err);
  };
  sprite.onload = (_ev) => {
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
  update(deltaTime) { }
  draw(ctx) { }
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
    this.velocity = BOX_INIT_VELOCITY;
  }

  update(deltaTime) {
    const newPos = {
      x: this.position.x - this.velocity * deltaTime,
      y: this.position.y,
    };

    if (newPos.x <= -32) {
      const platform = this.game.getGameObject('platform');
      newPos.x = this.game.viewWidth;
      newPos.y = Math.random() >= 0.5
        ? platform.position.y - this.sprite.naturalHeight * 4
        : platform.position.y - this.sprite.naturalHeight;
      this.velocity = Math.min(
        BOX_MAX_VELOCITY,
        this.velocity + BOX_VELOCITY_FACTOR * deltaTime);
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
    this.nn = new NeuralNetwork();
    this.nn.createLayers(DEFAULT_NN_CONFIG);
    this.boxRef = null;
    this.distance = 0.0;
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
    if (!this.isAlive) {
      return;
    }
    super.update(deltaTime);

    const jumpProbability = this.nn.predict([
      this.position.x / DEFAULT_VIEW_WIDTH,
      this.position.y / DEFAULT_VIEW_HEIGHT,
      this.boxRef.position.x / DEFAULT_VIEW_WIDTH,
      this.boxRef.position.y / DEFAULT_VIEW_HEIGHT,
      this.boxRef.velocity,
    ]);
    const shouldJump = jumpProbability[0] >= MIN_JUMP_PROBABILITY;

    const isSpaceUp = Keyboard.isButtonUp(KeyCode.SPACE) || shouldJump;
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

    const boxRect = this.boxRef.rect;
    const robotRect = this.rect;
    const intersects = !(
      robotRect.bottom < boxRect.top ||
      robotRect.right < boxRect.left ||
      robotRect.left > boxRect.right ||
      robotRect.top > boxRect.bottom
    );

    if (intersects) {
      this.isAlive = false;
    }

    this.distance += Math.ceil(deltaTime * 0.01);
  }

  draw(ctx) {
    if (!this.isAlive) {
      return;
    }
    super.draw(ctx);
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
    this.ctx = document
      .getElementById(canvasId)
      .getContext('2d');
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

    const box = await Box.create();
    box.position = {
      x: this.viewWidth + 100,
      y: Math.random() >= 0.5
        ? platform.position.y - box.sprite.naturalHeight * 4
        : platform.position.y - box.sprite.naturalHeight,
    };

    this.addGameObject('platform', platform);
    this.addGameObject('box', box);

    // Create robots:
    for (let i = 0; i < NUM_OF_ROBOTS; i++) {
      const robot = await Robot.create();
      robot.position = {
        x: 10,
        y: platform.position.y - robot.frameHeight,
      };
      robot.groundPos = platform.position.y;
      robot.boxRef = box;
      this.addGameObject(`robot_${i}`, robot);
    }
  }

  restartGame() {
    const platform = this.getGameObject('platform');
    const box = this.getGameObject('box');
    box.position = {
      x: this.viewWidth + 100,
      y: Math.random() >= 0.5
        ? platform.position.y - box.sprite.naturalHeight * 4
        : platform.position.y - box.sprite.naturalHeight,
    };
    box.velocity = BOX_INIT_VELOCITY;

    let robots = [];
    for (let i = 0; i < NUM_OF_ROBOTS; i++) {
      robots.push(this.getGameObject(`robot_${i}`));
    }
    robots.sort((a, b) => b.distance - a.distance);
    const bestRobot = robots[0];
    const bestNN = bestRobot.nn;
  
    // Create mutations:
    for (let i = 1; i < robots.length; i++) {
      const robot = robots[i];
      const nn = robot.nn;
    
      // For every layer:
      for(let l = 0; l < nn.size; l++) {
        const layer = nn.layers[l];
        const bestLayer = bestNN.layers[l];
      
        // For every neuron:
        for (let n = 0; n < layer.size; n++) {
          const neuron = layer.neurons[n];
          const bestNeuron = bestLayer.neurons[n];

          if (i >= robots.length * 0.8) {          
            neuron.weights = bestNeuron.weights.map((w) => Math.random());
            neuron.bias = Math.random();
          } else {
            neuron.weights = bestNeuron.weights.map((w) =>
              Neuron.createMutation(w, Math.random() * MUTATION_MULT));
            neuron.bias = Neuron.createMutation(
              bestNeuron.bias,
              Math.random() * MUTATION_MULT);
          }
        } // End of every neuron.
        
      } // End of every layer.

      robot.isAlive = true;
      robot.position = {
        x: 10,
        y: platform.position.y - robot.frameHeight,
      };
    }

    bestRobot.isAlive = true;
    bestRobot.position = {
      x: 10,
      y: platform.position.y - bestRobot.frameHeight,
    };

    this.#pause = false;
  }

  update(deltaTime) {
    if (this.#pause) {
      return;
    }

    for (const obj of this.#objs.values()) {
      obj.update(deltaTime);
    }

    // Check if all robots are dead:
    let countAlive = 0;
    for (let i = 0; i < NUM_OF_ROBOTS; i++) {
      if (this.getGameObject(`robot_${i}`).isAlive) {
        countAlive += 1;
      }
    }
    if (!countAlive) {
      console.log(`All robots are dead, let's try again!`);
      this.#pause = true;
      this.restartGame();
      return;
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
