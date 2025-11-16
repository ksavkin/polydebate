"use client";

import styles from "./Orb.module.css";

interface OrbColorConfig {
  color1: string; // First inner orb color
  color2: string; // Second inner orb color
  glow1: string; // First glow color
  glow2: string; // Second glow color
}

interface OrbProps {
  colorConfig?: OrbColorConfig;
}

// Default AI debate engine colors
const defaultColors: OrbColorConfig = {
  color1: '#ff3e1c',
  color2: '#1c8cff',
  glow1: '#ff3e1c88',
  glow2: '#1c8cff88',
};

export function Orb({ colorConfig = defaultColors }: OrbProps) {
  return (
    <div 
      className={styles.orbContainer}
      style={{
        filter: `drop-shadow(0 0 6px ${colorConfig.glow1}) drop-shadow(0 0 6px ${colorConfig.glow2})`,
      }}
    >
      <div className={styles.orb}>
        <div 
          className={styles.orbInner}
          style={{
            background: colorConfig.color1,
          }}
        ></div>
        <div 
          className={styles.orbInner}
          style={{
            background: colorConfig.color2,
          }}
        ></div>
      </div>
    </div>
  );
}

