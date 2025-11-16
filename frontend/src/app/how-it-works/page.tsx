"use client";

import Link from "next/link";

export default function HowItWorks() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--background)" }}>
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-16">
          <h1
            className="text-5xl font-bold mb-4"
            style={{ color: "var(--foreground)" }}
          >
            How It Works
          </h1>
          <p
            className="text-xl"
            style={{ color: "var(--foreground-secondary)" }}
          >
            AI-powered prediction market debates that help you make better decisions
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-12">
          {/* Step 1 */}
          <div className="flex gap-6">
            <div
              className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold"
              style={{
                backgroundColor: "var(--color-primary)",
                color: "var(--color-white)"
              }}
            >
              1
            </div>
            <div>
              <h2
                className="text-2xl font-bold mb-3"
                style={{ color: "var(--foreground)" }}
              >
                Browse Prediction Markets
              </h2>
              <p
                className="text-lg mb-4"
                style={{
                  color: "var(--foreground-secondary)",
                  lineHeight: "1.7"
                }}
              >
                Explore live prediction markets from Polymarket on topics like politics, crypto,
                finance, technology, and more. Each market represents a real question about future
                events with real-money probabilities.
              </p>
              <div
                className="p-4 rounded-lg"
                style={{ backgroundColor: "var(--color-soft-gray)" }}
              >
                <p className="text-sm" style={{ color: "var(--foreground-secondary)" }}>
                  Example: "Will Bitcoin reach $100,000 by end of 2025?" - Current market odds: 65% Yes, 35% No
                </p>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex gap-6">
            <div
              className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold"
              style={{
                backgroundColor: "var(--color-primary)",
                color: "var(--color-white)"
              }}
            >
              2
            </div>
            <div>
              <h2
                className="text-2xl font-bold mb-3"
                style={{ color: "var(--foreground)" }}
              >
                Select AI Models for Debate
              </h2>
              <p
                className="text-lg mb-4"
                style={{
                  color: "var(--foreground-secondary)",
                  lineHeight: "1.7"
                }}
              >
                Choose from leading AI models including Claude, GPT-4, Gemini, DeepSeek, Grok, and more.
                Select 1-10 models to participate in a structured debate analyzing the prediction market.
              </p>
              <div
                className="p-4 rounded-lg"
                style={{ backgroundColor: "var(--color-soft-gray)" }}
              >
                <p className="text-sm font-semibold mb-2" style={{ color: "var(--foreground)" }}>
                  Popular Model Combinations:
                </p>
                <ul className="text-sm space-y-1" style={{ color: "var(--foreground-secondary)" }}>
                  <li>• Claude Sonnet 4.5 vs GPT-4 vs Gemini 2.5 Flash</li>
                  <li>• DeepSeek Chat v3 vs Grok 4 Fast</li>
                  <li>• Mix multiple models for diverse perspectives</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex gap-6">
            <div
              className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold"
              style={{
                backgroundColor: "var(--color-primary)",
                color: "var(--color-white)"
              }}
            >
              3
            </div>
            <div>
              <h2
                className="text-2xl font-bold mb-3"
                style={{ color: "var(--foreground)" }}
              >
                Watch AI Models Debate
              </h2>
              <p
                className="text-lg mb-4"
                style={{
                  color: "var(--foreground-secondary)",
                  lineHeight: "1.7"
                }}
              >
                The AI models engage in a multi-round debate, analyzing data, presenting arguments,
                and challenging each other's reasoning. Each model provides its probability predictions
                for the market outcome.
              </p>
              <div
                className="p-4 rounded-lg"
                style={{ backgroundColor: "var(--color-soft-gray)" }}
              >
                <p className="text-sm mb-2" style={{ color: "var(--foreground-secondary)" }}>
                  <span className="font-semibold" style={{ color: "var(--foreground)" }}>Round 1:</span> Initial analysis and predictions
                </p>
                <p className="text-sm mb-2" style={{ color: "var(--foreground-secondary)" }}>
                  <span className="font-semibold" style={{ color: "var(--foreground)" }}>Round 2-N:</span> Models respond to each other, refine arguments
                </p>
                <p className="text-sm" style={{ color: "var(--foreground-secondary)" }}>
                  <span className="font-semibold" style={{ color: "var(--foreground)" }}>Final Round:</span> Summary and final predictions
                </p>
              </div>
            </div>
          </div>

          {/* Step 4 */}
          <div className="flex gap-6">
            <div
              className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold"
              style={{
                backgroundColor: "var(--color-primary)",
                color: "var(--color-white)"
              }}
            >
              4
            </div>
            <div>
              <h2
                className="text-2xl font-bold mb-3"
                style={{ color: "var(--foreground)" }}
              >
                Analyze Results & Insights
              </h2>
              <p
                className="text-lg mb-4"
                style={{
                  color: "var(--foreground-secondary)",
                  lineHeight: "1.7"
                }}
              >
                Review comprehensive debate results including AI consensus, market odds comparison,
                individual model predictions, key arguments, and an AI-generated summary. Use these
                insights to inform your own decision-making.
              </p>
              <div
                className="p-4 rounded-lg"
                style={{ backgroundColor: "var(--color-soft-gray)" }}
              >
                <p className="text-sm font-semibold mb-2" style={{ color: "var(--foreground)" }}>
                  You'll see:
                </p>
                <ul className="text-sm space-y-1" style={{ color: "var(--foreground-secondary)" }}>
                  <li>• Average AI consensus vs market odds</li>
                  <li>• Spread of predictions across models</li>
                  <li>• Key arguments for and against</li>
                  <li>• AI-generated debate summary</li>
                  <li>• Model-by-model breakdown</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Key Features */}
        <div className="mt-16 mb-12">
          <h2
            className="text-3xl font-bold text-center mb-8"
            style={{ color: "var(--foreground)" }}
          >
            Key Features
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div
              className="p-6 rounded-lg"
              style={{ backgroundColor: "var(--color-soft-gray)" }}
            >
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center mb-4"
                style={{ backgroundColor: "var(--color-primary)" }}
              >
                <svg className="w-6 h-6" fill="none" stroke="white" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold mb-2" style={{ color: "var(--foreground)" }}>
                Real Markets
              </h3>
              <p className="text-sm" style={{ color: "var(--foreground-secondary)" }}>
                All markets sourced from Polymarket with real money probabilities
              </p>
            </div>

            <div
              className="p-6 rounded-lg"
              style={{ backgroundColor: "var(--color-soft-gray)" }}
            >
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center mb-4"
                style={{ backgroundColor: "var(--color-primary)" }}
              >
                <svg className="w-6 h-6" fill="none" stroke="white" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold mb-2" style={{ color: "var(--foreground)" }}>
                Multiple AI Models
              </h3>
              <p className="text-sm" style={{ color: "var(--foreground-secondary)" }}>
                Compare perspectives from Claude, GPT-4, Gemini, DeepSeek, and more
              </p>
            </div>

            <div
              className="p-6 rounded-lg"
              style={{ backgroundColor: "var(--color-soft-gray)" }}
            >
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center mb-4"
                style={{ backgroundColor: "var(--color-primary)" }}
              >
                <svg className="w-6 h-6" fill="none" stroke="white" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold mb-2" style={{ color: "var(--foreground)" }}>
                Data-Driven Insights
              </h3>
              <p className="text-sm" style={{ color: "var(--foreground-secondary)" }}>
                Get comprehensive analysis with probabilities and consensus metrics
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-16">
          <h2
            className="text-3xl font-bold mb-4"
            style={{ color: "var(--foreground)" }}
          >
            Ready to Get Started?
          </h2>
          <p
            className="text-lg mb-8"
            style={{ color: "var(--foreground-secondary)" }}
          >
            Explore markets and start your first AI debate
          </p>
          <Link href="/">
            <button
              className="px-8 py-3 rounded-lg text-lg font-semibold transition-all duration-200"
              style={{
                backgroundColor: "var(--color-primary)",
                color: "var(--color-white)",
                boxShadow: "var(--shadow-primary)"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "var(--shadow-primary-hover)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "var(--shadow-primary)";
              }}
            >
              Browse Markets
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
