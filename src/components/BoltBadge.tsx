import React, { useEffect, useState } from 'react';

export function BoltBadge() {
  const [isAnimated, setIsAnimated] = useState(false);

  useEffect(() => {
    // Trigger animation after component mounts
    const timer = setTimeout(() => {
      setIsAnimated(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {/* Badge Styles */}
      <style>{`
        .bolt-badge {
          transition: all 0.3s ease;
        }
        
        @keyframes badgeIntro {
          0% { 
            transform: rotateY(-90deg); 
            opacity: 0; 
          }
          100% { 
            transform: rotateY(0deg); 
            opacity: 1; 
          }
        }
        
        .bolt-badge-intro {
          animation: badgeIntro 0.8s ease-out 1s both;
        }
        
        .bolt-badge-intro.animated {
          animation: none;
        }
        
        @keyframes badgeHover {
          0% { 
            transform: scale(1) rotate(0deg); 
          }
          50% { 
            transform: scale(1.1) rotate(22deg); 
          }
          100% { 
            transform: scale(1) rotate(0deg); 
          }
        }
        
        .bolt-badge:hover {
          animation: badgeHover 0.6s ease-in-out;
        }
        
        @media (max-width: 768px) {
          .bolt-badge-container {
            bottom: 1rem;
            left: 1rem;
          }
          
          .bolt-badge-img {
            width: 3rem;
            height: 3rem;
          }
        }
        
        @media (min-width: 769px) {
          .bolt-badge-container {
            bottom: 1.5rem;
            left: 1.5rem;
          }
          
          .bolt-badge-img {
            width: 4rem;
            height: 4rem;
          }
        }
        
        @media (min-width: 1024px) {
          .bolt-badge-container {
            bottom: 2rem;
            left: 2rem;
          }
          
          .bolt-badge-img {
            width: 5rem;
            height: 5rem;
          }
        }
      `}</style>

      {/* Badge Component */}
      <div className="bolt-badge-container fixed z-50">
        <a 
          href="https://bolt.new" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="block transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/25"
          title="Built with Bolt.new - World's Largest Hackathon"
        >
          <img 
            src="https://storage.bolt.army/white_circle_360x360.png" 
            alt="Built with Bolt.new badge" 
            className={`bolt-badge-img rounded-full shadow-lg bolt-badge ${
              isAnimated ? 'bolt-badge-intro animated' : 'bolt-badge-intro'
            }`}
            onAnimationEnd={() => setIsAnimated(true)}
            loading="lazy"
          />
        </a>
      </div>
    </>
  );
}