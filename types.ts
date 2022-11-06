///<reference path="physics.js"/>

interface Simulation {
  gravity: number
  pixelsToMeters: number
  uniqueId: number

  projectiles: Map<number, Projectile>

  maxBowStretch: number
  arrowMass: number
  bowSpringConstant: number

  //settings
  showTrajectory: boolean

  bowDrag: {
    startTime: number, 
    isAiming: boolean, 
    projectile: Projectile | null
  }
}

type NewValueFunction = (input: number) => void
type UpdateValueFunction = (input: number) => void 