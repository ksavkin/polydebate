"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";

export function Footer() {
  return (
    <footer
      className={cn(
        "w-full border-t transition-all duration-300",
        "py-4"
      )}
      style={{
        backgroundColor: "var(--background)",
        borderColor: "var(--card-border)",
      }}
    >
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Copyright */}
          <p
            className="text-caption"
            style={{ 
              color: "var(--foreground-secondary)",
              lineHeight: "var(--leading-base)",
            }}
          >
            PolyDebate © 2025
          </p>

          {/* Links */}
          <div className="flex items-center gap-4 flex-wrap justify-center">
            <Link
              href="/"
              className="text-caption transition-colors duration-150 hover:underline"
              style={{ 
                color: "var(--foreground-secondary)",
                lineHeight: "var(--leading-base)",
              }}
            >
              Markets
            </Link>
            <Link
              href="/breaking"
              className="text-caption transition-colors duration-150 hover:underline"
              style={{ 
                color: "var(--foreground-secondary)",
                lineHeight: "var(--leading-base)",
              }}
            >
              Breaking News
            </Link>
            <a
              href="https://docs.polymarket.com/quickstart/introduction/main"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 transition-opacity duration-150 hover:opacity-80"
              style={{ 
                lineHeight: "var(--leading-base)",
                fontSize: "0.9375rem",
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="flex-shrink-0"
              >
                <path
                  d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                  fill="url(#polymarketHeartGradient)"
                />
                <defs>
                  <linearGradient id="polymarketHeartGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#8B5CF6">
                      <animate
                        attributeName="stop-color"
                        values="#8B5CF6;#A855F7;#9333EA;#7C3AED;#8B5CF6"
                        dur="8s"
                        repeatCount="indefinite"
                      />
                    </stop>
                    <stop offset="33%" stopColor="#A855F7">
                      <animate
                        attributeName="stop-color"
                        values="#A855F7;#9333EA;#7C3AED;#8B5CF6;#A855F7"
                        dur="8s"
                        repeatCount="indefinite"
                      />
                    </stop>
                    <stop offset="66%" stopColor="#9333EA">
                      <animate
                        attributeName="stop-color"
                        values="#9333EA;#7C3AED;#8B5CF6;#A855F7;#9333EA"
                        dur="8s"
                        repeatCount="indefinite"
                      />
                    </stop>
                    <stop offset="100%" stopColor="#7C3AED">
                      <animate
                        attributeName="stop-color"
                        values="#7C3AED;#8B5CF6;#A855F7;#9333EA;#7C3AED"
                        dur="8s"
                        repeatCount="indefinite"
                      />
                    </stop>
                  </linearGradient>
                </defs>
              </svg>
              <span className="polymarket-gradient" style={{ fontSize: "0.9375rem", fontWeight: 600 }}>
                Powered by Polymarket Gamma API
              </span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

