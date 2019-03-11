# 3D Sculpture+

A rotating 3D sculpture under a spotlight, made using WebGL.
<a>https://hzhang1902.github.io/3d_sculpture_plus/main.html</a>

## How to use
Open main.html
* press 'p' to shrink spotlight size.
* press 'i' to increase spotlight size.
* press 'm' for gouraud shading.
* press 'n' for flat shading.
* press 'a' to toggle shadow on/off.
* press 'b' to toggle background texture on/off.
* press 'c' to toggle object reflection on/off.
* press 'd' to toggle object refraction on/off.

## Special things
1. The edge of the spotlight is blurred to simulate a real spotlight.

2. Check if triangle facing against light source, if so, kill specular. Because specular doesn't check normal, it will still show even if it is behind the entire shape.

3. Special shadow in vertex shader from line 50, not using the matrix mentioned in class. It uses a function which gets the intersection of a plane and a vector (in this case, floor/wall plane and Light->Point vector), use all the intersections to draw the shadow polygon.
