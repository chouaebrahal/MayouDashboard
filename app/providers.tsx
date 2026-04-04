// app/providers.tsx
"use client";

import { UserProvider } from '@/app/components/UserProvider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <UserProvider>
      {children}
    </UserProvider>
  );
}