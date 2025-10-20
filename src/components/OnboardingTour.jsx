import React from 'react';
import OnboardingTooltip from './OnboardingTooltip';
import OnboardingSpotlight from './OnboardingSpotlight';

function OnboardingTour({ 
  isActive, 
  currentStep, 
  totalSteps, 
  steps, 
  onNext, 
  onPrevious, 
  onSkip,
  isNavigating = false
}) {
  if (!isActive || isNavigating) return null;

  const currentStepInfo = steps[currentStep];
  if (!currentStepInfo) return null;

  return (
    <OnboardingSpotlight
      targetSelector={currentStepInfo.selector}
      isVisible={isActive}
      onOverlayClick={() => {}} // Prevent clicks outside
    >
      <OnboardingTooltip
        targetSelector={currentStepInfo.selector}
        title={currentStepInfo.title}
        description={currentStepInfo.description}
        step={currentStep + 1}
        totalSteps={totalSteps}
        onNext={onNext}
        onPrevious={onPrevious}
        onSkip={onSkip}
        isVisible={isActive}
        position={currentStepInfo.position}
        action={currentStepInfo.action}
      />
    </OnboardingSpotlight>
  );
}

export default OnboardingTour;
