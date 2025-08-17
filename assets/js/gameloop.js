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
      renderCat(this);
    }
  });
  return s;
}

player = createCat({ x: 60, y: GROUND_Y, speed: 2.2, ai: false });

let loop = GameLoop({  // create the main game loop
  update: function() { // update the game state
    player.update()
  },
  render: function() { // render the game state
    // background + ground (drawed on CANVAS context, excluded sprites)
    context.clearRect(0,0,canvas.width,canvas.height);
    context.fillStyle = '#eaeaea';
    context.fillRect(0, GROUND_Y + 4, canvas.width, 2);
    // sprites
    player.render()
  }
});

loop.start();    // start the game