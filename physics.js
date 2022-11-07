///<reference path="types.ts"/>
"use strict"

/**
 * All these variables is going to be in meters. 
 * @type { Simulation }
 */
const simulation = {
  gravity: 9.8,
  pixelsToMeters: 20,
  uniqueId: 0,

  projectiles: new Map(),
  terrain: [],

  //everything's in si units 
  maxBowStretch: 0.2, //20cm 
  arrowMass: 0.0162, 
  bowSpringConstant: 350,
  showTrajectory: true,

  //disables the ability to shoot the bow. 
  drawingTerrain: false, 
  terrainAssemble: [],

  //bow controls
  bowDrag: {
    //time since start drag. 
    startTime: 0, 
    isAiming: false,
    projectile: null
  },

}

class Vector2d {
  /**
   * Creates a 2d coordinate vector. 
   * @param { number } x 
   * @param { number } y 
   */
  constructor (x, y) {
    //number in case if a string gets inputted. 
    this.x = Number(x) || 0
    this.y = Number(y) || 0
  }

  /**
   * Adds another vector to this one. 
   * @param { Vector2d } vector 
   */
  add (vector) {
    this.x += vector.x
    this.y += vector.y
  }

  /**
   * @returns { boolean } If the vector has a non zero value. 
   */
  isNonZero () {
    return this.x != 0 || this.y != 0
  }

  /**
   * Resets the vector to (0,0)
   */
  reset() {
    this.x = 0
    this.y = 0
  }

  /**
   * Set it equal to another vector 
   * @param { Vector2d } vector 
   */
  setTo (vector) {
    this.x = vector.x
    this.y = vector.y
  }
}

class Projectile {
  /**
   * Creates a projectile class. Note the x and y values are real world values and not the pixel values. 
   * @param { number } x 
   * @param { number } y 
   * @param { number } speedX 
   * @param { number } speedY 
   * @param { number } mass 
   */
  constructor (x, y, speedX, speedY, mass) {
    this.position = new Vector2d(x, y)
    //this is used to determine the direction of the arrow. 
    this.lastPosition = new Vector2d(0, 0)

    this.velocity = new Vector2d(speedX, speedY)
    this.mass = mass
    
    this.gravityEnabled = true
  }

  /**
   * 
   * @param { number } delta time in ms since this was last called. 
   */
  update (delta) {
    //accelerate the object due to gravity. The canvas is upside down. 
    if (this.gravityEnabled) {
      this.velocity.y += simulation.gravity * delta
    }

    //there is no velocity so no more calcs. 
    if (!this.velocity.isNonZero()) {
      return
    }

    //update the last position then this position 
    this.lastPosition.setTo(this.position)

    this.position.x += this.velocity.x * delta
    this.position.y += this.velocity.y * delta

    //check if colliding with anything. The ground is anything below canvas.height(1024) * 0.90
    if (Projectile.HasCollided(this, false)) {
      this.gravityEnabled = false
      this.velocity.reset()
    }
  }

  /**
   * Draws the projectile on canvas.
   * @param { CanvasRenderingContext2D } ctx
   */
  draw (ctx) {
    //make it an actual arrow later. 
    ctx.strokeStyle = "#878787"
    ctx.lineWidth = 4

    const arrowLength = 100

    //convert the real world measure back to pixels. 
    let x = this.position.x * simulation.pixelsToMeters
    let y = this.position.y * simulation.pixelsToMeters

    let prevX = this.lastPosition.x * simulation.pixelsToMeters
    let prevY = this.lastPosition.y * simulation.pixelsToMeters

    let lineRotation = Math.atan2((y - prevY) , (x - prevX))

    //drag is the tail 
    ctx.beginPath()
    ctx.moveTo(x - Math.cos(lineRotation) * arrowLength, y - Math.sin(lineRotation) * arrowLength)
    ctx.lineTo(x, y)
    ctx.stroke()

    //the arrow at the end. 
    const length = 20
    const angle = Math.PI/6

    let x1 = x - Math.cos(lineRotation - angle) * length
    let y1 = y - Math.sin(lineRotation - angle) * length

    let x2 = x - Math.cos(lineRotation + angle) * length
    let y2 = y - Math.sin(lineRotation + angle) * length

    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x, y)
    ctx.lineTo(x2, y2)
    ctx.stroke()



    //ctx.beginPath()
    //ctx.arc(40, 40, 20, 0, Math.PI*2)
    //ctx.arc(this.position.x * simulation.pixelsToMeters, this.position.y * simulation.pixelsToMeters, 10, 0, Math.PI*2)
    //ctx.fill()
  }

  /**
   * Checks if the object is hitting anything and react accordingly 
   * @param { Projectile } projectile 
   * @param { boolean } ghostObject If the collision should affect other objects. Use false for the predicted paths. 
   * @returns { boolean } If the object is hitting 
   */
  static HasCollided (projectile, ghostObject = false) {
    //ground collision.
    if (projectile.position.y * simulation.pixelsToMeters > 921.6) {
      return true 
    }

    //object to terrain collision
    
    //sorry I'm rushing this, I'll make this more logical and optimized later. Pretend the arrow is a square and collision is calculated using pixels. 
    let adjustedArrowX = projectile.position.x * simulation.pixelsToMeters
    let adjustedArrowY = projectile.position.y * simulation.pixelsToMeters

    let arrowPoly = new Polygon([
      new Point(adjustedArrowX - 2, adjustedArrowY + 2), //bottom left 
      new Point(adjustedArrowX + 2, adjustedArrowY + 2), //bottom right 
      new Point(adjustedArrowX + 2, adjustedArrowY - 2), //top right 
      new Point(adjustedArrowX - 2, adjustedArrowY - 2), //top left 
    ])

    let isTouching = false
    for (let poly of simulation.terrain) {
      if (poly.IsTouchingPolygon(arrowPoly)) {
        isTouching = true
        break
      }
    }

    //there is a 0% chance I'm doing arrow to arrow collision. 
    return isTouching
  }
}

/**
 * Create a projectile. 
 * @param { Projectile } projectile Projectile to create. 
 */
function CreateProjectile (projectile) {
  let id = simulation.uniqueId

  simulation.projectiles.set(id, projectile)

  simulation.uniqueId ++ 
}


/**
 * Calculates the last position of the arrow based on it's angle. 
 * @param { number } angle
 * @param { number } x Current x pos. 
 * @param { number } y Current y pos. 
 * @returns { Vector2d } Returns a coordinate. 
 */
function ArrowLastPosition (angle, x, y) {
  let deltaX = Math.cos(angle)
  let deltaY = Math.sin(angle)

  return new Vector2d(x + deltaX, y + deltaY)
}

/**
 * Calculates the arctan of the mouse to body in rad.  
 * @returns { number }
 */
function FindMouseToBodyAngle () {
  return Math.atan2(mouse.y - 800, mouse.x - 250)
}

/**
 * Sets the arrow so it's aimed correctly. 
 * @param { Projectile } projectile Arrow. 
 */
function UpdateArrowLastPositionBeforeRelease (projectile) {
  projectile.lastPosition.setTo(ArrowLastPosition(FindMouseToBodyAngle() + Math.PI, projectile.position.x, projectile.position.y))
}

/**
 * Calculates the final velocity of the arrow. All calcs are done in SI units. Assumes all energy is conserved.
 * **Note:** y component is flipped because the js canvas is flipped. 
 * @param { number } springConstant N/m
 * @param { number } stretch How far the bow is pulled from the equlibrium point in PX. 
 * @param { number } mass Mass of arrow in kg. 
 * @param { number } angle Angle of the arrow. 
 * @returns { Vector2d } Vector for x, y.
 */
function CalculateInitialVeclotiy (springConstant, stretch, mass, angle) {
  /**
   * Ee = Ek 
   * k*x^2/2 = mv^2/2
   * v = sqrt(k*x^2/m)
   */

  let finalSpeed = Math.sqrt(springConstant * Math.pow(stretch, 2) / mass)

  return new Vector2d(finalSpeed * Math.cos(angle), finalSpeed * Math.sin(angle))
}

/**
 * Draws the path the arrow is going to take. This is an approximate path. 
 * @param { CanvasRenderingContext2D } ctx 
 * @param { number } x x pos in meters
 * @param { number } y y pos in meters
 * @param { number } springConstant N/m
 * @param { number } stretch How far the bow is pulled from the equlibrium point in meters. 
 * @param { number } mass Mass of arrow in kg. 
 * @param { number } angle Angle of the arrow. 
 */
function CalculateAndDrawBowPath (ctx, x, y, springConstant, stretch, mass, angle) {
  ctx.setLineDash([5, 10]) //dotted lines
  ctx.lineWidth = 4
  ctx.strokeStyle = "#00f"
  ctx.fillStyle = "#00f"

  ctx.beginPath()
  ctx.moveTo(x * simulation.pixelsToMeters, y * simulation.pixelsToMeters)

  let velocity = CalculateInitialVeclotiy(springConstant, stretch, mass, angle)

  let delta = 0.05 //using 50 ms increments 
  //going to take steps so it uses lines instead of a curve. 
  for (let i = 0; i < 200; i++) {
    velocity.y += simulation.gravity * delta

    x += velocity.x * delta 
    y += velocity.y * delta 

    ctx.lineTo(x * simulation.pixelsToMeters, y * simulation.pixelsToMeters)

    //do hit detection check. Typescript would scream at me if I did this. 
    if (Projectile.HasCollided({ position: { x, y } }, true)) {
      break //it's touching the object so the path ends here. 
    }
  }

  ctx.stroke()
  ctx.setLineDash([]) //dotted lines

  //end point 
  ctx.beginPath()
  ctx.arc(x * simulation.pixelsToMeters, y * simulation.pixelsToMeters, 10, 0, Math.PI*2)
  ctx.fill()
}

/**
 * Bow string strectched from eqlulib in pixels 
 * @returns { number } Distance the bow string was streched from the equlibrium point in px. 
 */
function BowStretchDistance () {
  let distance = (performance.now() - simulation.bowDrag.startTime) / 20 

  if (distance/simulation.pixelsToMeters > simulation.maxBowStretch) {
    distance = simulation.maxBowStretch * simulation.pixelsToMeters
  }

  return distance
}