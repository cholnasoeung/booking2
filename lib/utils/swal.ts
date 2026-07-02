import Swal from "sweetalert2";

const base = {
  customClass: {
    popup:         "!rounded-2xl !shadow-2xl !border !border-slate-100",
    title:         "!text-slate-900 !text-xl !font-bold",
    htmlContainer: "!text-slate-500 !text-sm !mt-1",
    confirmButton: "!rounded-xl !px-7 !py-2.5 !text-sm !font-semibold !shadow-sm",
    cancelButton:  "!rounded-xl !px-7 !py-2.5 !text-sm !font-semibold",
    actions:       "!gap-3 !mt-1",
    icon:          "!border-amber-300 !text-amber-400",
  },
};

/** Shared options for every confirmation — warning icon, green Yes, gray Cancel */
const warningOpts = {
  ...base,
  icon: "warning" as const,
  showCancelButton: true,
  confirmButtonColor: "#22c55e",   // green-500 — matches the screenshot
  cancelButtonColor:  "#94a3b8",   // slate-400
  confirmButtonText:  "Yes",
  cancelButtonText:   "Cancel",
  reverseButtons: false,
};

/** Delete: "Are you sure? / You want to delete X!" */
export async function confirmDelete(itemName?: string): Promise<boolean> {
  const result = await Swal.fire({
    ...warningOpts,
    title: "Are you sure?",
    html: itemName
      ? `You want to delete <strong>${itemName}</strong>!`
      : "You want to delete this item!",
  });
  return result.isConfirmed;
}

/** Bulk delete */
export async function confirmBulkDelete(count: number, label = "item"): Promise<boolean> {
  const result = await Swal.fire({
    ...warningOpts,
    title: "Are you sure?",
    html: `You want to delete <strong>${count} ${label}${count > 1 ? "s" : ""}</strong>!`,
  });
  return result.isConfirmed;
}

/**
 * Generic warning confirmation — same look as confirmDelete.
 * Use for suspend/reinstate/role-change/other reversible-but-impactful actions.
 */
export async function confirmWarning(
  _title: string,
  text: string,
  confirmText = "Yes"
): Promise<boolean> {
  const result = await Swal.fire({
    ...warningOpts,
    title: "Are you sure?",
    text,
    confirmButtonText: confirmText,
  });
  return result.isConfirmed;
}

/**
 * Action confirmation — same icon/layout as delete, but for non-destructive actions
 * (e.g., bulk cancel, process refund). Confirm button stays green so the look is uniform.
 */
export async function confirmAction(
  _title: string,
  text: string,
  confirmText = "Yes"
): Promise<boolean> {
  const result = await Swal.fire({
    ...warningOpts,
    title: "Are you sure?",
    text,
    confirmButtonText: confirmText,
  });
  return result.isConfirmed;
}

export function toastSuccess(message: string) {
  Swal.fire({
    toast: true,
    position: "top-end",
    icon: "success",
    title: message,
    showConfirmButton: false,
    timer: 2500,
    timerProgressBar: true,
    customClass: { popup: "!rounded-2xl !text-sm !shadow-lg" },
  });
}

export function toastError(message: string) {
  Swal.fire({
    toast: true,
    position: "top-end",
    icon: "error",
    title: message,
    showConfirmButton: false,
    timer: 3500,
    timerProgressBar: true,
    customClass: { popup: "!rounded-2xl !text-sm !shadow-lg" },
  });
}

export function toastInfo(message: string) {
  Swal.fire({
    toast: true,
    position: "top-end",
    icon: "info",
    title: message,
    showConfirmButton: false,
    timer: 2500,
    timerProgressBar: true,
    customClass: { popup: "!rounded-2xl !text-sm !shadow-lg" },
  });
}
