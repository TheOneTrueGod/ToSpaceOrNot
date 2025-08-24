import React, { useEffect, useRef } from 'react';

interface RocketAnimationProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  size?: 'small' | 'large';
  showTrail?: boolean;
  disasterAnimation?: 'slide' | 'shake' | null;
}

export const RocketAnimation: React.FC<RocketAnimationProps> = ({ 
  canvasRef,
  size = 'large', 
  showTrail = true,
  disasterAnimation = null
}) => {
  const animationRef = useRef<number>();
  const particles = useRef<Array<{ x: number; y: number; vx: number; vy: number; life: number; color: string }>>([]);
  const disasterAnimationRef = useRef<{ type: string; startTime: number; duration: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      time += 0.02;
      const tilt = Math.sin(time) * 0.35; // 20 degrees in radians
      
      // Handle disaster animation trigger
      if (disasterAnimation && !disasterAnimationRef.current) {
        disasterAnimationRef.current = {
          type: disasterAnimation,
          startTime: Date.now(),
          duration: disasterAnimation === 'slide' ? 1000 : 500 // slide: 1s, shake: 0.5s
        };
      }
      
      // Calculate disaster animation offset
      let disasterOffsetX = 0;
      let disasterOffsetY = 0;
      if (disasterAnimationRef.current) {
        const elapsed = Date.now() - disasterAnimationRef.current.startTime;
        const progress = Math.min(elapsed / disasterAnimationRef.current.duration, 1);
        
        if (disasterAnimationRef.current.type === 'slide') {
          // Slide up then down, then back to center
          const slideProgress = progress * Math.PI * 2; // Full sine wave
          disasterOffsetY = Math.sin(slideProgress) * -5; // 5 pixels up/down
        } else if (disasterAnimationRef.current.type === 'shake') {
          // Random shake
          const intensity = Math.max(0, 1 - progress) * 3; // Decrease over time
          disasterOffsetX = (Math.random() - 0.5) * intensity;
          disasterOffsetY = (Math.random() - 0.5) * intensity;
        }
        
        // Clean up animation when done
        if (progress >= 1) {
          disasterAnimationRef.current = null;
        }
      }
      
      ctx.save();
      // Move ship left by 50 pixels in small size mode (StatusMonitor)
      const xPosition = size === 'small' ? 50 : canvas.width / 2;
      ctx.translate(xPosition + disasterOffsetX, canvas.height / 2 + disasterOffsetY);
      ctx.rotate(tilt);
      
      // Draw rocket body
      const scale = size === 'large' ? 1 : 0.5;
      ctx.fillStyle = '#8B9DC3';
      ctx.fillRect(-15 * scale, -8 * scale, 30 * scale, 16 * scale);
      
      // Draw rocket nose
      ctx.fillStyle = '#DDD6FE';
      ctx.beginPath();
      ctx.moveTo(15 * scale, -8 * scale);
      ctx.lineTo(25 * scale, 0);
      ctx.lineTo(15 * scale, 8 * scale);
      ctx.closePath();
      ctx.fill();
      
      // Draw fins
      ctx.fillStyle = '#6B7280';
      ctx.fillRect(-15 * scale, -12 * scale, 8 * scale, 8 * scale);
      ctx.fillRect(-15 * scale, 4 * scale, 8 * scale, 8 * scale);
      
      if (showTrail) {
        // Add engine particles
        if (Math.random() < 0.8) {
          for (let i = 0; i < 3; i++) {
            particles.current.push({
              x: -15 * scale + (Math.random() - 0.5) * 4,
              y: (Math.random() - 0.5) * 8 * scale,
              vx: -2 - Math.random() * (size === 'large' ? 3 : 2),
              vy: (Math.random() - 0.5) * 2,
              life: 1.0,
              color: Math.random() < 0.5 ? '#FFA500' : '#FF4500'
            });
          }
        }
        
        // Update and draw particles
        particles.current = particles.current.filter(particle => {
          particle.x += particle.vx;
          particle.y += particle.vy;
          particle.life -= 0.02;
          
          if (particle.life > 0) {
            ctx.globalAlpha = particle.life;
            ctx.fillStyle = particle.color;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, 2 * scale, 0, Math.PI * 2);
            ctx.fill();
            return true;
          }
          return false;
        });
        
        ctx.globalAlpha = 1;
      }
      
      ctx.restore();
      
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [size, showTrail]);

  return null;
};