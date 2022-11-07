///<reference path="physics.js"/>
///<reference path="libsat.js"/>

interface Simulation {
  gravity: number
  pixelsToMeters: number
  uniqueId: number

  projectiles: Map<number, Projectile>
  terrain: Polygon[]

  maxBowStretch: number
  arrowMass: number
  bowSpringConstant: number

  //settings
  showTrajectory: boolean

  //if bow shooting or terrain drawing 
  drawingTerrain: boolean
  terrainAssemble: Point[]

  bowDrag: {
    startTime: number, 
    isAiming: boolean, 
    projectile: Projectile | null
  }
}

type NewValueFunction = (input: number) => void
type UpdateValueFunction = (input: number) => void 