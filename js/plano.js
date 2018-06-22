let six = (f) => [1,2,3,4,5,6].map(f);

const DEGREES_45  = (Math.PI/2).toFixed(2);
const DEGREES_180 = (2* Math.PI).toFixed(2);

let fondo = () => "fondo.png";
let face = (n) => "imagenes/faces" + n + ".jpg";

let facesTextures, skyboxTexture;

function init() {
    console.log("Initialization...");
    console.log(facesTextures);

    console.log("Loading textures...");
    loadTextures();

    console.log("Loading scene...");
    loadScene(window.innerWidth, window.innerHeight);
}
/**
 * It creates a video object based of source "src".
 */
function createVideo(src)
{
    let video = document.createElement( 'video' );
    video.src = src;
    video.load(); // Refresh
    video.setAttribute("loop","");
    video.setAttribute("autoplay","true");

    // Texture for the video
    let videoTexture = new THREE.VideoTexture(video);
    videoTexture.minFilter = THREE.LinearFilter;
    videoTexture.magFilter = THREE.LinearFilter;
    videoTexture.format = THREE.RGBFormat;

    return {
        "dom": video,
        "texture": videoTexture
    };
}

/**
 * It loads the textures asyncronously.
 */
function loadTextures()
{
    // Faces textures
    facesTextures = six((x) => new THREE.TextureLoader().load((face(x))));

    // The scene is a skybox when a plane rotates showing up 6 different faces and a playing video
    skyboxTexture = new THREE.CubeTextureLoader()
    	.setPath('imagenes/')
        .load(six(fondo));
}

/**
 * It creates and get the scene ready.
 */
function loadScene(w, h){

    // Scene/Camera/Control creation
    // Camera
    // - Perspective camera
    // - Vertical field of view of 75, ratio of frustrum given by width/height
    // - Near/Far plane, [0.1, 3000] respectivally
    let scene = new THREE.Scene();
    let camera = new THREE.PerspectiveCamera(75, w/h, 0.1, 3000 );
    let controls = new THREE.OrbitControls(camera);
    controls.update();

    // Render creation used to draw scenes
    // attach the scene into the DOM
    let renderer = new THREE.WebGLRenderer();
    renderer.setSize(w,h); 
    document.body.appendChild(renderer.domElement);
    renderer.setClearColor(0xEEEEEE);

    
    // Uniform variables with the textures as "tCube" variable
    let shader = THREE.ShaderLib["cube"];
    shader.uniforms["tCube"].value = skyboxTexture;

    // Skybox cube dimensions 2k x 2k x 2k
    let geometry = new THREE.BoxGeometry (3000, 3000, 3000);

    // Prepare the material when the faces texture will be applied 
    // into the internal sides of the skybox
    let material = new THREE.ShaderMaterial(
    {
        depthWrite: false,
        fragmentShader: shader.fragmentShader,
        vertexShader: shader.vertexShader,
        uniforms: shader.uniforms,
        side: THREE.BackSide
    });
    let skybox = new THREE.Mesh(geometry,material); 
    scene.add(skybox);

    // We created the video object ready to attach to scene
    let video = createVideo("videos/planet.mp4");

    // Creation of a plane with 7 textures: 6 belongs to faces images (assigned to front side) and 1 with the video (assigned to backside).
    let materials = [];
    facesTextures.forEach(texture => materials.push(new THREE.MeshBasicMaterial({map: texture, side: THREE.FrontSide})));
    materials.push(new THREE.MeshBasicMaterial({map: video.texture, side: THREE.BackSide}));

    let NFaces = materials.length-1;

    // As plane is created using createMultiMaterialObject, it's a new Group that contains a new mesh for each material defined in materials
    // so we can hide each material belongs to the tree object (it shows only the first (first photon) and the last (the video)).
    let plane = THREE.SceneUtils.createMultiMaterialObject(new THREE.PlaneGeometry( 3, 3, 3 ), materials );
    plane.children.forEach((e,i) => e.material.visible = (i <= 0 || i >= materials.length  - 1));
    scene.add( plane );

    // Camera configuration: position and look at the plane position
    // Set the camera position
    camera.position.z = 5;
    camera.lookAt(plane.position);

    /**
     * Returns true when the plane have been rotated how many times specified as argument. 
     * The rotation axis of the plane is divided by 2pi to check the proportion performed.
     * We removed the precision of decimals from the values.
     */
    let hasBeenRotated = false;
    let numberOfRotations = (plane) => Math.floor(plane.rotation.x.toFixed(2) / DEGREES_180);

    
    /**
     * It returns the angle between two planes in front each other, using the quaternion concept.
        Quaternion concept. https://threejs.org/docs/#api/math/Quaternion.
        Concept used regarding rotating things among the x,y,z coordinates.
    */
    let angleBetweenPlanes = (a,b) => {
        let planeA = (new THREE.Vector3(0,0,1))
                        .applyQuaternion(a.quaternion);
        let planeB = (new THREE.Vector3(0,0,-1))
                        .applyQuaternion(b.quaternion);
        return planeA.angleTo(planeB).toFixed(2)
    };

    let setFaceVisible = (visible, index) =>  {
        plane.children[(index % NFaces)].material.visible = visible;
    }

    /**
     * Rotate the plane across (+x, `+y, +z)
     */
    let rotate = (p,x,y,z) =>  {
        p.rotation.x += x;
        p.rotation.y += y;
        p.rotation.z += z;
    };

    // When to change the plane => as the plane have been rotated three times
    let rotations = 1;

    let lastRotation = 0, face = 0;

    function animate(){

        // As the plane is in front of us, we need to calculate the angle of normal plane
        // and the camera vector (-z). 
        // Material of the plan would be replaced as the angle is less than perpendicular.
        rotations = numberOfRotations(plane);

        // Each 3 rotations, we checked if the plane can be enough change
        if (rotations % 3 == 0 && lastRotation!=rotations){
            // Set the plane when the angle < 45 degrees, Not in front!
            if (angleBetweenPlanes(plane, camera) < DEGREES_45){
                if (lastRotation != rotations) {
                    setFaceVisible(false, face++);
                    setFaceVisible(true, face);
                }
                lastRotation = rotations;
            }
        }else{
            lastRotation = rotations;
        }
        
        rotate(plane, 0.015, -0.0035, 0.004);
        
        renderer.render(scene, camera);
        requestAnimationFrame(animate);
    };

    animate();
}