import React, { useEffect, useState } from 'react';

function OnboardingSpotlight({ 
  targetSelector, 
  isVisible = false, 
  children,
  onOverlayClick 
}) {
  const [targetElement, setTargetElement] = useState(null);
  const [spotlightStyle, setSpotlightStyle] = useState({});

  useEffect(() => {
    if (!isVisible || !targetSelector) {
      setTargetElement(null);
      return;
    }

    const element = document.querySelector(targetSelector);
    if (!element) {
      console.warn(`OnboardingSpotlight: Element not found for selector "${targetSelector}"`);
      setTargetElement(null);
      return;
    }

    setTargetElement(element);
    
    // Calculate spotlight position and size
    const updateSpotlight = () => {
      const rect = element.getBoundingClientRect();
      const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
      const scrollY = window.pageYOffset || document.documentElement.scrollTop;
      
      setSpotlightStyle({
        position: 'absolute',
        top: rect.top + scrollY - 8,
        left: rect.left + scrollX - 8,
        width: rect.width + 16,
        height: rect.height + 16,
        borderRadius: '12px',
        border: '4px solid #3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        boxShadow: '0 0 20px rgba(59, 130, 246, 0.5)',
        zIndex: 50,
        pointerEvents: 'none',
        animation: 'pulse 2s infinite'
      });
    };

    updateSpotlight();
    
    // Update on scroll and resize
    const handleUpdate = () => updateSpotlight();
    window.addEventListener('scroll', handleUpdate);
    window.addEventListener('resize', handleUpdate);
    
    return () => {
      window.removeEventListener('scroll', handleUpdate);
      window.removeEventListener('resize', handleUpdate);
    };
  }, [isVisible, targetSelector]);

  if (!isVisible) return children;

  return (
    <>
      {/* Spotlight effect - no dark overlay */}
      {targetElement && (
        <div 
          style={{
            ...spotlightStyle,
            zIndex: 50
          }} 
        />
      )}
      
      {/* Content */}
      <div className="relative z-50">
        {children}
      </div>
      
      {/* Add pulse animation styles */}
      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.02);
          }
        }
      `}</style>
    </>
  );
}

export default OnboardingSpotlight;
