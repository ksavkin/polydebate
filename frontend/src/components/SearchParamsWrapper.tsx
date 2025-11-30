"use client";

import { Suspense, ReactNode } from "react";
import { useSearchParams } from "next/navigation";

interface SearchParamsWrapperProps {
  children: (searchParams: URLSearchParams) => ReactNode;
  fallback?: ReactNode;
}

function SearchParamsContent({ children }: SearchParamsWrapperProps) {
  const searchParams = useSearchParams();
  return <>{children(searchParams)}</>;
}

export function SearchParamsWrapper({ children, fallback = null }: SearchParamsWrapperProps) {
  return (
    <Suspense fallback={fallback}>
      <SearchParamsContent>{children}</SearchParamsContent>
    </Suspense>
  );
}

