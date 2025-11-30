"use client";

import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useSearch } from "@/contexts/SearchContext";

interface SharedLayoutProps {
  children: React.ReactNode;
}

export function SharedLayout({ children }: SharedLayoutProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState("trending");
  const [activeSubtopic, setActiveSubtopic] = useState("All");
  const [showFooter, setShowFooter] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { searchQuery, setSearchQuery } = useSearch();
  
  // Check if we're on login or signup pages
  const isAuthPage = pathname === "/login" || pathname === "/signup";

  // Check if we're on profile page (needs full-width dark background)
  const isProfilePage = pathname === "/profile";

  // Check if we should show the bottom navigation bar (categories and search)
  // Hide on profile page and debate view pages
  const shouldShowBottomBar = !isProfilePage && !pathname.startsWith("/debate/");

  // Get search query from URL params
  const urlSearchQuery = searchParams.get("q") || "";

  // Sync context state with URL on mount and when URL changes (e.g., browser back/forward)
  useEffect(() => {
    if (urlSearchQuery !== searchQuery) {
      setSearchQuery(urlSearchQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlSearchQuery]);

  // Determine active category from pathname
  useEffect(() => {
    const path = pathname === "/" ? "trending" : pathname.slice(1).toLowerCase();
    setActiveCategory(path);
    // Reset subtopic when route changes (unless it's in URL)
    const subtopic = searchParams.get("subtopic");
    if (!subtopic) {
      setActiveSubtopic("All");
    }
  }, [pathname, searchParams]);

  // Get subtopic from URL search params if present
  useEffect(() => {
    const subtopic = searchParams.get("subtopic");
    if (subtopic) {
      setActiveSubtopic(subtopic);
    }
  }, [searchParams]);

  // Scroll detection for footer (only for non-auth pages)
  useEffect(() => {
    if (isAuthPage) {
      // Always show footer on auth pages
      setShowFooter(true);
      return;
    }
    
    const handleScroll = () => {
      const scrollPosition = window.scrollY || document.documentElement.scrollTop;
      setShowFooter(scrollPosition > 200);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isAuthPage]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // For auth pages, let the page component handle its own layout
  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <div 
      className="min-h-screen"
      style={{ backgroundColor: "var(--background)" }}
    >
      <Navigation
        activeCategory={activeCategory}
        activeSubtopic={activeSubtopic}
        searchQuery={searchQuery}
        showBottomBar={shouldShowBottomBar}
        onCategoryChange={(category) => {
          // Navigation will handle routing via Link components
          setActiveCategory(category);
          setActiveSubtopic("All");
        }}
        onSubtopicChange={(subtopic) => setActiveSubtopic(subtopic)}
        onSearchChange={(query) => {
          // Update context state immediately for instant filtering and API refetch
          setSearchQuery(query);
          
          // Clear existing timeout
          if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
          }
          
          // Debounce URL updates to avoid too many navigation events
          // Use shorter debounce for search to feel more responsive
          searchTimeoutRef.current = setTimeout(() => {
            const params = new URLSearchParams(searchParams?.toString() || "");
            if (query.trim()) {
              params.set("q", query);
            } else {
              params.delete("q");
            }
            const queryString = params.toString();
            router.push(`${pathname}${queryString ? `?${queryString}` : ""}`, { scroll: false });
            searchTimeoutRef.current = null;
          }, 150);
        }}
      />

      <main className={isProfilePage ? "" : "container mx-auto px-4 py-6 pb-24"}>
        {children}
      </main>

      {/* Footer - appears/disappears based on scroll (hide on profile page) */}
      {!isProfilePage && (
        <div
          className={cn(
            "fixed bottom-0 left-0 right-0 z-40 transition-transform duration-300",
            showFooter ? "translate-y-0" : "translate-y-full"
          )}
        >
          <Footer />
        </div>
      )}
    </div>
  );
}

