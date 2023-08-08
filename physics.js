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
  drawTime: 0,

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
    this.x = Number(x) ?? 0
    this.y = Number(y) ?? 0
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
   * Scale the vector up or down. 
   * @param { number } factor 
   */
  scale (factor) {
    this.x *= factor
    this.y *= factor
  }

  /**
   * @returns { Vector2d } another vector. 
   */
  clone () {
    return new Vector2d(this.x, this.y)
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

  /**
   * Distance to the other vector. 
   * @param { Vector2d } vector 
   * @returns { number } dist
   */
  distanceTo (vector) {
    return Math.hypot(this.x - vector.x, this.y - vector.y)
  }

  /**
   * Converts this to an array. 
   * @returns { [ number, number ] } (x, y)
   */
  toArray () {
    return [ this.x, this.y ]
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
    let point = Projectile.CollisionPoint(this, false) 
    if (point) {
      this.position = point
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
   * @returns { Vector2d | null } If the object is hitting. Vec is in meters not px. 
   */
  static CollisionPoint (projectile, ghostObject = false) {
    let travelLine = new LineSegment(projectile.lastPosition, projectile.position)

    //ground collision.
    if (projectile.position.y * simulation.pixelsToMeters > 921.6) {
      const groundY = 921.6 / simulation.pixelsToMeters
      //Move along the line back to where it intersects with the ground. Where the y value = the ground y value. 
      let t = (travelLine.point.y - groundY) / travelLine.dirVec.y

      //Subtract because it needs to go towards the current position from the last position, but the first argument of LineSegment is the point on the line which is set to lastPosition. 
      return new Vector2d(
        travelLine.point.x - travelLine.dirVec.x * t,
        groundY
      )
    }

    //object to terrain collision
    travelLine.scale(simulation.pixelsToMeters)

    /**
     * @type { Vector2d | null }
     */
    let intersectionPoint = null

    for (let terrain of simulation.terrain) {
      intersectionPoint = terrain.isTouchingLineSegment(travelLine, travelLine.point) //the point is the last position(first argument)

      if (intersectionPoint) {
        break
      }
    }
    
    if (intersectionPoint) {
      intersectionPoint.scale(1/simulation.pixelsToMeters)
    }

    //there is a 0% chance I'm doing arrow to arrow collision. 
    return intersectionPoint
  }
}

class LineSegment {
  /**
   * Creates a line segment. 
   * @param { Vector2d } point1 
   * @param { Vector2d } point2 
   */
  constructor (point1, point2) {
    this.point = new Vector2d(point1.x, point1.y)
    this.dirVec = new Vector2d(
      point2.x - point1.x,
      point2.y - point1.y
    )
  }

  /**
   * Point of intersection with another line, or null. 
   * @param { LineSegment } line 
   * @returns { Vector2d | null } vec2d for the intersection point. `null` is returned if the lines don't intersect or are coincident.
   */
  intersectionPoint (line) {
    //https://en.wikipedia.org/wiki/Line%E2%80%93line_intersection#Given_two_points_on_each_line_segment
    
    //Let this line's point be (x1, x2) and the direction vector be (dx, dy). Let the other line's point be (x3, y3) and dir vec be (mx, my)
    //bottom det = det [ (-dx) (-mx) ] = (dx)(my) - (dy)(mx)
    //                 [ (-dy) (-my) ]
    let bottomDet = ( this.dirVec.x * line.dirVec.y ) - (this.dirVec.y * line.dirVec.x)
    
    if (bottomDet == 0) {
      return null
    }

    //t's top det = det [ (x1-x3) (-mx) ] = (x1-x3)(-my) - (y1-y3)(-mx) = (x3-x1)(my) + (y1-y3)(mx)
    //                  [ (y1-y3) (-my) ]
    let tTopDet = (line.point.x-this.point.x)*line.dirVec.y + (this.point.y-line.point.y)*line.dirVec.x

    //Same as t's but the second column is flipped... kinda
    //u's top det = det [ (x1-x3) (-dx) ] = (x3-x1)(dy) + (y1-y3)(dx)
    //                  [ (y1-y3) (-dy) ]
    let uTopDet = (line.point.x-this.point.x)*this.dirVec.y + (this.point.y-line.point.y)*this.dirVec.x

    //Invert all of them, if negative. 
    if (bottomDet < 0) {
      tTopDet = -tTopDet
      uTopDet = -uTopDet
      bottomDet = -bottomDet
    }

    //Check if there isn't an intersection. Ie, when t and u are calculated they are not in the range [0, 1]
    if (!(0 <= tTopDet && tTopDet <= bottomDet) || !(0 <= uTopDet && uTopDet <= bottomDet)) {
      return null 
    }

    let t = tTopDet / bottomDet
    // let u = uTopDet / bottomDet

    let point = new Vector2d(
      this.point.x + t*this.dirVec.x,
      this.point.y + t*this.dirVec.y
    )

    return point
  }

  /**
   * This scales both the point and the direction vector by that factor. 
   * @param { number } factor 
   */
  scale (factor) {
    this.point.scale(factor)
    this.dirVec.scale(factor)
  }
}

class Terrain {
  /**
   * 
   * @param { {x: number, y: number}[] } points 
   */
  constructor (points) {
    /**
     * @type { LineSegment[] }
     */
    this.lines = []

    //Need at least 2 points
    if (points.length < 2) {
      return
    }

    //Loop from the first item to, and including, the second last. 
    for (let i = 0; i < points.length-1; i++) {
      this.lines.push(new LineSegment(points[i], points[i+1]))
    }

    //Push last for the loop around. 
    this.lines.push(new LineSegment(points[points.length-1], points[0]))
  }

  /**
   * Draws the terrain on canvas.
   * @param { CanvasRenderingContext2D } ctx
   */
  draw (ctx) {
    ctx.fillStyle = "#61ff8e"
    ctx.strokeStyle = "#00ff00"

    ctx.beginPath()
    ctx.moveTo(this.lines[0].point.x, this.lines[0].point.y)
    //Too lazy to remove the redundancy where it draws a point twice at the start of the line. 
    for (let line of this.lines) {
      let point = line.point
      ctx.lineTo(point.x, point.y)
    }
    ctx.lineTo(this.lines[0].point.x, this.lines[0].point.y)
    ctx.fill()
    ctx.stroke()
  }

  /**
   * If the line's touching the terrain. The line should be the projectile's path. 
   * @param { LineSegment } line 
   * @param { Vector2d } lastPosition this is the point we'll find an intersection closest to. 
   * @returns { Vector2d | null } Point of intersection if there is one, or none. There is a possibility of the line segment being coincident with one of the sides resulting in a null getting returned... 
   * @todo Optimize this using boxes so if the line's far away it doesn't need to check all the line segments. Also maybe fix the coincident line issue?  
   */
  isTouchingLineSegment (line, lastPosition) {
    let point = null
    let distance = Infinity

    for (let terrainLine of this.lines) {
      let otherPoint = terrainLine.intersectionPoint(line)
      if (!otherPoint) {
        continue
      }

      if (!point) {
        point = otherPoint
        distance = point.distanceTo(lastPosition)
        continue
      }

      //Both = find closest one. 
      let otherDist = otherPoint.distanceTo(lastPosition)
      if (otherDist < distance) {
        distance = otherDist
        point = otherPoint
      }
    }
    
    return point
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
 * @param { number } arrowAngle angle the arrow makes with the body(also the angle of the bow).
 */
function UpdateArrowLastPositionBeforeRelease (projectile, arrowAngle) {
  projectile.lastPosition.setTo(ArrowLastPosition(arrowAngle + Math.PI, projectile.position.x, projectile.position.y))
}

/**
 * Calculates the final velocity of the arrow. All calcs are done in SI units. Assumes all energy is conserved.
 * **Note:** y component is flipped because the js canvas is flipped. 
 * @param { number } springConstant N/m
 * @param { number } stretch How far the bow is pulled from the equilibrium point in PX. 
 * @param { number } mass Mass of arrow in kg. 
 * @param { number } angle Angle of the arrow. 
 * @returns { Vector2d } Vector for x, y.
 */
function CalculateInitialVelocity (springConstant, stretch, mass, angle) {
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
 * @param { number } stretch How far the bow is pulled from the equilibrium point in meters. 
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

  let velocity = CalculateInitialVelocity(springConstant, stretch, mass, angle)

  const delta = 0.05 //using 50 ms increments 
  let testProjectile = new Projectile(x, y, velocity.x, velocity.y, 1)
  
  //going to take steps so it uses lines instead of a curve. 
  for (let i = 0; i < 200; i++) {
    testProjectile.update(delta)

    let drawVec = testProjectile.position.clone()
    drawVec.scale(simulation.pixelsToMeters)
    ctx.lineTo(...drawVec.toArray())

    //It hit something. 
    if (!testProjectile.gravityEnabled) {
      break
    }

  }

  ctx.stroke()
  ctx.setLineDash([]) //no more dotted lines

  x = testProjectile.position.x
  y = testProjectile.position.y
  
  //end point 
  ctx.beginPath()
  ctx.arc(x * simulation.pixelsToMeters, y * simulation.pixelsToMeters, 10, 0, Math.PI*2)
  ctx.fill()
}

/**
 * Bow string stretched from equilibrium in pixels 
 * @returns { number } Distance the bow string was stretched from the equilibrium point in px. 
 */
function BowStretchDistance () {
  let distance = ((performance.now() - simulation.bowDrag.startTime) / simulation.drawTime) * 0.001 * simulation.maxBowStretch
  //the 0.001 is bc the perf time is in ms. 

  if (distance > simulation.maxBowStretch) {
    distance = simulation.maxBowStretch
  }

  distance *= simulation.pixelsToMeters 

  return distance
}