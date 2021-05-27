
attribute vec4 vPosition;
attribute vec4 vNormal;
attribute vec2 vTexCoord;

// lighting
uniform vec4 specularProduct, lightAmbient, lightDiffuse;
uniform vec4 lightPosition;
uniform vec3 lightDirection;
uniform float spotStart;
uniform float spotEnd;

uniform mat4 viewMatrix;
uniform mat4 modelMatrix;
uniform mat4 projectionMatrix;
uniform vec3 viewPosition;
uniform float shininess;

uniform vec4 uColor;

varying vec4 fColor;
varying vec2 fTexCoord;
varying vec3 reflection;
varying vec3 refraction;

// 0 shape, 1 line, 2 background
uniform int type;


void main() {
    if (type == 1) {
        // line

        gl_Position = projectionMatrix * viewMatrix * vPosition;
        fColor = vec4(1.0, 1.0, 1.0, 1.0);
        gl_PointSize = 3.0;

    } else if (type == 2) {
        // background tile

        gl_Position = projectionMatrix * viewMatrix * modelMatrix * vPosition;
        fColor = uColor;
        fTexCoord = vTexCoord;

    } else if (type == 3) {
        // shadow

        // another way to cast shadow
        vec3 afterTransPos = (modelMatrix * vPosition).xyz;
        vec3 lightToPoint = normalize(afterTransPos.xyz - lightPosition.xyz);

        // get the multiplier using the function that determines the intersection of a plane and a vector
        // times .98 to avoid z-fighting, shadow slightly above surface but looks fine
        float XYmultiplier = (- afterTransPos.z / lightToPoint.z) * 0.98;
        float XZmultiplier = (- afterTransPos.y / lightToPoint.y) * 0.98;
        float YZmultiplier = (- afterTransPos.x / lightToPoint.x) * 0.98;

        float multiplier = XYmultiplier;
        // by P + multiplier * LP, we get the projection of point on plane
        vec4 shadowPos = vec4(afterTransPos + lightToPoint * XYmultiplier, 1.0);
        // on yz plane
        if (shadowPos.x < 0.0) {
            shadowPos = vec4(afterTransPos + lightToPoint * YZmultiplier, 1.0);
            multiplier = YZmultiplier;
        }
        // on xz plane
        if (shadowPos.y < 0.0) {
            shadowPos = vec4(afterTransPos + lightToPoint * XZmultiplier, 1.0);
            multiplier = XZmultiplier;
        }
        // no shadow
        if (multiplier < 0.0) {
            gl_Position = vec4(0.0,0.0,0.0,0.0);
            fColor = vec4(0.0, 0.0, 0.0, 0.0);
            return;
        }

        gl_Position = projectionMatrix * viewMatrix * shadowPos;
        fColor = vec4(0.0, 0.0, 0.0, 1.0);

    } else if (type == 0) {
        // shape

        gl_Position = projectionMatrix * viewMatrix * modelMatrix * vPosition;

        // get rotation matrix from model matrix
        mat4 rotationMatrix;
        rotationMatrix[0] = modelMatrix[0];
        rotationMatrix[1] = modelMatrix[1];
        rotationMatrix[2] = modelMatrix[2];
        rotationMatrix[3] = vec4(0.0,0.0,0.0,0.0);

        // normals are only supposed to be affected by rotation
        vec3 N = normalize(rotationMatrix * vNormal).xyz;

        // The point to calculate lighting can be different 
        // from the actual point itself
        vec3 colorPoint = (modelMatrix * vNormal).xyz;

        //Calculate L
        vec3 L = normalize(lightPosition.xyz - colorPoint);

        //Calculate V
        vec3 V = normalize(viewPosition - colorPoint);

        //Calculate reflection vector
        vec3 R = (2.0 * dot(L, N) * N) - L;

        float Kd = dot(L, N);

        // reflection and refraction has to use model view matrix

        mat4 modelViewMatrix = viewMatrix * modelMatrix;
        vec3 modelViewPos = (modelViewMatrix* vPosition).xyz;
        reflection = reflect(modelViewPos, N);
        refraction = refract(modelViewPos, N, 0.5);

        // Check if triangle facing against light source, if so, kill specular
        // Because specular doesn't check normal, it will still show even if
        // it is behind the entire shape

        float Ks = 0.0;
        if (Kd > 0.0) {
            Ks = pow(max(dot(V, R), 0.0), shininess);
        } 
        // it actually looks better to not have a negative Kd.
        // but considering it's in the video, just leave it as is.
        else {
            Kd = 0.0;
        }

        vec3 lightDir = normalize(lightDirection);
        vec4 ambient = lightAmbient * uColor;
        vec4 diffuse = Kd * (lightDiffuse * uColor);
        vec4 specular = Ks * specularProduct;

        vec4 ds = diffuse + specular;
        float start = spotStart;
        float end = spotEnd;

        // smooth out the spotlight edge
        if (dot(L, -lightDir) > start) {
            // inside spotlight
            fColor = ambient + ds;
        } else if (dot(L, -lightDir) > end){
            // light is interpolated on spotlight edge
            fColor = ambient + (1.0- (start - dot(L, -lightDir)) / (start-end))* ds;
        } else {
            // not even on the edge
            fColor = ambient;
        }
        fColor.a = 1.0;
    }

}