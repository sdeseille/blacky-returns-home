import { init, TileEngine, Sprite, GameLoop, initKeys, initPointer, keyPressed, onKey, Text, Grid, track, clamp, collides } from 'kontra';

let // ZzFXMicro - Zuper Zmall Zound Zynth - v1.3.1 by Frank Force ~ 1000 bytes
zzfxV=.3,               // volume
zzfxX=new AudioContext, // audio context
zzfx=                   // play sound
(p=1,k=.05,b=220,e=0,r=0,t=.1,q=0,D=1,u=0,y=0,v=0,z=0,l=0,E=0,A=0,F=0,c=0,w=1,m=0,B=0
,N=0)=>{let M=Math,d=2*M.PI,R=44100,G=u*=500*d/R/R,C=b*=(1-k+2*k*M.random(k=[]))*d/R,
g=0,H=0,a=0,n=1,I=0,J=0,f=0,h=N<0?-1:1,x=d*h*N*2/R,L=M.cos(x),Z=M.sin,K=Z(x)/4,O=1+K,
X=-2*L/O,Y=(1-K)/O,P=(1+h*L)/2/O,Q=-(h+L)/O,S=P,T=0,U=0,V=0,W=0;e=R*e+9;m*=R;r*=R;t*=
R;c*=R;y*=500*d/R**3;A*=d/R;v*=d/R;z*=R;l=R*l|0;p*=zzfxV;for(h=e+m+r+t+c|0;a<h;k[a++]
=f*p)++J%(100*F|0)||(f=q?1<q?2<q?3<q?Z(g**3):M.max(M.min(M.tan(g),1),-1):1-(2*g/d%2+2
)%2:1-4*M.abs(M.round(g/d)-g/d):Z(g),f=(l?1-B+B*Z(d*a/l):1)*(f<0?-1:1)*M.abs(f)**D*(a
<e?a/e:a<e+m?1-(a-e)/m*(1-w):a<e+m+r?w:a<h-c?(h-a-c)/t*w:0),f=c?f/2+(c>a?0:(a<h-c?1:(
h-a)/c)*k[a-c|0]/2/p):f,N?f=W=S*T+Q*(T=U)+P*(U=f)-Y*V-X*(V=W):0),x=(b+=u+=y)*M.cos(A*
H++),g+=x+x*E*Z(a**5),n&&++n>z&&(b+=v,C+=v,n=0),!l||++I%l||(b=C,u=G,n=n||1);p=zzfxX.
createBuffer(1,h,R);p.getChannelData(0).set(k);b=zzfxX.createBufferSource();
b.buffer=p;b.connect(zzfxX.destination);b.start()}

// --- Litlle sound engine ---
function playSound(type){
  switch(type){
    case "jump": 
      zzfx(...[.7,,177,.01,.02,.05,,.1,,35,,,,,,,,.81,.02,,146]);
      break;
    case "rebound":
      zzfx(...[2.1,,358,.02,.01,.17,4,3.6,,,,,,.6,15,.4,.17,.75,.06]);
      break;
    case "pickup":
      zzfx(...[1.5,,539,,,.06,,.8,,,,,,.1,,,,.65]);
      break;
    case "catStep1":
      // a light, soft step
      zzfx(...[,,120,.01,.02,.02,1,1.5,,.5]); 
      break;
    case "catStep2":
      // a more subdued variant, slightly higher in pitch
      zzfx(...[,,160,.01,.015,.02,1,1.2,,.6]); 
      break;
  }
}

const { canvas } = init();
initPointer();
initKeys();

// ------------ CONSTANT ------------
const GRAV = 0.5, JUMP = -8.5;
const GROUND_Y = Math.floor(canvas.height * 0.7); // same pos everywhere
const DETECT_R = 110;   // Radius to detect player (IA switch to chase mode)
const ATTACK_R = 46;    // attack radius (crouch -> dash)
const FOOT_PAD = 4;
const bold_font = 'bold 20px Arial, sans-serif';
const normal_font = '20px Arial, sans-serif';

const text_options = {
  color: 'white',
  font: normal_font
};

// All related to tileset
const TW = 36, TH = 36, MAPW = 20, MAPH = 10;
const levels = [
                  [
                    [],
                    [3,2,7,1,10,1,13,1],
                    [16,4],
                    [0,2],
                    [],
                    [2,3,11,5],
                    [],
                    [5,5],
                    [],
                    [] // ground (last line created outside of level data)
                  ],
                  [
                    [],
                    [15,3],
                    [1,4,8,1,11,2,19,1],
                    [],
                    [0,1,6,1,9,1,12,1,17,2],
                    [],
                    [2,2,13,4],
                    [],
                    [4,1],
                    [] // ground (last line created outside of level data)
                  ],
                  [
                    [5,1],
                    [0,4,5,1,10,2],
                    [5,3,14,1,16,1],
                    [3,3,19,1],
                    [10,1,12,1],
                    [8,1,10,1,12,1,17,1],
                    [0,4,6,1,8,1,10,1],
                    [5,2,8,1,14,2],
                    [6,1],
                    [] // ground (last line created outside of level data)
                  ]
                ];
const levelObjects = [
                        [['p',8,1],['f',3,2],['w',1,19]],
                        [['p',8,1],['f',1,19],['w',3,9]],
                        [['p',0,1],['f',8,1],['f',0,19],['w',1,6]]
                      ];
// ------------ Global ------------

// --- data of the map : 0 = empty, 1 = filled ---
let data = new Array(MAPW * MAPH).fill(0);

let tileEngine, player, cats = [], fishes = [], exit_window;
let MAX_HIGH_SCORES = 5;
let game_level = 1;
let game_state = 'menu';
let player_score = 0;
let player_name = '';
let is_name_entered = false;
let current_level = 1;
let number_of_levels = levels.length;

// ------------ functions toolbox ------------
function dist(a,b){ let dx=a.x-b.x, dy=a.y-b.y; return Math.hypot(dx,dy); }

function createChrono() {
  let startTime = 0;
  let endTime = 0;
  let running = false;

  return {
    start() {
      startTime = performance.now();
      running = true;
    },
    stop() {
      if (running) {
        endTime = performance.now();
        running = false;
      }
    },
    reset() {
      startTime = 0;
      endTime = 0;
      running = false;
    },
    getElapsed() {
      let now = running ? performance.now() : endTime;
      return (now - startTime) / 1000; // secondes
    }
  };
}

let chrono = createChrono();

function computeTimeBonus(seconds) {
  let t = Math.min(seconds, 60); // borne max 60s
  return Math.max(0, Math.round(1000 * (60 - t) / 60));
}

// --- virtual Tileset : grey square 36x36 ---
function makeTile(color = '#999') {
  const img = document.createElement('canvas');
  img.width = TW; img.height = TH;
  const ctx = img.getContext('2d');
  ctx.fillStyle = color; ctx.fillRect(0, 0, TW, TH);
  ctx.strokeStyle = '#777'; ctx.strokeRect(0, 0, TW, TH);
  return img;
}
const tileImage = makeTile('#9aa'); // init tile image

function is_last_level(level){
  return level == number_of_levels ? true : false;
}

onKey('r', function(e) {
  // return to the game menu
  //console.log("r key pressed ! ");
  game_state = 'menu';
  initGame('restart',current_level);
});

function get_highscores() {
  // Retrieve scores from localStorage or return an empty array if not present
  return JSON.parse(localStorage.getItem('blacky_returns_home_highscores')) || [];
}

function save_highscore(new_score, player_name) {
  let highscores = get_highscores();
  const new_highscore = { score: new_score, name: player_name };

  // Add new score and sort the array in descending order
  highscores.push(new_highscore);
  highscores.sort((a, b) => b.score - a.score);

  // Limit the array to top MAX_HIGH_SCORES scores
  highscores.splice(MAX_HIGH_SCORES);

  // Save back to localStorage
  localStorage.setItem('blacky_returns_home_highscores', JSON.stringify(highscores));
}

function generate_score_table(highscores) {
  let text_objects = [];
  let start_y = 160; // Starting Y position for the first row
  let row_height = 40; // Space between each row
  let last_y_pos = start_y; // Used by text message proposing to restart a game

  // Column x positions for rank, name, and score
  const nameX = canvas.width/2;
  const rankX = nameX-100;
  const scoreX = nameX+100;
  const ColPos = {'Rank': rankX,'Name': nameX,'Score': scoreX};

  // Header row
  ['Rank','Name','Score'].forEach((name) => {
    text_objects.push(Text({
      text: name,
      font: '20px Arial',
      color: 'white',
      x: ColPos[name],
      y: start_y - 40,
      anchor: {x: 0.5, y: 0.5},
      textAlign: 'center'
    }))
  });

  // Loop through high scores and create Text objects for each entry
  highscores.forEach((entry, index) => {
    let y_pos = start_y + (index * row_height);
    last_y_pos = y_pos;

    text_objects.push(Text({
      text: `${index + 1}`.padStart(3,'0'),  // Rank
      font: '20px Arial',
      color: 'white',
      x: rankX,
      y: y_pos,
      anchor: {x: 0.5, y: 0.5},
      textAlign: 'center'
    }));

    text_objects.push(Text({
      text: entry.name,  // Player Name
      font: '20px Arial',
      color: 'white',
      x: nameX,
      y: y_pos,
      anchor: {x: 0.5, y: 0.5},
      textAlign: 'center'
    }));

    text_objects.push(Text({
      text: entry.score.toString().padStart(3,'0'),  // Player Score
      font: '20px Arial',
      color: 'white',
      x: scoreX,
      y: y_pos,
      anchor: {x: 0.5, y: 0.5},
      textAlign: 'center'
    }));
  });

  // Add a message to restart a game
  text_objects.push(Text({
    text: 'Press [r] to restart',
    font: 'bold 16px Arial',
    color: 'white',
    x: canvas.width/2,
    y: last_y_pos + (row_height * 1.5),
    anchor: {x: 0.5, y: 0.5},
    textAlign: 'center'
  }));

  return text_objects;
}

function new_banner(msg, colorname) {
  return Text({
    text: msg,
    font: '54px Arial',
    color: colorname,
    x: canvas.width/2,
    y: 75,
    anchor: {x: 0.5, y: 0.5},
    textAlign: 'center'
  });
}

let game_title = new_banner('🎭 Blacky returns home 🎭', 'yellow');
let highscores_title = new_banner('🏆 -= Highscore =- 🏆', 'gold');

let game_over = Text({
  text: 'Game Over\n\nYour score: ' + player_score,
  font: 'italic 58px Arial',
  color: 'red',
  x: canvas.width/2,
  y: 100,
  anchor: {x: 0.5, y: 0.5},
  textAlign: 'center',
  update: function () {
    this.text = 'Game Over\nYour score: ' + player_score
  }
});

let game_won = Text({
  text: '🎉Congratulation🎉\n\nYour score: ' + player_score,
  font: 'italic 58px Arial',
  color: 'white',
  x: canvas.width/2,
  y: 100,
  anchor: {x: 0.5, y: 0.5},
  textAlign: 'center',
  update: function () {
    this.text = '🎉Congratulation🎉\nYour score: ' + player_score
  }
});

let start_again = Text({
  text: 'Press [r] to restart',
  font: 'bold 16px Arial',
  color: 'white',
  x: canvas.width/2,
  y: 225,
  anchor: {x: 0.5, y: 0.5},
  textAlign: 'center'
});

let live_score = Text({
  text: 'SCORE: ' + player_score.toString().padStart(4,'0'),
  font: 'bold 20px Arial',
  color: 'white',
  strokeColor: 'black',
  x: 640,
  y: 345,
  anchor: {x: 0.5, y: 0.5},
  textAlign: 'right',
  update: function () {
    this.text = 'SCORE: ' + player_score.toString().padStart(4,'0')
  }
});

let start = Text({
  text: 'Start',
  onDown: function() {
    // handle on down events on the sprite
    //console.log("Clicked on Start");
    game_state = 'play';
  },
  onOver: function() {
    this.font = bold_font;
  },
  onOut: function() {
    this.font = normal_font;
  },
  ...text_options
});

let highscore = Text({
  text: 'Highscore',
  onDown: function() {
    // handle on down events on the sprite
    //console.log("Clicked on High Score");
    game_state = 'highscores';
  },
  onOver: function() {
    this.font = bold_font;
  },
  onOut: function() {
    this.font = normal_font;
  },
  ...text_options
});

let start_menu = Grid({
  x: canvas.width/2,
  y: 250,
  anchor: {x: 0.5, y: 0.5},

  // add 15 pixels of space between each row
  rowGap: 15,

  // center the children
  justify: 'center',

  children: [start, highscore]
});
track(start,highscore);

// --- Collision detection with tiles---
function isSolidAt(x, y) {
  return tileEngine.tileAtLayer('solid', { x, y }) > 0; // 0 = vide
}

function collideWithTiles(e) {
  // 1) Vertical integration with vy
  e.y += e.vy;
  const halfW = e.width / 2, halfH = e.height / 2;

  if (e.vy >= 0) {
    // fall : sample just below the feet (+1) to avoid sinking
    const bottom = e.y + halfH + FOOT_PAD;
    const left = e.x - halfW + 2, right = e.x + halfW - 2;
    if (isSolidAt(left, bottom) || isSolidAt(right, bottom)) {
      const row = Math.floor(bottom / TH);
      e.y = row * TH - halfH - FOOT_PAD;   // place it right on top of the tile
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

// Cat likes fish

function renderFishSkeleton(c){
  c.save();
  c.strokeStyle="#faf600ff"; c.lineWidth=2;

  // Spine
  c.beginPath();
  c.moveTo(-12,0); c.lineTo(10,0); c.stroke();

  // fish head (triangle)
  c.beginPath();
  c.moveTo(-16,0); c.lineTo(-12,-6); c.lineTo(-12,6); c.closePath();
  c.stroke();

  // Fish tail (V)
  c.beginPath();
  c.moveTo(10,0); c.lineTo(16,-6); c.moveTo(10,0); c.lineTo(16,6);
  c.stroke();

  // Fish bones (symmetrical)
  for(let x=-8;x<=9;x+=5){
    c.beginPath();
    c.moveTo(x,0); c.lineTo(x,-5);
    c.moveTo(x,0); c.lineTo(x,5);
    c.stroke();
  }
  c.restore();
}

function createFishSkeleton(opts={}){
  return Sprite({
    x: opts.x||100,
    y: opts.y||100,
    width: 32,
    height: 32,
    render(){ renderFishSkeleton(this.context); }
  });
}

function createSlidingWindow(opts) {
  opts = opts || {};
  let w = opts.w || 48, h = opts.h || 48;

  let s = Sprite({
    x: opts.x || 100,
    y: opts.y || 80,
    width: w,
    height: h,
    anchor: {x:0, y:0.25},

    open: 0,         // current state (0 close→ 1 open)
    targetOpen: 0,   // targeted state
    speed: 0.05,     // motion speed
    timer: 0,

    frameColor: opts.frame || "#965d08ff",
    glassColor: opts.glass || "#b4dcffcf",

    // API
    openWindow() { this.targetOpen = 1;this.timer = 1800;},
    closeWindow() { this.targetOpen = 0; },
    toggleWindow() { this.targetOpen = this.targetOpen > 0.5 ? 0 : 1; },

    update() {
      if (this.open < this.targetOpen) {
        this.open = Math.min(this.open + this.speed, this.targetOpen);
      } else if (this.open > this.targetOpen) {
        this.open = Math.max(this.open - this.speed, this.targetOpen);
      }

      // countdown autoclose
      if(this.timer>0){
        this.timer--;
        if(this.timer===0) this.closeWindow();
      }
    },

    render() {
      const c = this.context;
      const hw = this.width / 2, hh = this.height / 2;

      // frame
      c.fillStyle = this.frameColor;
      c.fillRect(-hw, -hh, this.width, this.height);

      // Glass area
      let innerMargin = 4;
      let glassW = this.width - innerMargin * 2;
      let glassH = this.height - innerMargin * 2;
      let glassX = -hw + innerMargin;
      let glassY = -hh + innerMargin;

      // Glass Background
      c.fillStyle = this.glassColor;
      c.fillRect(glassX, glassY, glassW, glassH);

      // sash (the part that lifts up when opening)
      let sashH = glassH / 2;
      let closedY = glassY + glassH - sashH;
      let openY = glassY; 
      let lowerY = closedY - (closedY - openY) * this.open;

      c.fillStyle = this.glassColor;
      c.fillRect(glassX, lowerY, glassW, sashH);

      // small separator bar
      c.fillStyle = this.frameColor;
      c.fillRect(glassX, closedY, glassW, 2);
    }
  });

  return s;
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
      let tileY = r * tileEngine.tileheight;
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

      c.fillStyle = '#0000004d';
      c.fillRect(-8, (shadowY - self.y), 16, 3,);
    }
  }
}

// ------------ cat factory ------------
function createCat(opts){
  let o = opts || {};
  let s = Sprite({
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
    // attributes for footstep sounds
    stepFrameCount: 0,
    stepToggle: false,

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
          if (this.onGround && Math.random() < 0.005) { this.vy = JUMP; playSound("jump"); this.onGround = false; }
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
        const wasOnGround = this.onGround;

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
          this.x = clamp(16 + tileEngine.sx, tileEngine.sx + canvas.width-8,this.x);
          return;
        }

        let l = keyPressed('arrowleft'),
            r = keyPressed('arrowright'),
            up = keyPressed('space') || keyPressed('arrowup');

        this.vx = (l ? -this.speed : 0) + (r ? this.speed : 0);
        if (wasOnGround && up){ this.vy = JUMP; playSound("jump"); this.onGround = false; }
      }
      // input
      collideWithTiles(this);

      // --- Detection and reading of steps ---
      if (!this.ai && this.onGround && Math.abs(this.vx) > 0.1) {
        this.stepFrameCount++;
        if (this.stepFrameCount >= 10) {
          this.stepFrameCount = 0;
          this.stepToggle = !this.stepToggle;
          playSound(this.stepToggle ? "catStep1" : "catStep2");
        }
      } else {
        this.stepFrameCount = 0;
      }

      // Border
      this.x = clamp(16, tileEngine.sx + canvas.width-8, this.x);
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

// helper to convert col/row → centered pixel coordinates
function tileToXY(col, row, tileEngine) {
  let tw = tileEngine.tilewidth;
  let th = tileEngine.tileheight;
  return {
    x: col * tw + tw/2,
    y: row * th + th/2
  };
}

function parseLevelObjects(levelIndex, levelObjects, tileEngine, fishes) {
  let objects = [];

  let list = levelObjects[levelIndex-1];
  for (let i=0; i<list.length; i++) {
    let [type, row, col] = list[i];
    let {x,y} = tileToXY(col, row, tileEngine);

    if (type === 'f') {
      let fish = createFishSkeleton({'x':x,'y':y});
      fishes.push(fish);
    }
    else if (type === 'w') {
      exit_window = createSlidingWindow({'x':x,'y':y, 'w': 36});
      objects.push(exit_window);
    }
    else if (type === 'p') {
      player = createCat({ x: x, y: y, speed: 2.2, ai: false });
      objects.push(player)
    }
  }
  return objects;
}

function initGame(reason,level) {
  if (reason == 'restart'){
    chrono.reset();
    // -- reinit variable used for game score
    player_score = 0;
    player_name = '';
    is_name_entered = false;
  }
  chrono.start();
  game_level = level;
  data = new Array(MAPW * MAPH).fill(0);

  // ground (last line)
  for (let c = 0; c < MAPW; c++) data[(MAPH - 1) * MAPW + c] = 1;

  // level constructor
  for (let l = 0; l < levels[game_level-1].length; l++){
    const row=levels[game_level-1][l]
    for (let i = 0; i <row.length;i+=2){
      const col = row[i], span = row[i+1];
      for (let j=0;j<span;j++){
        const idx = l * MAPW + (col + j);
        data[idx] = 1;
      }
    }
  }

  // --- TileEngine Creation (require image !) ---
  tileEngine = TileEngine({
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

  cats = [
    createCat({ x: 320, y: 200, speed: 1.2, vx:  0.8, ai: true, furColor: 'white', eyeColor: 'blue' }),
    createCat({ x: 460, y: 100, speed: 1.6, vx: -1.2, ai: true, furColor: 'silver', eyeColor: 'green' }),
    createCat({ x: 500, y: GROUND_Y, speed: 1.0, vx:  0.4, ai: true })
  ];
  fishes = []
  let objects = parseLevelObjects(game_level, levelObjects, tileEngine, fishes)
  tileEngine.add(cats,objects,fishes,live_score);
}

// Initialization of the game
initGame('start',current_level);

// --- Manage collision between player and AI ---
function collidePlayerCats(player, cats) {
  cats.forEach(cat => {
    if (collides(player, cat)) {
      // To not go in infinite loop
      if ( player.onGround && player.reboundCooldown === 0) {
         // Rebound direction
         let dx = player.x - cat.x;
         player.vx = dx > 0 ? 4 : -4;
         player.vy = -8;
  
        // cooldown to avoid infinite rebound
        player.reboundCooldown = 20;
        player_score -= 50;
        playSound("rebound");
        //console.log("Rebound trigered !");
      }
    }
  });
}

// --- Main Loop ---
let scoreTable = [];
let loop = GameLoop({  // create the main game loop
  update: function() { // update the game state
    let highscores = [];
    switch (game_state) {
      case 'menu':
        break;
      case 'play':
        player.update();
        for (let i=0;i<cats.length;i++) cats[i].update();
        exit_window.update();
        collidePlayerCats(player,cats);
        for (let i = fishes.length - 1; i >= 0; i--) {
          let fish = fishes[i];
          if (fish && collides(player, fish)) {
            player_score += 200;
            playSound("pickup");

            fish.ttl = 0;             // il disparaîtra aussi du rendu si tu utilises kontra
            tileEngine.remove(fish);  // supprime du tileEngine
            fishes.splice(i, 1);      // supprime du tableau

            exit_window.openWindow();      
          }
        }
        if (exit_window && collides(player, exit_window)){
          chrono.stop();
          let elapsed = chrono.getElapsed();
          let bonus = computeTimeBonus(elapsed);
          player_score += bonus;
          console.log(`Niveau terminé en ${elapsed.toFixed(2)}s → Bonus : ${bonus} pts`);
          player_score += 500;
          playSound("pickup");
          if (is_last_level(current_level)){
            current_level=1;
            game_state='gamewon';
          } else {
            current_level+=1;
            initGame('nextlevel',current_level);
          } 
        }
        live_score.update()
        tileEngine.sx = player.x + player.width/2 - canvas.width/2;
        break;
      case 'gameover':
        game_over.update();
        // Check if player made a high score
        highscores = get_highscores();
        break;
      case 'gamewon':
        game_won.update();
        // Check if player made a high score
        highscores = get_highscores();
        if (player_score > highscores[- 1]?.score || highscores.length < MAX_HIGH_SCORES) {
          // Player has a high score, ask for their name
          let player_name = prompt('New High Score! Enter your nickname:');
          //console.log('player_name: ['+player_name+']');
          let trimmed_player_name = player_name.substring(0, 3);
          //console.log('trimmed_player_name: ['+trimmed_player_name+']');
          save_highscore(player_score, trimmed_player_name);
          highscores = get_highscores();
          game_state='menu';
        }
        break;
      case 'highscores':
        scoreTable = generate_score_table(get_highscores());
        break;
    }
  },
  render: function() { // render the game state
    switch (game_state) {
      case 'menu':
        game_title.render();
        start_menu.render();
        break;
      case 'play':
        tileEngine.render();
        break;
      case 'gameover':
        game_over.render();
        start_again.render();
        break;
      case 'gamewon':
        game_won.render();
        start_again.render();
        break;
      case 'highscores':
        highscores_title.render()
        // Render the high score table
        scoreTable.forEach(row => row.render());
        break;
    }
  }
});

loop.start();    // start the game