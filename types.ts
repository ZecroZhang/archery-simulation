///<reference path="physics.js"/>

interface Simulation {
  gravity: number
  pixelsToMeters: number
  uniqueId: number

  projectiles: Map<number, Projectile>
  terrain: Terrain[]

  maxBowStretch: number
  arrowMass: number
  bowSpringConstant: number
  drawTime: number

  //settings
  showTrajectory: boolean

  //if bow shooting or terrain drawing 
  drawingTerrain: boolean
  terrainAssemble: Vector2d[]

  bowDrag: {
    startTime: number, 
    isAiming: boolean, 
    projectile: Projectile | null
  }
}

type NewValueFunction = (input: number) => void
type UpdateValueFunction = (input: number) => void 