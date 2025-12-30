'use client';

import { useEffect, useRef } from 'react';

interface ParticleLoaderProps {
  size?: number;
}

export function ParticleLoader({ size = 120 }: ParticleLoaderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const particles: Particle[] = [];
    const particleCount = 100;
    const radius = size / 2.5;
    let frame = 0;

    class Particle {
      phi: number;
      theta: number;
      x: number = 0;
      y: number = 0;
      z: number = 0;
      color: string;
      size: number;

      constructor() {
        // Spherical coordinates
        this.phi = Math.random() * Math.PI * 2;
        this.theta = Math.random() * Math.PI;

        // RGB color (red, green, or blue)
        const colors = [
          'rgba(255, 50, 50, 0.8)',   // Red
          'rgba(50, 255, 50, 0.8)',   // Green
          'rgba(50, 150, 255, 0.8)',  // Blue
        ];
        this.color = colors[Math.floor(Math.random() * colors.length)];
        this.size = Math.random() * 2 + 1;
      }

      update(time: number) {
        // Rotate around sphere
        this.phi += 0.005;
        this.theta += 0.003;

        // Convert spherical to Cartesian coordinates
        this.x = radius * Math.sin(this.theta) * Math.cos(this.phi);
        this.y = radius * Math.sin(this.theta) * Math.sin(this.phi);
        this.z = radius * Math.cos(this.theta);

        // Add some orbital motion
        this.x += Math.sin(time * 0.001 + this.phi) * 5;
        this.y += Math.cos(time * 0.001 + this.theta) * 5;
      }

      draw() {
        if (!ctx) return;

        // 3D perspective projection
        const scale = 200 / (200 + this.z);
        const x2d = this.x * scale + size / 2;
        const y2d = this.y * scale + size / 2;
        const particleSize = this.size * scale;

        // Draw particle with glow
        const gradient = ctx.createRadialGradient(x2d, y2d, 0, x2d, y2d, particleSize * 2);
        gradient.addColorStop(0, this.color);
        gradient.addColorStop(1, this.color.replace('0.8', '0'));

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x2d, y2d, particleSize * 2, 0, Math.PI * 2);
        ctx.fill();

        // Draw bright core
        ctx.fillStyle = this.color.replace('0.8', '1');
        ctx.beginPath();
        ctx.arc(x2d, y2d, particleSize, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Initialize particles
    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }

    function animate() {
      if (!ctx || !canvas) return;

      frame++;
      ctx.clearRect(0, 0, size, size);

      // Sort particles by z-index for proper layering
      particles.sort((a, b) => a.z - b.z);

      // Update and draw particles
      particles.forEach(particle => {
        particle.update(frame);
        particle.draw();
      });

      requestAnimationFrame(animate);
    }

    animate();

    return () => {
      // Cleanup
      ctx.clearRect(0, 0, size, size);
    };
  }, [size]);

  return (
    <div className="flex items-center justify-center">
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className="drop-shadow-2xl"
        style={{
          filter: 'contrast(1.2) brightness(1.1)',
        }}
      />
    </div>
  );
}
