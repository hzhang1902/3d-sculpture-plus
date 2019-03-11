
//-------------------- draw functions-------------------------
function floor () {
    return tile ( 5, 3, 2, 6 );
}

function XYWall () {
    return tile ( 0, 1, 2, 3 );
}

function YZWall () {
    return tile ( 4, 0, 3, 5 );
}

function tile (a, b, c, d){
    let pointsArray = [];
    let texCoordsArray = [];
    
    pointsArray.push(vertices[a]);
    texCoordsArray.push(texCoord[0]);

    pointsArray.push(vertices[b]);
    texCoordsArray.push(texCoord[1]);

    pointsArray.push(vertices[c]);
    texCoordsArray.push(texCoord[2]);

    pointsArray.push(vertices[a]);
    texCoordsArray.push(texCoord[0]);

    pointsArray.push(vertices[c]);
    texCoordsArray.push(texCoord[2]);

    pointsArray.push(vertices[d]);
    texCoordsArray.push(texCoord[3]);
    return {points: pointsArray, texCoords: texCoordsArray};
}



function tetrahedron(m, color) {

    //------------------ local variables------------------------

    var n = 4;
    var a = vec4(0.0, 0.0, -1.0,1);
    var b = vec4(0.0, 0.942809, 0.333333, 1);
    var c = vec4(-0.816497, -0.471405, 0.333333, 1);
    var d = vec4(0.816497, -0.471405, 0.333333,1);

    let pointsArray = [];
    let normalsArray = [];
    let texArray = [];

    divideTriangle(a, b, c, n);
    divideTriangle(d, c, b, n);
    divideTriangle(a, d, b, n);
    divideTriangle(a, c, d, n);
    return {points: pointsArray, normals: normalsArray, color: color, texCoords: texArray};



    function triangle(a, b, c) {
        pointsArray.push(a);
        pointsArray.push(b);
        pointsArray.push(c);

        if (m === "flat"){
            // flat shading normals
            let fp = vec4(
                a[0]/3 + b[0]/3 + c[0]/3,
                a[1]/3 + b[1]/3 + c[1]/3,
                a[2]/3 + b[2]/3 + c[2]/3,
                1.0);
            normalsArray.push(fp,fp,fp);
        } else {
            //gouraud shading normals
            normalsArray.push(a[0],a[1], a[2], 1.0);
            normalsArray.push(b[0],b[1], b[2], 1.0);
            normalsArray.push(c[0],c[1], c[2], 1.0);
        }
        texArray.push(vec2(0.0,0.0), vec2(0.0,0.0), vec2(0.0,0.0));
    }

    function divideTriangle(a, b, c, count) {
        if ( count > 0 ) {

            var ab = mix( a, b, 0.5);
            var ac = mix( a, c, 0.5);
            var bc = mix( b, c, 0.5);

            ab = normalize(ab, true);
            ac = normalize(ac, true);
            bc = normalize(bc, true);

            divideTriangle( a, ab, ac, count - 1 );
            divideTriangle( ab, b, bc, count - 1 );
            divideTriangle( bc, c, ac, count - 1 );
            divideTriangle( ab, bc, ac, count - 1 );
        }
        else {
            triangle( a, b, c );
        }
    }
}



function cube (m, color) {
    let pointsArray = [];
    let normalsArray = [];
    let texArray = [];

    quad( 1, 0, 3, 2 );
    quad( 2, 3, 7, 6 );
    quad( 3, 0, 4, 7 );
    quad( 6, 5, 1, 2 );
    quad( 4, 5, 6, 7 );
    quad( 5, 4, 0, 1 );

    return {points: pointsArray, normals: normalsArray, color: color, texCoords: texArray};


    function quad(a, b, c, d)
    {
        var vertices = [
        vec4( -0.5, -0.5,  0.5, 1.0 ),
        vec4( -0.5,  0.5,  0.5, 1.0 ),
        vec4(  0.5,  0.5,  0.5, 1.0 ),
        vec4(  0.5, -0.5,  0.5, 1.0 ),
        vec4( -0.5, -0.5, -0.5, 1.0 ),
        vec4( -0.5,  0.5, -0.5, 1.0 ),
        vec4(  0.5,  0.5, -0.5, 1.0 ),
        vec4(  0.5, -0.5, -0.5, 1.0 )
        ];

        // We need to parition the quad into two triangles in order for
        // WebGL to be able to render it.  In this case, we create two
        // triangles from the quad indices
        let indices = [ a, b, c, a, c, d ];

        // flat shading normals
        if (m==="flat") {
            let fp = vec4(
                vertices[a][0]/2+vertices[c][0]/2,
                vertices[a][1]/2+vertices[c][1]/2,
                vertices[a][2]/2+vertices[c][2]/2,
                1.0);
            normalsArray.push(fp,fp,fp,fp,fp,fp);
        }

        for ( let i = 0; i < indices.length; ++i ) {
            let cvec = vertices[indices[i]];
            pointsArray.push(cvec);
            texArray.push(vec2(0.0,0.0));

            // gouraud shading normals
            if (m!=="flat") {
                // vertex normals
                normalsArray.push(cvec);
            }
        }
    }

}
