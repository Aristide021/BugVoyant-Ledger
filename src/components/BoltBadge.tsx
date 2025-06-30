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
            bottom: 1rem !important;
            left: 1rem !important;
            position: fixed !important;
          }
          
          .bolt-badge-img {
            width: 3rem !important;
            height: 3rem !important;
          }
        }
        
        @media (min-width: 769px) {
          .bolt-badge-container {
            bottom: 1.5rem !important;
            left: 1.5rem !important;
            position: fixed !important;
          }
          
          .bolt-badge-img {
            width: 4rem !important;
            height: 4rem !important;
          }
        }
        
        @media (min-width: 1024px) {
          .bolt-badge-container {
            bottom: 2rem !important;
            left: 2rem !important;
            position: fixed !important;
          }
          
          .bolt-badge-img {
            width: 5rem !important;
            height: 5rem !important;
          }
        }
      `}</style>

      {/* Badge Component */}
      <div className="fixed bottom-4 left-4 md:bottom-6 md:left-6 lg:bottom-8 lg:left-8 z-50">
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
            className={`w-12 h-12 md:w-16 md:h-16 lg:w-20 lg:h-20 rounded-full shadow-lg bolt-badge ${
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