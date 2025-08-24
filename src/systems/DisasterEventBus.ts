// Simple event bus for disaster animations
type DisasterAnimationType = 'slide' | 'shake' | null;

class DisasterEventBus {
  private listeners: ((animation: DisasterAnimationType) => void)[] = [];
  
  subscribe(callback: (animation: DisasterAnimationType) => void): () => void {
    this.listeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }
  
  triggerAnimation(animation: DisasterAnimationType): void {
    this.listeners.forEach(listener => listener(animation));
  }
}

export const disasterEventBus = new DisasterEventBus();