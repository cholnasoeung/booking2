"use client";

import { useState, useCallback, useEffect, useTransition } from "react";
import {
  Users, Plus, Search, Pencil, Trash2, MoreHorizontal,
  UserCheck, UserX, UserMinus,
  AlertTriangle, ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { confirmDelete } from "@/lib/utils/swal";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import AvatarUpload, { AvatarPicker, uploadAvatarFile } from "@/components/dashboard/avatar-upload";

type Emp = {
  id: string; name: string; phone: string; email: string | null;
  role: string; department: string; hireDate: string; idNumber: string | null;
  emergencyContact: string | null; emergencyPhone: string | null;
  status: string; salaryType: string;
  baseSalary: number; allowanceTransport: number; allowanceMeal: number;
  allowanceHousing: number; allowanceOther: number; totalAllowances: number;
  grossMonthly: number; notes: string | null; createdAt: string;
  resignDate: string | null; lastWorkingDay: string | null; resignReason: string | null; resignNote: string | null;
  terminationDate: string | null; terminationReason: string | null; terminationNote: string | null;
  avatar?: string | null;
};

type StatusMode = "resigned" | "terminated";

const RESIGN_REASONS: Record<string, string> = {
  better_opportunity:  "Better Opportunity",
  personal_reasons:    "Personal Reasons",
  salary:              "Salary Dissatisfaction",
  relocation:          "Relocation",
  retirement:          "Retirement",
  other:               "Other",
};

const TERM_REASONS: Record<string, string> = {
  misconduct:          "Misconduct",
  performance:         "Poor Performance",
  redundancy:          "Redundancy / Restructure",
  contract_end:        "Contract Ended",
  absence:             "Unexplained Absence",
  other:               "Other",
};

function fmtDate(d: string | null | undefined) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtShort(d: string | null | undefined) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}


type EmpForm = {
  name: string; phone: string; email: string;
  role: string; department: string; hireDate: string;
  idNumber: string; emergencyContact: string; emergencyPhone: string;
  status: string; salaryType: string;
  baseSalary: string; allowanceTransport: string; allowanceMeal: string;
  allowanceHousing: string; allowanceOther: string; notes: string;
};

const ROLES: Record<string, { label: string; color: string; bg: string }> = {
  driver:       { label: "Driver",       color: "text-cyan-400",    bg: "bg-cyan-500/15   border border-cyan-500/30"   },
  mechanic:     { label: "Mechanic",     color: "text-orange-400",  bg: "bg-orange-500/15 border border-orange-500/30" },
  ticket_agent: { label: "Ticket Agent", color: "text-blue-400",    bg: "bg-blue-500/15   border border-blue-500/30"   },
  manager:      { label: "Manager",      color: "text-purple-400",  bg: "bg-purple-500/15 border border-purple-500/30" },
  accountant:   { label: "Accountant",   color: "text-green-400",   bg: "bg-green-500/15  border border-green-500/30"  },
  other:        { label: "Other",        color: "text-slate-400",   bg: "bg-slate-500/15  border border-slate-500/30"  },
};

const DEPTS: Record<string, { label: string; color: string; bg: string }> = {
  operations:       { label: "Operations",       color: "text-indigo-400",  bg: "bg-indigo-500/15  border border-indigo-500/30"  },
  finance:          { label: "Finance",          color: "text-emerald-400", bg: "bg-emerald-500/15 border border-emerald-500/30" },
  maintenance:      { label: "Maintenance",      color: "text-amber-400",   bg: "bg-amber-500/15   border border-amber-500/30"   },
  admin:            { label: "Admin",            color: "text-violet-400",  bg: "bg-violet-500/15  border border-violet-500/30"  },
  customer_service: { label: "Cust. Service",    color: "text-sky-400",     bg: "bg-sky-500/15     border border-sky-500/30"     },
};

const STATUSES: Record<string, { label: string; color: string; bg: string }> = {
  active:     { label: "Active",     color: "text-emerald-400", bg: "bg-emerald-500/15 border border-emerald-500/30" },
  resigned:   { label: "Resigned",   color: "text-slate-400",   bg: "bg-slate-500/15   border border-slate-500/30"   },
  terminated: { label: "Terminated", color: "text-red-400",     bg: "bg-red-500/15     border border-red-500/30"     },
};

const emptyForm: EmpForm = {
  name: "", phone: "", email: "",
  role: "driver", department: "operations", hireDate: "",
  idNumber: "", emergencyContact: "", emergencyPhone: "",
  status: "active", salaryType: "monthly",
  baseSalary: "", allowanceTransport: "0", allowanceMeal: "0",
  allowanceHousing: "0", allowanceOther: "0", notes: "",
};

const fmt = (n: number) => `$${n.toLocaleString()}`;


function EmployeeFormContent({
  form, onChange,
}: {
  form: EmpForm;
  onChange: (key: keyof EmpForm, v: string) => void;
}) {
  const liveBase  = Number(form.baseSalary)        || 0;
  const liveAllow = (Number(form.allowanceTransport) || 0) + (Number(form.allowanceMeal) || 0)
                  + (Number(form.allowanceHousing)   || 0) + (Number(form.allowanceOther) || 0);
  const liveGross = liveBase + liveAllow;

  return (
    <div className="space-y-5">
      {/* Personal */}
      <div className="rounded-xl border border-white/8 bg-white/3 p-4 space-y-4">
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Personal Information</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-slate-300 text-xs">Full Name <span className="text-red-400">*</span></Label>
            <Input value={form.name} onChange={e => onChange("name", e.target.value)} placeholder="e.g. Sokha Phan" className="bg-white/5 border-white/10 text-white placeholder:text-slate-500" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-slate-300 text-xs">Phone <span className="text-red-400">*</span></Label>
            <Input value={form.phone} onChange={e => onChange("phone", e.target.value)} placeholder="+855 12 345 678" className="bg-white/5 border-white/10 text-white placeholder:text-slate-500" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-slate-300 text-xs">Email</Label>
            <Input value={form.email} onChange={e => onChange("email", e.target.value)} placeholder="name@company.com" className="bg-white/5 border-white/10 text-white placeholder:text-slate-500" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-slate-300 text-xs">ID / Passport Number</Label>
            <Input value={form.idNumber} onChange={e => onChange("idNumber", e.target.value)} placeholder="ID number" className="bg-white/5 border-white/10 text-white placeholder:text-slate-500" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-slate-300 text-xs">Emergency Contact</Label>
            <Input value={form.emergencyContact} onChange={e => onChange("emergencyContact", e.target.value)} placeholder="Name" className="bg-white/5 border-white/10 text-white placeholder:text-slate-500" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-slate-300 text-xs">Emergency Phone</Label>
            <Input value={form.emergencyPhone} onChange={e => onChange("emergencyPhone", e.target.value)} placeholder="+855..." className="bg-white/5 border-white/10 text-white placeholder:text-slate-500" />
          </div>
        </div>
      </div>

      {/* Work */}
      <div className="rounded-xl border border-white/8 bg-white/3 p-4 space-y-4">
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Work Information</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-slate-300 text-xs">Role <span className="text-red-400">*</span></Label>
            <Select value={form.role} onValueChange={v => v !== null && onChange("role", v)}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(ROLES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-slate-300 text-xs">Department <span className="text-red-400">*</span></Label>
            <Select value={form.department} onValueChange={v => v !== null && onChange("department", v)}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(DEPTS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-slate-300 text-xs">Hire Date <span className="text-red-400">*</span></Label>
            <Input type="date" value={form.hireDate} onChange={e => onChange("hireDate", e.target.value)} className="bg-white/5 border-white/10 text-white" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-slate-300 text-xs">Employment Status</Label>
            <Select value={form.status} onValueChange={v => v !== null && onChange("status", v)}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(STATUSES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Salary */}
      <div className="rounded-xl border border-white/8 bg-white/3 p-4 space-y-4">
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Salary & Allowances</h4>
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label className="text-slate-300 text-xs">Salary Type</Label>
            <Select value={form.salaryType} onValueChange={v => v !== null && onChange("salaryType", v)}>
              <SelectTrigger className="bg-white/5 border-white/10 text-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly Fixed</SelectItem>
                <SelectItem value="daily">Daily Rate</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label className="text-slate-300 text-xs">Base Salary ($) <span className="text-red-400">*</span></Label>
            <Input type="number" min="0" value={form.baseSalary} onChange={e => onChange("baseSalary", e.target.value)} placeholder="0" className="bg-white/5 border-white/10 text-white placeholder:text-slate-500" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-slate-300 text-xs">Transport Allow. ($)</Label>
            <Input type="number" min="0" value={form.allowanceTransport} onChange={e => onChange("allowanceTransport", e.target.value)} placeholder="0" className="bg-white/5 border-white/10 text-white placeholder:text-slate-500" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-slate-300 text-xs">Meal Allow. ($)</Label>
            <Input type="number" min="0" value={form.allowanceMeal} onChange={e => onChange("allowanceMeal", e.target.value)} placeholder="0" className="bg-white/5 border-white/10 text-white placeholder:text-slate-500" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-slate-300 text-xs">Housing Allow. ($)</Label>
            <Input type="number" min="0" value={form.allowanceHousing} onChange={e => onChange("allowanceHousing", e.target.value)} placeholder="0" className="bg-white/5 border-white/10 text-white placeholder:text-slate-500" />
          </div>
          <div className="col-span-3 space-y-1.5">
            <Label className="text-slate-300 text-xs">Other Allow. ($)</Label>
            <Input type="number" min="0" value={form.allowanceOther} onChange={e => onChange("allowanceOther", e.target.value)} placeholder="0" className="bg-white/5 border-white/10 text-white placeholder:text-slate-500" />
          </div>
        </div>

        {/* Live preview */}
        <div className="grid grid-cols-3 gap-3 rounded-xl border border-emerald-500/20 bg-gradient-to-r from-emerald-500/8 to-teal-500/8 p-3 text-center">
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Base</p>
            <p className="text-base font-bold text-white">{fmt(liveBase)}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Allowances</p>
            <p className="text-base font-bold text-emerald-400">+{fmt(liveAllow)}</p>
          </div>
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Monthly Package</p>
            <p className="text-base font-bold text-teal-300">{fmt(liveGross)}</p>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-1.5">
        <Label className="text-slate-300 text-xs">Notes</Label>
        <textarea
          value={form.notes}
          onChange={e => onChange("notes", e.target.value)}
          placeholder="Additional information..."
          rows={2}
          className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
        />
      </div>
    </div>
  );
}

export default function AdminEmployeesTab() {
  const [employees, setEmployees]     = useState<Emp[]>([]);
  const [stats, setStats]             = useState<Record<string, number>>({ active: 0, on_leave: 0, resigned: 0, terminated: 0 });
  const [loading, setLoading]         = useState(true);
  const [err, setErr]                 = useState("");

  const [filterRole,   setFilterRole]   = useState("_all");
  const [filterDept,   setFilterDept]   = useState("_all");
  const [filterStatus, setFilterStatus] = useState("_all");
  const [search,       setSearch]       = useState("");

  const [addOpen,        setAddOpen]        = useState(false);
  const [addAvatarFile,  setAddAvatarFile]  = useState<File | null>(null);
  const [editOpen,       setEditOpen]       = useState(false);
  const [deleteOpen,     setDeleteOpen]     = useState(false);
  const [editTarget,   setEditTarget]   = useState<Emp | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Emp | null>(null);
  const [form,         setForm]         = useState<EmpForm>(emptyForm);
  const [formErr,      setFormErr]      = useState("");
  const [isPending,    startTransition] = useTransition();

  const [scOpen,   setScOpen]   = useState(false);
  const [scMode,   setScMode]   = useState<StatusMode>("resigned");
  const [scTarget, setScTarget] = useState<Emp | null>(null);
  const [scForm,   setScForm]   = useState({
    resignDate: "", lastWorkingDay: "", resignReason: "personal_reasons", resignNote: "",
    terminationDate: "", terminationReason: "misconduct", terminationNote: "",
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (filterRole   !== "_all") p.set("role",   filterRole);
      if (filterDept   !== "_all") p.set("dept",   filterDept);
      if (filterStatus !== "_all") p.set("status", filterStatus);
      if (search)                  p.set("q",      search);
      const res  = await fetch(`/api/admin/employees?${p}`);
      const data = await res.json();
      setEmployees(data.employees ?? []);
      setStats(data.stats ?? {});
    } catch { setErr("Failed to load employees"); }
    finally  { setLoading(false); }
  }, [filterRole, filterDept, filterStatus, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onChange = (key: keyof EmpForm, v: string) => setForm(p => ({ ...p, [key]: v }));

  const openAdd = () => { setForm(emptyForm); setFormErr(""); setAddOpen(true); };
  const openEdit = (emp: Emp) => {
    setEditTarget(emp);
    setForm({
      name:               emp.name,
      phone:              emp.phone,
      email:              emp.email            ?? "",
      role:               emp.role,
      department:         emp.department,
      hireDate:           emp.hireDate ? new Date(emp.hireDate).toISOString().slice(0, 10) : "",
      idNumber:           emp.idNumber         ?? "",
      emergencyContact:   emp.emergencyContact ?? "",
      emergencyPhone:     emp.emergencyPhone   ?? "",
      status:             emp.status,
      salaryType:         emp.salaryType,
      baseSalary:         String(emp.baseSalary),
      allowanceTransport: String(emp.allowanceTransport),
      allowanceMeal:      String(emp.allowanceMeal),
      allowanceHousing:   String(emp.allowanceHousing),
      allowanceOther:     String(emp.allowanceOther),
      notes:              emp.notes            ?? "",
    });
    setFormErr(""); setEditOpen(true);
  };
  const openDelete = (emp: Emp) => { setDeleteTarget(emp); setDeleteOpen(true); };

  const buildBody = () => ({
    name: form.name, phone: form.phone, email: form.email || undefined,
    role: form.role, department: form.department, hireDate: form.hireDate,
    idNumber: form.idNumber || undefined,
    emergencyContact: form.emergencyContact || undefined,
    emergencyPhone:   form.emergencyPhone   || undefined,
    status: form.status, salaryType: form.salaryType,
    baseSalary:         Number(form.baseSalary)         || 0,
    allowanceTransport: Number(form.allowanceTransport) || 0,
    allowanceMeal:      Number(form.allowanceMeal)      || 0,
    allowanceHousing:   Number(form.allowanceHousing)   || 0,
    allowanceOther:     Number(form.allowanceOther)     || 0,
    notes: form.notes || undefined,
  });

  const handleAdd = () => {
    if (!form.name || !form.phone || !form.hireDate || !form.baseSalary) { setFormErr("Name, phone, hire date, and base salary are required."); return; }
    startTransition(async () => {
      const res = await fetch("/api/admin/employees", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(buildBody()) });
      if (!res.ok) { const d = await res.json(); setFormErr(d.message ?? "Error"); return; }
      const data = await res.json();
      if (addAvatarFile && data.employee?.id) {
        await uploadAvatarFile(addAvatarFile, "employee", data.employee.id);
        setAddAvatarFile(null);
      }
      setAddOpen(false); fetchData();
    });
  };

  const handleEdit = () => {
    if (!form.name || !form.phone || !form.baseSalary) { setFormErr("Name, phone, and base salary are required."); return; }
    if (!editTarget) return;
    startTransition(async () => {
      const res = await fetch(`/api/admin/employees/${editTarget.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(buildBody()) });
      if (!res.ok) { const d = await res.json(); setFormErr(d.message ?? "Error"); return; }
      setEditOpen(false); fetchData();
    });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    if (!(await confirmDelete("this employee"))) return;
    startTransition(async () => {
      await fetch(`/api/admin/employees/${deleteTarget.id}`, { method: "DELETE" });
      setDeleteOpen(false); fetchData();
    });
  };

  const handleStatusChange = (id: string, status: string) => {
    startTransition(async () => {
      await fetch(`/api/admin/employees/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      fetchData();
    });
  };

  const openStatusChange = (emp: Emp, mode: StatusMode) => {
    setScTarget(emp);
    setScMode(mode);
    setScForm({
      resignDate:        emp.resignDate       ? new Date(emp.resignDate).toISOString().slice(0, 10)       : "",
      lastWorkingDay:    emp.lastWorkingDay   ? new Date(emp.lastWorkingDay).toISOString().slice(0, 10)   : "",
      resignReason:      emp.resignReason     ?? "personal_reasons",
      resignNote:        emp.resignNote       ?? "",
      terminationDate:   emp.terminationDate  ? new Date(emp.terminationDate).toISOString().slice(0, 10)  : "",
      terminationReason: emp.terminationReason ?? "misconduct",
      terminationNote:   emp.terminationNote  ?? "",
    });
    setScOpen(true);
  };

  const handleStatusChangeSave = () => {
    if (!scTarget) return;
    const body: Record<string, string | undefined> = { status: scMode };
    if (scMode === "resigned") {
      body.resignDate      = scForm.resignDate      || undefined;
      body.lastWorkingDay  = scForm.lastWorkingDay  || undefined;
      body.resignReason    = scForm.resignReason    || undefined;
      body.resignNote      = scForm.resignNote      || undefined;
    } else {
      body.terminationDate   = scForm.terminationDate   || undefined;
      body.terminationReason = scForm.terminationReason || undefined;
      body.terminationNote   = scForm.terminationNote   || undefined;
    }
    startTransition(async () => {
      await fetch(`/api/admin/employees/${scTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setScOpen(false);
      fetchData();
    });
  };

  const totalAll = Object.values(stats).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative flex h-13 w-13 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-xl shadow-emerald-500/40">
            <Users className="size-6 text-white" />
            {stats.active > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-black text-emerald-600 shadow">
                {stats.active}
              </span>
            )}
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">Employees</h2>
            <p className="text-xs text-slate-400">{totalAll} total staff · {stats.active} active</p>
          </div>
        </div>
        <Button onClick={openAdd} className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-semibold px-5 shadow-md shadow-indigo-100 gap-2">
          <Plus className="size-4" /> Add Employee
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {([
          { key: "active",     label: "Active",     gradient: "from-emerald-500 to-teal-600", shadow: "shadow-emerald-500/30", Icon: UserCheck },
          { key: "resigned",   label: "Resigned",   gradient: "from-slate-500 to-slate-700",  shadow: "shadow-slate-500/20",   Icon: UserMinus },
          { key: "terminated", label: "Terminated", gradient: "from-red-500 to-rose-600",     shadow: "shadow-red-500/30",     Icon: UserX     },
        ] as const).map(({ key, label, gradient, shadow, Icon }) => {
          const count = stats[key] ?? 0;
          const pct = totalAll > 0 ? Math.round((count / totalAll) * 100) : 0;
          return (
            <div key={key} className={cn("relative overflow-hidden rounded-2xl bg-gradient-to-br p-5 shadow-lg", gradient, shadow)}>
              <div className="absolute -right-3 -bottom-3 opacity-10 pointer-events-none">
                <Icon className="size-20" />
              </div>
              <p className="text-4xl font-black text-white">{count}</p>
              <p className="mt-1 text-sm font-semibold text-white/85">{label}</p>
              <div className="mt-3 flex items-center gap-2">
                <div className="h-1.5 flex-1 rounded-full bg-black/20">
                  <div className="h-1.5 rounded-full bg-white/75 transition-all duration-500" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-[11px] font-semibold text-white/70">{pct}%</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name…" className="pl-9 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400" />
        </div>
        <Select value={filterRole} onValueChange={v => setFilterRole(v ?? "_all")}>
          <SelectTrigger className="w-36 bg-white border-slate-200 text-slate-700">
            <SelectValue>{filterRole === "_all" ? "All Roles" : (ROLES[filterRole]?.label ?? "All Roles")}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All Roles</SelectItem>
            {Object.entries(ROLES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterDept} onValueChange={v => setFilterDept(v ?? "_all")}>
          <SelectTrigger className="w-44 bg-white border-slate-200 text-slate-700">
            <SelectValue>{filterDept === "_all" ? "All Departments" : (DEPTS[filterDept]?.label ?? "All Departments")}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All Departments</SelectItem>
            {Object.entries(DEPTS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={v => setFilterStatus(v ?? "_all")}>
          <SelectTrigger className="w-36 bg-white border-slate-200 text-slate-700">
            <SelectValue>{filterStatus === "_all" ? "All Status" : (STATUSES[filterStatus]?.label ?? "All Status")}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All Status</SelectItem>
            {Object.entries(STATUSES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="rounded-2xl border border-white/8 bg-slate-800/40 py-20 text-center text-slate-400">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 mb-4">
            <Users className="size-6 text-emerald-400 animate-pulse" />
          </div>
          <p className="text-sm">Loading employees…</p>
        </div>
      ) : err ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 py-12 text-center text-red-400">{err}</div>
      ) : employees.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-slate-800/20 py-24 text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-4">
            <Users className="size-8 text-emerald-400/50" />
          </div>
          <p className="text-base font-semibold text-white">No employees found.</p>
          <p className="text-sm text-slate-400 mt-1">Click "Add Employee" to create the first record.</p>
          <Button onClick={openAdd} className="mt-5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white gap-2">
            <Plus className="size-4" /> Add First Employee
          </Button>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 overflow-x-auto shadow-sm">
          <table className="w-full text-sm min-w-[800px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                {["Employee", "Role", "Department", "Hire Date", "Base Salary", "Monthly Package", "Status", ""].map((h, i) => (
                  <th key={i} className={cn("px-4 py-3.5 text-left text-[10px] uppercase tracking-widest text-slate-500 font-bold whitespace-nowrap", i === 7 && "w-12")}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {employees.map((emp) => {
                const role       = ROLES[emp.role]       ?? ROLES.other;
                const dept       = DEPTS[emp.department] ?? DEPTS.operations;
                const status     = STATUSES[emp.status]  ?? STATUSES.active;
                return (
                  <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <AvatarUpload
                          entityType="employee"
                          entityId={emp.id}
                          currentAvatar={emp.avatar}
                          name={emp.name}
                          size="sm"
                          onUploaded={(url) => setEmployees((prev) => prev.map((e) => e.id === emp.id ? { ...e, avatar: url } : e))}
                        />
                        <div>
                          <p className="text-slate-900 font-semibold leading-tight">{emp.name}</p>
                          <p className="text-slate-500 text-[11px] mt-0.5">{emp.email ?? emp.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold", role.bg, role.color)}>{role.label}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold", dept.bg, dept.color)}>{dept.label}</span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 text-xs whitespace-nowrap font-medium">
                      {emp.hireDate ? new Date(emp.hireDate).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—"}
                    </td>
                    <td className="px-4 py-3.5 text-slate-700 font-mono font-semibold">{fmt(emp.baseSalary)}</td>
                    <td className="px-4 py-3.5">
                      <p className="text-slate-900 font-mono font-bold">{fmt(emp.grossMonthly)}</p>
                      {emp.totalAllowances > 0 && <p className="text-slate-400 text-[11px] mt-0.5">+{fmt(emp.totalAllowances)} allow.</p>}
                    </td>
                    <td className="px-4 py-3.5 min-w-[160px]">
                      <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold", status.bg, status.color)}>{status.label}</span>

                      {/* ── Resigned ── */}
                      {emp.status === "resigned" && (emp.resignDate || emp.resignReason) && (
                        <div className="mt-1.5 space-y-0.5">
                          <p className="text-[10px] font-semibold text-slate-500">
                            {RESIGN_REASONS[emp.resignReason ?? ""] ?? "Resigned"}
                          </p>
                          {emp.resignDate && (
                            <p className="text-[10px] text-slate-400">Resigned {fmtShort(emp.resignDate)}</p>
                          )}
                          {emp.lastWorkingDay && (
                            <p className="text-[10px] text-slate-400">LWD {fmtShort(emp.lastWorkingDay)}</p>
                          )}
                        </div>
                      )}

                      {/* ── Terminated ── */}
                      {emp.status === "terminated" && (emp.terminationDate || emp.terminationReason) && (
                        <div className="mt-1.5 space-y-0.5">
                          <p className="text-[10px] font-semibold text-red-500">
                            {TERM_REASONS[emp.terminationReason ?? ""] ?? "Terminated"}
                          </p>
                          {emp.terminationDate && (
                            <p className="text-[10px] text-slate-400">{fmtDate(emp.terminationDate)}</p>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger className="inline-flex items-center justify-center size-8 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
                          <MoreHorizontal className="size-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-slate-800 border-white/10 text-slate-200 w-48">
                          <DropdownMenuItem onClick={() => openEdit(emp)} className="gap-2 cursor-pointer">
                            <Pencil className="size-3.5" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-white/8" />
                          {emp.status !== "active"     && <DropdownMenuItem onClick={() => handleStatusChange(emp.id, "active")}     className="gap-2 cursor-pointer text-emerald-400">→ Set Active</DropdownMenuItem>}
                          {emp.status !== "resigned"   && <DropdownMenuItem onClick={() => openStatusChange(emp, "resigned")}   className="gap-2 cursor-pointer text-slate-300"><ArrowRight className="size-3.5" /> Set Resigned…</DropdownMenuItem>}
                          {emp.status !== "terminated" && <DropdownMenuItem onClick={() => openStatusChange(emp, "terminated")} className="gap-2 cursor-pointer text-red-400"><AlertTriangle className="size-3.5" /> Set Terminated…</DropdownMenuItem>}
                          <DropdownMenuSeparator className="bg-white/8" />
                          <DropdownMenuItem onClick={() => openDelete(emp)} className="gap-2 cursor-pointer text-red-400">
                            <Trash2 className="size-3.5" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Dialog */}
      <Dialog open={addOpen} onOpenChange={(o) => { if (!o) setAddAvatarFile(null); setAddOpen(o); }}>
        <DialogContent className="sm:max-w-3xl bg-slate-900 border-white/10 text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Employee</DialogTitle>
            <DialogDescription className="text-slate-400">Create a new employee record with salary information.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-center pt-2">
            <AvatarPicker
              name={form.name || "?"}
              file={addAvatarFile}
              onChange={setAddAvatarFile}
              size="lg"
            />
          </div>
          <EmployeeFormContent form={form} onChange={onChange} />
          {formErr && <p className="text-sm text-red-400">{formErr}</p>}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddOpen(false)} className="text-slate-300 hover:text-white">Cancel</Button>
            <Button onClick={handleAdd} disabled={isPending} className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white">
              {isPending ? "Adding…" : "Add Employee"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-3xl bg-slate-900 border-white/10 text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
            <DialogDescription className="text-slate-400">Update employee and salary information.</DialogDescription>
          </DialogHeader>
          <EmployeeFormContent form={form} onChange={onChange} />
          {formErr && <p className="text-sm text-red-400">{formErr}</p>}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditOpen(false)} className="text-slate-300 hover:text-white">Cancel</Button>
            <Button onClick={handleEdit} disabled={isPending} className="bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white">
              {isPending ? "Saving…" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md bg-slate-900 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Delete Employee</DialogTitle>
            <DialogDescription className="text-slate-400">
              Delete <span className="font-semibold text-white">{deleteTarget?.name}</span>? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)} className="text-slate-300 hover:text-white">Cancel</Button>
            <Button onClick={handleDelete} disabled={isPending} className="bg-red-600 hover:bg-red-700 text-white">
              {isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Change Dialog */}
      <Dialog open={scOpen} onOpenChange={setScOpen}>
        <DialogContent className="sm:max-w-lg bg-slate-900 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {scMode === "resigned"   && <><ArrowRight className="size-5 text-slate-400" /> Record Resignation</>}
              {scMode === "terminated" && <><AlertTriangle className="size-5 text-red-400" /> Record Termination</>}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {scTarget?.name} ·{" "}
              {scMode === "resigned" ? "Record the resignation details." : "Record the termination details."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-1">
            {/* ── Resigned fields ── */}
            {scMode === "resigned" && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-slate-300 text-xs">Resignation Reason</Label>
                  <Select value={scForm.resignReason} onValueChange={v => v !== null && setScForm(p => ({ ...p, resignReason: v }))}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                      <SelectValue>{RESIGN_REASONS[scForm.resignReason] ?? "Select reason"}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(RESIGN_REASONS).map(([k, label]) => <SelectItem key={k} value={k}>{label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-slate-300 text-xs">Resignation Date</Label>
                    <Input type="date" value={scForm.resignDate} onChange={e => setScForm(p => ({ ...p, resignDate: e.target.value }))} className="bg-white/5 border-white/10 text-white" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-300 text-xs">Last Working Day</Label>
                    <Input type="date" value={scForm.lastWorkingDay} onChange={e => setScForm(p => ({ ...p, lastWorkingDay: e.target.value }))} className="bg-white/5 border-white/10 text-white" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-300 text-xs">Notes</Label>
                  <textarea
                    value={scForm.resignNote}
                    onChange={e => setScForm(p => ({ ...p, resignNote: e.target.value }))}
                    placeholder="Any additional context…"
                    rows={2}
                    className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 resize-none focus:outline-none focus:ring-2 focus:ring-slate-500/40"
                  />
                </div>
              </>
            )}

            {/* ── Terminated fields ── */}
            {scMode === "terminated" && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-slate-300 text-xs">Termination Reason</Label>
                  <Select value={scForm.terminationReason} onValueChange={v => v !== null && setScForm(p => ({ ...p, terminationReason: v }))}>
                    <SelectTrigger className="bg-white/5 border-white/10 text-white">
                      <SelectValue>{TERM_REASONS[scForm.terminationReason] ?? "Select reason"}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(TERM_REASONS).map(([k, label]) => <SelectItem key={k} value={k}>{label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-300 text-xs">Termination Date</Label>
                  <Input type="date" value={scForm.terminationDate} onChange={e => setScForm(p => ({ ...p, terminationDate: e.target.value }))} className="bg-white/5 border-white/10 text-white" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-300 text-xs">Notes</Label>
                  <textarea
                    value={scForm.terminationNote}
                    onChange={e => setScForm(p => ({ ...p, terminationNote: e.target.value }))}
                    placeholder="Documentation / HR notes…"
                    rows={2}
                    className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 resize-none focus:outline-none focus:ring-2 focus:ring-red-500/40"
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setScOpen(false)} className="text-slate-300 hover:text-white">Cancel</Button>
            <Button
              onClick={handleStatusChangeSave}
              disabled={isPending}
              className={cn(
                "text-white shadow-lg",
                scMode === "resigned"
                  ? "bg-gradient-to-r from-slate-500 to-slate-700 hover:from-slate-600 hover:to-slate-800 shadow-slate-500/20"
                  : "bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 shadow-red-500/30"
              )}
            >
              {isPending
                ? "Saving…"
                : scMode === "resigned"
                ? "Record Resignation"
                : "Record Termination"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
