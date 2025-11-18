import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
  Clock
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";

export default function WorkforceScheduling() {
  const { toast } = useToast();
  const [openEmployeeDialog, setOpenEmployeeDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("employees");

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

  const createEmployeeMutation = useMutation({
    mutationFn: async (data: any) => 
      apiRequest("/api/workforce/employees", {
        method: "POST",
        body: JSON.stringify(data),
      }),
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
          <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="heading-workforce">
            <Users className="h-8 w-8" />
            Workforce Management
          </h1>
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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-7 w-full">
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
                                <CheckCircle2 className="h-4 w-4 text-green-600" /> :
                                <AlertCircle className="h-4 w-4 text-muted-foreground" />
                              }
                            </TableCell>
                            <TableCell>
                              {benefits.some((b: any) => b.employeeId === emp.id && b.benefitType === 'dental') ? 
                                <CheckCircle2 className="h-4 w-4 text-green-600" /> :
                                <AlertCircle className="h-4 w-4 text-muted-foreground" />
                              }
                            </TableCell>
                            <TableCell>
                              {benefits.some((b: any) => b.employeeId === emp.id && b.benefitType === '401k') ? 
                                <CheckCircle2 className="h-4 w-4 text-green-600" /> :
                                <AlertCircle className="h-4 w-4 text-muted-foreground" />
                              }
                            </TableCell>
                            <TableCell>
                              {benefits.some((b: any) => b.employeeId === emp.id && b.benefitType === 'life') ? 
                                <CheckCircle2 className="h-4 w-4 text-green-600" /> :
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
                                <TrendingUp className="h-4 w-4 text-green-600" />
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
      </Tabs>
    </div>
  );
}
