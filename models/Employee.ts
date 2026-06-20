import mongoose, { Schema, type Document } from "mongoose";

export type EmployeeRole = "driver" | "mechanic" | "ticket_agent" | "manager" | "accountant" | "other";
export type EmployeeDept = "operations" | "finance" | "maintenance" | "admin" | "customer_service";
export type EmployeeStatus = "active" | "on_leave" | "resigned" | "terminated";
export type SalaryType = "monthly" | "daily";

export interface IEmployee extends Document {
  name: string;
  phone: string;
  email?: string;
  role: EmployeeRole;
  department: EmployeeDept;
  hireDate: Date;
  idNumber?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  status: EmployeeStatus;
  salaryType: SalaryType;
  baseSalary: number;
  allowanceTransport: number;
  allowanceMeal: number;
  allowanceHousing: number;
  allowanceOther: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const EmployeeSchema = new Schema<IEmployee>(
  {
    name:               { type: String, required: true, trim: true, index: true },
    phone:              { type: String, required: true, trim: true },
    email:              { type: String, trim: true, lowercase: true },
    role:               { type: String, enum: ["driver","mechanic","ticket_agent","manager","accountant","other"], required: true },
    department:         { type: String, enum: ["operations","finance","maintenance","admin","customer_service"], required: true },
    hireDate:           { type: Date,   required: true },
    idNumber:           { type: String, trim: true },
    emergencyContact:   { type: String, trim: true },
    emergencyPhone:     { type: String, trim: true },
    status:             { type: String, enum: ["active","on_leave","resigned","terminated"], default: "active", index: true },
    salaryType:         { type: String, enum: ["monthly","daily"], default: "monthly" },
    baseSalary:         { type: Number, required: true, min: 0 },
    allowanceTransport: { type: Number, default: 0, min: 0 },
    allowanceMeal:      { type: Number, default: 0, min: 0 },
    allowanceHousing:   { type: Number, default: 0, min: 0 },
    allowanceOther:     { type: Number, default: 0, min: 0 },
    notes:              { type: String, trim: true },
  },
  { timestamps: true }
);

export default (mongoose.models.Employee as mongoose.Model<IEmployee>) ||
  mongoose.model<IEmployee>("Employee", EmployeeSchema);
