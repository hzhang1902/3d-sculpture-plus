
precision mediump float;

varying vec4 fColor;
varying vec2 fTexCoord;

uniform int enableTexture;
uniform int enableReflection;
uniform int enableRefraction;
uniform int currentTexture;

uniform sampler2D tex0;
uniform sampler2D tex1;
uniform samplerCube texMap;

varying vec3 reflection;
varying vec3 refraction;

void main()
{
    if (enableTexture == 1) {

        if (currentTexture == 0) {
            gl_FragColor = texture2D( tex0, fTexCoord );

        } else if (currentTexture == 1) {
            gl_FragColor = texture2D( tex1, fTexCoord );

        } else if (currentTexture == 2) {

            if (enableReflection == 1 && enableRefraction == 1) {
                vec4 texColor1 = textureCube(texMap, reflection);
                vec4 texColor2 = textureCube(texMap, refraction);
                vec4 texColor = texColor1* texColor2;
                gl_FragColor = fColor*texColor;

            } else if (enableReflection == 1) {
                vec4 texColor = textureCube(texMap, reflection);
                gl_FragColor = fColor*texColor;

            } else if (enableRefraction == 1) {
                vec4 texColor = textureCube(texMap, refraction);
                gl_FragColor = fColor*texColor;

            }
        }
    } else {
        gl_FragColor = fColor;
    }

}