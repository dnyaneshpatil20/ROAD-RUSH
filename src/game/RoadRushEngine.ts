import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RoadRushAudio } from './audio';
import { BIKE_SKINS, MELEE_WEAPONS, RACES, RIDER_ACCESSORIES, WEAPONS } from './catalog';
import {
  buildCityEnvironment,
  createBikeRiderRig,
  createPickupMesh,
  type BikeRiderRig,
} from './models';
import {
  createInitialRacers,
  createTrackHazards,
  createTrackPickups,
  getRace,
  getTrackSurface,
  stepRacePhysics,
} from './physics';
import { createProceduralTextures, type ProceduralTextureSet } from './textures';
import type {
  BrickProjectile,
  CombatActionKind,
  GameScreenState,
  HudTelemetry,
  RacerState,
  RaceResultSnapshot,
  RaceTrackDef,
  TrackHazard,
  TrackPickup,
  WeaponId,
} from './types';

// Module-scope scratch helpers (zero GC inside render loop)
const _dummy = new THREE.Object3D();
const _camTargetPos = new THREE.Vector3();
const _camLookTarget = new THREE.Vector3();
const _colorTmp = new THREE.Color();

interface ParticleSlot {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  scale: number;
  color: number;
}

export interface EngineCallbacks {
  onHudUpdate: (hud: HudTelemetry) => void;
  onRaceFinish: (result: RaceResultSnapshot) => void;
  onPauseRequest: () => void;
  onMultiplayerSync?: (state: {
    z: number;
    x: number;
    vz: number;
    hp: number;
    weapon: WeaponId;
    attacking: boolean;
  }) => void;
}

export interface PlayerLoadoutConfig {
  name: string;
  skinId: string;
  accessoryId: string;
  highestUnlockedRace: number;
  weaponTier: number;
  boosterTier: number;
}

export class RoadRushEngine {
  private container: HTMLElement;
  private callbacks: EngineCallbacks;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private sunLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private skyDomeMesh: THREE.Object3D | null = null;
  private isSoftwareGl: boolean;
  private audio = new RoadRushAudio();

  private frameId = 0;
  private disposed = false;
  private lastTimeMs = 0;
  private hudEmitAccum = 0;
  private netEmitAccum = 0;

  // Game & Race state
  private screenState: GameScreenState = 'title';
  private race: RaceTrackDef = RACES[0];
  private loadout: PlayerLoadoutConfig;
  private racers: RacerState[] = [];
  private projectiles: BrickProjectile[] = [];
  private hazards: TrackHazard[] = [];
  private pickups: TrackPickup[] = [];
  private elapsedTime = 0;
  private countdownTimer = 3.0;
  private lastCountdownBeep = 4;
  private raceStarted = false;
  private finishReported = false;
  private topSpeedKmh = 0;
  private fuelCollectedCount = 0;
  private boostersHitCount = 0;
  private brickHitsCount = 0;
  private hitstopTimer = 0;
  private cameraTrauma = 0;
  private calloutText = '';
  private calloutTimer = 0;
  private titleOrbitAngle = 0;

  // Scene objects
  private worldObjects: THREE.Object3D[] = [];
  private textures: ProceduralTextureSet | null = null;
  private rigs = new Map<string, BikeRiderRig>();
  private brickMeshes = new Map<number, THREE.Mesh>();
  private hazardMeshes: THREE.Mesh[] = [];
  private pickupMeshes = new Map<number, THREE.Group>();
  private brickGeo = new THREE.BoxGeometry(0.24, 0.14, 0.34);
  private brickMat = new THREE.MeshStandardMaterial({
    color: 0xc2410c,
    roughness: 0.85,
  });

  // Pooled particles (zero GC)
  private particleCount = 160;
  private particles: ParticleSlot[] = [];
  private particleInstanced: THREE.InstancedMesh;

  // Weather particles
  private weatherCount = 120;
  private weatherInstanced: THREE.InstancedMesh;
  private weatherOffsets: { x: number; y: number; z: number; speed: number }[] = [];

  // Input & Direct Action state
  private keysPressed = new Set<string>();
  private touchState = {
    throttle: false,
    brake: false,
    steerLeft: false,
    steerRight: false,
  };
  private currentMeleeWeapon: Exclude<WeaponId, 'brick'> = 'rod';
  private attackBufferedTimer = 0;
  private pendingActionKind: CombatActionKind = 'weapon';
  private pendingAttackWeapon: WeaponId | undefined;
  private pendingWeaponSwitch: WeaponId | undefined;
  private gyroEnabled = false;
  private gyroSupported = typeof window !== 'undefined' && 'DeviceOrientationEvent' in window;
  private gyroBaselineGamma: number | null = null;
  private gyroTiltDeg = 0;

  // Remote multiplayer racers state
  private remoteHumanStates = new Map<
    string,
    { name: string; z: number; x: number; vz: number; hp: number; weapon: WeaponId; lastSeen: number }
  >();

  constructor(
    container: HTMLElement,
    initialLoadout: PlayerLoadoutConfig,
    callbacks: EngineCallbacks,
  ) {
    this.container = container;
    this.loadout = initialLoadout;
    this.callbacks = callbacks;

    this.isSoftwareGl = (() => {
      try {
        const probe = document.createElement('canvas').getContext('webgl2');
        if (!probe) return true;
        const ext = probe.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
        const gpu = String(probe.getParameter(param));
        probe.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      alpha: false,
      preserveDrawingBuffer: this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2),
    );
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(container.clientWidth || 1280, container.clientHeight || 720);
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    const w = container.clientWidth || 1280;
    const h = container.clientHeight || 720;
    this.camera = new THREE.PerspectiveCamera(64, w / h, 0.25, 420);

    this.hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x5c4938, 0.85);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xffe0b2, 2.2);
    this.sunLight.position.set(28, 45, -18);
    this.sunLight.castShadow = !this.isSoftwareGl;
    this.sunLight.shadow.mapSize.set(1024, 1024);
    this.sunLight.shadow.camera.near = 5;
    this.sunLight.shadow.camera.far = 120;
    this.sunLight.shadow.camera.left = -28;
    this.sunLight.shadow.camera.right = 28;
    this.sunLight.shadow.camera.top = 28;
    this.sunLight.shadow.camera.bottom = -28;
    this.sunLight.shadow.bias = -0.0005;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    const pGeo = new THREE.BoxGeometry(0.14, 0.14, 0.14);
    const pMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.particleInstanced = new THREE.InstancedMesh(pGeo, pMat, this.particleCount);
    this.particleInstanced.frustumCulled = false;
    for (let i = 0; i < this.particleCount; i++) {
      this.particles.push({
        active: false,
        x: 0,
        y: -50,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 0.4,
        scale: 1,
        color: 0xfbbf24,
      });
      _dummy.position.set(0, -100, 0);
      _dummy.scale.set(0, 0, 0);
      _dummy.updateMatrix();
      this.particleInstanced.setMatrixAt(i, _dummy.matrix);
      this.particleInstanced.setColorAt(i, _colorTmp.setHex(0xfbbf24));
    }
    this.scene.add(this.particleInstanced);

    const wGeo = new THREE.BoxGeometry(0.16, 0.16, 0.16);
    const wMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 });
    this.weatherInstanced = new THREE.InstancedMesh(wGeo, wMat, this.weatherCount);
    this.weatherInstanced.frustumCulled = false;
    for (let i = 0; i < this.weatherCount; i++) {
      this.weatherOffsets.push({
        x: (Math.random() - 0.5) * 44,
        y: Math.random() * 18,
        z: (Math.random() - 0.5) * 55,
        speed: 4 + Math.random() * 5,
      });
    }
    this.scene.add(this.weatherInstanced);

    this.loadRace(0);
    this.bindEvents();

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.lastTimeMs = performance.now();
    this.tick();
  }

  public updateLoadout(loadout: PlayerLoadoutConfig): void {
    this.loadout = loadout;
    const player = this.racers.find((r) => r.isPlayer);
    const rig = this.rigs.get('player');
    if (player && rig) {
      const skin = BIKE_SKINS.find((s) => s.id === loadout.skinId) ?? BIKE_SKINS[0];
      const gear =
        RIDER_ACCESSORIES.find((a) => a.id === loadout.accessoryId) ?? RIDER_ACCESSORIES[0];
      player.bikeColor = skin.primaryColor;
      player.secondaryColor = skin.secondaryColor;
      player.helmetColor = gear.helmetColor;
      player.visorColor = gear.visorColor;
      player.jacketColor = gear.jacketColor;
      player.name = loadout.name;
      rig.applyCosmetics(
        skin.primaryColor,
        skin.secondaryColor,
        gear.helmetColor,
        gear.visorColor,
        gear.jacketColor,
      );
    }
  }

  public loadRace(raceId: number): void {
    this.race = getRace(raceId);
    const firstSlot = this.race.defaultWeaponPair[0];
    this.currentMeleeWeapon = firstSlot === 'brick' ? 'rod' : firstSlot;

    for (const obj of this.worldObjects) {
      this.scene.remove(obj);
      obj.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const m = child as THREE.Mesh;
          m.geometry.dispose();
          if (Array.isArray(m.material)) m.material.forEach((mat) => mat.dispose());
          else m.material.dispose();
        }
      });
    }
    this.worldObjects = [];
    this.skyDomeMesh = null;
    this.textures?.dispose();

    this.rigs.forEach((rig) => this.scene.remove(rig.root));
    this.rigs.clear();
    this.brickMeshes.forEach((m) => this.scene.remove(m));
    this.brickMeshes.clear();
    this.hazardMeshes.forEach((m) => {
      this.scene.remove(m);
      m.geometry.dispose();
    });
    this.hazardMeshes = [];
    this.pickupMeshes.forEach((g) => this.scene.remove(g));
    this.pickupMeshes.clear();

    this.scene.background = new THREE.Color(this.race.skyColor);
    this.scene.fog = new THREE.FogExp2(this.race.fogColor, this.race.fogDensity);
    this.sunLight.color.set(this.race.sunColor);
    this.sunLight.intensity = this.race.sunIntensity;
    this.hemiLight.color.set(this.race.hemiSkyColor);
    this.hemiLight.groundColor.set(this.race.hemiGroundColor);

    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.textures = createProceduralTextures(
      this.race.season,
      this.race.roadColor,
      maxAniso,
    );

    this.worldObjects = buildCityEnvironment(
      this.scene,
      this.race,
      this.textures,
      (z) => getTrackSurface(this.race.id, z),
    );
    this.skyDomeMesh = this.worldObjects.find((o) => o.name === 'skyDome') ?? null;

    const skin = BIKE_SKINS.find((s) => s.id === this.loadout.skinId) ?? BIKE_SKINS[0];
    const gear =
      RIDER_ACCESSORIES.find((a) => a.id === this.loadout.accessoryId) ?? RIDER_ACCESSORIES[0];

    this.racers = createInitialRacers(this.race, {
      name: this.loadout.name,
      bikeColor: skin.primaryColor,
      secondaryColor: skin.secondaryColor,
      helmetColor: gear.helmetColor,
      visorColor: gear.visorColor,
      jacketColor: gear.jacketColor,
    });

    for (const r of this.racers) {
      const rig = createBikeRiderRig(this.textures.shadowDiscMap, r.isPlayer);
      rig.applyCosmetics(
        r.bikeColor,
        r.secondaryColor,
        r.helmetColor,
        r.visorColor,
        r.jacketColor,
      );
      rig.setActiveWeapon(r.activeWeapon, r.attackSide);
      this.scene.add(rig.root);
      this.rigs.set(r.id, rig);
    }

    this.hazards = createTrackHazards(this.race);
    const coneMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.55 });
    const barrelMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.5, metalness: 0.35 });
    const snowMat = new THREE.MeshStandardMaterial({ color: 0xe0f2fe, roughness: 0.85 });
    const rampMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.45, metalness: 0.2 });

    for (const h of this.hazards) {
      const s = getTrackSurface(this.race.id, h.z);
      let mesh: THREE.Mesh;
      if (h.kind === 'ramp') {
        mesh = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.55, 3.2), rampMat);
        mesh.rotation.x = -0.18;
      } else if (h.kind === 'snowbank') {
        mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(0.95, 0), snowMat);
      } else if (h.kind === 'barrel') {
        mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 1.15, 10), barrelMat);
      } else {
        mesh = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.95, 8), coneMat);
      }
      mesh.position.set(s.xCenter + h.x, s.yElevation + (h.kind === 'ramp' ? 0.15 : 0.48), h.z);
      mesh.castShadow = !this.isSoftwareGl;
      this.scene.add(mesh);
      this.hazardMeshes.push(mesh);
    }

    // Spawn 3D Road Boosters & Petrol Cans
    this.pickups = createTrackPickups(this.race);
    for (const pk of this.pickups) {
      const s = getTrackSurface(this.race.id, pk.z);
      const grp = createPickupMesh(pk.kind);
      grp.position.set(s.xCenter + pk.x, s.yElevation, pk.z);
      this.scene.add(grp);
      this.pickupMeshes.set(pk.id, grp);
    }

    this.projectiles = [];
    this.elapsedTime = 0;
    this.countdownTimer = 2.6;
    this.lastCountdownBeep = 4;
    this.raceStarted = false;
    this.finishReported = false;
    this.topSpeedKmh = 0;
    this.fuelCollectedCount = 0;
    this.boostersHitCount = 0;
    this.brickHitsCount = 0;
    this.hitstopTimer = 0;
    this.cameraTrauma = 0;
    this.calloutText = '';
    this.calloutTimer = 0;
    this.syncRigsToPhysics(0.016);
    this.snapInitialCamera();
    this.emitHud();
  }

  private snapInitialCamera(): void {
    const player = this.racers.find((r) => r.isPlayer);
    if (!player) return;
    const surf = getTrackSurface(this.race.id, player.z);
    const aheadSurf = getTrackSurface(this.race.id, player.z + 18);
    this.camera.up.set(0, 1, 0);
    if (this.screenState === 'title') {
      this.camera.position.set(
        surf.xCenter + player.x + 5.8,
        surf.yElevation + 2.6,
        player.z - 5.2,
      );
      this.camera.lookAt(aheadSurf.xCenter, aheadSurf.yElevation + 1.5, player.z + 18);
    } else {
      this.camera.position.set(
        surf.xCenter + player.x * 0.78,
        surf.yElevation + 3.15,
        player.z - 6.6,
      );
      this.camera.lookAt(aheadSurf.xCenter, aheadSurf.yElevation + 1.35, player.z + 18);
    }
    if (this.skyDomeMesh) {
      this.skyDomeMesh.position.copy(this.camera.position);
    }
  }

  public startRace(raceId?: number): void {
    this.audio.unlock();
    if (typeof raceId === 'number') {
      this.loadRace(raceId);
    } else {
      this.loadRace(this.race.id);
    }
    this.keysPressed.clear();
    this.touchState = { throttle: false, brake: false, steerLeft: false, steerRight: false };
    this.screenState = 'playing';
    document.body.dataset.state = 'playing';
    this.renderer.domElement.focus();
  }

  public setScreenState(state: GameScreenState): void {
    this.screenState = state;
    document.body.dataset.state = state;
    if (state === 'paused' || state === 'title' || state === 'gameover') {
      this.audio.updateEngine(0, false, false);
      this.keysPressed.clear();
    }
  }

  public toggleMute(): boolean {
    return this.audio.toggleMute();
  }

  public isMuted(): boolean {
    return this.audio.isMuted();
  }

  public async toggleGyroscope(): Promise<boolean> {
    if (!this.gyroSupported) return false;
    if (!this.gyroEnabled) {
      const DOE = window.DeviceOrientationEvent as unknown as {
        requestPermission?: () => Promise<'granted' | 'denied'>;
      };
      if (typeof DOE?.requestPermission === 'function') {
        try {
          const res = await DOE.requestPermission();
          if (res !== 'granted') return false;
        } catch {
          return false;
        }
      }
      this.gyroBaselineGamma = null;
      this.gyroEnabled = true;
    } else {
      this.gyroEnabled = false;
      this.gyroTiltDeg = 0;
    }
    this.emitHud();
    return this.gyroEnabled;
  }

  public calibrateGyroscope(): void {
    this.gyroBaselineGamma = null;
  }

  public setTouchControl(
    control: 'throttle' | 'brake' | 'steerLeft' | 'steerRight',
    pressed: boolean,
  ): void {
    this.audio.unlock();
    this.touchState[control] = pressed;
  }

  public triggerMeleeAttack(): void {
    this.audio.unlock();
    this.pendingActionKind = 'weapon';
    this.pendingAttackWeapon = this.currentMeleeWeapon;
    this.attackBufferedTimer = 0.16;
  }

  public triggerBrickThrow(): void {
    this.audio.unlock();
    this.pendingActionKind = 'brick';
    this.pendingAttackWeapon = 'brick';
    this.attackBufferedTimer = 0.16;
  }

  public shiftMeleeWeapon(): void {
    this.audio.unlock();
    const idx = MELEE_WEAPONS.indexOf(this.currentMeleeWeapon);
    const next = MELEE_WEAPONS[(idx + 1) % MELEE_WEAPONS.length];
    this.currentMeleeWeapon = next;
    this.pendingWeaponSwitch = next;
    const player = this.racers.find((r) => r.isPlayer);
    if (player) {
      player.activeWeapon = next;
      this.rigs.get('player')?.setActiveWeapon(next, player.attackSide);
    }
    this.calloutText = `TOOL: ${WEAPONS[next].name.toUpperCase()}`;
    this.calloutTimer = 0.9;
    this.emitHud();
  }

  public triggerKick(side: 'left' | 'right'): void {
    this.audio.unlock();
    this.pendingActionKind = side === 'left' ? 'kick_left' : 'kick_right';
    this.pendingAttackWeapon = undefined;
    this.attackBufferedTimer = 0.16;
  }

  public updateRemoteRacers(
    players: { id: string; name: string; z: number; x: number; vz: number; hp: number; weapon: WeaponId }[],
    selfId: string,
  ): void {
    const now = performance.now();
    for (const p of players) {
      if (p.id === selfId) continue;
      this.remoteHumanStates.set(p.id, { ...p, lastSeen: now });
    }
  }

  private bindEvents(): void {
    window.addEventListener('resize', this.onResize);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onWindowBlur);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    window.addEventListener('deviceorientation', this.onDeviceOrientation);
  }

  private unbindEvents(): void {
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onWindowBlur);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    window.removeEventListener('deviceorientation', this.onDeviceOrientation);
  }

  private onResize = (): void => {
    if (this.disposed) return;
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / Math.max(1, h);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private onWindowBlur = (): void => {
    this.keysPressed.clear();
    this.touchState = { throttle: false, brake: false, steerLeft: false, steerRight: false };
  };

  private onVisibilityChange = (): void => {
    if (document.hidden) {
      this.keysPressed.clear();
      this.touchState = { throttle: false, brake: false, steerLeft: false, steerRight: false };
    }
  };

  private onDeviceOrientation = (ev: DeviceOrientationEvent): void => {
    if (!this.gyroEnabled || ev.gamma === null) return;
    if (this.gyroBaselineGamma === null) {
      this.gyroBaselineGamma = ev.gamma;
    }
    const delta = ev.gamma - this.gyroBaselineGamma;
    this.gyroTiltDeg = Math.max(-45, Math.min(45, delta));
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    const code = e.code;
    if (code === 'Escape' || code === 'KeyP') {
      if (this.screenState === 'playing') {
        e.preventDefault();
        this.callbacks.onPauseRequest();
      }
      return;
    }
    if (code === 'KeyM') {
      this.toggleMute();
      return;
    }
    if (this.screenState !== 'playing') return;

    if (
      code === 'Space' ||
      code === 'ArrowUp' ||
      code === 'ArrowDown' ||
      code === 'ArrowLeft' ||
      code === 'ArrowRight'
    ) {
      e.preventDefault();
    }

    this.audio.unlock();
    const wasDown = this.keysPressed.has(code);
    this.keysPressed.add(code);

    if (!wasDown) {
      if (code === 'KeyA') {
        this.triggerKick('left');
      } else if (code === 'KeyD') {
        this.triggerKick('right');
      } else if (code === 'Space' || code === 'KeyJ') {
        this.triggerMeleeAttack();
      } else if (code === 'KeyB' || code === 'KeyK') {
        this.triggerBrickThrow();
      } else if (code === 'KeyQ' || code === 'KeyE' || code === 'Digit1' || code === 'ShiftLeft') {
        this.shiftMeleeWeapon();
      }
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keysPressed.delete(e.code);
  };

  private spawnBurst(x: number, y: number, z: number, count: number, colorHex: number): void {
    let spawned = 0;
    for (let i = 0; i < this.particleCount && spawned < count; i++) {
      const slot = this.particles[i];
      if (!slot.active) {
        slot.active = true;
        slot.x = x;
        slot.y = y;
        slot.z = z;
        slot.vx = (Math.random() - 0.5) * 10;
        slot.vy = 2 + Math.random() * 6;
        slot.vz = (Math.random() - 0.5) * 10;
        slot.life = 0;
        slot.maxLife = 0.25 + Math.random() * 0.28;
        slot.scale = 0.7 + Math.random() * 0.9;
        slot.color = colorHex;
        spawned++;
      }
    }
  }

  private tick = (): void => {
    if (this.disposed) return;

    const nowMs = performance.now();
    const rawDt = (nowMs - this.lastTimeMs) / 1000;
    this.lastTimeMs = nowMs;
    const dt = Math.min(Math.max(rawDt, 0.001), 0.05);

    if (this.screenState === 'title') {
      this.titleOrbitAngle += dt * 0.26;
      this.updateTitleCamera(dt);
      this.updateWeather(dt);
    } else if (this.screenState === 'playing') {
      this.stepGameplay(dt);
    }

    if (this.skyDomeMesh) {
      this.skyDomeMesh.position.copy(this.camera.position);
    }

    this.renderer.render(this.scene, this.camera);

    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  };

  private afterDraw(cb: () => void): void {
    try {
      const gl = this.renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      let polls = 0;
      const poll = () => {
        if (this.disposed) return;
        polls++;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED && polls < 10) {
          this.frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          this.frameId = window.setTimeout(cb, 80);
        }
      };
      this.frameId = window.setTimeout(poll, 5);
    } catch {
      this.frameId = window.setTimeout(cb, 80);
    }
  }

  private stepGameplay(dt: number): void {
    if (this.calloutTimer > 0) {
      this.calloutTimer = Math.max(0, this.calloutTimer - dt);
      if (this.calloutTimer === 0) this.calloutText = '';
    }

    if (!this.raceStarted) {
      this.countdownTimer -= dt;
      const ceilVal = Math.ceil(this.countdownTimer);
      if (ceilVal < this.lastCountdownBeep && ceilVal >= 0) {
        this.lastCountdownBeep = ceilVal;
        this.audio.playCountdownBeep(ceilVal === 0);
      }
      if (this.countdownTimer <= 0) {
        this.raceStarted = true;
        this.calloutText = 'GO!';
        this.calloutTimer = 1.0;
      }
    }

    const now = performance.now();
    let slotIdx = 1;
    this.remoteHumanStates.forEach((remote, id) => {
      if (now - remote.lastSeen > 5000) {
        this.remoteHumanStates.delete(id);
        return;
      }
      if (slotIdx < this.racers.length) {
        const target = this.racers[slotIdx++];
        target.isRemoteHuman = true;
        target.name = remote.name;
        target.z += (remote.z - target.z) * 0.35;
        target.x += (remote.x - target.x) * 0.35;
        target.vz = remote.vz;
        target.hp = remote.hp;
        target.activeWeapon = remote.weapon;
      }
    });

    if (this.hitstopTimer > 0) {
      this.hitstopTimer = Math.max(0, this.hitstopTimer - dt);
    } else {
      if (this.raceStarted) {
        this.elapsedTime += dt;
      }

      const kLeft = this.keysPressed.has('ArrowLeft') || this.touchState.steerLeft;
      const kRight = this.keysPressed.has('ArrowRight') || this.touchState.steerRight;
      let steer = (kRight ? 1 : 0) - (kLeft ? 1 : 0);
      if (this.gyroEnabled && Math.abs(this.gyroTiltDeg) > 3.5) {
        steer = Math.max(-1, Math.min(1, this.gyroTiltDeg / 24));
      }

      const throttle =
        this.keysPressed.has('KeyW') ||
        this.keysPressed.has('ArrowUp') ||
        this.touchState.throttle;
      const brake =
        this.keysPressed.has('KeyS') ||
        this.keysPressed.has('ArrowDown') ||
        this.touchState.brake;

      let attackJustPressed = false;
      if (this.attackBufferedTimer > 0) {
        this.attackBufferedTimer = Math.max(0, this.attackBufferedTimer - dt);
        const player = this.racers.find((r) => r.isPlayer);
        if (player && player.attackState === 'idle' && player.attackCooldown <= 0) {
          attackJustPressed = true;
          this.attackBufferedTimer = 0;
        }
      }

      const events = stepRacePhysics(
        this.racers,
        this.projectiles,
        this.hazards,
        this.pickups,
        this.race,
        {
          throttle,
          brake,
          steer,
          attackJustPressed,
          attackAction: this.pendingActionKind,
          attackWeapon: this.pendingAttackWeapon,
          switchWeapon: this.pendingWeaponSwitch,
          weaponTier: this.loadout.weaponTier,
          boosterTier: this.loadout.boosterTier,
        },
        this.elapsedTime,
        dt,
        this.raceStarted,
      );
      this.pendingWeaponSwitch = undefined;

      const player = this.racers.find((r) => r.isPlayer)!;
      const speedKmh = player.vz * 3.6;
      if (speedKmh > this.topSpeedKmh) this.topSpeedKmh = speedKmh;
      this.audio.updateEngine(speedKmh, throttle || player.boostTimer > 0, this.raceStarted && player.knockdownTimer <= 0);

      if (events.playerAttacked) {
        this.audio.playAttackSwing(events.playerAttacked);
      }

      for (const pk of events.pickups) {
        this.audio.playPickup(pk.kind);
        const surf = getTrackSurface(this.race.id, pk.z);
        this.spawnBurst(
          surf.xCenter + pk.x,
          surf.yElevation + pk.y,
          pk.z,
          14,
          pk.kind === 'booster' ? 0x38bdf8 : 0x22c55e,
        );
        if (pk.kind === 'booster') {
          this.boostersHitCount += 1;
          this.calloutText = `TURBO BOOST T${this.loadout.boosterTier}!`;
          this.calloutTimer = 1.35;
        } else {
          this.fuelCollectedCount += 1;
          this.calloutText = 'PETROL REFILLED +42%';
          this.calloutTimer = 1.25;
        }
      }

      for (const hit of events.hitImpacts) {
        this.audio.playHitImpact(hit.weapon, hit.knockout);
        if (hit.attackerId === 'player' && hit.weapon === 'brick') {
          this.brickHitsCount += 1;
        }
        const surf = getTrackSurface(this.race.id, hit.z);
        this.spawnBurst(
          surf.xCenter + hit.x,
          surf.yElevation + hit.y,
          hit.z,
          hit.knockout ? 24 : 12,
          hit.weapon === 'brick' ? 0xd97706 : 0xfbbf24,
        );
        if (hit.attackerId === 'player' || hit.targetId === 'player') {
          this.hitstopTimer = hit.knockout ? 0.06 : 0.035;
          this.cameraTrauma = Math.min(1, this.cameraTrauma + (hit.knockout ? 0.7 : 0.4));
          if (hit.knockout && hit.attackerId === 'player') {
            this.calloutText = 'KNOCKOUT! +150';
            this.calloutTimer = 1.6;
          }
        }
      }
      for (const col of events.collisions) {
        this.audio.playCollision(col.intensity);
        const surf = getTrackSurface(this.race.id, col.z);
        this.spawnBurst(surf.xCenter + col.x, surf.yElevation + col.y, col.z, 8, 0xf97316);
        this.cameraTrauma = Math.min(1, this.cameraTrauma + col.intensity * 0.45);
      }

      if (player.finished && !this.finishReported) {
        this.finishReported = true;
        this.triggerFinishModal();
      }
    }

    this.syncRigsToPhysics(dt);
    this.syncPickups(dt);
    this.syncProjectiles();
    this.updateParticles(dt);
    this.updateWeather(dt);
    this.updateChaseCamera(dt);

    this.hudEmitAccum += dt;
    if (this.hudEmitAccum >= 0.1) {
      this.hudEmitAccum = 0;
      this.emitHud();
    }

    this.netEmitAccum += dt;
    if (this.netEmitAccum >= 0.08 && this.callbacks.onMultiplayerSync) {
      this.netEmitAccum = 0;
      const p = this.racers.find((r) => r.isPlayer)!;
      this.callbacks.onMultiplayerSync({
        z: p.z,
        x: p.x,
        vz: p.vz,
        hp: p.hp,
        weapon: p.activeWeapon,
        attacking: p.attackState === 'active',
      });
    }
  }

  private triggerFinishModal(): void {
    const player = this.racers.find((r) => r.isPlayer)!;
    const won = player.rank === 1;
    this.audio.playFinishSting(won);
    this.audio.updateEngine(0, false, false);

    const standings = [...this.racers]
      .sort((a, b) => a.rank - b.rank)
      .map((r) => ({
        rank: r.rank,
        name: r.name,
        isPlayer: r.isPlayer,
        timeSeconds: r.finishTime,
        hp: Math.round(r.hp),
      }));

    const baseReward = Math.max(75, (12 - player.rank) * 40);
    const koBonus = player.knockouts * 55;
    const pickupBonus = this.fuelCollectedCount * 18 + this.boostersHitCount * 22;
    const winBonus = won ? 200 + this.race.id * 45 : 0;
    const unlockedNext =
      won &&
      this.race.id >= this.loadout.highestUnlockedRace &&
      this.race.id < RACES.length - 1;
    const stageBonusCoins = unlockedNext ? 250 + (this.race.id + 1) * 40 : 0;

    const result: RaceResultSnapshot = {
      raceId: this.race.id,
      city: this.race.city,
      season: this.race.season,
      difficulty: this.race.difficulty,
      won,
      rank: player.rank,
      totalRacers: this.racers.length,
      timeSeconds: player.finishTime ?? this.elapsedTime,
      knockouts: player.knockouts,
      fuelCollected: this.fuelCollectedCount,
      boostersHit: this.boostersHitCount,
      brickHits: this.brickHitsCount,
      coinsEarned: baseReward + koBonus + pickupBonus + winBonus + stageBonusCoins,
      stageBonusCoins,
      unlockedNextRace: unlockedNext,
      topSpeedKmh: Math.round(this.topSpeedKmh),
      standings,
    };

    this.screenState = 'gameover';
    document.body.dataset.state = 'gameover';
    this.callbacks.onRaceFinish(result);
  }

  private syncRigsToPhysics(dt: number): void {
    for (const r of this.racers) {
      const rig = this.rigs.get(r.id);
      if (!rig) continue;

      const surf = getTrackSurface(this.race.id, r.z);
      rig.root.position.set(
        surf.xCenter + r.x,
        surf.yElevation + r.yOffset,
        r.z,
      );
      rig.root.rotation.set(-surf.pitch, 0, surf.bankAngle);

      const knockdownRoll = r.knockdownTimer > 0 ? 1.15 : 0;
      rig.chassisGroup.rotation.z = r.leanAngle + knockdownRoll;
      rig.chassisGroup.position.y = r.suspensionOffset;
      rig.boostFlames.visible = r.boostTimer > 0;
      if (rig.boostFlames.visible) {
        const pulse = 0.85 + Math.sin(this.elapsedTime * 38) * 0.25;
        rig.boostFlames.scale.set(1, 1, pulse);
      }

      const wheelRot = (r.vz * dt) / 0.34;
      rig.frontWheel.rotation.x += wheelRot;
      rig.rearWheel.rotation.x += wheelRot;

      if (r.riderDetached) {
        rig.riderGroup.position.set(
          r.riderEjectPos.x,
          0.82 + r.riderEjectPos.y,
          r.riderEjectPos.z,
        );
        rig.riderGroup.rotation.set(r.riderSpin, r.riderSpin * 0.7, r.riderSpin * 0.5);
      } else {
        rig.riderGroup.position.set(0, 0.82 + r.suspensionOffset * 0.6, -0.14);
        rig.riderGroup.rotation.set(r.riderCrouch * 0.25, 0, r.riderTorsoLean);
      }

      // Display weapon on active swing side (-1 Left = +X, +1 Right = -X)
      const displaySide: -1 | 1 = r.attackState === 'idle' ? 1 : r.attackSide;
      const displayWeapon: WeaponId =
        r.attackState !== 'idle' && r.attackKind === 'brick' ? 'brick' : r.activeWeapon;
      rig.setActiveWeapon(displayWeapon, displaySide);
      rig.telegraphRing.visible = r.telegraphing;

      rig.leftArmGroup.rotation.set(0, 0, 0);
      rig.rightArmGroup.rotation.set(0, 0, 0);
      rig.leftLegGroup.rotation.set(0, 0, 0);
      rig.rightLegGroup.rotation.set(0, 0, 0);
      rig.leftSwingArc.visible = false;
      rig.rightSwingArc.visible = false;

      if (r.attackState !== 'idle') {
        const isKick = r.attackKind === 'kick_left' || r.attackKind === 'kick_right';
        if (isKick) {
          const isLeft = r.attackKind === 'kick_left';
          const kickLeg = isLeft ? rig.leftLegGroup : rig.rightLegGroup;
          // Screen Left (+X) requires positive rotation.z; Screen Right (-X) requires negative rotation.z
          const worldSwingDir = isLeft ? 1 : -1;
          if (r.attackState === 'windup') {
            kickLeg.rotation.set(0.35, 0, worldSwingDir * 0.45);
          } else if (r.attackState === 'active') {
            kickLeg.rotation.set(-0.35, 0, worldSwingDir * 1.48);
            rig.leftSwingArc.visible = isLeft;
            rig.rightSwingArc.visible = !isLeft;
          } else {
            kickLeg.rotation.set(-0.1, 0, worldSwingDir * 0.45);
          }
        } else {
          // Left (-1 -> +X) OR Right (+1 -> -X) side arm swing
          const isLeft = r.attackSide < 0;
          const arm = isLeft ? rig.leftArmGroup : rig.rightArmGroup;
          const worldSwingDir = isLeft ? 1 : -1;
          if (r.attackState === 'windup') {
            arm.rotation.set(-0.65, 0, -worldSwingDir * 0.85);
          } else if (r.attackState === 'active') {
            arm.rotation.set(0.5, worldSwingDir * 0.35, worldSwingDir * 1.55);
            rig.leftSwingArc.visible = isLeft && r.attackKind !== 'brick';
            rig.rightSwingArc.visible = !isLeft && r.attackKind !== 'brick';
          } else {
            arm.rotation.set(0.12, 0, worldSwingDir * 0.42);
          }
        }
      }

      const flash = r.hitFlashTimer > 0 ? 0.65 : 0;
      for (const mat of rig.hitFlashMaterials) {
        mat.emissive.setHex(flash > 0 ? 0xffffff : 0x000000);
        mat.emissiveIntensity = flash;
      }
    }
  }

  private syncPickups(dt: number): void {
    for (const pk of this.pickups) {
      const grp = this.pickupMeshes.get(pk.id);
      if (!grp) continue;
      grp.visible = !pk.collected;
      if (pk.collected) continue;
      if (pk.kind === 'petrol') {
        grp.rotation.y += 2.2 * dt;
      }
    }
  }

  private syncProjectiles(): void {
    const activeIds = new Set<number>();
    for (const p of this.projectiles) {
      if (!p.active) continue;
      activeIds.add(p.id);
      let mesh = this.brickMeshes.get(p.id);
      if (!mesh) {
        mesh = new THREE.Mesh(this.brickGeo, this.brickMat);
        this.scene.add(mesh);
        this.brickMeshes.set(p.id, mesh);
      }
      const surf = getTrackSurface(this.race.id, p.z);
      mesh.position.set(surf.xCenter + p.x, surf.yElevation + p.y, p.z);
      mesh.rotation.set(p.rotX, p.rotY, 0);
    }

    this.brickMeshes.forEach((mesh, id) => {
      if (!activeIds.has(id)) {
        this.scene.remove(mesh);
        this.brickMeshes.delete(id);
      }
    });
  }

  private updateParticles(dt: number): void {
    let changed = false;
    for (let i = 0; i < this.particleCount; i++) {
      const slot = this.particles[i];
      if (!slot.active) continue;
      changed = true;
      slot.life += dt;
      if (slot.life >= slot.maxLife) {
        slot.active = false;
        _dummy.position.set(0, -100, 0);
        _dummy.scale.set(0, 0, 0);
      } else {
        slot.vy -= 14 * dt;
        slot.x += slot.vx * dt;
        slot.y += slot.vy * dt;
        slot.z += slot.vz * dt;
        const s = slot.scale * (1 - slot.life / slot.maxLife);
        _dummy.position.set(slot.x, slot.y, slot.z);
        _dummy.scale.set(s, s, s);
      }
      _dummy.updateMatrix();
      this.particleInstanced.setMatrixAt(i, _dummy.matrix);
      this.particleInstanced.setColorAt(i, _colorTmp.setHex(slot.color));
    }
    if (changed) {
      this.particleInstanced.instanceMatrix.needsUpdate = true;
      if (this.particleInstanced.instanceColor) {
        this.particleInstanced.instanceColor.needsUpdate = true;
      }
    }
  }

  private updateWeather(dt: number): void {
    const player = this.racers.find((r) => r.isPlayer);
    if (!player) return;
    const surf = getTrackSurface(this.race.id, player.z);
    const season = this.race.season;

    let colorHex = 0xfbbf24;
    let sx = 0.14;
    let sy = 0.14;
    if (season === 'Spring') {
      colorHex = 0xf9a8d4;
      sx = 0.22;
      sy = 0.08;
    } else if (season === 'Winter') {
      colorHex = 0xf8fafc;
      sx = 0.18;
      sy = 0.18;
    } else if (season === 'Monsoon') {
      colorHex = 0x93c5fd;
      sx = 0.05;
      sy = 0.75;
    } else if (season === 'Summer') {
      colorHex = 0x86efac;
      sx = 0.12;
      sy = 0.12;
    }

    for (let i = 0; i < this.weatherCount; i++) {
      const w = this.weatherOffsets[i];
      w.y -= w.speed * (season === 'Monsoon' ? 2.6 : 0.7) * dt;
      w.x += Math.sin(this.elapsedTime + i) * 1.1 * dt;
      if (w.y < 0) w.y = 18;
      _dummy.position.set(
        surf.xCenter + player.x + w.x,
        surf.yElevation + w.y,
        player.z + w.z + 18,
      );
      _dummy.scale.set(sx, sy, sx);
      _dummy.updateMatrix();
      this.weatherInstanced.setMatrixAt(i, _dummy.matrix);
      this.weatherInstanced.setColorAt(i, _colorTmp.setHex(colorHex));
    }
    this.weatherInstanced.instanceMatrix.needsUpdate = true;
    if (this.weatherInstanced.instanceColor) {
      this.weatherInstanced.instanceColor.needsUpdate = true;
    }
  }

  private updateTitleCamera(dt: number): void {
    const player = this.racers.find((r) => r.isPlayer);
    if (!player) return;
    const surf = getTrackSurface(this.race.id, player.z);
    const targetX = surf.xCenter + player.x;
    const targetY = surf.yElevation + 1.1;
    const targetZ = player.z;

    const radius = 8.2;
    _camTargetPos.set(
      targetX + Math.sin(this.titleOrbitAngle) * radius,
      targetY + 2.4 + Math.sin(this.titleOrbitAngle * 0.5) * 0.5,
      targetZ - Math.cos(this.titleOrbitAngle) * radius,
    );
    this.camera.up.set(0, 1, 0);
    this.camera.position.lerp(_camTargetPos, 1 - Math.exp(-3.5 * dt));
    _camLookTarget.set(targetX + 1.2, targetY + 0.6, targetZ + 18);
    this.camera.lookAt(_camLookTarget);
  }

  private updateChaseCamera(dt: number): void {
    const player = this.racers.find((r) => r.isPlayer);
    if (!player) return;
    const surf = getTrackSurface(this.race.id, player.z);
    const aheadSurf = getTrackSurface(this.race.id, player.z + 16);

    const boostFovAdd = player.boostTimer > 0 ? 7 : 0;
    const targetFov = 62 + Math.min(20, (player.vz * 3.6) / 13) + boostFovAdd;
    this.camera.fov += (targetFov - this.camera.fov) * (1 - Math.exp(-5 * dt));
    this.camera.updateProjectionMatrix();

    _camTargetPos.set(
      surf.xCenter + player.x * 0.78,
      surf.yElevation + 3.15 + player.yOffset * 0.65,
      player.z - 6.6,
    );
    this.camera.position.lerp(_camTargetPos, 1 - Math.exp(-11 * dt));

    this.cameraTrauma = Math.max(0, this.cameraTrauma - dt * 1.9);
    const shake = this.cameraTrauma * this.cameraTrauma;
    const shakeX = (Math.random() - 0.5) * shake * 0.75;
    const shakeY = (Math.random() - 0.5) * shake * 0.55;

    const camRoll = -player.leanAngle * 0.14;
    this.camera.up.set(Math.sin(camRoll), Math.cos(camRoll), 0);

    _camLookTarget.set(
      aheadSurf.xCenter + player.x * 0.5 + shakeX,
      aheadSurf.yElevation + 1.35 + player.yOffset * 0.5 + shakeY,
      player.z + 18,
    );
    this.camera.lookAt(_camLookTarget);

    this.sunLight.position.set(
      surf.xCenter + 24,
      surf.yElevation + 44,
      player.z - 16,
    );
    this.sunLight.target.position.set(surf.xCenter, surf.yElevation, player.z + 20);
  }

  private emitHud(): void {
    const player = this.racers.find((r) => r.isPlayer);
    if (!player) return;
    const weaponDef = WEAPONS[this.currentMeleeWeapon];
    const cooldownPct = Math.min(1, player.attackCooldown / weaponDef.cooldown);
    const brickCooldownPct = Math.min(1, player.attackCooldown / WEAPONS.brick.cooldown);

    let nearbyWarning: 'left' | 'right' | null = null;
    for (const r of this.racers) {
      if (!r.isPlayer && r.telegraphing && Math.abs(r.z - player.z) < 5) {
        // Screen Left = +X
        nearbyWarning = r.x >= player.x ? 'left' : 'right';
        break;
      }
    }

    const countdownText = this.raceStarted
      ? ''
      : this.countdownTimer > 0.2
        ? String(Math.ceil(this.countdownTimer))
        : 'GO!';

    this.callbacks.onHudUpdate({
      speedKmh: Math.round(player.vz * 3.6),
      rank: player.rank,
      totalRacers: this.racers.length,
      progressPct: Math.min(100, Math.round((player.z / this.race.lengthMeters) * 100)),
      elapsedTime: this.elapsedTime,
      hp: Math.round(player.hp),
      maxHp: player.maxHp,
      fuel: Math.round(player.fuel),
      maxFuel: player.maxFuel,
      boostActive: player.boostTimer > 0,
      boostTimer: Number(player.boostTimer.toFixed(1)),
      weaponTier: this.loadout.weaponTier,
      boosterTier: this.loadout.boosterTier,
      activeWeapon: player.activeWeapon,
      meleeWeapon: this.currentMeleeWeapon,
      weaponCooldownPct: cooldownPct,
      brickCooldownPct,
      knockouts: player.knockouts,
      fuelCollected: this.fuelCollectedCount,
      boostersHit: this.boostersHitCount,
      calloutText: this.calloutText,
      countdownText,
      gyroEnabled: this.gyroEnabled,
      gyroSupported: this.gyroSupported,
      gyroTiltDeg: Math.round(this.gyroTiltDeg),
      // Screen Left (+X) maps to negative xNorm so minimap left edge matches screen left!
      minimapRacers: this.racers.map((r) => ({
        xNorm: -r.x / this.race.roadHalfWidth,
        zNorm: Math.max(0, Math.min(1, r.z / this.race.lengthMeters)),
        isPlayer: r.isPlayer,
      })),
      nearbyWarning,
    });
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    this.unbindEvents();
    this.audio.dispose();
    this.textures?.dispose();
    this.brickGeo.dispose();
    this.brickMat.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
