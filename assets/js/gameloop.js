let { init, TileEngine, Sprite, GameLoop, initKeys, keyPressed, clamp } = kontra;

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
    case "dash":
      zzfx(...[,,400,.05,.15,.2,,2]);
      break;
    case "squash":
      zzfx(...[,,60,.2,.3,.4,2]);
      break;
    case "pickup":
      zzfx(...[,,553,.02,.03,.05,,1.9,2,62,208,.06,,,,,,.94]);
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
initKeys();

// ------------ CONSTANT ------------
const GRAV = 0.5, JUMP = -8.5;
const GROUND_Y = Math.floor(canvas.height * 0.7); // same pos everywhere
const DETECT_R = 110;   // Radius to detect player (IA switch to chase mode)
const ATTACK_R = 46;    // attack radius (crouch -> dash)
const FOOT_PAD = 4;
// All related to tileset
const TW = 36, TH = 36, MAPW = 50, MAPH = 10;

// ------------ functions toolbox ------------
function dist(a,b){ let dx=a.x-b.x, dy=a.y-b.y; return Math.hypot(dx,dy); }

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

// --- data of the map : 0 = empty, 1 = filled ---
const data = new Array(MAPW * MAPH).fill(0);
// ground (last line)
for (let c = 0; c < MAPW; c++) data[(MAPH - 1) * MAPW + c] = 1;

// floating platform (line 5, columns 11..15)
for (let c = 11; c <= 15; c++) data[5 * MAPW + c] = 1;

// floating plateform (line 7, columns 6..9)
for (let c = 6; c <= MAPW; c++) data[7 * MAPW + c] = 1;

// floating plateform (line 7, columns 6..9)
for (let c = 6; c <= 11; c++) data[3 * MAPW + c] = 1;

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
  c.strokeStyle="#ccc"; c.lineWidth=2;

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
  return kontra.Sprite({
    x: opts.x||100,
    y: opts.y||100,
    width: 32,
    height: 32,
    render(){ renderFishSkeleton(this.context); }
  });
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

        let l = kontra.keyPressed('arrowleft'),
            r = kontra.keyPressed('arrowright'),
            up = kontra.keyPressed('space') || kontra.keyPressed('arrowup'),
            dash = kontra.keyPressed('shift');

        this.vx = (l ? -this.speed : 0) + (r ? this.speed : 0);
        if (wasOnGround && up){ this.vy = JUMP; playSound("jump"); this.onGround = false; }
        if (wasOnGround && dash && !this.sliding){ this.sliding = 18; }
        if (this.sliding){
          this.vx += (this.facing = (this.vx>=0?1:-1)) * 3.5;
          this.sliding--;
        }
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

let player = createCat({ x: 60, y: GROUND_Y, speed: 2.2, ai: false });

let cats = [
  createCat({ x: 210, y: GROUND_Y, speed: 1.2, vx:  0.8, ai: true, furColor: 'white', eyeColor: 'blue' }),
  createCat({ x: 180, y: GROUND_Y, speed: 1.6, vx: -1.2, ai: true, furColor: 'orange', eyeColor: 'green' }),
  createCat({ x: 140, y: GROUND_Y, speed: 1.0, vx:  0.4, ai: true })
];

let fish = createFishSkeleton();


// sync the tile map camera and the sprite
tileEngine.add(player,cats,fish);
let sx = 1;

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
        playSound("rebound");
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
    tileEngine.sx = player.x + player.width/2 - canvas.width/2;
  },
  render: function() { // render the game state
    tileEngine.render();
    // sprites
    //player.render();
    //for (let i=0;i<cats.length;i++) cats[i].render();
    //fish.render()
  }
});

loop.start();    // start the game