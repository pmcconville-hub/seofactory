/**
 * Animations
 *
 * Generates CSS transitions, keyframe animations, and staggered effects.
 *
 * @module services/publishing/css/animations
 */

/**
 * Generate animation CSS
 */
export function generateAnimations(): string {
  return `/* ============================================
   Animations
   ============================================ */

@keyframes ctc-fade-in {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes ctc-scale-in {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes ctc-slide-up {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes ctc-pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.ctc-animate-fade-in {
  animation: ctc-fade-in var(--ctc-duration-normal) var(--ctc-ease-enter) forwards;
}

.ctc-animate-scale-in {
  animation: ctc-scale-in var(--ctc-duration-normal) var(--ctc-ease-emphasis) forwards;
}

.ctc-animate-slide-up {
  animation: ctc-slide-up var(--ctc-duration-slow) var(--ctc-ease-enter) forwards;
}

/* Staggered animations */
.ctc-stagger > * {
  opacity: 0;
  animation: ctc-fade-in var(--ctc-duration-normal) var(--ctc-ease-enter) forwards;
}

.ctc-stagger > *:nth-child(1) { animation-delay: 0ms; }
.ctc-stagger > *:nth-child(2) { animation-delay: 100ms; }
.ctc-stagger > *:nth-child(3) { animation-delay: 200ms; }
.ctc-stagger > *:nth-child(4) { animation-delay: 300ms; }
.ctc-stagger > *:nth-child(5) { animation-delay: 400ms; }
.ctc-stagger > *:nth-child(6) { animation-delay: 500ms; }

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}`;
}
