import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Building2, Users, Rocket, Check, X, Loader2, Mail, UserPlus, MapPin } from "lucide-react";

const INDUSTRIES = [
  "Aerospace & Defense",
  "Automotive",
  "Chemicals",
  "Consumer Goods",
  "Electronics",
  "Food & Beverage",
  "Industrial Equipment",
  "Medical Devices",
  "Metals & Mining",
  "Pharmaceuticals",
  "Plastics & Rubber",
  "Semiconductors",
  "Textiles",
  "Other Manufacturing"
];

const COMPANY_SIZES = [
  { value: "small", label: "Small (1-50 employees)" },
  { value: "medium", label: "Medium (51-500 employees)" },
  { value: "large", label: "Large (501-5000 employees)" },
  { value: "enterprise", label: "Enterprise (5000+ employees)" }
];

interface TeamMember {
  email: string;
  role: string;
}

export default function Onboarding() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [location, setLocation] = useState("");
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("viewer");

  const { data: roles } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["/api/roles"],
    enabled: step === 2,
  });

  const setupCompanyMutation = useMutation({
    mutationFn: async (data: { name: string; industry: string; companySize: string; location: string }) => {
      return apiRequest("POST", "/api/onboarding/company", data);
    },
    onSuccess: () => {
      setStep(2);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to set up company",
        variant: "destructive",
      });
    },
  });

  const inviteTeamMutation = useMutation({
    mutationFn: async (members: TeamMember[]) => {
      return apiRequest("POST", "/api/onboarding/invite-team", { members });
    },
  });

  const completeOnboardingMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/onboarding/complete");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Welcome to Prescient Labs!",
        description: "Your account is ready. Let's get started!",
      });
      navigate("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to complete onboarding",
        variant: "destructive",
      });
    },
  });

  const handleAddTeamMember = () => {
    if (!newMemberEmail || !newMemberEmail.includes("@")) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }
    if (teamMembers.some(m => m.email === newMemberEmail)) {
      toast({
        title: "Duplicate email",
        description: "This email has already been added",
        variant: "destructive",
      });
      return;
    }
    setTeamMembers([...teamMembers, { email: newMemberEmail, role: newMemberRole }]);
    setNewMemberEmail("");
    setNewMemberRole("viewer");
  };

  const handleRemoveTeamMember = (email: string) => {
    setTeamMembers(teamMembers.filter(m => m.email !== email));
  };

  const handleCompanySubmit = () => {
    if (!companyName.trim()) {
      toast({
        title: "Company name required",
        description: "Please enter your company name",
        variant: "destructive",
      });
      return;
    }
    setupCompanyMutation.mutate({
      name: companyName,
      industry,
      companySize,
      location,
    });
  };

  const handleTeamSubmit = async () => {
    if (teamMembers.length > 0) {
      await inviteTeamMutation.mutateAsync(teamMembers);
    }
    setStep(3);
  };

  const handleComplete = () => {
    completeOnboardingMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-xl">P</span>
          </div>
          <span className="text-2xl font-bold">Prescient Labs</span>
        </div>

        <div className="flex items-center justify-center gap-4 mb-8">
          <StepIndicator step={1} currentStep={step} label="Company" icon={<Building2 className="w-4 h-4" />} />
          <div className="w-12 h-0.5 bg-border" />
          <StepIndicator step={2} currentStep={step} label="Team" icon={<Users className="w-4 h-4" />} />
          <div className="w-12 h-0.5 bg-border" />
          <StepIndicator step={3} currentStep={step} label="Launch" icon={<Rocket className="w-4 h-4" />} />
        </div>

        {step === 1 && (
          <Card data-testid="card-onboarding-company">
            <CardHeader>
              <CardTitle>Set up your organization</CardTitle>
              <CardDescription>
                Tell us about your company so we can customize your experience
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name *</Label>
                <Input
                  id="companyName"
                  data-testid="input-company-name"
                  placeholder="Acme Manufacturing Co."
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="industry">Industry</Label>
                <Select value={industry} onValueChange={setIndustry}>
                  <SelectTrigger id="industry" data-testid="select-industry">
                    <SelectValue placeholder="Select your industry" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDUSTRIES.map((ind) => (
                      <SelectItem key={ind} value={ind}>{ind}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="companySize">Company Size</Label>
                <Select value={companySize} onValueChange={setCompanySize}>
                  <SelectTrigger id="companySize" data-testid="select-company-size">
                    <SelectValue placeholder="Select company size" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMPANY_SIZES.map((size) => (
                      <SelectItem key={size.value} value={size.value}>{size.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">
                  <span className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Headquarters Location
                  </span>
                </Label>
                <Input
                  id="location"
                  data-testid="input-location"
                  placeholder="e.g., Detroit, Michigan, USA"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
                <p className="text-sm text-muted-foreground">
                  This helps us tailor supply chain recommendations to your region
                </p>
              </div>

              <Separator />

              <Button 
                onClick={handleCompanySubmit} 
                className="w-full"
                data-testid="button-continue-to-team"
                disabled={setupCompanyMutation.isPending}
              >
                {setupCompanyMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Setting up...</>
                ) : (
                  <>Continue <Users className="w-4 h-4 ml-2" /></>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card data-testid="card-onboarding-team">
            <CardHeader>
              <CardTitle>Invite your team</CardTitle>
              <CardDescription>
                Add team members to collaborate on procurement and forecasting (optional)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    placeholder="colleague@company.com"
                    type="email"
                    data-testid="input-team-email"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddTeamMember()}
                  />
                </div>
                <Select value={newMemberRole} onValueChange={setNewMemberRole}>
                  <SelectTrigger className="w-[140px]" data-testid="select-team-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={handleAddTeamMember}
                  data-testid="button-add-team-member"
                >
                  <UserPlus className="w-4 h-4" />
                </Button>
              </div>

              {teamMembers.length > 0 && (
                <div className="space-y-2">
                  <Label>Pending Invitations</Label>
                  <div className="space-y-2">
                    {teamMembers.map((member) => (
                      <div 
                        key={member.email} 
                        className="flex items-center justify-between p-3 bg-muted rounded-lg"
                        data-testid={`team-member-${member.email}`}
                      >
                        <div className="flex items-center gap-3">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          <span>{member.email}</span>
                          <Badge variant="secondary">{member.role}</Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveTeamMember(member.email)}
                          data-testid={`button-remove-${member.email}`}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {teamMembers.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No team members added yet</p>
                  <p className="text-sm">You can always invite team members later</p>
                </div>
              )}

              <Separator />

              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setStep(1)}
                  data-testid="button-back-to-company"
                >
                  Back
                </Button>
                <Button 
                  onClick={handleTeamSubmit} 
                  className="flex-1"
                  data-testid="button-continue-to-launch"
                  disabled={inviteTeamMutation.isPending}
                >
                  {inviteTeamMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending invites...</>
                  ) : teamMembers.length > 0 ? (
                    <>Send Invites & Continue <Rocket className="w-4 h-4 ml-2" /></>
                  ) : (
                    <>Skip & Continue <Rocket className="w-4 h-4 ml-2" /></>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card data-testid="card-onboarding-launch">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle>You're all set!</CardTitle>
              <CardDescription>
                Your organization is ready. Here's what you can do next:
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4">
                <FeatureHighlight
                  icon={<Building2 className="w-5 h-5" />}
                  title="Upload your product catalog"
                  description="Import your SKUs, materials, and suppliers to get accurate demand forecasts"
                />
                <FeatureHighlight
                  icon={<Rocket className="w-5 h-5" />}
                  title="Explore the Digital Twin"
                  description="See real-time economic indicators and how they affect your supply chain"
                />
                <FeatureHighlight
                  icon={<Users className="w-5 h-5" />}
                  title="Set up procurement rules"
                  description="Configure automated RFQ generation and purchase order triggers"
                />
              </div>

              <Separator />

              <Button 
                onClick={handleComplete} 
                className="w-full"
                size="lg"
                data-testid="button-launch-platform"
                disabled={completeOnboardingMutation.isPending}
              >
                {completeOnboardingMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Launching...</>
                ) : (
                  <>Launch Prescient Labs <Rocket className="w-4 h-4 ml-2" /></>
                )}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function StepIndicator({ 
  step, 
  currentStep, 
  label, 
  icon 
}: { 
  step: number; 
  currentStep: number; 
  label: string;
  icon: React.ReactNode;
}) {
  const isComplete = currentStep > step;
  const isCurrent = currentStep === step;
  
  return (
    <div className="flex flex-col items-center gap-2">
      <div 
        className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
          isComplete 
            ? "bg-primary text-primary-foreground" 
            : isCurrent 
              ? "bg-primary text-primary-foreground" 
              : "bg-muted text-muted-foreground"
        }`}
      >
        {isComplete ? <Check className="w-5 h-5" /> : icon}
      </div>
      <span className={`text-sm font-medium ${isCurrent ? "text-foreground" : "text-muted-foreground"}`}>
        {label}
      </span>
    </div>
  );
}

function FeatureHighlight({ 
  icon, 
  title, 
  description 
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string;
}) {
  return (
    <div className="flex gap-4 p-4 bg-muted/50 rounded-lg">
      <div className="text-primary">{icon}</div>
      <div>
        <h4 className="font-medium">{title}</h4>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
