var canvas;
var gl;
var program;
var currentAnimationRequest;
var theta = 0;
var sigma = 0;
var alpha = 0;

var lightPosition = vec4(40.0, 10.0, 40.0, 0.0);
var lightDirection = vec3(-1, -0.2, -1.0);
var lightAmbient = vec4(0.2, 0.2, 0.2, 1.0 );
var lightDiffuse = vec4( 1.0, 1.0, 1.0, 1.0 );
var lightSpecular = vec4( 1.0, 1.0, 1.0, 1.0 );

var materialSpecular = vec4( 1.0, 1.0, 1.0, 1.0 );
var materialShininess = 20.0;

var specularProduct = mult(lightSpecular, materialSpecular);


var eye = vec3(25.0, 8.0, 25.0);
var at = vec3(0.0, 3.0, 0.0);
var up = vec3(0.0, 1.0, 0.0);

let tileSize = 5.0;

var texCoord = [
vec2(1.0, 0.0),
vec2(0.0, 0.0),
vec2(0.0, 1.0),
vec2(1.0, 1.0)
];

var vertices = [
vec4( 0.0, tileSize, 0.0, 1.0 ),
vec4( tileSize,  tileSize,  0.0, 1.0 ),
vec4(  tileSize,  0.0,  0.0, 1.0 ),
vec4(  0.0, 0.0,  0.0, 1.0 ),
vec4( 0.0, tileSize, tileSize, 1.0 ),
vec4( 0.0,  0.0, tileSize, 1.0 ),
vec4(  tileSize,  0.0, tileSize, 1.0 )
];

let grass, stone;
let left, front, right, back, toppu, bottom;

let vBuffer, tBuffer, nBuffer;
let vTexCoord, vPosition, vNormal;

window.onload = init;

function init() {
    //-----------------inits----------------------
    canvas = document.getElementById( "gl-canvas" );

    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    gl.viewport( 0, 0, canvas.width, canvas.height );

    gl.clearColor( 0.0, 0.0, 0.0, 1.0 );

    gl.enable(gl.DEPTH_TEST);

    program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );


    // ----------------pass params--------------------

    let viewMatrix = lookAt(eye, at , up);
    let viewMatrixLoc = gl.getUniformLocation( program, "viewMatrix" );
    gl.uniformMatrix4fv(viewMatrixLoc, false, flatten(viewMatrix));

    let projectionMatrix = perspective(30, 1, 0.1, 100);
    let projectionMatrixLoc = gl.getUniformLocation( program, "projectionMatrix" );
    gl.uniformMatrix4fv(projectionMatrixLoc, false, flatten(projectionMatrix) );

    let viewPosition = gl.getUniformLocation(program, "viewPosition");
    gl.uniform3fv(viewPosition, eye);

    gl.uniform4fv(gl.getUniformLocation(program,
        "specularProduct"), flatten(specularProduct));
    gl.uniform4fv(gl.getUniformLocation(program,
        "lightAmbient"), flatten(lightAmbient));
    gl.uniform4fv(gl.getUniformLocation(program,
        "lightDiffuse"), flatten(lightDiffuse));
    gl.uniform4fv(gl.getUniformLocation(program,
        "lightPosition"), flatten(lightPosition));
    gl.uniform3fv(gl.getUniformLocation(program,
        "lightDirection"), flatten(lightDirection));
    gl.uniform1f(gl.getUniformLocation(program,
        "shininess"), materialShininess);

    createATexture();
    configureCubeMap();

    stone = new Image();
    stone.crossOrigin = "";
    stone.src = "http://web.cs.wpi.edu/~jmcuneo/stones.bmp";
    stone.onload = function() {
        configureTexture(stone, 0);
    }
    grass = new Image();
    grass.crossOrigin = "";
    grass.src = "http://web.cs.wpi.edu/~jmcuneo/grass.bmp";
    grass.onload = function() {
        configureTexture(grass, 1);
    }

    left = new Image();
    front = new Image();
    right = new Image();
    back = new Image();
    toppu = new Image();
    bottom = new Image();

    left.crossOrigin = "";
    front.crossOrigin = "";
    right.crossOrigin = "";
    back.crossOrigin = "";
    toppu.crossOrigin = "";
    bottom.crossOrigin = "";

    left.src = "http://web.cs.wpi.edu/~jmcuneo/env_map_sides/nvnegx.bmp";
    front.src = "http://web.cs.wpi.edu/~jmcuneo/env_map_sides/nvposz.bmp";
    right.src = "http://web.cs.wpi.edu/~jmcuneo/env_map_sides/nvposx.bmp";
    back.src = "http://web.cs.wpi.edu/~jmcuneo/env_map_sides/nvnegz.bmp";
    toppu.src = "http://web.cs.wpi.edu/~jmcuneo/env_map_sides/nvposy.bmp";
    bottom.src = "http://web.cs.wpi.edu/~jmcuneo/env_map_sides/nvnegy.bmp";

    let configured = false;

    var configureAfterAllDone = () => {
        if (left.complete && front.complete && right.complete && 
            back.complete && toppu.complete && bottom.complete && 
            !configured) {
            configureCubeMapImage(left, front, right, back, toppu, bottom);
            configured = true;
        }
    }

    left.onload = configureAfterAllDone;
    front.onload = configureAfterAllDone;
    right.onload = configureAfterAllDone;
    back.onload = configureAfterAllDone;
    toppu.onload = configureAfterAllDone;
    bottom.onload = configureAfterAllDone;

    draw();
}

function draw () {
    //-------------------build shapes------------------

    let goldBall = tetrahedron(mode, vec4(1,0.6,0,1));
    let redBall = tetrahedron(mode, vec4(1,0,0,1));
    let purpleBall = tetrahedron(mode, vec4(0.9,0.0,1,1));
    let blueCube = cube(mode, vec4(0,0,1,1));
    let greenCube = cube(mode, vec4(0,1,0,1));
    let cyanCube = cube(mode, vec4(0,1,1,1));
    let bgfloor = floor();
    let bgXYWall = XYWall();
    let bgYZWall = YZWall();

    //-------------------draw---------------------
    let modelMatrix = mat4();
    let modelMatrixLoc = gl.getUniformLocation( program, "modelMatrix" );
    let enableTextureLoc = gl.getUniformLocation(program, "enableTexture");
    let typeLoc = gl.getUniformLocation(program, "type");
    let currentTextureLoc = gl.getUniformLocation(program, "currentTexture");
    let enableReflectionLoc = gl.getUniformLocation(program, "enableReflection");
    let enableRefractionLoc = gl.getUniformLocation(program, "enableRefraction");
    vTexCoord = gl.getAttribLocation( program, "vTexCoord" );
    vPosition = gl.getAttribLocation( program, "vPosition");
    vNormal = gl.getAttribLocation( program, "vNormal");

    drawScene();

    function drawScene () {
        gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        drawHierachy()
        if (grass.complete && stone.complete) {
            drawWallsAndFloor(bgXYWall, bgYZWall, bgfloor);
        }
        currentAnimationRequest = requestAnimationFrame(drawScene);
    }


    function drawHierachy() {

        gl.uniform1i(typeLoc, 0);
        gl.uniform1f(gl.getUniformLocation(program, "spotStart"), spotStart);
        gl.uniform1f(gl.getUniformLocation(program, "spotEnd"), spotEnd);


        gl.uniform1i(enableReflectionLoc, reflection? 1 : 0);
        gl.uniform1i(enableRefractionLoc, refraction? 1 : 0);
        gl.uniform1i(currentTextureLoc, 2);

        lines = [];
        stack = [];
        //1
        stack.push(modelMatrix);
        modelMatrix = mult(modelMatrix, translate(8,8,8));
        modelMatrix = mult(modelMatrix, rotate(theta, vec3(0,1,0)));

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
            modelMatrix = mult(modelMatrix, translate(-3,-3,0));
            modelMatrix = mult(modelMatrix, rotate(sigma, vec3(0,1,0)));
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
                modelMatrix = mult(modelMatrix, translate(-2,-3,0));
                modelMatrix = mult(modelMatrix, rotate(alpha, vec3(0,1,0)));

                gl.uniformMatrix4fv(modelMatrixLoc, false, flatten(modelMatrix));
                drawShapeWithRef(redBall);
                drawShadowOnPlanes(redBall);

                modelMatrix = stack.pop();

                stack.push(modelMatrix)
                modelMatrix = mult(modelMatrix, translate(2,-3,0));
                modelMatrix = mult(modelMatrix, rotate(alpha, vec3(0,1,0)));
                gl.uniformMatrix4fv(modelMatrixLoc, false, flatten(modelMatrix));
                drawShapeWithRef(purpleBall);
                drawShadowOnPlanes(purpleBall);

                modelMatrix = stack.pop();
            //2
            modelMatrix = stack.pop();

            //2
            stack.push(modelMatrix)
            modelMatrix = mult(modelMatrix, translate(3,-3,0));
            modelMatrix = mult(modelMatrix, rotate(sigma, vec3(0,1,0)));

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
                modelMatrix = mult(modelMatrix, translate(-2,-3,0));
                modelMatrix = mult(modelMatrix, rotate(alpha, vec3(0,1,0)));

                gl.uniformMatrix4fv(modelMatrixLoc, false, flatten(modelMatrix));
                drawShapeWithRef(cyanCube);
                drawShadowOnPlanes(cyanCube);

                modelMatrix = stack.pop();

                //3
                stack.push(modelMatrix)
                modelMatrix = mult(modelMatrix, translate(2,-3,0));
                modelMatrix = mult(modelMatrix, rotate(alpha, vec3(0,1,0)));

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
        drawLines(lines);

        theta += 0.5;
        sigma -= 0.8;
        alpha += 0.8;
    }

    function drawShapeWithRef (shape) {
        if (reflection || refraction) {
            gl.uniform1i(enableTextureLoc, 1);
        }
        drawShape(shape);
        gl.uniform1i(enableTextureLoc, 0);
    }

    function drawShadowOnPlanes (shape) {
        if (!shadow) return;
        gl.uniform1i(typeLoc, 3);
        drawShadow(shape);
        gl.uniform1i(typeLoc, 0);
    }

    function drawWallsAndFloor (XYWall, YZWall, floor) {
        gl.uniform1i(typeLoc, 2);
        if (texture) {
            gl.uniform1i(enableTextureLoc, 1);
            gl.uniform1i(currentTextureLoc, 0);
        } else {
            gl.uniform1i(enableTextureLoc, 0);
        }
        // XY
        gl.uniform4fv(gl.getUniformLocation(program, "uColor"), vec4(0.0,0.0,1.0,1.0));
        for (let i = 0; i < 5; i++) {
            let nextTileX = mult(modelMatrix, translate(i * tileSize, 0, 0));
            gl.uniformMatrix4fv(modelMatrixLoc, false, flatten(nextTileX));
            drawBackground(XYWall);

            for (let j = 0; j < 5; j++) {
                let nextTileY = mult(nextTileX, translate(0, j * tileSize, 0));
                gl.uniformMatrix4fv(modelMatrixLoc, false, flatten(nextTileY));
                drawBackground(XYWall);
            }
        }

        // YZ
        for (let i = 0; i < 5; i++) {
            let nextTileZ = mult(modelMatrix, translate(0, 0, i * tileSize));
            gl.uniformMatrix4fv(modelMatrixLoc, false, flatten(nextTileZ));
            drawBackground(YZWall);

            for (let j = 0; j < 5; j++) {
                let nextTileY = mult(nextTileZ, translate(0, j * tileSize, 0));
                gl.uniformMatrix4fv(modelMatrixLoc, false, flatten(nextTileY));
                drawBackground(YZWall);
            }
        }

        gl.uniform1i(currentTextureLoc, 1);
        gl.uniform4fv(gl.getUniformLocation(program, "uColor"), vec4(0.5,0.5,0.5,1.0));
        // floor 
        for (let i = 0; i < 5; i++) {
            let nextTileX = mult(modelMatrix, translate(i * tileSize, 0, 0));
            gl.uniformMatrix4fv(modelMatrixLoc, false, flatten(nextTileX));
            drawBackground(floor);

            for (let j = 0; j < 5; j++) {
                let nextTileZ = mult(nextTileX, translate(0, 0, j * tileSize));
                gl.uniformMatrix4fv(modelMatrixLoc, false, flatten(nextTileZ));
                drawBackground(floor);
            }
        }
        gl.uniform1i(enableTextureLoc, 0);
    }
}



//--------------------------- render functions-------------------------------

function drawShape(shape) {
    let pointsArray = shape.points;
    let normalsArray = shape.normals;
    let texArray = shape.texCoords;
    let index = pointsArray.length;

    gl.deleteBuffer(vBuffer);
    gl.deleteBuffer(nBuffer);
    gl.deleteBuffer(tBuffer);
    // points
    vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);

    vPosition = gl.getAttribLocation( program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    // normal
    nBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(normalsArray), gl.STATIC_DRAW);

    gl.vertexAttribPointer(vNormal, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vNormal);

    tBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, tBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(texArray), gl.STATIC_DRAW );

    vTexCoord = gl.getAttribLocation( program, "vTexCoord" );
    gl.vertexAttribPointer( vTexCoord, 2, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray(vTexCoord);

    gl.uniform4fv(gl.getUniformLocation(program, "uColor"), shape.color);
    
    for(let i=0; i<index; i+=3){
        gl.drawArrays( gl.TRIANGLE_FAN, i, 3 );
    }
}

function drawShadow (shape) {
    let pointsArray = shape.points;
    let index = pointsArray.length;

    gl.deleteBuffer(vBuffer);
    // points
    vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);

    vPosition = gl.getAttribLocation( program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    for(let i=0; i<index; i+=3){
        gl.drawArrays( gl.TRIANGLE_FAN, i, 3 );
    }
}


function drawLines(linePoints) {
    gl.deleteBuffer(vBuffer);
    // points
    vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(linePoints), gl.STATIC_DRAW);

    vPosition = gl.getAttribLocation( program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    gl.drawArrays(gl.LINES, 0, linePoints.length);
}


function drawBackground (background) {
    gl.deleteBuffer(vBuffer);
    gl.deleteBuffer(tBuffer);
    // points
    vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(background.points), gl.STATIC_DRAW);

    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    tBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, tBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(background.texCoords), gl.STATIC_DRAW );

    gl.vertexAttribPointer( vTexCoord, 2, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray(vTexCoord);

    gl.drawArrays( gl.TRIANGLE_FAN, 0, background.texCoords.length );
}









