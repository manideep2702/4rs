import * as THREE from 'three/webgpu';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { SCENE_BACKGROUND_COLOR } from '../constants';

export class Stage {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public controls: OrbitControls;

  private followTarget: THREE.Vector3 | null = null;
  private readonly defaultTarget = new THREE.Vector3(0, 0.8, 0);

  constructor(rendererElement: HTMLElement) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(SCENE_BACKGROUND_COLOR);

    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 500);
    this.camera.position.set(10, 8, 15);

    this.controls = new OrbitControls(this.camera, rendererElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.rotateSpeed = 0.8;
    this.controls.enableRotate = true;
    this.controls.enablePan = false;
    this.controls.enableZoom = true;
    this.controls.minPolarAngle = Math.PI / 4.5;
    this.controls.maxPolarAngle = Math.PI / 2.4;
    this.controls.minDistance = 3;
    this.controls.maxDistance = 10;
    this.controls.target.set(0, 0.8, 0);

    this.controls.addEventListener('start', () => {
      rendererElement.style.cursor = 'grabbing';
    });
    this.controls.addEventListener('end', () => {
      rendererElement.style.cursor = 'auto';
    });

    this.setupLights();
    // Environment is initialized with a default, but updated via updateDimensions immediately in SceneManager
  }

  private setupLights() {
    // Hemisphere light: sky blue → green ground bounce
    const hemiLight = new THREE.HemisphereLight(0x6DD5FA, 0x84C57A, 0.7 * Math.PI);
    this.scene.add(hemiLight);

    // Soft ambient fill
    const ambientLight = new THREE.AmbientLight(0xE8F4FF, 0.4 * Math.PI);
    this.scene.add(ambientLight);

    // Primary sunlight — bright white from upper right
    const dirLight = new THREE.DirectionalLight(0xFFFFFF, 0.55 * Math.PI);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    dirLight.shadow.camera.near = 0.1;
    dirLight.shadow.camera.far = 100;
    dirLight.shadow.camera.top = 12;
    dirLight.shadow.camera.bottom = -12;
    dirLight.shadow.camera.right = 12;
    dirLight.shadow.camera.left = -12;
    dirLight.shadow.mapSize.set(2048, 2048);
    dirLight.shadow.bias = -0.0001;
    dirLight.shadow.radius = 3;
    dirLight.shadow.autoUpdate = true;
    this.scene.add(dirLight);

    // Warm orange accent from the left
    const orangeLight = new THREE.PointLight(0xFF8C42, 1.2 * Math.PI, 20);
    orangeLight.position.set(-6, 4, 4);
    this.scene.add(orangeLight);

    // Cool cyan accent from the right-back
    const cyanLight = new THREE.PointLight(0x00E5FF, 0.8 * Math.PI, 18);
    cyanLight.position.set(6, 3, -6);
    this.scene.add(cyanLight);

    // Purple accent from the back center — adds depth
    const purpleLight = new THREE.PointLight(0xC77DFF, 0.7 * Math.PI, 15);
    purpleLight.position.set(0, 5, -8);
    this.scene.add(purpleLight);

    // Pink-magenta fill from the front
    const pinkLight = new THREE.PointLight(0xFF4DA6, 0.5 * Math.PI, 14);
    pinkLight.position.set(0, 3, 10);
    this.scene.add(pinkLight);
  }

  public onResize(width: number, height: number) {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  /** Call every frame with the character's world position to follow, or null to return to origin. */
  public setFollowTarget(pos: THREE.Vector3 | null) {
    this.followTarget = pos ? pos.clone() : null;
  }

  public update() {
    const lerpTarget = this.followTarget
      ? new THREE.Vector3(this.followTarget.x, 0.8, this.followTarget.z)
      : this.defaultTarget;
    this.controls.target.lerp(lerpTarget, 0.06);
    this.controls.update();
  }

  /**
   * Drive camera behavior based on chat state.
   * Call every frame from the animation loop.
   *
   * @param isChatting  True while a conversation is active.
   * @param playerMoving True while player is walking toward the NPC (GOTO state).
   */
  public setChatMode(isChatting: boolean, playerMoving: boolean): void {
    if (!this.controls) return;

    if (isChatting) {
      if (playerMoving) {
        // Lock controls and zoom in while walking
        this.controls.enabled = false;
        this.controls.minDistance = THREE.MathUtils.lerp(this.controls.minDistance, 4, 0.05);
        this.controls.maxDistance = THREE.MathUtils.lerp(this.controls.maxDistance, 6, 0.05);
      } else {
        // Arrived — re-enable controls, stay slightly zoomed
        this.controls.enabled = true;
        this.controls.minDistance = THREE.MathUtils.lerp(this.controls.minDistance, 3, 0.05);
        this.controls.maxDistance = THREE.MathUtils.lerp(this.controls.maxDistance, 10, 0.05);
      }
    } else {
      // Free roam
      this.controls.enabled = true;
      this.controls.minDistance = THREE.MathUtils.lerp(this.controls.minDistance, 3, 0.05);
      this.controls.maxDistance = THREE.MathUtils.lerp(this.controls.maxDistance, 50, 0.05);
    }
  }
}
