import Swal from "sweetalert2";

const base = {
  customClass: {
    popup:         "!rounded-2xl !shadow-2xl !border !border-slate-100",
    title:         "!text-slate-900 !text-lg !font-bold",
    htmlContainer: "!text-slate-500 !text-sm",
    confirmButton: "!rounded-xl !px-5 !py-2 !text-sm !font-semibold !shadow-sm",
    cancelButton:  "!rounded-xl !px-5 !py-2 !text-sm !font-semibold",
    actions:       "!gap-2",
  },
};

export async function confirmDelete(itemName?: string): Promise<boolean> {
  const result = await Swal.fire({
    ...base,
    title: "Delete Confirmation",
    html: itemName
      ? `Are you sure you want to delete <strong>${itemName}</strong>?<br/><span class="text-xs text-red-500 mt-1 block">This action cannot be undone.</span>`
      : `Are you sure? <span class="text-xs text-red-500 mt-1 block">This action cannot be undone.</span>`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#ef4444",
    cancelButtonColor: "#64748b",
    confirmButtonText: "Yes, Delete",
    cancelButtonText: "Cancel",
    reverseButtons: true,
  });
  return result.isConfirmed;
}

export async function confirmBulkDelete(count: number, label = "item"): Promise<boolean> {
  const result = await Swal.fire({
    ...base,
    title: `Delete ${count} ${label}${count > 1 ? "s" : ""}?`,
    html: `<span class="text-xs text-red-500 mt-1 block">This action cannot be undone.</span>`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#ef4444",
    cancelButtonColor: "#64748b",
    confirmButtonText: `Delete ${count}`,
    cancelButtonText: "Cancel",
    reverseButtons: true,
  });
  return result.isConfirmed;
}

export async function confirmAction(title: string, text: string, confirmText = "Confirm"): Promise<boolean> {
  const result = await Swal.fire({
    ...base,
    title,
    text,
    icon: "question",
    showCancelButton: true,
    confirmButtonColor: "#4f46e5",
    cancelButtonColor: "#64748b",
    confirmButtonText: confirmText,
    cancelButtonText: "Cancel",
    reverseButtons: true,
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
