import { useQuery } from "@tanstack/react-query";
import type { OnboardingStep } from "@/components/OnboardingChecklist";

interface OnboardingData {
  hasCompanyProfile: boolean;
  hasBudget: boolean;
  hasSkus: boolean;
  hasMaterials: boolean;
  hasSuppliers: boolean;
  hasAlertsConfigured: boolean;
}

export function useOnboardingSteps() {
  const { data: onboardingData, isLoading } = useQuery<OnboardingData>({
    queryKey: ['/api/onboarding/status'],
    refetchInterval: 5000, // Refetch every 5 seconds to keep status fresh
  });

  const steps: OnboardingStep[] = [
    {
      id: 'company-profile',
      title: 'Set Company Profile',
      description: 'Add your industry and location to get started',
      completed: onboardingData?.hasCompanyProfile || false,
      link: '/configuration',
    },
    {
      id: 'budget',
      title: 'Configure Budget',
      description: 'Set your monthly budget and time period',
      completed: onboardingData?.hasBudget || false,
      link: '/configuration',
    },
    {
      id: 'sku',
      title: 'Load Sample Data',
      description: 'Use sample data to explore platform features',
      completed: onboardingData?.hasSkus || false,
      link: '/dashboard',
    },
    {
      id: 'material',
      title: 'Explore Materials',
      description: 'Review material inventory and pricing',
      completed: onboardingData?.hasMaterials || false,
      link: '/procurement',
    },
    {
      id: 'suppliers',
      title: 'Review Supply Chain',
      description: 'Understand supplier relationships',
      completed: onboardingData?.hasSuppliers || false,
      link: '/supply-chain',
    },
    {
      id: 'alerts',
      title: 'Configure Alerts',
      description: 'Get notified about important changes',
      completed: onboardingData?.hasAlertsConfigured || false,
      link: '/configuration',
    },
  ];

  const completedCount = steps.filter(s => s.completed).length;
  const totalCount = steps.length;
  const isFullyCompleted = completedCount === totalCount;

  return {
    steps,
    completedCount,
    totalCount,
    isFullyCompleted,
    isLoading,
  };
}
