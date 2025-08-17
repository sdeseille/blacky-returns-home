let { init, Sprite, Text, Grid, GameLoop, track, initPointer, initKeys, onKey, Button } = kontra;

let { canvas, context } = init();
initPointer();
initKeys();

// ------------ CONSTANT ------------
var GRAV = 0.5, JUMP = -8.5;
var GROUND_Y = Math.floor(canvas.height * 0.7); // same pos everywhere
var DETECT_R = 110;   // Radius to detect player (IA switch to chase mode)
var ATTACK_R = 46;    // attack radius (crouch -> dash)

