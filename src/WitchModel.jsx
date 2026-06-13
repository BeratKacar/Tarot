import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, Float } from '@react-three/drei';
import * as THREE from 'three';

export default function WitchModel() {
  const modelRef = useRef();
  const { scene } = useGLTF('/ranni.glb'); 
  
  // Farenin global hedefini tutacağımız referans
  const targetRotation = useRef({ x: 0, y: 0 });

  useEffect(() => {
    // Farenin tüm sayfa üzerindeki hareketini dinleyen fonksiyon
    const handleMouseMove = (event) => {
      // Ekrandaki fare pozisyonunu -1 ile +1 arasında normalize ediyoruz
      const x = (event.clientX / window.innerWidth) * 2 - 1;
      const y = -(event.clientY / window.innerHeight) * 2 + 1;

      // Modelin dönüş limitlerini belirliyoruz (X: aşağı/yukarı, Y: sağ/sol)
      targetRotation.current.y = x * 0.5; 
      targetRotation.current.x = -y * 0.2; 
    };

    // Dinleyiciyi tüm pencereye (window) takıyoruz
    window.addEventListener('mousemove', handleMouseMove);
    
    // Bileşen ekrandan kalkarsa dinleyiciyi temizliyoruz
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useFrame(() => {
    if (modelRef.current) {
      // Modelin mevcut açısından, farenin olduğu global açıya yumuşak (lerp) geçiş
      modelRef.current.rotation.y = THREE.MathUtils.lerp(modelRef.current.rotation.y, targetRotation.current.y, 0.05);
      modelRef.current.rotation.x = THREE.MathUtils.lerp(modelRef.current.rotation.x, targetRotation.current.x, 0.05);
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.1} floatIntensity={1.2}>
      <primitive ref={modelRef} object={scene} scale={10} position={[0, -2, 0]} />
    </Float>
  );
}