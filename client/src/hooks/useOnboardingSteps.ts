import { useQuery } from "@tanstack/react-query";
import type { OnboardingStep } from "@/components/OnboardingChecklist";

interface OnboardingData {
  hasCompanyProfile: boolean;
  hasBudget: boolean;
  hasSkus: boolean;
  hasMaterials: boolean;
  hasSuppliers: boolean;
  hasAlertEmail: boolean;
}

export function useOnboardingSteps() {
  const { data: onboardingData, isLoading } = useQuery<OnboardingData>({
    queryKey: ['/api/onboarding/status'],
    refetchInterval: 5000,
  });

  const steps: OnboardingStep[] = [
    {
      id: 'company-profile',
      title: 'Set Up Your Company',
      description: 'Add your industry and location',
      completed: onboardingData?.hasCompanyProfile || false,
      link: '/configuration',
    },
    {
      id: 'budget',
      title: 'Set Your Budget',
      description: 'Configure annual budget for planning',
      completed: onboardingData?.hasBudget || false,
      link: '/configuration',
    },
    {
      id: 'sku',
      title: 'Add Products',
      description: 'Create your first product or SKU',
      completed: onboardingData?.hasSkus || false,
      link: '/demand',
    },
    {
      id: 'material',
      title: 'Add Materials',
      description: 'Set up your materials catalog',
      completed: onboardingData?.hasMaterials || false,
      link: '/procurement',
    },
    {
      id: 'suppliers',
      title: 'Add Suppliers',
      description: 'Configure your supplier network',
      completed: onboardingData?.hasSuppliers || false,
      link: '/supply-chain',
    },
    {
      id: 'alerts',
      title: 'Set Up Notifications',
      description: 'Add email for alerts and updates',
      completed: onboardingData?.hasAlertEmail || false,
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
