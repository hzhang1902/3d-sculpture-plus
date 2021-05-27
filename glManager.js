import { WebGLUtils } from './lib/webgl-utils.js'
import { initShaders } from './lib/initShaders'
import TextureHelper from './textures.js'
import {
  TileFactory,
  tetrahedron,
  cube
} from './shapes.js'

const materialSpecular = vec4(1.0, 1.0, 1.0, 1.0);
const materialShininess = 20.0;

const lightPosition = vec4(40.0, 10.0, 40.0, 0.0);
const lightDirection = vec3(-1, -0.2, -1.0);
const lightAmbient = vec4(0.2, 0.2, 0.2, 1.0);
const lightDiffuse = vec4(1.0, 1.0, 1.0, 1.0);
const lightSpecular = vec4(1.0, 1.0, 1.0, 1.0);
const specularProduct = mult(lightSpecular, materialSpecular);

const eye = vec3(25.0, 8.0, 25.0);
const at = vec3(0.0, 3.0, 0.0);
const up = vec3(0.0, 1.0, 0.0);

const tileSize = 5.0;

class GLManager {

  theta = 0;
  sigma = 0;
  alpha = 0;
  tileLoaded = false;

  esDifference = 0.001; //recommended value
  spotStart = 0.99;
  spotEnd = this.spotStart - this.esDifference;

  mode = "gouraud";
  texture = true;
  shadow = true;
  reflection = false;
  refraction = false;

  init() {
    //-----------------inits----------------------
    const canvas = document.getElementById("gl-canvas");

    const gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) { alert("WebGL isn't available"); }
    this.gl = gl;

    const program = initShaders(gl, "vertex-shader", "fragment-shader");
    this.program = program

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.useProgram(program);

    const textureHelper = new TextureHelper(gl, program)
    this.vTexCoord = gl.getAttribLocation(program, "vTexCoord");
    this.vPosition = gl.getAttribLocation(program, "vPosition");
    this.vNormal = gl.getAttribLocation(program, "vNormal");

    // ----------------pass params--------------------

    let viewMatrix = lookAt(eye, at, up);
    let viewMatrixLoc = gl.getUniformLocation(program, "viewMatrix");
    gl.uniformMatrix4fv(viewMatrixLoc, false, flatten(viewMatrix));

    let projectionMatrix = perspective(30, 1, 0.1, 100);
    let projectionMatrixLoc = gl.getUniformLocation(program, "projectionMatrix");
    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix));

    let viewPosition = gl.getUniformLocation(program, "viewPosition");
    gl.uniform3fv(viewPosition, eye);

    gl.uniform4fv(gl.getUniformLocation(program, "specularProduct"), flatten(specularProduct));
    gl.uniform4fv(gl.getUniformLocation(program, "lightAmbient"), flatten(lightAmbient));
    gl.uniform4fv(gl.getUniformLocation(program, "lightDiffuse"), flatten(lightDiffuse));
    gl.uniform4fv(gl.getUniformLocation(program, "lightPosition"), flatten(lightPosition));
    gl.uniform3fv(gl.getUniformLocation(program, "lightDirection"), flatten(lightDirection));
    gl.uniform1f(gl.getUniformLocation(program, "shininess"), materialShininess);

    // textures
    textureHelper.createATexture();
    textureHelper.configureCubeMap();

    const makePromise = (side) => {
      return new Promise(res => side.onload = () => { res() })
    }

    const stone = new Image();
    stone.crossOrigin = "";
    stone.src = "http://web.cs.wpi.edu/~jmcuneo/stones.bmp";
    const grass = new Image();
    grass.crossOrigin = "";
    grass.src = "http://web.cs.wpi.edu/~jmcuneo/grass.bmp";
    const uPromise = [stone, grass].map(txt => makePromise(txt))
    Promise.all(uPromise)
      .then(() => {
        textureHelper.configureTexture(stone, 0);
        textureHelper.configureTexture(grass, 1);
        this.tileLoaded = true
      })

    //left, front, right, back, toppu, bottom
    const sides = [];
    for (let i = 0; i < 6; i++) {
      sides.push(new Image());
    }
    const host = "http://web.cs.wpi.edu/~jmcuneo/env_map_sides";
    const fileNames = ["nvnegx.bmp", "nvposz.bmp", "nvposx.bmp", "nvnegz.bmp", "nvposy.bmp", "nvnegy.bmp"]
    sides.forEach((side, index) => {
      side.crossOrigin = "";
      side.src = `${host}/${fileNames[index]}`;
    });

    const iPromise = sides.map(side => makePromise(side))
    Promise.all(iPromise)
      .then(() => textureHelper.configureCubeMapImage(...sides))

    this.draw();
  }

  draw() {
    const { gl, program, mode, texture, shadow, reflection, refraction, spotStart, spotEnd } = this;
    const tileFactory = new TileFactory(tileSize);
    //-------------------build shapes------------------

    let goldBall = tetrahedron(mode, vec4(1, 0.6, 0, 1));
    let redBall = tetrahedron(mode, vec4(1, 0, 0, 1));
    let purpleBall = tetrahedron(mode, vec4(0.9, 0.0, 1, 1));
    let blueCube = cube(mode, vec4(0, 0, 1, 1));
    let greenCube = cube(mode, vec4(0, 1, 0, 1));
    let cyanCube = cube(mode, vec4(0, 1, 1, 1));
    let bgfloor = tileFactory.floor();
    let bgXYWall = tileFactory.XYWall();
    let bgYZWall = tileFactory.YZWall();

    //-------------------draw---------------------
    let modelMatrix = mat4();
    let modelMatrixLoc = gl.getUniformLocation(program, "modelMatrix");
    let enableTextureLoc = gl.getUniformLocation(program, "enableTexture");
    let typeLoc = gl.getUniformLocation(program, "type");
    let currentTextureLoc = gl.getUniformLocation(program, "currentTexture");
    let enableReflectionLoc = gl.getUniformLocation(program, "enableReflection");
    let enableRefractionLoc = gl.getUniformLocation(program, "enableRefraction");


    const drawShapeWithRef = (shape) => {
      if (reflection || refraction) {
        gl.uniform1i(enableTextureLoc, 1);
      }
      this.drawShape(shape);
      gl.uniform1i(enableTextureLoc, 0);
    }

    const drawShadowOnPlanes = (shape) => {
      if (!shadow) return;
      gl.uniform1i(typeLoc, 3);
      this.drawShadow(shape);
      gl.uniform1i(typeLoc, 0);
    }

    const drawHierachy = () => {

      gl.uniform1i(typeLoc, 0);
      gl.uniform1f(gl.getUniformLocation(program, "spotStart"), spotStart);
      gl.uniform1f(gl.getUniformLocation(program, "spotEnd"), spotEnd);


      gl.uniform1i(enableReflectionLoc, reflection ? 1 : 0);
      gl.uniform1i(enableRefractionLoc, refraction ? 1 : 0);
      gl.uniform1i(currentTextureLoc, 2);

      const lines = [];
      const stack = [];
      //1
      stack.push(modelMatrix);
      modelMatrix = mult(modelMatrix, translate(8, 8, 8));
      modelMatrix = mult(modelMatrix, rotate(this.theta, vec3(0, 1, 0)));

      gl.uniformMatrix4fv(modelMatrixLoc, false, flatten(modelMatrix));
      drawShapeWithRef(goldBall);
      drawShadowOnPlanes(goldBall);


      lines.push(
        mult(modelMatrix, vec4(0.0, 0.0, 0.0, 1.0)),
        mult(modelMatrix, vec4(0, -1.5, 0, 1)));
      lines.push(
        mult(modelMatrix, vec4(-3, -1.5, 0, 1)),
        mult(modelMatrix, vec4(3, -1.5, 0, 1)));
      lines.push(
        mult(modelMatrix, vec4(-3, -1.5, 0, 1)),
        mult(modelMatrix, vec4(-3, -3, 0, 1)));
      lines.push(
        mult(modelMatrix, vec4(3, -1.5, 0, 1)),
        mult(modelMatrix, vec4(3, -3, 0, 1)));

      //2
      stack.push(modelMatrix)
      modelMatrix = mult(modelMatrix, translate(-3, -3, 0));
      modelMatrix = mult(modelMatrix, rotate(this.sigma, vec3(0, 1, 0)));
      gl.uniformMatrix4fv(modelMatrixLoc, false, flatten(modelMatrix));
      drawShapeWithRef(blueCube);
      drawShadowOnPlanes(blueCube);


      lines.push(
        mult(modelMatrix, vec4(0.0, 0.0, 0.0, 1.0)),
        mult(modelMatrix, vec4(0, -1.5, 0, 1)));
      lines.push(
        mult(modelMatrix, vec4(-2, -1.5, 0, 1)),
        mult(modelMatrix, vec4(2, -1.5, 0, 1)));
      lines.push(
        mult(modelMatrix, vec4(-2, -1.5, 0, 1)),
        mult(modelMatrix, vec4(-2, -3, 0, 1)));
      lines.push(
        mult(modelMatrix, vec4(2, -1.5, 0, 1)),
        mult(modelMatrix, vec4(2, -3, 0, 1)));

      //3
      stack.push(modelMatrix)
      modelMatrix = mult(modelMatrix, translate(-2, -3, 0));
      modelMatrix = mult(modelMatrix, rotate(this.alpha, vec3(0, 1, 0)));

      gl.uniformMatrix4fv(modelMatrixLoc, false, flatten(modelMatrix));
      drawShapeWithRef(redBall);
      drawShadowOnPlanes(redBall);

      modelMatrix = stack.pop();

      stack.push(modelMatrix)
      modelMatrix = mult(modelMatrix, translate(2, -3, 0));
      modelMatrix = mult(modelMatrix, rotate(this.alpha, vec3(0, 1, 0)));
      gl.uniformMatrix4fv(modelMatrixLoc, false, flatten(modelMatrix));
      drawShapeWithRef(purpleBall);
      drawShadowOnPlanes(purpleBall);

      modelMatrix = stack.pop();
      //2
      modelMatrix = stack.pop();

      //2
      stack.push(modelMatrix)
      modelMatrix = mult(modelMatrix, translate(3, -3, 0));
      modelMatrix = mult(modelMatrix, rotate(this.sigma, vec3(0, 1, 0)));

      gl.uniformMatrix4fv(modelMatrixLoc, false, flatten(modelMatrix));
      drawShapeWithRef(redBall);
      drawShadowOnPlanes(redBall);

      lines.push(
        mult(modelMatrix, vec4(0.0, 0.0, 0.0, 1.0)),
        mult(modelMatrix, vec4(0, -1.5, 0, 1)));
      lines.push(
        mult(modelMatrix, vec4(-2, -1.5, 0, 1)),
        mult(modelMatrix, vec4(2, -1.5, 0, 1)));
      lines.push(
        mult(modelMatrix, vec4(-2, -1.5, 0, 1)),
        mult(modelMatrix, vec4(-2, -3, 0, 1)));
      lines.push(
        mult(modelMatrix, vec4(2, -1.5, 0, 1)),
        mult(modelMatrix, vec4(2, -3, 0, 1)));

      //3
      stack.push(modelMatrix)
      modelMatrix = mult(modelMatrix, translate(-2, -3, 0));
      modelMatrix = mult(modelMatrix, rotate(this.alpha, vec3(0, 1, 0)));

      gl.uniformMatrix4fv(modelMatrixLoc, false, flatten(modelMatrix));
      drawShapeWithRef(cyanCube);
      drawShadowOnPlanes(cyanCube);

      modelMatrix = stack.pop();

      //3
      stack.push(modelMatrix)
      modelMatrix = mult(modelMatrix, translate(2, -3, 0));
      modelMatrix = mult(modelMatrix, rotate(this.alpha, vec3(0, 1, 0)));

      gl.uniformMatrix4fv(modelMatrixLoc, false, flatten(modelMatrix));
      drawShapeWithRef(greenCube);
      drawShadowOnPlanes(greenCube);

      modelMatrix = stack.pop();

      //2
      modelMatrix = stack.pop();

      //1
      modelMatrix = stack.pop();

      //let vertex shader treat lines differently
      gl.uniform1i(typeLoc, 1);
      this.drawLines(lines);

      this.theta += 0.5;
      this.sigma -= 0.8;
      this.alpha += 0.8;
    }


    const drawWallsAndFloor = (XYWall, YZWall, floor) => {
      gl.uniform1i(typeLoc, 2);
      if (texture && this.tileLoaded) {
        gl.uniform1i(enableTextureLoc, 1);
        gl.uniform1i(currentTextureLoc, 0);
      } else {
        gl.uniform1i(enableTextureLoc, 0);
      }
      // XY
      gl.uniform4fv(gl.getUniformLocation(program, "uColor"), vec4(0.0, 0.0, 1.0, 1.0));
      for (let i = 0; i < 5; i++) {
        let nextTileX = mult(modelMatrix, translate(i * tileSize, 0, 0));
        gl.uniformMatrix4fv(modelMatrixLoc, false, flatten(nextTileX));
        this.drawBackground(XYWall);

        for (let j = 0; j < 5; j++) {
          let nextTileY = mult(nextTileX, translate(0, j * tileSize, 0));
          gl.uniformMatrix4fv(modelMatrixLoc, false, flatten(nextTileY));
          this.drawBackground(XYWall);
        }
      }

      // YZ
      for (let i = 0; i < 5; i++) {
        let nextTileZ = mult(modelMatrix, translate(0, 0, i * tileSize));
        gl.uniformMatrix4fv(modelMatrixLoc, false, flatten(nextTileZ));
        this.drawBackground(YZWall);

        for (let j = 0; j < 5; j++) {
          let nextTileY = mult(nextTileZ, translate(0, j * tileSize, 0));
          gl.uniformMatrix4fv(modelMatrixLoc, false, flatten(nextTileY));
          this.drawBackground(YZWall);
        }
      }

      gl.uniform1i(currentTextureLoc, 1);
      gl.uniform4fv(gl.getUniformLocation(program, "uColor"), vec4(0.5, 0.5, 0.5, 1.0));
      // floor 
      for (let i = 0; i < 5; i++) {
        let nextTileX = mult(modelMatrix, translate(i * tileSize, 0, 0));
        gl.uniformMatrix4fv(modelMatrixLoc, false, flatten(nextTileX));
        this.drawBackground(floor);

        for (let j = 0; j < 5; j++) {
          let nextTileZ = mult(nextTileX, translate(0, 0, j * tileSize));
          gl.uniformMatrix4fv(modelMatrixLoc, false, flatten(nextTileZ));
          this.drawBackground(floor);
        }
      }
      gl.uniform1i(enableTextureLoc, 0);
    }

    const drawScene = () => {
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      drawHierachy()
      // if (this.tileLoaded) {
      drawWallsAndFloor(bgXYWall, bgYZWall, bgfloor);
      // }
      this.currentAnimationRequest = requestAnimationFrame(drawScene);
    }

    drawScene();
  }

  drawShape(shape) {
    const { gl, program } = this;
    let pointsArray = shape.points;
    let normalsArray = shape.normals;
    let texArray = shape.texCoords;
    let index = pointsArray.length;

    gl.deleteBuffer(this.vBuffer);
    gl.deleteBuffer(this.nBuffer);
    gl.deleteBuffer(this.tBuffer);

    // points
    this.vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);

    this.vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(this.vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(this.vPosition);

    // normal
    this.nBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.nBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(normalsArray), gl.STATIC_DRAW);

    this.vNormal = gl.getAttribLocation(program, "vNormal");
    gl.vertexAttribPointer(this.vNormal, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(this.vNormal);

    this.tBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.tBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(texArray), gl.STATIC_DRAW);

    this.vTexCoord = gl.getAttribLocation(program, "vTexCoord");
    gl.vertexAttribPointer(this.vTexCoord, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(this.vTexCoord);

    gl.uniform4fv(gl.getUniformLocation(program, "uColor"), shape.color);

    for (let i = 0; i < index; i += 3) {
      gl.drawArrays(gl.TRIANGLE_FAN, i, 3);
    }
  }

  drawShadow(shape) {
    const { gl, program } = this;
    let pointsArray = shape.points;
    let index = pointsArray.length;

    gl.deleteBuffer(this.vBuffer);
    // points
    this.vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);

    this.vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(this.vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(this.vPosition);

    for (let i = 0; i < index; i += 3) {
      gl.drawArrays(gl.TRIANGLE_FAN, i, 3);
    }
  }

  drawLines(linePoints) {

    const { gl, program } = this;
    gl.deleteBuffer(this.vBuffer);
    // points
    this.vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(linePoints), gl.STATIC_DRAW);

    this.vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(this.vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(this.vPosition);

    gl.drawArrays(gl.LINES, 0, linePoints.length);
  }

  drawBackground(background) {
    const { gl, program } = this;
    gl.deleteBuffer(this.vBuffer);
    gl.deleteBuffer(this.tBuffer);
    // points
    this.vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(background.points), gl.STATIC_DRAW);

    this.vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(this.vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(this.vPosition);

    this.tBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.tBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(background.texCoords), gl.STATIC_DRAW);

    this.vTexCoord = gl.getAttribLocation(program, "vTexCoord");
    gl.vertexAttribPointer(this.vTexCoord, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(this.vTexCoord);

    gl.drawArrays(gl.TRIANGLE_FAN, 0, background.texCoords.length);
  }
}


export default GLManager;