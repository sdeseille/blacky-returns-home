let { init, Sprite, Text, Grid, GameLoop, track, initPointer, initKeys, onKey, Button } = kontra;

let { canvas, context } = init();
initPointer();
initKeys();

// ------------ CONSTANT ------------
const GRAV = 0.5, JUMP = -8.5;
const GROUND_Y = Math.floor(canvas.height * 0.7); // same pos everywhere
const DETECT_R = 110;   // Radius to detect player (IA switch to chase mode)
const ATTACK_R = 46;    // attack radius (crouch -> dash)

// ------------ functions toolbox ------------
function clamp(v, a, b){ return v < a ? a : v > b ? b : v; }
function dist(a,b){ let dx=a.x-b.x, dy=a.y-b.y; return Math.hypot(dx,dy); }

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
  c.fillRect(10, -6 + tailOffset, 4, 14);

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
    c.fillStyle = 'rgba(0,0,0,0.15)';
    c.fillRect(-8, (GROUND_Y - self.y) + 20, 16, 3);
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
    anchor: {x:0.5, y:0.5},

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
    onGround: true,

    update: function(){
      this.t += 0.1;
      if (this.ai){
        // --- IA : idle -> chase -> crouch -> dash ---
        var D = dist(this, player);
        var dx = player.x - this.x, dy = player.y - this.y;
        var nx = D ? dx/D : 0, ny = D ? dy/D : 0;

        if (this.state === 'idle'){
          // light patrol
          if (Math.random() < 0.02) this.vx = (Math.random() - 0.5) * (this.speed*0.8);
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
      // Gravity management
      this.vy += GRAV;
      this.x += this.vx;
      this.y += this.vy;

      // Ground collision
      if (this.y > GROUND_Y){
        this.y = GROUND_Y;
        this.vy = 0;
        this.onGround = true;
      } else {
        this.onGround = false;
      }

      // Border
      this.x = clamp(this.x, 32, canvas.width - 4);
    },
    render: function(){
      // If AI is in “crouch” mode, draw a ball — otherwise draw a normal cat.
      var c = this.context;
      if (this.ai && this.state === 'crouch'){
        c.fillStyle = 'black';
        //c.beginPath(); c.arc(0, 6, 10, 0, Math.PI*2); c.fill();
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
  player,
  createCat({ x: 210, y: GROUND_Y, speed: 1.2, vx:  0.8, ai: true }),
  createCat({ x: 320, y: GROUND_Y, speed: 1.6, vx: -1.2, ai: true }),
  createCat({ x: 140, y: GROUND_Y, speed: 1.0, vx:  0.4, ai: true })
];

let loop = GameLoop({  // create the main game loop
  update: function() { // update the game state
    for (let i=0;i<cats.length;i++) cats[i].update();
  },
  render: function() { // render the game state
    // background + ground (drawed on CANVAS context, excluded sprites)
    context.clearRect(0,0,canvas.width,canvas.height);
    context.fillStyle = '#eaeaea';
    context.fillRect(0, GROUND_Y + 4, canvas.width, 2);
    // sprites
    for (let i=0;i<cats.length;i++) cats[i].render();
  }
});

loop.start();    // start the game