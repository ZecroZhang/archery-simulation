///<reference path="./physics.js"/>
"use strict"

/**
 * @type { HTMLCanvasElement }
 */
const canvas = document.getElementById("canvas")
const ctx = canvas.getContext("2d")

canvas.width = 1024
canvas.height = 1024

//internal variables
//arm positioning constants 
const armFromCenterDistance = Math.hypot(100, 20) 
const extraAngle = Math.atan(1/5)
Animate()

var lastCheck = performance.now(), delta = 0
/**
 * Main loop.
 */
function Animate () {
  requestAnimationFrame(Animate)
  delta = (performance.now() - lastCheck) / 1000
  lastCheck = performance.now()

  ctx.fillStyle = "#00ffd9"
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  ctx.fillStyle = "#2bff00"
  ctx.fillRect(0, canvas.height * 0.75, canvas.width, canvas.height)

  ctx.fillStyle = "#000"
  ctx.strokeStyle = "#000"
  ctx.lineWidth = 4
  //draw the person. I'm going to precalculate these values for simplicity.
  ctx.beginPath()
  ctx.arc(150, 676, 40, 0, Math.PI*2)

  const skinColour = "#f7a862"
  DrawCircle(150, 820, 70, skinColour) //body 

  //feet
  DrawCircle(110, 930, 20, skinColour, true)
  DrawCircle(190, 930, 20, skinColour, true)

  //eyes
  DrawCircle(150, 800, 12, "#fff")
  DrawCircle(180, 800, 12, "#fff")

  //left arm positioning. 
  DrawCircle(120, 860, 20, skinColour)

  let arrowAngle = FindMouseToBodyAngle() + extraAngle

  let bowX = Math.cos(arrowAngle) * armFromCenterDistance + 150
  let bowY = Math.sin(arrowAngle) * armFromCenterDistance + 820

  //right arm. They require movement :(
  DrawCircle(bowX, bowY, 20, skinColour)

  //bow. 250, 800
  DrawBow(bowX, bowY, arrowAngle, 0)

  //update the current projectile position if there is one in the bow. 
  if (simulation.bowDrag.projectile !== null) {
    let projectile = simulation.bowDrag.projectile

    projectile.position.x = bowX / simulation.pixelsToMeters
    projectile.position.y = bowY / simulation.pixelsToMeters
    
    UpdateArrowLastPositionBeforeRelease(projectile)

    if (simulation.showTrajectory) {
      CalculateAndDrawBowPath(ctx,
      projectile.position.x, projectile.position.y,
      simulation.bowSpringConstant, BowStretchDistance() / simulation.pixelsToMeters,
      simulation.arrowMass, FindMouseToBodyAngle())
    }
  }

  for (let [ , projectile ] of simulation.projectiles) {
    projectile.update(delta)
    
    projectile.draw(ctx)
  }


  //mouse for debugging 
  /*ctx.fillStyle = "#f00"
  ctx.beginPath()
  ctx.arc(mouse.x, mouse.y, 10, 0, Math.PI*2)
  ctx.fill()*/
}

/**
 * Draws a circle with outline and filling on canvas. Colour is for the internal filling. Outside is always black. 
 * @param { number } x 
 * @param { number } y 
 * @param { number } radius 
 * @param { string } colour hex code. 
 * @param { boolean } semi
 */
function DrawCircle (x, y, radius, colour, semi = false) {
  ctx.fillStyle = colour

  ctx.beginPath()
  ctx.arc(x, y, radius, Math.PI * semi, Math.PI*2)
  ctx.fill()
  ctx.stroke()

  //draw the bottom line
  if (semi) {
    ctx.lineCap = "round"

    ctx.beginPath()
    ctx.moveTo(x - radius, y)
    ctx.lineTo(x + radius, y)
    ctx.stroke()
  }
}

/**
 * Draws a bow. (x, y) is the middle of the bow, the part where it would be held. 
 * @param { number } x 
 * @param { number } y 
 * @param { number } angle 
 * @param { number } stringPull
 */
function DrawBow (x, y, angle, stringPull) {
  const radius = 60

  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)

  //control point
  let controlPoint = simulation.bowDrag.projectile == null ? 0 : BowStretchDistance() * 2
  //bow string 
  ctx.lineWidth = 4
  ctx.strokeStyle = "#f2f0bc"
  ctx.beginPath()
  ctx.bezierCurveTo(-radius, -radius, -radius -controlPoint, 0, -radius, radius)
  //ctx.lineTo()
  ctx.stroke()

  ctx.strokeStyle = "#000"
  ctx.lineWidth = 10
  ctx.beginPath()
  ctx.arc(-radius, 0, radius, -Math.PI/2, Math.PI/2)
  ctx.stroke()

  ctx.restore()
}