import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Calendar, 
  ClipboardList, 
  Clock,
  UserPlus,
  CalendarPlus,
  TrendingUp,
  Target,
  Award
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";

export default function WorkforceScheduling() {
  const { toast } = useToast();
  const [openEmployeeDialog, setOpenEmployeeDialog] = useState(false);
  const [openShiftDialog, setOpenShiftDialog] = useState(false);

  const { data: employees = [], isLoading: employeesLoading } = useQuery({
    queryKey: ["/api/workforce/employees"],
  });

  const { data: shifts = [], isLoading: shiftsLoading } = useQuery({
    queryKey: ["/api/workforce/shifts"],
  });

  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery({
    queryKey: ["/api/workforce/assignments"],
  });

  const { data: machinery = [] } = useQuery({
    queryKey: ["/api/machinery"],
  });

  const { data: regime } = useQuery({
    queryKey: ["/api/economics/regime"],
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

  const createShiftMutation = useMutation({
    mutationFn: async (data: any) => 
      apiRequest("/api/workforce/shifts", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workforce/shifts"] });
      toast({ title: "Shift created successfully" });
      setOpenShiftDialog(false);
    },
    onError: () => {
      toast({ 
        title: "Failed to create shift", 
        variant: "destructive" 
      });
    },
  });

  const handleCreateEmployee = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const skills = (formData.get("skills") as string)?.split(',').map(s => s.trim()).filter(Boolean) || [];
    const certifications = (formData.get("certifications") as string)?.split(',').map(s => s.trim()).filter(Boolean) || [];
    
    createEmployeeMutation.mutate({
      employeeNumber: formData.get("employeeNumber"),
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      department: formData.get("department"),
      role: formData.get("role"),
      skills,
      certifications,
      hourlyRate: parseFloat(formData.get("hourlyRate") as string),
      employmentType: formData.get("employmentType"),
    });
  };

  const handleCreateShift = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const requiredSkills = (formData.get("requiredSkills") as string)?.split(',').map(s => s.trim()).filter(Boolean) || [];
    
    createShiftMutation.mutate({
      shiftName: formData.get("shiftName"),
      shiftType: formData.get("shiftType"),
      department: formData.get("department"),
      startTime: new Date(formData.get("startTime") as string).toISOString(),
      endTime: new Date(formData.get("endTime") as string).toISOString(),
      requiredHeadcount: parseInt(formData.get("requiredHeadcount") as string),
      requiredSkills,
    });
  };

  const getRegimeBadge = (regimeName: string) => {
    const regimeConfig = {
      HEALTHY_EXPANSION: { className: "bg-green-600", label: "Healthy Expansion" },
      ASSET_LED_GROWTH: { className: "bg-orange-600", label: "Asset-Led Growth" },
      IMBALANCED_EXCESS: { className: "bg-red-600", label: "Imbalanced Excess" },
      REAL_ECONOMY_LEAD: { className: "bg-blue-600", label: "Real Economy Lead" },
    };
    const config = regimeConfig[regimeName as keyof typeof regimeConfig] || { className: "", label: regimeName };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const activeEmployees = employees.filter((e: any) => e.status === "active").length;
  const upcomingShifts = shifts.filter((s: any) => 
    s.status === "scheduled" && new Date(s.startTime) > new Date()
  ).length;
  
  const totalRequired = shifts.reduce((acc: number, s: any) => acc + (s.requiredHeadcount || 0), 0);
  const totalAssigned = assignments.filter((a: any) => a.status !== "absent").length;
  const fillRate = totalRequired > 0 ? (totalAssigned / totalRequired) * 100 : 0;

  const getRegimeStaffingGuidance = () => {
    if (!regime) return null;
    const guidance: Record<string, string> = {
      HEALTHY_EXPANSION: "Hire aggressively. Growth is sustainable. Invest in training and development programs.",
      ASSET_LED_GROWTH: "Moderate hiring. Use contractors for flexibility. Avoid long-term commitments.",
      IMBALANCED_EXCESS: "Hiring freeze. Reduce overtime. Prepare for potential workforce adjustments.",
      REAL_ECONOMY_LEAD: "Maximize overtime for existing staff. Production demand is strong. Hire critical skills only.",
    };
    return guidance[regime.regime] || "Adjust staffing strategy based on economic regime.";
  };

  const analyzeSkillGaps = () => {
    const allRequiredSkills = new Set<string>();
    shifts.forEach((s: any) => {
      s.requiredSkills?.forEach((skill: string) => allRequiredSkills.add(skill));
    });

    const availableSkills = new Set<string>();
    employees.forEach((e: any) => {
      e.skills?.forEach((skill: string) => availableSkills.add(skill));
    });

    const gaps = Array.from(allRequiredSkills).filter(skill => !availableSkills.has(skill));
    return gaps;
  };

  const skillGaps = analyzeSkillGaps();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="heading-workforce-scheduling">
            <Users className="h-8 w-8" />
            Workforce Scheduling & Skills Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Shift planning, employee skills tracking, and regime-aware staffing optimization
          </p>
        </div>
        {regime && (
          <Card className="w-fit">
            <CardContent className="pt-6 px-4 pb-4">
              <div className="text-sm text-muted-foreground">Current Regime</div>
              <div className="mt-1">{getRegimeBadge(regime.regime)}</div>
              <div className="text-2xl font-bold mt-1" data-testid="text-fdr">FDR: {regime.fdr.toFixed(2)}</div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Employees</CardDescription>
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
            <CardDescription>Upcoming Shifts</CardDescription>
            <CardTitle className="text-3xl" data-testid="text-upcoming-shifts">
              {upcomingShifts}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {shifts.length} total shifts scheduled
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Fill Rate</CardDescription>
            <CardTitle className="text-3xl" data-testid="text-fill-rate">
              {fillRate.toFixed(0)}%
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {totalAssigned} / {totalRequired} positions filled
            </p>
          </CardContent>
        </Card>
      </div>

      {regime && (
        <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="h-4 w-4" />
              Regime-Aware Staffing Strategy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{getRegimeStaffingGuidance()}</p>
          </CardContent>
        </Card>
      )}

      {skillGaps.length > 0 && (
        <Card className="bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Award className="h-4 w-4" />
              Skill Gap Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm mb-2">
              Training recommended for the following skills:
            </p>
            <div className="flex gap-2 flex-wrap">
              {skillGaps.map((skill, idx) => (
                <Badge key={idx} variant="outline">{skill}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="employees" className="space-y-4">
        <TabsList>
          <TabsTrigger value="employees" data-testid="tab-employees">
            <Users className="h-4 w-4 mr-2" />
            Employees
          </TabsTrigger>
          <TabsTrigger value="shifts" data-testid="tab-shifts">
            <Calendar className="h-4 w-4 mr-2" />
            Shifts
          </TabsTrigger>
          <TabsTrigger value="assignments" data-testid="tab-assignments">
            <ClipboardList className="h-4 w-4 mr-2" />
            Assignments
          </TabsTrigger>
        </TabsList>

        <TabsContent value="employees" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Employees</h2>
            <Dialog open={openEmployeeDialog} onOpenChange={setOpenEmployeeDialog}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-employee">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Employee
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add Employee</DialogTitle>
                  <DialogDescription>
                    Register a new employee with skills and certifications
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateEmployee}>
                  <div className="grid grid-cols-2 gap-4 py-4">
                    <div>
                      <Label htmlFor="employeeNumber">Employee Number</Label>
                      <Input id="employeeNumber" name="employeeNumber" placeholder="EMP-001" required data-testid="input-employee-number" />
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
                      <Input id="email" name="email" type="email" data-testid="input-email" />
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
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="role">Role</Label>
                      <Select name="role" required>
                        <SelectTrigger data-testid="select-role">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="operator">Operator</SelectItem>
                          <SelectItem value="technician">Technician</SelectItem>
                          <SelectItem value="supervisor">Supervisor</SelectItem>
                          <SelectItem value="engineer">Engineer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="employmentType">Employment Type</Label>
                      <Select name="employmentType" required>
                        <SelectTrigger data-testid="select-employment-type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="full_time">Full Time</SelectItem>
                          <SelectItem value="part_time">Part Time</SelectItem>
                          <SelectItem value="contractor">Contractor</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="hourlyRate">Hourly Rate</Label>
                      <Input id="hourlyRate" name="hourlyRate" type="number" step="0.01" data-testid="input-hourly-rate" />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="skills">Skills (comma-separated)</Label>
                      <Input id="skills" name="skills" placeholder="CNC Operation, Welding, QC" data-testid="input-skills" />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="certifications">Certifications (comma-separated)</Label>
                      <Input id="certifications" name="certifications" placeholder="Forklift, Safety, ISO9001" data-testid="input-certifications" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" data-testid="button-submit-employee">Add Employee</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee #</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Skills</TableHead>
                  <TableHead>Certifications</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employeesLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">Loading...</TableCell>
                  </TableRow>
                ) : employees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No employees found. Add your first employee to start scheduling shifts.
                    </TableCell>
                  </TableRow>
                ) : (
                  employees.map((emp: any) => (
                    <TableRow key={emp.id} data-testid={`row-employee-${emp.id}`}>
                      <TableCell className="font-mono">{emp.employeeNumber}</TableCell>
                      <TableCell className="font-medium">{emp.firstName} {emp.lastName}</TableCell>
                      <TableCell className="capitalize">{emp.department}</TableCell>
                      <TableCell className="capitalize">{emp.role}</TableCell>
                      <TableCell>
                        {emp.skills?.length > 0 ? (
                          <div className="flex gap-1 flex-wrap">
                            {emp.skills.map((skill: string, idx: number) => (
                              <Badge key={idx} variant="outline" className="text-xs">{skill}</Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">None</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {emp.certifications?.length > 0 ? (
                          <div className="flex gap-1 flex-wrap">
                            {emp.certifications.map((cert: string, idx: number) => (
                              <Badge key={idx} variant="secondary" className="text-xs">{cert}</Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">None</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="shifts" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Work Shifts</h2>
            <Dialog open={openShiftDialog} onOpenChange={setOpenShiftDialog}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-shift">
                  <CalendarPlus className="h-4 w-4 mr-2" />
                  Create Shift
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create Work Shift</DialogTitle>
                  <DialogDescription>
                    Schedule a new shift with required skills and headcount
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateShift}>
                  <div className="grid grid-cols-2 gap-4 py-4">
                    <div>
                      <Label htmlFor="shiftName">Shift Name</Label>
                      <Input id="shiftName" name="shiftName" placeholder="Morning Shift A" required data-testid="input-shift-name" />
                    </div>
                    <div>
                      <Label htmlFor="shiftType">Shift Type</Label>
                      <Select name="shiftType" required>
                        <SelectTrigger data-testid="select-shift-type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="day">Day</SelectItem>
                          <SelectItem value="evening">Evening</SelectItem>
                          <SelectItem value="night">Night</SelectItem>
                          <SelectItem value="weekend">Weekend</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="department">Department</Label>
                      <Select name="department" required>
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
                      <Label htmlFor="requiredHeadcount">Required Headcount</Label>
                      <Input id="requiredHeadcount" name="requiredHeadcount" type="number" required data-testid="input-headcount" />
                    </div>
                    <div>
                      <Label htmlFor="startTime">Start Time</Label>
                      <Input id="startTime" name="startTime" type="datetime-local" required data-testid="input-start-time" />
                    </div>
                    <div>
                      <Label htmlFor="endTime">End Time</Label>
                      <Input id="endTime" name="endTime" type="datetime-local" required data-testid="input-end-time" />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="requiredSkills">Required Skills (comma-separated)</Label>
                      <Input id="requiredSkills" name="requiredSkills" placeholder="CNC Operation, Quality Control" data-testid="input-required-skills" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" data-testid="button-submit-shift">Create Shift</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Shift Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Start Time</TableHead>
                  <TableHead>End Time</TableHead>
                  <TableHead>Required</TableHead>
                  <TableHead>Skills</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shiftsLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">Loading...</TableCell>
                  </TableRow>
                ) : shifts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No shifts scheduled. Create your first shift to start planning.
                    </TableCell>
                  </TableRow>
                ) : (
                  shifts.map((shift: any) => (
                    <TableRow key={shift.id} data-testid={`row-shift-${shift.id}`}>
                      <TableCell className="font-medium">{shift.shiftName}</TableCell>
                      <TableCell className="capitalize">{shift.shiftType}</TableCell>
                      <TableCell className="capitalize">{shift.department}</TableCell>
                      <TableCell>{format(new Date(shift.startTime), "PPp")}</TableCell>
                      <TableCell>{format(new Date(shift.endTime), "PPp")}</TableCell>
                      <TableCell>{shift.requiredHeadcount} people</TableCell>
                      <TableCell>
                        {shift.requiredSkills?.length > 0 ? (
                          <div className="flex gap-1 flex-wrap">
                            {shift.requiredSkills.map((skill: string, idx: number) => (
                              <Badge key={idx} variant="outline" className="text-xs">{skill}</Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">None</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="assignments" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Staff Assignments</h2>
          </div>

          {assignmentsLoading ? (
            <Card><CardContent className="p-6">Loading assignments...</CardContent></Card>
          ) : assignments.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                No staff assignments yet. Assign employees to shifts to see them here.
              </CardContent>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Shift</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Machinery</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Check In/Out</TableHead>
                    <TableHead>Hours</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments.map((assignment: any) => {
                    const employee = employees.find((e: any) => e.id === assignment.employeeId);
                    const shift = shifts.find((s: any) => s.id === assignment.shiftId);
                    const machine = machinery.find((m: any) => m.id === assignment.machineryId);
                    return (
                      <TableRow key={assignment.id} data-testid={`row-assignment-${assignment.id}`}>
                        <TableCell className="font-medium">
                          {employee ? `${employee.firstName} ${employee.lastName}` : 'Unknown'}
                        </TableCell>
                        <TableCell>{shift?.shiftName || 'Unknown'}</TableCell>
                        <TableCell className="capitalize">{assignment.assignedRole}</TableCell>
                        <TableCell>{machine?.name || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge variant={
                            assignment.status === "completed" ? "default" :
                            assignment.status === "checked_in" ? "default" :
                            assignment.status === "absent" ? "destructive" : "secondary"
                          } className={
                            assignment.status === "completed" ? "bg-green-600" :
                            assignment.status === "checked_in" ? "bg-blue-600" : ""
                          }>
                            {assignment.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {assignment.checkInTime && (
                            <div>In: {format(new Date(assignment.checkInTime), "p")}</div>
                          )}
                          {assignment.checkOutTime && (
                            <div>Out: {format(new Date(assignment.checkOutTime), "p")}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          {assignment.hoursWorked ? `${assignment.hoursWorked.toFixed(1)}h` : '-'}
                          {assignment.overtimeHours > 0 && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              +{assignment.overtimeHours.toFixed(1)}h OT
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
