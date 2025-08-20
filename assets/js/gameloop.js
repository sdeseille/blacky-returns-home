let { init, TileEngine, Sprite, GameLoop, initKeys, keyPressed } = kontra;

const { canvas } = init();
initKeys();

// ------------ CONSTANT ------------
const GRAV = 0.5, JUMP = -8.5;
const GROUND_Y = Math.floor(canvas.height * 0.7); // same pos everywhere
const DETECT_R = 110;   // Radius to detect player (IA switch to chase mode)
const ATTACK_R = 46;    // attack radius (crouch -> dash)

// ------------ functions toolbox ------------
function clamp(v, a, b){ return v < a ? a : v > b ? b : v; }
function dist(a,b){ let dx=a.x-b.x, dy=a.y-b.y; return Math.hypot(dx,dy); }

// --- virtual Tileset : grey square 36x36 ---
const TW = 36, TH = 36, MAPW = 25, MAPH = 10;
function makeTile(color = '#999') {
  const img = document.createElement('canvas');
  img.width = TW; img.height = TH;
  const ctx = img.getContext('2d');
  ctx.fillStyle = color; ctx.fillRect(0, 0, TW, TH);
  ctx.strokeStyle = '#777'; ctx.strokeRect(0, 0, TW, TH);
  return img;
}
const tileImage = makeTile('#9aa'); // init tile image

// --- data of the map : 0 = empty, 1 = filled ---
const data = new Array(MAPW * MAPH).fill(0);
// ground (last line)
for (let c = 0; c < MAPW; c++) data[(MAPH - 1) * MAPW + c] = 1;

// floating platform (line 5, columns 11..15)
for (let c = 11; c <= 15; c++) data[5 * MAPW + c] = 1;

// floating plateform (line 7, columns 6..9)
for (let c = 6; c <= 9; c++) data[7 * MAPW + c] = 1;

// --- TileEngine Création (require image !) ---
const tileEngine = TileEngine({
  tilewidth: TW,
  tileheight: TH,
  width: MAPW,
  height: MAPH,
  tilesets: [{ firstgid: 1, image: tileImage, columns: 1 }],
  layers: [{
    name: 'solid',
    data // CSV flatten (1D array)
  }]
});

// --- Collisions detection with tiles---
function isSolidAt(x, y) {
  return tileEngine.tileAtLayer('solid', { x, y }) > 0; // 0 = vide
}

function collideWithTiles(e) {
  // 1) Vertical integration with vy
  e.y += e.vy;

  const halfW = e.width / 2, halfH = e.height / 2;

  if (e.vy >= 0) {
    // fall : sample just below the feet (+1) to avoid sinking
    const bottom = e.y + halfH + 1;
    const left = e.x - halfW + 2, right = e.x + halfW - 2;
    if (isSolidAt(left, bottom) || isSolidAt(right, bottom)) {
      const row = Math.floor(bottom / TH);
      e.y = row * TH - halfH - 4;   // place it right on top of the tile
      e.vy = 0;
      e.onGround = true;
    } else {
      e.onGround = false;
    }
  } else {
    // climb : sample just above the head (-1)
    const top = e.y - halfH - 1;
    const left = e.x - halfW + 2, right = e.x + halfW - 2;
    if (isSolidAt(left, top) || isSolidAt(right, top)) {
      const row = Math.floor(top / TH);
      e.y = (row + 1) * TH + halfH; // hit the underside of a tile
      e.vy = 0;
    }
  }

  // 2) Horizontal integration with vx
  e.x += e.vx;

  if (e.vx > 0) {
    const right = e.x + halfW;
    const top = e.y - halfH + 2, bottom = e.y + halfH - 2;
    if (isSolidAt(right, top) || isSolidAt(right, bottom)) {
      const col = Math.floor(right / TW);
      e.x = col * TW - halfW; // stick to the left edge of the tile
      e.vx = 0;
    }
  } else if (e.vx < 0) {
    const left = e.x - halfW;
    const top = e.y - halfH + 2, bottom = e.y + halfH - 2;
    if (isSolidAt(left, top) || isSolidAt(left, bottom)) {
      const col = Math.floor(left / TW);
      e.x = (col + 1) * TW + halfW; // stick to the right edge of the tile
      e.vx = 0;
    }
  }
}

// --- utility to find Y of the shadow ---
function getShadowY(e, tileEngine) {
  let startY = e.y + e.height / 2;        // bottom of the sprite
  let col = Math.floor(e.x / tileEngine.tilewidth);
  let row = Math.floor(startY / tileEngine.tileheight);

  const cols = tileEngine.width;           // width in tiles
  const rows = tileEngine.height;          // height in tiles

  for (let r = row; r < rows; r++) {
    let tile = tileEngine.layers[0].data[r * cols + col];
    if (tile) {
      tileY = r * tileEngine.tileheight;
      return tileY; // Y from the top of the tile
    }
  }
  return null;
}

// ------------ Render the cat (locally, centered anchor) ------------
function renderCat(self){
  let c = self.context;

  // Body
  c.fillStyle = self.furColor ? self.furColor : 'black';
  c.fillRect(-10,  0, 20, 12);
  // Head
  c.fillRect(-8,  -10, 16, 10);
  // Ears
  c.fillRect(-8,  -14, 4, 4);
  c.fillRect( 4,  -14, 4, 4);

  // Tail (oscillates more strongly if moving horizontally)
  let walkAmp = Math.min(Math.abs(self.vx || 0), 3) * 1.2 + 2;
  let tailOffset = Math.sin(self.t * 1.6) * walkAmp;
  if (!self.ai){
    c.fillRect(10, -4 + tailOffset, 4, 8);
    c.fillRect(14, -6 + tailOffset, 4, 5);  
  } else {
    c.fillRect(10, -6 + tailOffset, 4, 14);
  }
  

  // Legs (no movement during sliding)
  let step = self.sliding ? 0 : Math.sin(self.t * 3) * 2;
  c.fillRect(-8,  12 + step, 4, 6);
  c.fillRect( 4,  12 - step, 4, 6);
  c.fillRect(-10, 12 - step, 4, 6);
  c.fillRect( 8,  12 + step, 4, 6);

  // Eyes (single blink)
  if ((self.blink = (self.blink+1)%200) < 5){
    c.fillStyle = self.furColor ? self.furColor : 'black';
    c.fillRect(-5, -7, 3, 1);
    c.fillRect( 2, -7, 3, 1);
  } else {
    c.fillStyle = self.eyeColor ? self.eyeColor : 'yellow';
    c.fillRect(-5, -7, 3, 3);
    c.fillRect( 2, -7, 3, 3);
  }

  // Shadow if in the air
  if (!self.onGround){
    let shadowY = getShadowY(self, tileEngine);
    if (shadowY !== null) {

      c.fillStyle = 'rgba(0, 0, 0, 0.3)';
      c.fillRect(-8, (shadowY - self.y), 16, 3,);
    }
  }
}

// ------------ cat factory ------------
function createCat(opts){
  let o = opts || {};
  let s = kontra.Sprite({
    x: o.x || 50,
    y: o.y || GROUND_Y,
    width: 32,
    height: 32,
    furColor: o.furColor,
    eyeColor: o.eyeColor,
    //anchor: {x:0.5, y:0.5},

    // state and physics.
    vx: o.vx || 0,
    vy: 0,
    speed: o.speed || 2.2,
    ai: !!o.ai,
    state: 'idle', // idle, chase, crouch, dash
    crouchT: 0,
    sliding: 0,
    facing: 1,
    t: 0,
    blink: 0,
    onGround: false,
    reboundCooldown: 0,

    update: function(){
      this.t += 0.1;
      this.vy += GRAV;

      if (this.ai){
        // --- IA : idle -> chase -> crouch -> dash ---
        let D = dist(this, player);
        let dx = player.x - this.x, dy = player.y - this.y;
        let nx = D ? dx/D : 0, ny = D ? dy/D : 0;

        if (this.state === 'idle'){
          // light patrol
          if (Math.random() < 0.02) this.vx = (Math.random() - 0.5) * (this.speed*0.8);
          // Jump sometime
          if (this.onGround && Math.random() < 0.005) { this.vy = JUMP; this.onGround = false; }
          if (D < DETECT_R) this.state = 'chase';
        }
        else if (this.state === 'chase'){
          this.vx = nx * this.speed * 1.3;
          if (D < ATTACK_R){
            this.state = 'crouch';
            this.crouchT = 20; // frames to curl up in
            this.vx = 0;
          }
        }
        else if (this.state === 'crouch'){
          this.vx = 0;
          this.crouchT--;
          if (this.crouchT <= 0){
            this.state = 'dash';
            this.vx = nx * this.speed * 4.0; // aggressive jump
          }
        }
        else if (this.state === 'dash'){
          // short dash, then return to idle/chase
          this.vx *= 0.96;
          if (Math.abs(this.vx) < 0.2) this.state = (D < DETECT_R ? 'chase' : 'idle');
        }

        this.facing = this.vx === 0 ? this.facing : (this.vx > 0 ? 1 : -1);
      }
      else {
        // --- Player ---

        // --- Cooldown rebond ---
        if (this.reboundCooldown > 0) {
          this.reboundCooldown--;  // decrement each frame
        }

        // if the player is rebounding, the keyboard is not taken into account
        if (player.reboundCooldown > 0) {
          this.x += this.vx;
          this.y += this.vy;
          this.vy += GRAV; // continuous gravity

          // duplicate the function call to not go out of area
          collideWithTiles(this);

          // duplicate the function call to not go out of area
          this.x = clamp(this.x, 32, canvas.width - 4);
          return;
        }

        let l = kontra.keyPressed('arrowleft'),
            r = kontra.keyPressed('arrowright'),
            up = kontra.keyPressed('space') || kontra.keyPressed('arrowup'),
            dash = kontra.keyPressed('shift');

        this.vx = (l ? -this.speed : 0) + (r ? this.speed : 0);
        if (this.onGround && up){ this.vy = JUMP; this.onGround = false; }
        if (this.onGround && dash && !this.sliding){ this.sliding = 18; }
        if (this.sliding){
          this.vx += (this.facing = (this.vx>=0?1:-1)) * 3.5;
          this.sliding--;
        }
      }
      // input
      collideWithTiles(this);

      // Border
      this.x = clamp(this.x, 32, canvas.width - 4);
    },
    render: function(){
      // If AI is in “crouch” mode, draw a ball — otherwise draw a normal cat.
      let c = this.context;
      if (this.ai && this.state === 'crouch'){
        c.fillStyle = this.furColor;
        c.beginPath(); c.ellipse(0, 6, 15, 10, 0, 0, Math.PI*2); c.fill();
      } else {
        renderCat(this);
      }
    }
  });
  return s;
}

let player = createCat({ x: 60, y: GROUND_Y, speed: 2.2, ai: false });

let cats = [
  createCat({ x: 210, y: GROUND_Y, speed: 1.2, vx:  0.8, ai: true, furColor: 'white', eyeColor: 'blue' }),
  createCat({ x: 180, y: GROUND_Y, speed: 1.6, vx: -1.2, ai: true, furColor: 'orange', eyeColor: 'green' }),
  createCat({ x: 140, y: GROUND_Y, speed: 1.0, vx:  0.4, ai: true })
];

// --- Manage collision between player and AI ---
function collidePlayerCats(player, cats) {
  cats.forEach(cat => {
    if (kontra.collides(player, cat)) {
      // To not go in infinite loop
      if ( player.onGround && player.reboundCooldown === 0) {
         // Rebound direction
         let dx = player.x - cat.x;
         player.vx = dx > 0 ? 4 : -4;
         player.vy = -8;
  
        // cooldown to avoid infinite rebound
        player.reboundCooldown = 20;

        console.log("Rebound trigered !");
      }
    }
  });
}

// --- Main Loop ---
let loop = GameLoop({  // create the main game loop
  update: function() { // update the game state
    player.update();
    for (let i=0;i<cats.length;i++) cats[i].update();
    collidePlayerCats(player,cats);
  },
  render: function() { // render the game state
    tileEngine.render();
    // sprites
    player.render();
    for (let i=0;i<cats.length;i++) cats[i].render();
  }
});

loop.start();    // start the game