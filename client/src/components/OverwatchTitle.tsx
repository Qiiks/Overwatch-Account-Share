import React, { useEffect, useRef } from 'react';

interface OverwatchTitleProps {
  className?: string;
}

const OverwatchTitle: React.FC<OverwatchTitleProps> = ({ className = '' }) => {
  const titleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!titleRef.current) return;
      
      const rect = titleRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      
      titleRef.current.style.setProperty('--mouse-x', `${x}%`);
      titleRef.current.style.setProperty('--mouse-y', `${y}%`);
    };

    const element = titleRef.current;
    if (element) {
      element.addEventListener('mousemove', handleMouseMove);
      return () => element.removeEventListener('mousemove', handleMouseMove);
    }
  }, []);

  return (
    <div className={`relative ${className}`}>
      <h1 
        ref={titleRef}
        className="overwatch-title text-8xl md:text-9xl font-bebas tracking-wider select-none cursor-pointer"
      >
        <span className="relative inline-block">
          <img 
            src="/lovable-uploads/0effe610-271f-458a-b094-6df52c764983.png" 
            alt="O" 
            className="inline-block w-[1.1em] h-[1.1em] object-contain align-text-top -mt-1"
          />
          VERWATCH
        </span>
      </h1>
      <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-primary-glow/30 to-primary/20 opacity-0 hover:opacity-100 transition-opacity duration-500 blur-3xl -z-10" />
    </div>
  );
};

export default OverwatchTitle;