import mongoose, { Schema, type Document } from "mongoose";

export type PayrollStatus = "draft" | "approved" | "paid";

export interface IPayroll extends Document {
  employeeId: mongoose.Types.ObjectId;
  month: string; // "2026-06"
  year: number;
  monthNum: number;
  baseSalary: number;
  allowanceTransport: number;
  allowanceMeal: number;
  allowanceHousing: number;
  allowanceOther: number;
  totalAllowances: number;
  deductionTax: number;
  deductionInsurance: number;
  deductionAdvance: number;
  deductionOther: number;
  totalDeductions: number;
  bonus: number;
  grossPay: number;
  netPay: number;
  status: PayrollStatus;
  paidAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PayrollSchema = new Schema<IPayroll>(
  {
    employeeId:         { type: Schema.Types.ObjectId, ref: "Employee", required: true, index: true },
    month:              { type: String, required: true },
    year:               { type: Number, required: true },
    monthNum:           { type: Number, required: true },
    baseSalary:         { type: Number, required: true, min: 0 },
    allowanceTransport: { type: Number, default: 0 },
    allowanceMeal:      { type: Number, default: 0 },
    allowanceHousing:   { type: Number, default: 0 },
    allowanceOther:     { type: Number, default: 0 },
    totalAllowances:    { type: Number, default: 0 },
    deductionTax:       { type: Number, default: 0 },
    deductionInsurance: { type: Number, default: 0 },
    deductionAdvance:   { type: Number, default: 0 },
    deductionOther:     { type: Number, default: 0 },
    totalDeductions:    { type: Number, default: 0 },
    bonus:              { type: Number, default: 0 },
    grossPay:           { type: Number, required: true },
    netPay:             { type: Number, required: true },
    status:             { type: String, enum: ["draft","approved","paid"], default: "draft" },
    paidAt:             { type: Date },
    notes:              { type: String, trim: true },
  },
  { timestamps: true }
);

PayrollSchema.index({ employeeId: 1, month: 1 }, { unique: true });

export default (mongoose.models.Payroll as mongoose.Model<IPayroll>) ||
  mongoose.model<IPayroll>("Payroll", PayrollSchema);
