// lib/difficultyEngine.js

/**
 * DIFFICULTY ENGINE
 * This acts as the single source of truth for game balance. 
 * Instead of hardcoding math into the UI or physics loop, other developers 
 * import getDifficultySettings() and multiply their base values by these modifiers.
 */

export const DIFFICULTY_LEVELS = {
  EASY: 'EASY',
  NORMAL: 'NORMAL',
  HARD: 'HARD'
};

export const DIFFICULTY_CONFIG = {
  [DIFFICULTY_LEVELS.EASY]: {
    // Economy: Gives the player 50% more money than the contract states
    budgetModifier: 1.5,     
    
    // Maintenance: Parts never break down or lose maximum condition
    wearRate: 0.0,           
    
    // Events: No random mid-flight events (engine-out, sensor drift)
    malfunctionsOn: false,   
    
    // Physics: The bullseye target for landing is 50% wider, making it much easier to score
    landingRingSize: 1.5,    
    
    // Education: UI shows active warnings (e.g., "TWR too low") before launch
    helpLevel: 'hints'       
  },
  
  [DIFFICULTY_LEVELS.NORMAL]: {
    // Economy: Player must build exactly within the contract's budget cap
    budgetModifier: 1.0,     
    
    // Maintenance: Parts degrade at a standard rate after each flight
    wearRate: 1.0,           
    
    // Events: No random mid-flight events, only failures caused by the player's design
    malfunctionsOn: false,   
    
    // Physics: Standard bullseye target size
    landingRingSize: 1.0,    
    
    // Education: UI shows passive tooltips when hovering over stats, but no active warnings
    helpLevel: 'tooltips'    
  },
  
  [DIFFICULTY_LEVELS.HARD]: {
    // Economy: Player gets 20% LESS money than the contract states, forcing extreme efficiency
    budgetModifier: 0.8,     
    
    // Maintenance: Parts degrade 75% faster, forcing the player to spend money on repairs
    wearRate: 1.75,          
    
    // Events: Random events (power brownouts, comms blackouts) can happen mid-flight
    // The player must build redundancy (backup batteries, spare engines) to survive
    malfunctionsOn: true,    
    
    // Physics: The bullseye target shrinks by 40%, requiring extreme precision
    landingRingSize: 0.6,    
    
    // Education: No UI assistance. The player is on their own.
    helpLevel: 'minimal'     
  }
};

/**
 * Utility function to fetch the current modifiers.
 * 
 * @param {string} level - The active difficulty level string
 * @returns {Object} - The configuration object for that difficulty
 */
export const getDifficultySettings = (level = DIFFICULTY_LEVELS.NORMAL) => {
  return DIFFICULTY_CONFIG[level] || DIFFICULTY_CONFIG[DIFFICULTY_LEVELS.NORMAL];
};