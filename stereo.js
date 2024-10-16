import * as THREE from 'three';

export default function stereogram(canvas, slider, image, depthImage) {

    const renderer = new THREE.WebGLRenderer( { antialias: true, canvas } );
    renderer.autoClearColor = false;

    const camera = new THREE.OrthographicCamera(
        - 1, // left
        1, // right
        1, // top
        - 1, // bottom
        - 1, // near,
        1, // far
    );
    const scene = new THREE.Scene();
    const plane = new THREE.PlaneGeometry( 2, 2 );

    // From https://www.strv.com/blog/stereo-photo-from-depth-photo-engineering-ios
    const fragmentShader = `
#include <common>

uniform vec2 iResolution;
uniform float iMaxShift;
uniform sampler2D image;
uniform sampler2D depthImage;

void main() {
    vec2 uv = gl_FragCoord.xy / iResolution.xy;

    if (iMaxShift == 0.0) {
        gl_FragColor = texture(image, uv);
        return;
    }

    float increment = 1.0 / iResolution.x;
    vec2 oldPoint = uv;
    vec2 currentDepthPoint = uv;

    float d = iMaxShift;
    float step = sign(iMaxShift) * increment;
    float limit = -iMaxShift;

    while ((iMaxShift > 0.0 && d >= limit) || (iMaxShift < 0.0 && d <= limit)) {
        vec2 depthPoint = currentDepthPoint;
        depthPoint.x = currentDepthPoint.x + d;
        float dFT = texture(depthImage, depthPoint).r * 2.0 - 1.0;
        float shiftFT = dFT * iMaxShift;
        
        if ((iMaxShift > 0.0 && -shiftFT <= d) || (iMaxShift < 0.0 && -shiftFT >= d)) {
            vec2 newPoint = oldPoint;
            newPoint.x = oldPoint.x - shiftFT;
            gl_FragColor = texture(image, newPoint);
            return;
        }
        
        d -= step;
    }
}
    `;
    const imageTexture = new THREE.Texture(image);
    imageTexture.needsUpdate = true;
    const depthTexture = new THREE.Texture(depthImage);
    depthTexture.needsUpdate = true;
    const uniforms = {
        iMaxShift: { value: 0.0 },
        iResolution: { value: new THREE.Vector2(canvas.width, canvas.height) },
        image: { value: imageTexture },
        depthImage: { value: depthTexture },
    };
    const material = new THREE.ShaderMaterial( {
        fragmentShader,
        uniforms,
    } );
    scene.add( new THREE.Mesh( plane, material ) );

    slider.addEventListener("input", (event) => {
        uniforms.iMaxShift.value = event.target.valueAsNumber;
        renderer.render( scene, camera );
    });
    renderer.render( scene, camera );
}

window.stereogram = stereogram;