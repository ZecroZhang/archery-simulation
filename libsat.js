//from my separating axis theorem project - I'm going to replace this later. 

"use strict"

class Point {
  /**
   * Generates a point object for the hit detection engine to use.
   * @param { [ number, number ] | Point | Number } point Array [ x, y ] or another point class { x, y } or a number(x). 
   * @param { number | undefined } pointY Y position of the point. Only used if a number was entered for "point"
   */
  constructor (point, pointY) {
    if (Array.isArray(point)) {//Input is an array
      this.x = point[0]
      this.y = point[1]

    } else if (!isNaN(point)) { //Input is a number. 
      this.x = Number (point)
      this.y = Number(pointY)

    } else { //Input is another Point class/object. 
      this.x = point.x
      this.y = point.y
    }
  }
}

//NOTE: This engine works with points counterclockwise. Make sure all entered points for polygons are in counterclockwise draw order.
class Polygon {
  /**
   * Polygon class used to detect if it's hitting another polygon.
   * @param { Array<Point> } points Array of point classes or objects with property x and y. Imagine connecting all the points entered. That is what the polygon is calculating. Also must be a convex polygon. 
   */
  constructor (points = []) {
    //Make sure there are enough points inputted. 
    if (points.length < 2) throw new Error(`There must be at least two points to for a polygon.`)
    
    //Creates the properties of the polygon class
    /**
     * @type { Array<Point> }
     */
    this.points = points
    /**
     * @type { Array<Point> } The points represent edge vectors in this case. 
     */
    this.edges = []

    //Repeat for each side and pushes the side vector. The last side is done outside the for loop. Note that the vector is an object with x,y instead of an array. This is done for consistency.
    for (var c = 0; c < this.points.length-1; c++) {
      this.#PushEdge(c, c+1)
    }
    this.#PushEdge(this.points.length-1, 0)

    /**
     * @type { number } X position of the center of polygon. 
     */
    this.x = 0
    /**
     * @type { number } Y position of the center of the polygon. 
     */
    this.y = 0
    /**
     * @type { number } The amount of sides the polygon has. 
     */
    this.sides = points.length
  }

  /**
   * Calculates an edge and pushes it into the list of edges. 
   * @param { number } no1 The position of the first point in the array of points. 
   * @param { number } no2 Position of the second item.
   */
  #PushEdge (no1, no2) {
    //Push the edge vector.
    this.edges.push({
      x: this.points[no1].x - this.points[no2].x,
      y: this.points[no1].y - this.points[no2].y
    })
  }

  /**
   * Checks if this polygon is touching another polygon. 
   * @param { Polygon } otherPolygon 
   * @returns { boolean } If this polygon is ttouching the other polygon .
   */
  IsTouchingPolygon(otherPolygon) {
    //The sides of both polygons needs to all be tested(unless a match is detected). Think of this as shining a light perpendicular to the sides of the polygons and testing each if there is a shadow in between. 
    return !(Polygon.#IsNotTouchingPolygon(this, otherPolygon) || Polygon.#IsNotTouchingPolygon(otherPolygon, this))
  }

  /**
   * Checks if two polygons are touching. 
   * @param { Polygon } polygon1 
   * @param { Polygon } polygon2 
   * @returns { boolean } If the two polygons are touching. 
   */
  static PolygonsAreTouching(polygon1, polygon2) {
    return !(Polygon.#IsNotTouchingPolygon(polygon1, polygon2) || Polygon.#IsNotTouchingPolygon(polygon2, polygon1))
  }

  /**
   * If a polygon is not touching. Private since the point is to check for if it IS touching. 
   * @param { Polygon } polygon1 
   * @param { Polygon } polygon2 
   * @returns { boolean } If the polygons are not touching. 
   */
  static #IsNotTouchingPolygon(polygon1, polygon2) {
    //Runs through every side on this polygon(polygon1).
    for (var edge of polygon1.edges) {
      //Generates a perpendicular edge vector. (x, y) => (-y, x)
      var perpendicular = { x: -edge.y, y: edge.x }

      //Min/max dot products of the first polygon's points.
      var max1 = -Infinity
      var min1 = Infinity
      for (var point of polygon1.points) {
        //dot product projection
        var project = DotProduct(point)

        //Unfortunately needs two if statements instead of an elseif 
        if (project > max1) max1 = project
        if (project < min1) min1 = project
      }

      //Repeat above process for the other shape's edges. 
      var max2 = -Infinity
      var min2 = Infinity
      for (var point of polygon2.points) {
        var project = DotProduct(point)

        if (project > max2) max2 = project
        if (project < min2) min2 = project
      }
      
      //This if statement checks if there is a gap. If yes then the shapes aren't touching and returns true. Otherwise it keeps running to check the other sides. +Also, I don't like this if statement, remind me to fix it later.
      if (!((min2 >= min1 && min2 <= max1) || (max2 <= max1 && max2 >= min1) || (min1 >= min2 && min1 <= max2) || (max1 <= max2 && max1 >= min2))) {
        return true
      }

      /**
       * Calculates the dot product of the perpendicular edge vector and the point vector.
       * @param { Point } point
       * @returns { number } Dot product. 
       */
      function DotProduct (point) {
        return point.x*perpendicular.x + point.y*perpendicular.y
      }
    }

    //We ran through each edge and there were no gaps. This means the two polygons are touching. 
    return false
  }
}