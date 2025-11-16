// Orb.tsx
"use client";

import styles from "./Orb.module.css";

interface OrbColorConfig {
  color1: string;
  color2: string;
  glow1: string;
  glow2: string;
}

interface OrbProps {
  colorConfig?: OrbColorConfig;
  isSpeaking?: boolean;
}

const defaultColors: OrbColorConfig = {
  color1: '#ff3e1c',
  color2: '#1c8cff',
  glow1: '#ff3e1c88',
  glow2: '#1c8cff88',
};

export function Orb({ colorConfig = defaultColors, isSpeaking = false }: OrbProps) {
  return (
    <div 
      className={`${styles.orbContainer} ${isSpeaking ? styles.speaking : ''}`}
      style={{
        filter: isSpeaking
          ? `drop-shadow(0 0 20px ${colorConfig.glow1}) drop-shadow(0 0 12px ${colorConfig.glow2}) drop-shadow(0 0 30px ${colorConfig.glow1})`
          : `drop-shadow(0 0 6px ${colorConfig.glow1}) drop-shadow(0 0 6px ${colorConfig.glow2})`,
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
