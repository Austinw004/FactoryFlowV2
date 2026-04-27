import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";

interface AuthUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  // Optional preferred-name override the customer set in Settings → Profile.
  // AI Advisor + sidebar footer prefer this when set; falls back to firstName.
  nickname: string | null;
  profileImageUrl: string | null;
  companyId: string | null;
  onboardingComplete: number | null;
}

export function useAuth() {
  const { data: user, isLoading } = useQuery<AuthUser | null>({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    needsOnboarding: user && !user.onboardingComplete,
  };
}
