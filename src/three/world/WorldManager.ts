
import * as THREE from 'three/webgpu';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { DRACO_LIB_PATH } from '../constants';
import { NavMeshManager } from '../pathfinding/NavMeshManager';
import { PoiManager } from './PoiManager';
import { getAgentSet } from '../../data/agents';
import { useAgencyStore } from '../../store/agencyStore';

/** Returns realistic color + material props based on mesh name. */
function getMeshStyle(name: string): { color: number; roughness: number; metalness: number } | null {
  // Work chairs — vibrant teal fabric
  if (name.startsWith('static-work-chair'))  return { color: 0x00B894, roughness: 0.92, metalness: 0.0 };
  // Lounge / cafe chairs — warm coral
  if (name.startsWith('static-chair'))        return { color: 0xFF6B4A, roughness: 0.90, metalness: 0.0 };
  // Sofa — deep indigo
  if (name === 'static-sofa')                 return { color: 0x5C6BC0, roughness: 0.88, metalness: 0.0 };
  // Work desks — warm oak wood
  if (name.startsWith('static-work-desk'))    return { color: 0xD4956A, roughness: 0.75, metalness: 0.0 };
  // Cafe table — dark walnut
  if (name === 'static-cafe-table')           return { color: 0x6D4C41, roughness: 0.72, metalness: 0.0 };
  // Counter — light marble
  if (name === 'static-counter')              return { color: 0xECEFF1, roughness: 0.30, metalness: 0.1 };
  // Cabinet — slate blue-grey
  if (name === 'static-cabinet')              return { color: 0x546E7A, roughness: 0.55, metalness: 0.3 };
  // Plants — vivid green foliage
  if (name.startsWith('static-plant'))        return { color: 0x2ECC71, roughness: 0.95, metalness: 0.0 };
  // Circles are flower pots — terracotta
  if (name.startsWith('circle'))              return { color: 0xC0392B, roughness: 0.85, metalness: 0.0 };
  // Desk lamps (flexo) — warm golden yellow
  if (name.startsWith('static-flexo'))        return { color: 0xF1C40F, roughness: 0.25, metalness: 0.80 };
  // PC monitors — near-black with slight blue
  if (name.startsWith('static-pc'))           return { color: 0x1A237E, roughness: 0.20, metalness: 0.85 };
  // Floor — warm honey wood
  if (name === 'static-floor')                return { color: 0xC8A97A, roughness: 0.80, metalness: 0.0 };
  // Whiteboard — crisp white
  if (name === 'static-board')                return { color: 0xF5F5F5, roughness: 0.40, metalness: 0.05 };
  return null;
}

export class WorldManager {
  private office: THREE.Group | null = null;

  constructor(
    private scene: THREE.Scene,
    private navMesh: NavMeshManager,
    private poiManager: PoiManager
  ) {}

  public async load(): Promise<void> {
    const loader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath(DRACO_LIB_PATH);
    loader.setDRACOLoader(dracoLoader);
    const officeGltf = await loader.loadAsync(`${import.meta.env.BASE_URL}models/office.glb`);
    this.office = officeGltf.scene;
    this.scene.add(this.office);

    // Get current AgentSet color
    const selectedAgentSetId = useAgencyStore.getState().selectedAgentSetId;
    const activeSet = getAgentSet(selectedAgentSetId);
    const themeColor = new THREE.Color(activeSet.color);

    // Log all mesh names for debugging (dev only)
    if (import.meta.env.DEV) {
      const meshNames: string[] = [];
      this.office.traverse((child) => {
        if ((child as any).isMesh) meshNames.push(child.name);
      });
      console.log('[WorldManager] mesh names:', meshNames);
    }

    // Extract NavMesh and setup
    this.office.traverse((child) => {
      if ((child as any).isMesh) {
        const mesh = child as THREE.Mesh;
        const name = mesh.name.toLowerCase();

        if (name.includes('navmesh')) {
          this.navMesh.loadFromGeometry(mesh.geometry);
          mesh.visible = false;
        } else {
          mesh.receiveShadow = true;
          mesh.castShadow = true;

          // Apply specific material for WebGPU shadow compatibility as requested
          if (mesh.material) {
            const oldMat = mesh.material as THREE.MeshStandardMaterial;

            if (name.startsWith('colored')) {
              mesh.material = new THREE.MeshStandardNodeMaterial({
                color: themeColor,
                map: oldMat.map,
                roughness: 0.70,
                metalness: 0.20,
              });
            } else {
              const style = getMeshStyle(name);
              mesh.material = new THREE.MeshStandardNodeMaterial({
                color: style ? new THREE.Color(style.color) : oldMat.color,
                map: oldMat.map,
                roughness: style ? style.roughness : 0.85,
                metalness: style ? style.metalness : 0.10,
              });
            }
          }
        }
      }
    });

    // Extract Points of Interest
    this.poiManager.loadFromGlb(this.office);
  }

  public updateThemeColor(color: string): void {
    if (!this.office) return;

    const themeColor = new THREE.Color(color);

    this.office.traverse((child) => {
      if ((child as any).isMesh) {
        const mesh = child as THREE.Mesh;
        const name = mesh.name.toLowerCase();

        if (name.startsWith('colored') && mesh.material) {
          // Update existing material color if it's a NodeMaterial
          // or replace it if needed. Since we already replaced them in load(),
          // we can just update the color property.
          if ((mesh.material as any).color) {
            (mesh.material as any).color.copy(themeColor);
          }
        }
      }
    });
  }

  public getOffice(): THREE.Group | null {
    return this.office;
  }
}
