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
            style={{ color: "var(--foreground-secondary)" }}
          >
            PolyDebate © 2025
          </p>

          {/* Links */}
          <div className="flex items-center gap-4 flex-wrap justify-center">
            <Link
              href="/privacy"
              className="text-caption transition-colors duration-150 hover:underline"
              style={{ color: "var(--foreground-secondary)" }}
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="text-caption transition-colors duration-150 hover:underline"
              style={{ color: "var(--foreground-secondary)" }}
            >
              Terms of Use
            </Link>
            <Link
              href="/learn"
              className="text-caption transition-colors duration-150 hover:underline"
              style={{ color: "var(--foreground-secondary)" }}
            >
              Learn
            </Link>
            <Link
              href="/careers"
              className="text-caption transition-colors duration-150 hover:underline"
              style={{ color: "var(--foreground-secondary)" }}
            >
              Careers
            </Link>
            <Link
              href="/press"
              className="text-caption transition-colors duration-150 hover:underline"
              style={{ color: "var(--foreground-secondary)" }}
            >
              Press
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

