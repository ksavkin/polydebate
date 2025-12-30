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
  size?: number;
}

const defaultColors: OrbColorConfig = {
  color1: '#1652f0',
  color2: '#00c2ff',
  glow1: '#1652f044',
  glow2: '#00c2ff44',
};

export function Orb({ colorConfig = defaultColors, isSpeaking = false, size = 200 }: OrbProps) {
  return (
    <div
      className={`${styles.orbContainer} ${isSpeaking ? styles.speaking : ''}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        filter: isSpeaking
          ? `drop-shadow(0 0 ${size / 10}px ${colorConfig.glow1}) drop-shadow(0 0 ${size / 16}px ${colorConfig.glow2})`
          : `drop-shadow(0 0 ${size / 20}px ${colorConfig.glow1})`,
      }}
    >
      <div className={styles.orb} style={{ width: `${size}px`, height: `${size}px` }}>
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
