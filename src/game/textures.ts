import * as THREE from 'three';
import type { SeasonType } from './types';

export interface ProceduralTextureSet {
  roadMap: THREE.CanvasTexture;
  roadBump: THREE.CanvasTexture;
  terrainMap: THREE.CanvasTexture;
  buildingMap: THREE.CanvasTexture;
  shadowDiscMap: THREE.CanvasTexture;
  finishBannerMap: THREE.CanvasTexture;
  dispose: () => void;
}

export function createProceduralTextures(
  season: SeasonType,
  roadColorHex: string,
  maxAnisotropy: number,
): ProceduralTextureSet {
  const aniso = Math.max(1, Math.min(8, maxAnisotropy));

  // 1. Road Asphalt Texture (4-lane highway with dashed dividers, shoulders, aggregate speckle)
  const roadCanvas = document.createElement('canvas');
  roadCanvas.width = 512;
  roadCanvas.height = 512;
  const rCtx = roadCanvas.getContext('2d')!;
  rCtx.fillStyle = roadColorHex;
  rCtx.fillRect(0, 0, 512, 512);

  // Subtle aggregate grain
  for (let i = 0; i < 4200; i++) {
    const x = (Math.sin(i * 19.3) * 0.5 + 0.5) * 512;
    const y = (Math.cos(i * 73.1) * 0.5 + 0.5) * 512;
    const shade = i % 2 === 0 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.12)';
    rCtx.fillStyle = shade;
    rCtx.fillRect(x, y, 2, 2);
  }

  // Wet reflection streaks for Monsoon
  if (season === 'Monsoon') {
    rCtx.fillStyle = 'rgba(110, 165, 255, 0.10)';
    rCtx.fillRect(60, 0, 120, 512);
    rCtx.fillRect(320, 0, 110, 512);
  } else if (season === 'Winter') {
    // Frost along road shoulders
    rCtx.fillStyle = 'rgba(226, 240, 252, 0.38)';
    rCtx.fillRect(0, 0, 36, 512);
    rCtx.fillRect(476, 0, 36, 512);
  }

  // Solid outer shoulder lines
  rCtx.fillStyle = season === 'Monsoon' ? '#f59e0b' : '#f4f4f5';
  rCtx.fillRect(24, 0, 8, 512);
  rCtx.fillRect(480, 0, 8, 512);

  // Center double yellow / amber line
  rCtx.fillStyle = '#f59e0b';
  rCtx.fillRect(248, 0, 5, 512);
  rCtx.fillRect(259, 0, 5, 512);

  // Dashed inner lane lines
  rCtx.fillStyle = 'rgba(244, 244, 245, 0.85)';
  for (let y = 16; y < 512; y += 96) {
    rCtx.fillRect(136, y, 6, 48);
    rCtx.fillRect(370, y, 6, 48);
  }

  const roadMap = new THREE.CanvasTexture(roadCanvas);
  roadMap.colorSpace = THREE.SRGBColorSpace;
  roadMap.wrapS = THREE.RepeatWrapping;
  roadMap.wrapT = THREE.RepeatWrapping;
  roadMap.repeat.set(1, 22);
  roadMap.anisotropy = aniso;

  // 2. Road Bump Map (linear space)
  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = 256;
  bumpCanvas.height = 256;
  const bCtx = bumpCanvas.getContext('2d')!;
  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2500; i++) {
    const x = (Math.sin(i * 41.7) * 0.5 + 0.5) * 256;
    const y = (Math.cos(i * 91.2) * 0.5 + 0.5) * 256;
    bCtx.fillStyle = i % 2 === 0 ? '#a8a8a8' : '#585858';
    bCtx.fillRect(x, y, 2, 2);
  }
  const roadBump = new THREE.CanvasTexture(bumpCanvas);
  roadBump.wrapS = THREE.RepeatWrapping;
  roadBump.wrapT = THREE.RepeatWrapping;
  roadBump.repeat.set(2, 36);

  // 3. Seasonal Ground Terrain Texture
  const terrainCanvas = document.createElement('canvas');
  terrainCanvas.width = 256;
  terrainCanvas.height = 256;
  const tCtx = terrainCanvas.getContext('2d')!;
  const baseTerrain: Record<SeasonType, [string, string]> = {
    Autumn: ['#7c5c38', '#966c41'],
    Summer: ['#245224', '#316e2c'],
    Spring: ['#3f6b3a', '#558749'],
    Winter: ['#d7e6f2', '#c0d5e6'],
    Monsoon: ['#1b212e', '#262e3e'],
  };
  const [tBase, tPatch] = baseTerrain[season];
  tCtx.fillStyle = tBase;
  tCtx.fillRect(0, 0, 256, 256);
  tCtx.fillStyle = tPatch;
  for (let i = 0; i < 180; i++) {
    const x = (Math.sin(i * 12.1) * 0.5 + 0.5) * 256;
    const y = (Math.cos(i * 33.7) * 0.5 + 0.5) * 256;
    tCtx.fillRect(x, y, 16, 10);
  }
  const terrainMap = new THREE.CanvasTexture(terrainCanvas);
  terrainMap.colorSpace = THREE.SRGBColorSpace;
  terrainMap.wrapS = THREE.RepeatWrapping;
  terrainMap.wrapT = THREE.RepeatWrapping;
  terrainMap.repeat.set(16, 80);
  terrainMap.anisotropy = aniso;

  // 4. City Building Facade Windows Texture
  const bldgCanvas = document.createElement('canvas');
  bldgCanvas.width = 256;
  bldgCanvas.height = 512;
  const wCtx = bldgCanvas.getContext('2d')!;
  const isNight = season === 'Monsoon';
  wCtx.fillStyle = isNight ? '#111827' : '#d6d3d1';
  wCtx.fillRect(0, 0, 256, 512);

  for (let row = 0; row < 16; row++) {
    for (let col = 0; col < 6; col++) {
      const lit = ((row * 7 + col * 13) % 5) !== 0;
      if (isNight) {
        wCtx.fillStyle = lit
          ? (row + col) % 3 === 0
            ? '#38bdf8'
            : '#fbbf24'
          : '#1e293b';
      } else {
        wCtx.fillStyle = lit ? '#475569' : '#64748b';
      }
      wCtx.fillRect(14 + col * 39, 14 + row * 31, 24, 20);
    }
  }
  const buildingMap = new THREE.CanvasTexture(bldgCanvas);
  buildingMap.colorSpace = THREE.SRGBColorSpace;
  buildingMap.wrapS = THREE.RepeatWrapping;
  buildingMap.wrapT = THREE.RepeatWrapping;
  buildingMap.anisotropy = aniso;

  // 5. Soft Radial Contact Shadow Disc
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 128;
  shadowCanvas.height = 128;
  const sCtx = shadowCanvas.getContext('2d')!;
  const grad = sCtx.createRadialGradient(64, 64, 6, 64, 64, 60);
  grad.addColorStop(0, 'rgba(0,0,0,0.68)');
  grad.addColorStop(0.6, 'rgba(0,0,0,0.28)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  sCtx.fillStyle = grad;
  sCtx.fillRect(0, 0, 128, 128);
  const shadowDiscMap = new THREE.CanvasTexture(shadowCanvas);

  // 6. Checkered Finish Arch Banner
  const finishCanvas = document.createElement('canvas');
  finishCanvas.width = 512;
  finishCanvas.height = 128;
  const fCtx = finishCanvas.getContext('2d')!;
  const sq = 32;
  for (let y = 0; y < 128; y += sq) {
    for (let x = 0; x < 512; x += sq) {
      fCtx.fillStyle = ((x / sq + y / sq) % 2 === 0) ? '#fafafa' : '#18181b';
      fCtx.fillRect(x, y, sq, sq);
    }
  }
  fCtx.fillStyle = 'rgba(245, 158, 11, 0.92)';
  fCtx.fillRect(156, 36, 200, 56);
  fCtx.fillStyle = '#09090b';
  fCtx.font = 'bold 34px sans-serif';
  fCtx.textAlign = 'center';
  fCtx.textBaseline = 'middle';
  fCtx.fillText('FINISH', 256, 65);
  const finishBannerMap = new THREE.CanvasTexture(finishCanvas);
  finishBannerMap.colorSpace = THREE.SRGBColorSpace;

  return {
    roadMap,
    roadBump,
    terrainMap,
    buildingMap,
    shadowDiscMap,
    finishBannerMap,
    dispose: () => {
      roadMap.dispose();
      roadBump.dispose();
      terrainMap.dispose();
      buildingMap.dispose();
      shadowDiscMap.dispose();
      finishBannerMap.dispose();
    },
  };
}
