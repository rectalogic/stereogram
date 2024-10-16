import * as THREE from 'three';

export default function stereogram(canvas, image, depthImage) {

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
uniform vec2 iMouse;
uniform sampler2D image;
uniform sampler2D depthImage;

void main() {
    vec2 uv = gl_FragCoord.xy / iResolution.xy;
    // normalize mouse coordinates
    vec2 mouse = iMouse.xy / iResolution;
    float increment = 1.0 / iResolution.x;
    float maxShift = (mouse.x - 0.5) * 0.02;
    vec2 oldPoint = uv;
    vec2 currentDepthPoint = uv;
    
    if (maxShift > 0.0) { //positive shift
        float d = -maxShift;
        while (d <= maxShift) {
            vec2 depthPoint = currentDepthPoint;
            depthPoint.x = currentDepthPoint.x + d;
            float dFT = texture(depthImage, depthPoint).r * 2.0 - 1.0;
            float shiftFT = dFT * maxShift;
            if (-shiftFT <= d) {
                vec2 newPoint = oldPoint;
                newPoint.x = oldPoint.x - shiftFT;
                gl_FragColor = texture(image, newPoint);
                return;
            }
            d = d + increment;
        }
        
    } else if (maxShift < 0.0) { //negative shift
        float d = -maxShift;
        while (d >= maxShift) {
            vec2 depthPoint = currentDepthPoint;
            depthPoint.x = currentDepthPoint.x + d;
            float dFT = texture(depthImage, depthPoint).r * 2.0 - 1.0;
            float shiftFT = dFT * maxShift;
            if (-shiftFT >= d) {
                vec2 newPoint = oldPoint;
                newPoint.x = oldPoint.x - shiftFT;
                gl_FragColor = texture(image, newPoint);
                return;
            }
            d = d - increment;
        }
    }
    
    gl_FragColor = texture(image, uv);
}
    `;
    const imageTexture = new THREE.Texture(image);
    const depthTexture = new THREE.Texture(depthImage);
    const uniforms = {
        iMouse: { value: new THREE.Vector2() },
        iResolution: { value: new THREE.Vector2(canvas.width, canvas.height) },
        image: { value: imageTexture },
        depthImage: { value: depthTexture },
    };
    const material = new THREE.ShaderMaterial( {
        fragmentShader,
        uniforms,
    } );
    scene.add( new THREE.Mesh( plane, material ) );

    canvas.addEventListener("mousemove", (event) => {
        uniforms.iMouse.value.set( event.clientX, event.clientY );
        renderer.render( scene, camera );
    });
}

window.stereogram = stereogram;