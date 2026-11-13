// lib/reportGenerator.js

/**
 * POST-MISSION REPORT ENGINE
 * Takes the raw numbers from the physics and operations phases, evaluates them against 
 * the player's ship design, and generates a structured educational report card.
 * 
 * @param {Object} telemetry - Raw flight data (e.g., maxHeat, verticalSpeed, itemsCollected, powerRemaining)
 * @param {Object} shipStats - The limits of the player's built spacecraft
 * @param {Object} contract - The mission objective, budget, and base rewards
 */
export const generateFullMissionReport = (telemetry, shipStats, contract) => {
  // 1. Initialize the baseline report object
  const report = {
    missionStatus: 'SUCCESS', // Can become PARTIAL SUCCESS, ROUGH_LANDING, CRASH, or DESTROYED
    rootCauses: [],
    suggestedChanges: [],
    
    // Chronological log of the mission (matches Section 12 requirements)
    eventTimeline: [
      "T+0:00 - Launch sequence initiated.",
      "T+1:15 - Atmospheric exit.",
      telemetry.malfunctionEvent || "T+3:40 - Transit nominal.",
      "T+4:10 - Landing sequence started."
    ],
    
    // Scavenging phase tracking (matches Section 10A)
    scavengingResults: {
      itemsCollected: telemetry.itemsCollected || [],
      itemsLost: [],
      lossReason: "", 
      totalScienceValue: 0
    },
    
    // The core economy loop (matches Section 6)
    financials: {
      baseReward: contract.reward,
      multipliers: {
        landing: telemetry.landingAccuracyMultiplier || 1.0, // Based on bullseye rings
        science: 1.0,
        streak: telemetry.streakMultiplier || 1.0
      },
      costs: {
        build: shipStats.totalCost,
        launch: shipStats.mass * 1000, // Launch gets more expensive as mass increases
        repair: telemetry.repairCosts || 0
      },
      netProfit: 0 // Calculated at the end
    },
    
    // Educational anchor linking the game to real life
    nasaReference: {
      missionName: "Mars Polar Lander",
      relevance: "Failed due to software misinterpreting landing leg deployment vibrations as touchdown, cutting engines too early."
    }
  };

  // ---------------------------------------------------------
  // PHASE 1: ATMOSPHERIC ENTRY (Heat limits)
  // ---------------------------------------------------------
  if (telemetry.maxHeat > shipStats.thermalCapacity) {
    report.missionStatus = 'DESTROYED';
    report.rootCauses.push("Spacecraft burned up during atmospheric entry.");
    report.suggestedChanges.push(`Planets like ${contract.destinationName} require heavier ablative heat shields.`);
  }

  // ---------------------------------------------------------
  // PHASE 2: LANDING KINETICS (Only check if we didn't burn up)
  // ---------------------------------------------------------
  if (report.missionStatus !== 'DESTROYED') {
    // Check Vertical Speed limit
    if (telemetry.verticalSpeed > shipStats.legVerticalLimit) {
      report.missionStatus = 'CRASH';
      report.rootCauses.push(`Vertical speed (${telemetry.verticalSpeed} m/s) exceeded leg limits (${shipStats.legVerticalLimit} m/s).`);
      report.suggestedChanges.push("Thrust-to-weight at touchdown was too low to slow down. Add stronger engines.");
    } 
    // Check Terrain Angle/Tilt limit
    else if (telemetry.tiltAngle > shipStats.legMaxTilt) {
      report.missionStatus = 'CRASH';
      report.rootCauses.push(`Landing tilt (${telemetry.tiltAngle}°) exceeded leg stability limits (${shipStats.legMaxTilt}°).`);
      report.suggestedChanges.push("Use wider landing legs to tolerate uneven terrain.");
    }

    // ---------------------------------------------------------
    // PHASE 3: SURFACE OPERATIONS & SCAVENGING
    // ---------------------------------------------------------
    if (telemetry.powerRemaining <= 0) {
      report.missionStatus = 'FAILED';
      report.rootCauses.push("Total power loss. Systems shut down before science operations could complete.");
      report.suggestedChanges.push("Add heavier batteries or an RTG if operating far from the Sun.");
    }

    // Check if they collected more data than the antenna can send home
    const dataGenerated = telemetry.itemsCollected.length * 10; // 10mb per item
    if (report.missionStatus === 'SUCCESS' && dataGenerated > shipStats.antennaDownlinkCap) {
      report.missionStatus = 'PARTIAL SUCCESS';
      report.rootCauses.push("Data generated exceeded antenna downlink capacity before mission timer ended.");
      report.scavengingResults.lossReason = "Antenna bandwidth limit reached. Unsent data was lost.";
      report.financials.multipliers.science = 0.5; // Cut science reward in half
    }
  }

  // ---------------------------------------------------------
  // PHASE 4: FINAL FINANCIAL CALCULATIONS
  // ---------------------------------------------------------
  if (report.missionStatus === 'SUCCESS' || report.missionStatus === 'PARTIAL SUCCESS') {
    report.scavengingResults.totalScienceValue = report.scavengingResults.itemsCollected.length * 10;
  } else {
    // If the ship crashed or failed, zero out the rewards but keep the costs
    report.financials.multipliers.science = 0;
    report.financials.multipliers.landing = 0;
    report.financials.multipliers.streak = 1; // Streaks are lost
  }

  // Equation: Net = (Reward * Multipliers) - (Build + Launch + Repair)
  const grossReward = report.financials.baseReward * 
                      report.financials.multipliers.landing * 
                      report.financials.multipliers.science * 
                      report.financials.multipliers.streak;
                      
  const totalCosts = report.financials.costs.build + 
                     report.financials.costs.launch + 
                     report.financials.costs.repair;
                     
  report.financials.netProfit = grossReward - totalCosts;

  return report; // Hand this completed object to the UI components
};