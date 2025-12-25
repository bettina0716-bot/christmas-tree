import React, { useMemo, useRef, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { TreeMode } from '../types';

interface OrnamentsProps {
  mode: TreeMode;
  count: number;
}

type OrnamentType = 'ball' | 'gift' | 'light';

interface InstanceData {
  chaosPos: THREE.Vector3;
  targetPos: THREE.Vector3;
  type: OrnamentType;
  color: THREE.Color;
  scale: number;
  speed: number;
  rotationOffset: THREE.Euler;
}

export const Ornaments: React.FC<OrnamentsProps> = ({ mode, count }) => {
  const ballsRef = useRef<THREE.InstancedMesh>(null);
  const giftsRef = useRef<THREE.InstancedMesh>(null);
  const lightsRef = useRef<THREE.InstancedMesh>(null);
  
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const { ballsData, giftsData, lightsData } = useMemo(() => {
    const _balls: InstanceData[] = [];
    const _gifts: InstanceData[] = [];
    const _lights: InstanceData[] = [];

    const height = 11;
    const maxRadius = 4.5;
    
    // --- 修改：改为梦幻冰蓝调色板 ---
    const iceBlue = new THREE.Color("#4B9CD3");  // 经典冰蓝
    const cyanBlue = new THREE.Color("#0ea5e9"); // 晴空蓝
    const crystalWhite = new THREE.Color("#f0f9ff"); // 晶莹白
    const silver = new THREE.Color("#e2e8f0");    // 银灰色
    
    const palette = [iceBlue, cyanBlue, crystalWhite, silver];

    for (let i = 0; i < count; i++) {
      const rnd = Math.random();
      let type: OrnamentType = 'ball';
      if (rnd > 0.8) type = 'gift';
      if (rnd > 0.9) type = 'light';

      const yNorm = Math.pow(Math.random(), 2.5);
      const y = yNorm * height + 0.5;
      const rScale = (1 - yNorm);
      const theta = y * 10 + Math.random() * Math.PI * 2;
      
      const r = maxRadius * rScale + (Math.random() * 0.5);
      
      const targetPos = new THREE.Vector3(
        r * Math.cos(theta),
        y,
        r * Math.sin(theta)
      );

      const cR = 15 + Math.random() * 15;
      const cTheta = Math.random() * Math.PI * 2;
      const cPhi = Math.acos(2 * Math.random() - 1);
      const chaosPos = new THREE.Vector3(
        cR * Math.sin(cPhi) * Math.cos(cTheta),
        cR * Math.sin(cPhi) * Math.sin(cTheta) + 5,
        cR * Math.cos(cPhi)
      );

      const scale = type === 'light' ? 0.15 : (0.2 + Math.random() * 0.25);
      
      // --- 修改：灯光颜色也改为冰白/淡蓝 ---
      const color = type === 'light' ? new THREE.Color("#e0f2fe") : palette[Math.floor(Math.random() * palette.length)];

      const data: InstanceData = {
        chaosPos,
        targetPos,
        type,
        color,
        scale,
        speed: 0.5 + Math.random() * 1.5,
        rotationOffset: new THREE.Euler(Math.random() * Math.PI, Math.random() * Math.PI, 0)
      };

      if (type === 'ball') _balls.push(data);
      else if (type === 'gift') _gifts.push(data);
      else _lights.push(data);
    }

    return { ballsData: _balls, giftsData: _gifts, lightsData: _lights };
  }, [count]);

  useLayoutEffect(() => {
    [
      { ref: ballsRef, data: ballsData },
      { ref: giftsRef, data: giftsData },
      { ref: lightsRef, data: lightsData }
    ].forEach(({ ref, data }) => {
      if (ref.current) {
        data.forEach((d, i) => {
          ref.current!.setColorAt(i, d.color);
        });
        ref.current.instanceColor!.needsUpdate = true;
      }
    });
  }, [ballsData, giftsData, lightsData]);

  useFrame((state, delta) => {
    const isFormed = mode === TreeMode.FORMED;
    const time = state.clock.elapsedTime;

    const updateMesh = (ref: React.RefObject<THREE.InstancedMesh>, data: InstanceData[]) => {
      if (!ref.current) return;
      let needsUpdate = false;

      data.forEach((d, i) => {
        const dest = isFormed ? d.targetPos : d.chaosPos;
        ref.current!.getMatrixAt(i, dummy.matrix);
        dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);
        
        const step = delta * d.speed;
        dummy.position.lerp(dest, step);

        if (isFormed && dummy.position.distanceTo(d.targetPos) < 0.5) {
          dummy.position.y += Math.sin(time * 2 + d.chaosPos.x) * 0.002;
        }

        if (d.type === 'gift') {
           dummy.rotation.x += delta * 0.5;
           dummy.rotation.y += delta * 0.2;
        } else {
           dummy.lookAt(0, dummy.position.y, 0);
        }

        dummy.scale.setScalar(d.scale);
        if (d.type === 'light') {
           const pulse = 1 + Math.sin(time * 5 + d.chaosPos.y) * 0.3;
           dummy.scale.multiplyScalar(pulse);
        }

        dummy.updateMatrix();
        ref.current!.setMatrixAt(i, dummy.matrix);
        needsUpdate = true;
      });

      if (needsUpdate) ref.current.instanceMatrix.needsUpdate = true;
    };

    updateMesh(ballsRef, ballsData);
    updateMesh(giftsRef, giftsData);
    updateMesh(lightsRef, lightsData);
  });

  return (
    <>
      {/* 装饰球：高光泽冰蓝/银色 */}
      <instancedMesh ref={ballsRef} args={[undefined, undefined, ballsData.length]}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial 
          roughness={0.05} 
          metalness={1.0} 
          envMapIntensity={2}
        />
      </instancedMesh>

      {/* 礼物盒：冰蓝色调 */}
      <instancedMesh ref={giftsRef} args={[undefined, undefined, giftsData.length]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial 
          roughness={0.2} 
          metalness={0.7} 
          color="white" 
        />
      </instancedMesh>

      {/* 小灯：冰白自发光 */}
      <instancedMesh ref={lightsRef} args={[undefined, undefined, lightsData.length]}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshStandardMaterial 
          emissive="#7dd3fc"
          emissiveIntensity={4}
          toneMapped={false}
          color="white" 
        />
      </instancedMesh>
    </>
  );
};
