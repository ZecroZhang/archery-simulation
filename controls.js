///<reference path="physics.js"/>
///<reference path="index.js"/>
///<reference path="types.ts"/>
"use strict"

//keyboard controls. 
document.addEventListener("keydown", event => {
  //for ease of use space will be treated like a mouse
  if (event.code == "Space") {
    HandleMouseDown()
  }
})
document.addEventListener("keyup", event => {
  //for ease of use space will be treated like a mouse
  if (event.code == "Space") {
    HandleMouseUp()
  }
})

/**
 * Mouse position relative to the 1024x1024 canvas
 */
const mouse = {
  x: 0,
  y: 0,
  isDown: false
}

document.addEventListener("mouseup", HandleMouseUp)
document.addEventListener("mousedown", HandleMouseDown)

document.addEventListener("mousemove", event => {
  let canvasBoundingBox = canvas.getBoundingClientRect()

  mouse.x = (event.pageX - canvasBoundingBox.left) / canvasBoundingBox.width * 1024
  mouse.y = (event.pageY - canvasBoundingBox.top) / canvasBoundingBox.height * 1024

  //check if terrain is being drawn. 
  if (mouse.isDown && simulation.drawingTerrain) {
    simulation.terrainAssemble.push(new Vector2d(mouse.x, mouse.y))
  }
})


function HandleMouseDown () {
  //ignore if it isn't in the canvas. 
  if (!IsMouseInCanvas()) {
    return
  }

  mouse.isDown = true 

  //mouseup didn't register or something. 
  if (simulation.bowDrag.projectile !== null) return 

  if (simulation.drawingTerrain) {
    simulation.terrainAssemble.push(new Vector2d(mouse.x, mouse.y))
  } else {
    //Start the bow drag.
    simulation.bowDrag.isAiming = true
    simulation.bowDrag.startTime = performance.now()

    let projectile = new Projectile(250 / simulation.pixelsToMeters, 800 / simulation.pixelsToMeters, 0, 0, 1)
    projectile.gravityEnabled = false

    //so it's oriented correctly 
    UpdateArrowLastPositionBeforeRelease(projectile)
    CreateProjectile(projectile)

    simulation.bowDrag.projectile = projectile
  }
}

function HandleMouseUp () {
  mouse.isDown = false

  //shoot the arrow.
  let arrow = simulation.bowDrag.projectile
  if (arrow !== null) {
    let angle = FindMouseToBodyAngle()

    arrow.gravityEnabled = true
    arrow.velocity.setTo(CalculateInitialVelocity(simulation.bowSpringConstant, BowStretchDistance()/simulation.pixelsToMeters, simulation.arrowMass, angle))

    simulation.bowDrag.projectile = null
  }

  //complete the terrain 
  if (simulation.drawingTerrain && simulation.terrainAssemble.length > 3) {
    simulation.terrain.push(new Terrain(simulation.terrainAssemble))

    //remove the assembly terrain 
    simulation.terrainAssemble = []
  }
}


//set up the sliders
SetUpSlider("springConstant", 100, 500, 350, (input) => {
  simulation.bowSpringConstant = input
})
SetUpSlider("maxDrawDistance", 0.1, 1, 0.4, (input) => {
  simulation.maxBowStretch = input
})
SetUpSlider("arrowMass", 0.001, 0.3, 0.0162, (input) => {
  simulation.arrow = input
})
SetUpSlider("gravity", 0, 40, 9.8, (input) => {
  simulation.gravity = input
})
SetUpSlider("drawTime", 0, 4, 0.25, (input) => {
  simulation.drawTime = input
})

document.getElementById("trajectoryCheckBox").addEventListener("click", event => {
  /**
   * @type { boolean }
   */
  let isChecked = Boolean(event.target.checked)

  simulation.showTrajectory = isChecked
})

/**
 * Sets up a slider. Assumes the html elements are created for it. 
 * @param { string } elementId The is the general id of the elements. The text input should be called "`elementId`TextInput" and the slider element should be called "`elementId`SliderInput"
 * @param { number } sliderMin The min value the slider can go to.
 * @param { number } sliderMax The max value the slider can go to. 
 * @param { number } defaultValue The default value of the slider when the simulation starts. 
 * @param { NewValueFunction } SetNewValue A function to call to update the value of the simulation. Slider and text input sync is auto handled by the function. 
 * @returns { UpdateValueFunction } Function to change both the slider, text input and call the SetNewValue
 */
function SetUpSlider (elementId, sliderMin, sliderMax, defaultValue, SetNewValue) {
  /**
   * @type { HTMLInputElement }
   */
  let sliderInput = document.getElementById(`${elementId}SliderInput`)

  //slider settings and stuff
  let sliderRange = sliderMax - sliderMin
  let sliderRatio = sliderRange / 1000 //how much a tick of the slider is. 
  sliderInput.setAttribute("min", 0)
  sliderInput.setAttribute("max", 1000)

  /**
   * @type { HTMLTextAreaElement }
   */
  let textInput = document.getElementById(`${elementId}TextInput`)

  sliderInput.addEventListener("input", () => {
    let adjustedValue = FromSliderValue(Number(sliderInput.value))

    textInput.value = Math.round(adjustedValue * 1000)/1000
    SetNewValue(adjustedValue)
  })

  textInput.addEventListener("change", () => {
    let value = Number(textInput.value)

    //return if the value isn't a number. 
    if (isNaN(value)) {
      return
    }
    
    //update the slider
    sliderInput.value = ToSliderValue(value)

    SetNewValue(value)
  })

  //set the default values 
  textInput.value = defaultValue
  sliderInput.value = ToSliderValue(defaultValue)

  /**
   * Converts a input number to the slider value. 
   * @param { number } input 
   * @returns { number } Slider value. 
   */
  function ToSliderValue (input) {
    return (input - sliderMin) / sliderRatio
  }

  /**
   * Undoes what ToSliderValue does. 
   * @param { number } input
   * @returns { number } original value. 
   */
  function FromSliderValue (input) {
    return input * sliderRatio + sliderMin

  }

  /**
   * Updates both the slider and the function.
   * @param { number } input New value to update to based on actual values. 
   */
  function UpdateValueFunction (input) {
    let sliderValue = ToSliderValue(input)

    textInput.value = Math.round(input * 1000)/1000
    sliderInput.value = sliderValue

    SetNewValue(input)
  }
  
  return UpdateValueFunction
}

/**
 * @returns { boolean } If the mouse is inside the canvas or not. 
 */
function IsMouseInCanvas () {
  //the mouse position is scaled to the canvas which is nice.

  return mouse.x >= 0 && mouse.x <= 1024 && mouse.y >= 0 && mouse.y <= 1024
}

//additional buttons 
/**
 * @type { HTMLButtonElement }
 */
const drawTerrainButton = document.getElementById("drawTerrainButton")
drawTerrainButton.addEventListener("click", () => {
  EnableDisableTerrainDrawing()
})

function EnableDisableTerrainDrawing () {
  if (simulation.drawingTerrain) {
    //stop it 
    drawTerrainButton.innerText = "Draw Terrain"
    simulation.drawingTerrain = false
  } else {
    drawTerrainButton.innerText = "Stop Drawing Terrain"
    simulation.drawingTerrain = true
  }
}