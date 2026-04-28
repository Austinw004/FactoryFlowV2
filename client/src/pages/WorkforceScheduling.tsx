import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { formatRegimeName } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter 
} from "@/components/ui/dialog";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Users, 
  UserPlus,
  DollarSign,
  Heart,
  CalendarClock,
  FileText,
  Star,
  Phone,
  Building2,
  Award,
  TrendingUp,
  Briefcase,
  CreditCard,
  Shield,
  AlertCircle,
  CheckCircle2,
  Clock,
  Grid3X3,
  Calendar,
  Timer,
  Lightbulb,
  Plus,
  UserCheck,
  UserX,
  AlertTriangle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";

export default function WorkforceScheduling() {
  const { toast } = useToast();
  const [openEmployeeDialog, setOpenEmployeeDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("coverage");

  const { data: employees = [], isLoading: employeesLoading } = useQuery<any[]>({
    queryKey: ["/api/workforce/employees"],
  });

  const { data: payrollData = [] } = useQuery<any[]>({
    queryKey: ["/api/workforce/payroll"],
    enabled: selectedEmployee !== null,
  });

  const { data: benefits = [] } = useQuery<any[]>({
    queryKey: ["/api/workforce/benefits"],
    enabled: selectedEmployee !== null,
  });

  const { data: timeOffRequests = [] } = useQuery<any[]>({
    queryKey: ["/api/workforce/time-off"],
  });

  const { data: documents = [] } = useQuery<any[]>({
    queryKey: ["/api/workforce/documents"],
    enabled: selectedEmployee !== null,
  });

  const { data: performanceReviews = [] } = useQuery<any[]>({
    queryKey: ["/api/workforce/reviews"],
    enabled: selectedEmployee !== null,
  });

  // New queries for enhanced workforce features
  const { data: skillCertifications = [] } = useQuery<any[]>({
    queryKey: ["/api/workforce/skill-certifications"],
  });

  const { data: skillRequirements = [] } = useQuery<any[]>({
    queryKey: ["/api/workforce/skills"],
  });

  const { data: todaysCoverage } = useQuery<any>({
    queryKey: ["/api/workforce/todays-coverage"],
  });

  const { data: overtimeTracking } = useQuery<any>({
    queryKey: ["/api/workforce/overtime-tracking"],
  });

  const { data: staffingRecommendations } = useQuery<any>({
    queryKey: ["/api/workforce/staffing-recommendations"],
  });

  const { data: shiftAssignments = [] } = useQuery<any[]>({
    queryKey: ["/api/workforce/shift-assignments"],
  });

  // State for skill matrix dialog
  const [openSkillDialog, setOpenSkillDialog] = useState(false);
  const [skillEmployeeId, setSkillEmployeeId] = useState("");
  const [skillCode, setSkillCode] = useState("");
  const [skillLevel, setSkillLevel] = useState("");

  // State for shift assignment dialog
  const [openShiftDialog, setOpenShiftDialog] = useState(false);
  const [shiftEmployeeId, setShiftEmployeeId] = useState("");
  const [shiftType, setShiftType] = useState("");
  const [shiftDepartment, setShiftDepartment] = useState("");

  const createSkillCertMutation = useMutation({
    mutationFn: async (data: any) => 
      apiRequest("POST", "/api/workforce/skill-certifications", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workforce/skill-certifications"] });
      toast({ title: "Skill certification added" });
      setOpenSkillDialog(false);
      setSkillEmployeeId("");
      setSkillCode("");
      setSkillLevel("");
    },
    onError: () => {
      toast({ title: "Failed to add skill certification", variant: "destructive" });
    },
  });

  const createShiftAssignmentMutation = useMutation({
    mutationFn: async (data: any) => 
      apiRequest("POST", "/api/workforce/shift-assignments", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workforce/shift-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/workforce/todays-coverage"] });
      queryClient.invalidateQueries({ queryKey: ["/api/workforce/overtime-tracking"] });
      toast({ title: "Shift assigned successfully" });
      setOpenShiftDialog(false);
      setShiftEmployeeId("");
      setShiftType("");
      setShiftDepartment("");
    },
    onError: () => {
      toast({ title: "Failed to assign shift", variant: "destructive" });
    },
  });

  const handleCreateSkillCert = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!skillEmployeeId || !skillCode || !skillLevel) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }
    const formData = new FormData(e.currentTarget);
    createSkillCertMutation.mutate({
      employeeId: skillEmployeeId,
      skillCode,
      skillLevel: parseInt(skillLevel),
      certifiedDate: formData.get("certifiedDate") ? new Date(formData.get("certifiedDate") as string).toISOString() : null,
      expirationDate: formData.get("expirationDate") ? new Date(formData.get("expirationDate") as string).toISOString() : null,
    });
  };

  const handleCreateShiftAssignment = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!shiftEmployeeId || !shiftType || !shiftDepartment) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }
    const formData = new FormData(e.currentTarget);
    const shiftDate = formData.get("shiftDate") as string;
    const startTime = formData.get("startTime") as string;
    const endTime = formData.get("endTime") as string;
    
    // Calculate hours
    const [startH, startM] = startTime.split(":").map(Number);
    const [endH, endM] = endTime.split(":").map(Number);
    let hoursScheduled = (endH + endM / 60) - (startH + startM / 60);
    if (hoursScheduled < 0) hoursScheduled += 24; // Overnight shift
    
    createShiftAssignmentMutation.mutate({
      employeeId: shiftEmployeeId,
      shiftDate: new Date(shiftDate).toISOString(),
      shiftType,
      startTime,
      endTime,
      hoursScheduled,
      department: shiftDepartment,
      productionLine: formData.get("productionLine") || null,
    });
  };

  const createEmployeeMutation = useMutation({
    mutationFn: async (data: any) => 
      apiRequest("POST", "/api/workforce/employees", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workforce/employees"] });
      toast({ title: "Employee added successfully" });
      setOpenEmployeeDialog(false);
    },
    onError: () => {
      toast({ 
        title: "Failed to add employee", 
        variant: "destructive" 
      });
    },
  });

  const handleCreateEmployee = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    createEmployeeMutation.mutate({
      employeeNumber: formData.get("employeeNumber"),
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      department: formData.get("department"),
      role: formData.get("role"),
      employmentType: formData.get("employmentType"),
      hireDate: new Date(formData.get("hireDate") as string).toISOString(),
    });
  };

  const activeEmployees = employees.filter((e: any) => e.status === "active").length;
  const pendingTimeOff = timeOffRequests.filter((r: any) => r.status === "pending").length;
  
  const totalPayroll = payrollData.reduce((sum: number, p: any) => {
    return sum + (p.annualSalary || (p.hourlyRate * 2080) || 0);
  }, 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
<p className="text-muted-foreground mt-1">
            Complete employee hub for HR, payroll, benefits, time off, and performance tracking
          </p>
        </div>
        <Dialog open={openEmployeeDialog} onOpenChange={setOpenEmployeeDialog}>
          <DialogTrigger asChild>
            <Button size="lg" data-testid="button-add-employee">
              <UserPlus className="h-4 w-4 mr-2" />
              Add Employee
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Employee</DialogTitle>
              <DialogDescription>
                Enter basic employee information to get started
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateEmployee}>
              <div className="grid grid-cols-2 gap-4 py-4">
                <div>
                  <Label htmlFor="employeeNumber">Employee Number</Label>
                  <Input id="employeeNumber" name="employeeNumber" placeholder="EMP-001" required data-testid="input-employee-number" />
                </div>
                <div>
                  <Label htmlFor="hireDate">Hire Date</Label>
                  <Input id="hireDate" name="hireDate" type="date" required data-testid="input-hire-date" />
                </div>
                <div>
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" name="firstName" required data-testid="input-first-name" />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" name="lastName" required data-testid="input-last-name" />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" required data-testid="input-email" />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" name="phone" data-testid="input-phone" />
                </div>
                <div>
                  <Label htmlFor="department">Department</Label>
                  <Select name="department" required>
                    <SelectTrigger data-testid="select-department">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="production">Production</SelectItem>
                      <SelectItem value="quality">Quality</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="logistics">Logistics</SelectItem>
                      <SelectItem value="hr">Human Resources</SelectItem>
                      <SelectItem value="accounting">Accounting</SelectItem>
                      <SelectItem value="admin">Administration</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="role">Role/Title</Label>
                  <Input id="role" name="role" required placeholder="e.g., Production Manager" data-testid="input-role" />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="employmentType">Employment Type</Label>
                  <Select name="employmentType" required>
                    <SelectTrigger data-testid="select-employment-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full_time">Full Time</SelectItem>
                      <SelectItem value="part_time">Part Time</SelectItem>
                      <SelectItem value="contractor">Contractor</SelectItem>
                      <SelectItem value="intern">Intern</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" data-testid="button-submit-employee">
                  Add Employee
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Employees
            </CardDescription>
            <CardTitle className="text-3xl" data-testid="text-total-employees">
              {activeEmployees}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {employees.length} total (including on leave)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Annual Payroll
            </CardDescription>
            <CardTitle className="text-3xl" data-testid="text-total-payroll">
              ${(totalPayroll / 1000).toFixed(0)}K
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Estimated total compensation
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4" />
              Time Off Requests
            </CardDescription>
            <CardTitle className="text-3xl" data-testid="text-pending-time-off">
              {pendingTimeOff}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Pending approval
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-2">
              <Heart className="h-4 w-4" />
              Benefits Enrolled
            </CardDescription>
            <CardTitle className="text-3xl" data-testid="text-benefits-enrolled">
              {benefits.filter((b: any) => b.status === "active").length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Active benefit plans
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Regime-Aware Staffing Recommendations */}
      {staffingRecommendations?.recommendations?.length > 0 && (
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Lightbulb className="h-5 w-5 text-blue-500" />
              Regime-Aware Staffing Insights
              <Badge variant="outline">{formatRegimeName(staffingRecommendations.regime)}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {staffingRecommendations.recommendations.map((rec: any, idx: number) => (
                <div key={idx} className="flex items-start gap-2 p-2 rounded-lg bg-muted/50">
                  <Badge variant={rec.priority === "high" ? "destructive" : rec.priority === "medium" ? "default" : "secondary"} className="text-xs">
                    {rec.priority}
                  </Badge>
                  <span className="text-sm">{rec.message}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="overflow-x-auto">
          <TabsList className="inline-flex min-w-full">
            <TabsTrigger value="coverage" data-testid="tab-coverage">
              <UserCheck className="h-4 w-4 mr-2" />
              Today
            </TabsTrigger>
            <TabsTrigger value="skills" data-testid="tab-skills">
              <Grid3X3 className="h-4 w-4 mr-2" />
              Skills
            </TabsTrigger>
            <TabsTrigger value="scheduling" data-testid="tab-scheduling">
              <Calendar className="h-4 w-4 mr-2" />
              Schedule
            </TabsTrigger>
            <TabsTrigger value="overtime" data-testid="tab-overtime">
              <Timer className="h-4 w-4 mr-2" />
              Overtime
            </TabsTrigger>
            <TabsTrigger value="employees" data-testid="tab-employees">
              <Users className="h-4 w-4 mr-2" />
              Employees
            </TabsTrigger>
            <TabsTrigger value="payroll" data-testid="tab-payroll">
              <DollarSign className="h-4 w-4 mr-2" />
              Payroll
            </TabsTrigger>
            <TabsTrigger value="benefits" data-testid="tab-benefits">
              <Heart className="h-4 w-4 mr-2" />
              Benefits
            </TabsTrigger>
            <TabsTrigger value="timeoff" data-testid="tab-timeoff">
              <CalendarClock className="h-4 w-4 mr-2" />
              Time Off
            </TabsTrigger>
            <TabsTrigger value="documents" data-testid="tab-documents">
              <FileText className="h-4 w-4 mr-2" />
              Documents
            </TabsTrigger>
            <TabsTrigger value="reviews" data-testid="tab-reviews">
              <Star className="h-4 w-4 mr-2" />
              Reviews
            </TabsTrigger>
            <TabsTrigger value="emergency" data-testid="tab-emergency">
              <Phone className="h-4 w-4 mr-2" />
              Emergency
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="employees" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Employee Directory</CardTitle>
              <CardDescription>
                Complete employee information and personal details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee #</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employeesLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center">Loading...</TableCell>
                    </TableRow>
                  ) : employees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>No employees found. Add your first employee to get started.</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    employees.map((emp: any) => (
                      <TableRow key={emp.id} data-testid={`row-employee-${emp.id}`}>
                        <TableCell className="font-mono">{emp.employeeNumber}</TableCell>
                        <TableCell className="font-medium">{emp.firstName} {emp.lastName}</TableCell>
                        <TableCell>{emp.email}</TableCell>
                        <TableCell className="capitalize">{emp.department}</TableCell>
                        <TableCell>{emp.role}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {emp.employmentType?.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={emp.status === 'active' ? 'default' : 'secondary'}
                            className={emp.status === 'active' ? 'bg-green-600' : ''}
                          >
                            {emp.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setSelectedEmployee(emp)}
                            data-testid={`button-view-employee-${emp.id}`}
                          >
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payroll" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payroll Management
              </CardTitle>
              <CardDescription>
                Salary, hourly rates, tax withholding, bank account info, and payment schedules
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  <Building2 className="h-4 w-4 inline mr-2" />
                  Select an employee from the Employees tab to view and manage their payroll details, including:
                </div>
                <ul className="list-disc list-inside space-y-2 text-sm ml-4">
                  <li>Salary or hourly rate configuration</li>
                  <li>Pay frequency (weekly, biweekly, monthly)</li>
                  <li>Direct deposit bank account information</li>
                  <li>Federal and state tax withholding</li>
                  <li>Bonus and commission eligibility</li>
                  <li>Overtime rates and eligibility</li>
                  <li>Payment history and pay stubs</li>
                </ul>
                
                {employees.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <DollarSign className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Add employees to manage payroll information</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Salary/Rate</TableHead>
                        <TableHead>Pay Frequency</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {employees.map((emp: any) => {
                        const payroll = payrollData.find((p: any) => p.employeeId === emp.id);
                        return (
                          <TableRow key={emp.id}>
                            <TableCell className="font-medium">{emp.firstName} {emp.lastName}</TableCell>
                            <TableCell className="capitalize">{emp.employmentType?.replace('_', ' ')}</TableCell>
                            <TableCell>
                              {payroll?.annualSalary ? `$${payroll.annualSalary.toLocaleString()}/year` :
                               payroll?.hourlyRate ? `$${payroll.hourlyRate}/hour` :
                               'Not set'}
                            </TableCell>
                            <TableCell className="capitalize">
                              {payroll?.payFrequency || 'Not set'}
                            </TableCell>
                            <TableCell>
                              <Button variant="outline" size="sm" data-testid={`button-edit-payroll-${emp.id}`}>
                                Edit
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="benefits" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Benefits & Insurance
              </CardTitle>
              <CardDescription>
                Health, dental, vision, life insurance, 401k, and other employee benefits
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  <Heart className="h-4 w-4 inline mr-2" />
                  Manage comprehensive employee benefits including:
                </div>
                <ul className="list-disc list-inside space-y-2 text-sm ml-4">
                  <li>Health insurance (employee, spouse, family coverage)</li>
                  <li>Dental and vision insurance plans</li>
                  <li>Life insurance policies and beneficiaries</li>
                  <li>401(k) retirement plans and employer matching</li>
                  <li>PTO accrual and balance tracking</li>
                  <li>Other benefits (gym membership, education assistance, etc.)</li>
                  <li>Enrollment periods and status tracking</li>
                </ul>

                {employees.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Heart className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Add employees to manage benefits enrollment</p>
                  </div>
                ) : (
                  <div className="mt-6">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Employee</TableHead>
                          <TableHead>Health</TableHead>
                          <TableHead>Dental</TableHead>
                          <TableHead>401(k)</TableHead>
                          <TableHead>Life</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {employees.map((emp: any) => (
                          <TableRow key={emp.id}>
                            <TableCell className="font-medium">{emp.firstName} {emp.lastName}</TableCell>
                            <TableCell>
                              {benefits.some((b: any) => b.employeeId === emp.id && b.benefitType === 'health') ? 
                                <CheckCircle2 className="h-4 w-4 text-good" /> :
                                <AlertCircle className="h-4 w-4 text-muted-foreground" />
                              }
                            </TableCell>
                            <TableCell>
                              {benefits.some((b: any) => b.employeeId === emp.id && b.benefitType === 'dental') ? 
                                <CheckCircle2 className="h-4 w-4 text-good" /> :
                                <AlertCircle className="h-4 w-4 text-muted-foreground" />
                              }
                            </TableCell>
                            <TableCell>
                              {benefits.some((b: any) => b.employeeId === emp.id && b.benefitType === '401k') ? 
                                <CheckCircle2 className="h-4 w-4 text-good" /> :
                                <AlertCircle className="h-4 w-4 text-muted-foreground" />
                              }
                            </TableCell>
                            <TableCell>
                              {benefits.some((b: any) => b.employeeId === emp.id && b.benefitType === 'life') ? 
                                <CheckCircle2 className="h-4 w-4 text-good" /> :
                                <AlertCircle className="h-4 w-4 text-muted-foreground" />
                              }
                            </TableCell>
                            <TableCell>
                              <Button variant="outline" size="sm" data-testid={`button-manage-benefits-${emp.id}`}>
                                Manage
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeoff" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Time Off Management
              </CardTitle>
              <CardDescription>
                Vacation, sick leave, personal days, and PTO balance tracking
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  <CalendarClock className="h-4 w-4 inline mr-2" />
                  Track and manage all time off requests and PTO balances:
                </div>
                <ul className="list-disc list-inside space-y-2 text-sm ml-4">
                  <li>Vacation days - accrual, usage, and remaining balance</li>
                  <li>Sick leave tracking and approvals</li>
                  <li>Personal days and unpaid leave</li>
                  <li>Bereavement, parental, and jury duty leave</li>
                  <li>PTO request approval workflow</li>
                  <li>Annual carryover policies</li>
                  <li>Holiday calendars</li>
                </ul>

                {timeOffRequests.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CalendarClock className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No time off requests yet</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Dates</TableHead>
                        <TableHead>Days</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {timeOffRequests.map((request: any) => {
                        const emp = employees.find((e: any) => e.id === request.employeeId);
                        return (
                          <TableRow key={request.id}>
                            <TableCell className="font-medium">
                              {emp ? `${emp.firstName} ${emp.lastName}` : 'Unknown'}
                            </TableCell>
                            <TableCell className="capitalize">{request.requestType}</TableCell>
                            <TableCell className="text-sm">
                              {format(new Date(request.startDate), 'MMM d')} - {format(new Date(request.endDate), 'MMM d, yyyy')}
                            </TableCell>
                            <TableCell>{request.totalDays}</TableCell>
                            <TableCell>
                              <Badge variant={
                                request.status === 'approved' ? 'default' :
                                request.status === 'pending' ? 'secondary' :
                                'outline'
                              }>
                                {request.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {request.status === 'pending' && (
                                <div className="flex gap-2">
                                  <Button variant="outline" size="sm" data-testid={`button-approve-${request.id}`}>
                                    Approve
                                  </Button>
                                  <Button variant="outline" size="sm" data-testid={`button-deny-${request.id}`}>
                                    Deny
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Employee Documents
              </CardTitle>
              <CardDescription>
                I-9, W-4, contracts, certifications, licenses, and performance reviews
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  <FileText className="h-4 w-4 inline mr-2" />
                  Store and manage all employee documentation:
                </div>
                <ul className="list-disc list-inside space-y-2 text-sm ml-4">
                  <li>I-9 employment eligibility verification</li>
                  <li>W-4 tax withholding forms</li>
                  <li>Employment contracts and offer letters</li>
                  <li>Professional certifications and licenses</li>
                  <li>Training completion certificates</li>
                  <li>Performance review documents</li>
                  <li>Disciplinary action records (confidential)</li>
                  <li>Background check results</li>
                </ul>

                {employees.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Add employees to manage their documents</p>
                  </div>
                ) : documents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No documents uploaded yet</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Document Type</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Upload Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {documents.map((doc: any) => {
                        const emp = employees.find((e: any) => e.id === doc.employeeId);
                        return (
                          <TableRow key={doc.id}>
                            <TableCell className="font-medium">
                              {emp ? `${emp.firstName} ${emp.lastName}` : 'Unknown'}
                            </TableCell>
                            <TableCell className="capitalize">{doc.documentType.replace('_', ' ')}</TableCell>
                            <TableCell>{doc.title}</TableCell>
                            <TableCell>{format(new Date(doc.createdAt), 'MMM d, yyyy')}</TableCell>
                            <TableCell>
                              <Badge variant={doc.status === 'active' ? 'default' : 'secondary'}>
                                {doc.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button variant="outline" size="sm">Download</Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reviews" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Performance Reviews
              </CardTitle>
              <CardDescription>
                Annual reviews, goals, accomplishments, and performance tracking
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  <Star className="h-4 w-4 inline mr-2" />
                  Conduct and track comprehensive performance evaluations:
                </div>
                <ul className="list-disc list-inside space-y-2 text-sm ml-4">
                  <li>Annual, quarterly, and probationary reviews</li>
                  <li>Performance ratings (productivity, quality, teamwork, attendance)</li>
                  <li>Strengths and areas for improvement</li>
                  <li>Goal setting and accomplishment tracking</li>
                  <li>Salary increases and bonus recommendations</li>
                  <li>Promotion tracking</li>
                  <li>Employee acknowledgment and signatures</li>
                </ul>

                {employees.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Star className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Add employees to conduct performance reviews</p>
                  </div>
                ) : performanceReviews.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Star className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No performance reviews yet</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Review Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Overall Rating</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {performanceReviews.map((review: any) => {
                        const emp = employees.find((e: any) => e.id === review.employeeId);
                        return (
                          <TableRow key={review.id}>
                            <TableCell className="font-medium">
                              {emp ? `${emp.firstName} ${emp.lastName}` : 'Unknown'}
                            </TableCell>
                            <TableCell>{format(new Date(review.reviewDate), 'MMM d, yyyy')}</TableCell>
                            <TableCell className="capitalize">{review.reviewType}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-good" />
                                {review.overallRating}/5
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={review.status === 'completed' ? 'default' : 'secondary'}>
                                {review.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button variant="outline" size="sm">View</Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="emergency" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Emergency Contacts
              </CardTitle>
              <CardDescription>
                Emergency contact information for all employees
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  <AlertCircle className="h-4 w-4 inline mr-2" />
                  Maintain up-to-date emergency contact information for safety and compliance:
                </div>
                <ul className="list-disc list-inside space-y-2 text-sm ml-4">
                  <li>Primary and secondary emergency contacts</li>
                  <li>Contact name, relationship, and phone numbers</li>
                  <li>Alternate phone numbers and email addresses</li>
                  <li>Physical addresses if needed</li>
                  <li>Medical information (optional)</li>
                </ul>

                {employees.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Phone className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Add employees to manage emergency contacts</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Primary Contact</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {employees.map((emp: any) => (
                        <TableRow key={emp.id}>
                          <TableCell className="font-medium">{emp.firstName} {emp.lastName}</TableCell>
                          <TableCell className="capitalize">{emp.department}</TableCell>
                          <TableCell>Not set</TableCell>
                          <TableCell>-</TableCell>
                          <TableCell>
                            <Button variant="outline" size="sm" data-testid={`button-add-emergency-${emp.id}`}>
                              Add Contact
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Today's Coverage Tab */}
        <TabsContent value="coverage" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-3">
                <CardDescription className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-good" />
                  Scheduled Today
                </CardDescription>
                <CardTitle className="text-3xl" data-testid="text-scheduled-today">
                  {todaysCoverage?.scheduled || 0}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription className="flex items-center gap-2">
                  <UserX className="h-4 w-4 text-signal" />
                  On Leave
                </CardDescription>
                <CardTitle className="text-3xl" data-testid="text-on-leave">
                  {todaysCoverage?.onLeave || 0}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-500" />
                  Available
                </CardDescription>
                <CardTitle className="text-3xl" data-testid="text-available">
                  {todaysCoverage?.available || 0}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Total Active
                </CardDescription>
                <CardTitle className="text-3xl">
                  {todaysCoverage?.totalActive || 0}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <UserCheck className="h-5 w-5 text-good" />
                  Working Today
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!todaysCoverage?.scheduledEmployees?.length ? (
                  <p className="text-muted-foreground text-sm">No employees scheduled for today</p>
                ) : (
                  <div className="space-y-2">
                    {todaysCoverage.scheduledEmployees.map((emp: any) => (
                      <div key={emp.id} className="flex items-center justify-between p-2 rounded bg-muted/50">
                        <span className="font-medium">{emp.firstName} {emp.lastName}</span>
                        <Badge variant="outline" className="capitalize">{emp.department}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <UserX className="h-5 w-5 text-signal" />
                  On Leave Today
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!todaysCoverage?.onLeaveEmployees?.length ? (
                  <p className="text-muted-foreground text-sm">No employees on leave today</p>
                ) : (
                  <div className="space-y-2">
                    {todaysCoverage.onLeaveEmployees.map((emp: any) => (
                      <div key={emp.id} className="flex items-center justify-between p-2 rounded bg-orange-50 dark:bg-orange-950/20">
                        <span className="font-medium">{emp.firstName} {emp.lastName}</span>
                        <Badge variant="secondary" className="capitalize">{emp.department}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Skills Matrix Tab */}
        <TabsContent value="skills" className="space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <h2 className="text-xl font-semibold">Skills Matrix</h2>
            <Dialog open={openSkillDialog} onOpenChange={setOpenSkillDialog}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-skill-cert">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Certification
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Skill Certification</DialogTitle>
                  <DialogDescription>
                    Record a skill certification for an employee
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateSkillCert}>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label htmlFor="skillEmployee">Employee</Label>
                      <Select value={skillEmployeeId} onValueChange={setSkillEmployeeId}>
                        <SelectTrigger data-testid="select-skill-employee">
                          <SelectValue placeholder="Select employee" />
                        </SelectTrigger>
                        <SelectContent>
                          {employees.map((emp: any) => (
                            <SelectItem key={emp.id} value={emp.id}>
                              {emp.firstName} {emp.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="skillCode">Skill</Label>
                      <Select value={skillCode} onValueChange={setSkillCode}>
                        <SelectTrigger data-testid="select-skill-code">
                          <SelectValue placeholder="Select skill" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CNC_OPERATION">CNC Operation</SelectItem>
                          <SelectItem value="WELDING_MIG">MIG Welding</SelectItem>
                          <SelectItem value="WELDING_TIG">TIG Welding</SelectItem>
                          <SelectItem value="FORKLIFT">Forklift Operation</SelectItem>
                          <SelectItem value="QUALITY_INSPECTION">Quality Inspection</SelectItem>
                          <SelectItem value="ELECTRICAL">Electrical Systems</SelectItem>
                          <SelectItem value="PLC_PROGRAMMING">PLC Programming</SelectItem>
                          <SelectItem value="HYDRAULICS">Hydraulics</SelectItem>
                          <SelectItem value="SAFETY_LEAD">Safety Leadership</SelectItem>
                          <SelectItem value="FIRST_AID">First Aid/CPR</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="skillLevel">Skill Level</Label>
                      <Select value={skillLevel} onValueChange={setSkillLevel}>
                        <SelectTrigger data-testid="select-skill-level">
                          <SelectValue placeholder="Select level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 - Basic</SelectItem>
                          <SelectItem value="2">2 - Intermediate</SelectItem>
                          <SelectItem value="3">3 - Advanced</SelectItem>
                          <SelectItem value="4">4 - Expert</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="certifiedDate">Certified Date</Label>
                        <Input id="certifiedDate" name="certifiedDate" type="date" data-testid="input-certified-date" />
                      </div>
                      <div>
                        <Label htmlFor="expirationDate">Expiration Date</Label>
                        <Input id="expirationDate" name="expirationDate" type="date" data-testid="input-expiration-date" />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={createSkillCertMutation.isPending} data-testid="button-submit-skill">
                      {createSkillCertMutation.isPending ? "Adding..." : "Add Certification"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Employee Skills Grid</CardTitle>
              <CardDescription>
                Visual grid showing employee certifications by skill. Levels: 1=Basic, 2=Intermediate, 3=Advanced, 4=Expert
              </CardDescription>
            </CardHeader>
            <CardContent>
              {employees.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Grid3X3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Add employees to build the skills matrix</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="sticky left-0 bg-background">Employee</TableHead>
                        <TableHead className="text-center">CNC</TableHead>
                        <TableHead className="text-center">MIG Weld</TableHead>
                        <TableHead className="text-center">TIG Weld</TableHead>
                        <TableHead className="text-center">Forklift</TableHead>
                        <TableHead className="text-center">QC</TableHead>
                        <TableHead className="text-center">Electrical</TableHead>
                        <TableHead className="text-center">PLC</TableHead>
                        <TableHead className="text-center">First Aid</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {employees.map((emp: any) => {
                        const empCerts = skillCertifications.filter((c: any) => c.employeeId === emp.id);
                        const getLevel = (code: string) => {
                          const cert = empCerts.find((c: any) => c.skillCode === code);
                          return cert?.skillLevel || 0;
                        };
                        const levelBadge = (level: number) => {
                          if (level === 0) return <span className="text-muted-foreground">-</span>;
                          const colors = ["", "bg-slate-200 text-slate-800", "bg-blue-200 text-blue-800", "bg-green-200 text-green-800", "bg-purple-200 text-purple-800"];
                          return <Badge className={colors[level]}>{level}</Badge>;
                        };
                        return (
                          <TableRow key={emp.id}>
                            <TableCell className="sticky left-0 bg-background font-medium">
                              {emp.firstName} {emp.lastName}
                            </TableCell>
                            <TableCell className="text-center">{levelBadge(getLevel("CNC_OPERATION"))}</TableCell>
                            <TableCell className="text-center">{levelBadge(getLevel("WELDING_MIG"))}</TableCell>
                            <TableCell className="text-center">{levelBadge(getLevel("WELDING_TIG"))}</TableCell>
                            <TableCell className="text-center">{levelBadge(getLevel("FORKLIFT"))}</TableCell>
                            <TableCell className="text-center">{levelBadge(getLevel("QUALITY_INSPECTION"))}</TableCell>
                            <TableCell className="text-center">{levelBadge(getLevel("ELECTRICAL"))}</TableCell>
                            <TableCell className="text-center">{levelBadge(getLevel("PLC_PROGRAMMING"))}</TableCell>
                            <TableCell className="text-center">{levelBadge(getLevel("FIRST_AID"))}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Shift Scheduling Tab */}
        <TabsContent value="scheduling" className="space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <h2 className="text-xl font-semibold">Shift Schedule</h2>
            <Dialog open={openShiftDialog} onOpenChange={setOpenShiftDialog}>
              <DialogTrigger asChild>
                <Button data-testid="button-assign-shift">
                  <Plus className="h-4 w-4 mr-2" />
                  Assign Shift
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Assign Shift</DialogTitle>
                  <DialogDescription>
                    Schedule an employee for a shift
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateShiftAssignment}>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label htmlFor="shiftEmployee">Employee</Label>
                      <Select value={shiftEmployeeId} onValueChange={setShiftEmployeeId}>
                        <SelectTrigger data-testid="select-shift-employee">
                          <SelectValue placeholder="Select employee" />
                        </SelectTrigger>
                        <SelectContent>
                          {employees.filter((e: any) => e.status === "active").map((emp: any) => (
                            <SelectItem key={emp.id} value={emp.id}>
                              {emp.firstName} {emp.lastName} ({emp.department})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="shiftDate">Shift Date</Label>
                      <Input id="shiftDate" name="shiftDate" type="date" required data-testid="input-shift-date" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="startTime">Start Time</Label>
                        <Input id="startTime" name="startTime" type="time" required defaultValue="06:00" data-testid="input-start-time" />
                      </div>
                      <div>
                        <Label htmlFor="endTime">End Time</Label>
                        <Input id="endTime" name="endTime" type="time" required defaultValue="14:00" data-testid="input-end-time" />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="shiftType">Shift Type</Label>
                      <Select value={shiftType} onValueChange={setShiftType}>
                        <SelectTrigger data-testid="select-shift-type">
                          <SelectValue placeholder="Select shift type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="day">Day Shift (6am-2pm)</SelectItem>
                          <SelectItem value="evening">Evening Shift (2pm-10pm)</SelectItem>
                          <SelectItem value="night">Night Shift (10pm-6am)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="shiftDepartment">Department</Label>
                      <Select value={shiftDepartment} onValueChange={setShiftDepartment}>
                        <SelectTrigger data-testid="select-shift-department">
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="production">Production</SelectItem>
                          <SelectItem value="quality">Quality</SelectItem>
                          <SelectItem value="maintenance">Maintenance</SelectItem>
                          <SelectItem value="logistics">Logistics</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="productionLine">Production Line (Optional)</Label>
                      <Input id="productionLine" name="productionLine" placeholder="e.g., Line A, Assembly 1" data-testid="input-production-line" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={createShiftAssignmentMutation.isPending} data-testid="button-submit-shift">
                      {createShiftAssignmentMutation.isPending ? "Assigning..." : "Assign Shift"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Scheduled Shifts</CardTitle>
              <CardDescription>
                View and manage employee shift assignments
              </CardDescription>
            </CardHeader>
            <CardContent>
              {shiftAssignments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No shifts scheduled. Click "Assign Shift" to get started.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Employee</TableHead>
                      <TableHead>Shift</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Hours</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shiftAssignments.slice(0, 20).map((shift: any) => {
                      const emp = employees.find((e: any) => e.id === shift.employeeId);
                      return (
                        <TableRow key={shift.id}>
                          <TableCell>{format(new Date(shift.shiftDate), 'MMM d, yyyy')}</TableCell>
                          <TableCell className="font-medium">
                            {emp ? `${emp.firstName} ${emp.lastName}` : 'Unknown'}
                          </TableCell>
                          <TableCell className="capitalize">{shift.shiftType}</TableCell>
                          <TableCell>{shift.startTime} - {shift.endTime}</TableCell>
                          <TableCell className="capitalize">{shift.department}</TableCell>
                          <TableCell>{shift.hoursScheduled?.toFixed(1)}h</TableCell>
                          <TableCell>
                            <Badge variant={shift.status === 'scheduled' ? 'default' : shift.status === 'worked' ? 'secondary' : 'destructive'}>
                              {shift.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Overtime Tracking Tab */}
        <TabsContent value="overtime" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Total Scheduled This Week</CardDescription>
                <CardTitle className="text-3xl" data-testid="text-total-scheduled">
                  {overtimeTracking?.summary?.totalEmployeesScheduled || 0}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Employees with shifts this week
                </p>
              </CardContent>
            </Card>
            <Card className={overtimeTracking?.summary?.approachingOvertime > 0 ? "border-l-4 border-l-orange-500" : ""}>
              <CardHeader className="pb-3">
                <CardDescription className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-signal" />
                  Approaching Overtime
                </CardDescription>
                <CardTitle className="text-3xl text-orange-600" data-testid="text-approaching-overtime">
                  {overtimeTracking?.summary?.approachingOvertime || 0}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  35+ hours scheduled (close to 40)
                </p>
              </CardContent>
            </Card>
            <Card className={overtimeTracking?.summary?.inOvertime > 0 ? "border-l-4 border-l-red-500" : ""}>
              <CardHeader className="pb-3">
                <CardDescription className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-bad" />
                  In Overtime
                </CardDescription>
                <CardTitle className="text-3xl text-red-600" data-testid="text-in-overtime">
                  {overtimeTracking?.summary?.inOvertime || 0}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Over 40 hours scheduled
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Timer className="h-5 w-5" />
                Weekly Hours Tracking
              </CardTitle>
              <CardDescription>
                Week of {overtimeTracking?.weekStart ? format(new Date(overtimeTracking.weekStart), 'MMM d, yyyy') : 'Current Week'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!overtimeTracking?.employees?.length ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Timer className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No employees have hours scheduled this week</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Scheduled</TableHead>
                      <TableHead>Max Hours</TableHead>
                      <TableHead>Remaining</TableHead>
                      <TableHead>OT Eligible</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {overtimeTracking.employees.map((emp: any) => (
                      <TableRow key={emp.employeeId} className={emp.inOvertime ? "bg-red-50 dark:bg-red-950/20" : emp.approachingOvertime ? "bg-orange-50 dark:bg-orange-950/20" : ""}>
                        <TableCell className="font-medium">{emp.employeeName}</TableCell>
                        <TableCell className="capitalize">{emp.department}</TableCell>
                        <TableCell>{emp.hoursScheduled?.toFixed(1)}h</TableCell>
                        <TableCell>{emp.maxHoursPerWeek}h</TableCell>
                        <TableCell>{emp.remainingRegularHours?.toFixed(1)}h</TableCell>
                        <TableCell>
                          <Badge variant={emp.overtimeEligible ? "default" : "secondary"}>
                            {emp.overtimeEligible ? "Yes" : "No"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {emp.inOvertime ? (
                            <Badge variant="destructive">Over Limit</Badge>
                          ) : emp.approachingOvertime ? (
                            <Badge className="bg-orange-500 hover:bg-orange-600">Warning</Badge>
                          ) : (
                            <Badge variant="secondary">Normal</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
