import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowDownLeft, ArrowUpRight, Sparkles, Trash2 } from "lucide-react";
import clsx from "clsx";
import { api, type Transaction } from "../api/client";
import { useToken } from "../lib/auth";
import { useToast } from "../lib/toast";
import { CATEGORIES, getCategory } from "../lib/categories";
import { money } from "../lib/format";
import Modal from "./Modal";
import { Button, Field, Input, Segmented } from "./ui";

type Kind = "expense" | "income";
const AUTO = "auto" as const;

export default function TransactionForm({
  open,
  transaction,
  onClose,
  onSaved,
}: {
  open: boolean;
  transaction?: Transaction;
  onClose: () => void;
  onSaved: () => void;
}) {
  const token = useToken();
  const toast = useToast();
  const editing = !!transaction;

  const [kind, setKind] = useState<Kind>("expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<number | typeof AUTO | null>(AUTO);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const amountRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setConfirmDelete(false);
    if (transaction) {
      setKind(transaction.amount >= 0 ? "income" : "expense");
      setAmount(String(Math.abs(transaction.amount)));
      setDescription(transaction.description);
      setCategory(transaction.category_id);
    } else {
      setKind("expense");
      setAmount("");
      setDescription("");
      setCategory(AUTO);
    }
    setTimeout(() => amountRef.current?.focus(), 50);
  }, [open, transaction]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const value = parseFloat(amount);
    if (!value || value <= 0) return setError("Enter an amount greater than zero.");
    if (!description.trim()) return setError("Add a short description.");

    setSaving(true);
    setError(null);
    const input = {
      amount: kind === "expense" ? -value : value,
      description: description.trim(),
      category_id: category === AUTO ? null : category,
    };
    try {
      if (transaction) {
        // The PUT endpoint overwrites every field, so send the original date back.
        await api.updateTransaction(token, transaction.id, { ...input, date: transaction.date });
        toast({ kind: "success", title: "Transaction updated" });
      } else {
        const created = await api.createTransaction(token, input);
        if (category === AUTO && created.is_ai_categorized) {
          toast({ kind: "ai", title: `Categorized as ${getCategory(created.category_id).name}`, body: created.description });
        } else if (category === AUTO) {
          toast({ kind: "success", title: "Transaction added", body: "AI couldn't pick a category for this one." });
        } else {
          toast({ kind: "success", title: "Transaction added", body: `${created.description} · ${money(Math.abs(created.amount))}` });
        }
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!transaction) return;
    setSaving(true);
    try {
      await api.deleteTransaction(token, transaction.id);
      toast({ kind: "success", title: "Transaction deleted" });
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? "Edit transaction" : "New transaction"}>
      <form onSubmit={submit} className="space-y-5">
        <Segmented<Kind>
          value={kind}
          onChange={setKind}
          options={[
            { value: "expense", label: <><ArrowUpRight className="size-3.5 text-rose-500" /> Expense</> },
            { value: "income", label: <><ArrowDownLeft className="size-3.5 text-emerald-500" /> Income</> },
          ]}
        />

        <div className="relative">
          <span
            className={clsx(
              "pointer-events-none absolute top-1/2 left-0 -translate-y-1/2 text-3xl font-semibold",
              kind === "expense" ? "text-rose-400" : "text-emerald-400",
            )}
          >
            {kind === "expense" ? "−" : "+"}
          </span>
          <input
            ref={amountRef}
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="tabular w-full border-0 border-b-2 border-slate-100 bg-transparent py-2 pl-8 text-4xl font-semibold tracking-tight text-slate-900 placeholder:text-slate-300 focus:border-emerald-500 focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
            aria-label="Amount"
          />
        </div>

        <Field label="Description">
          <Input
            placeholder={kind === "expense" ? "e.g. Uber ride to airport" : "e.g. Salary credited"}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>

        <div>
          <span className="mb-2 block text-[13px] font-medium text-slate-700">Category</span>
          <div className="grid grid-cols-2 gap-2">
            {!editing && (
              <CategoryChip active={category === AUTO} onClick={() => setCategory(AUTO)} className="col-span-2">
                <Sparkles className="size-4 text-violet-500" />
                <span className="flex-1 text-left">Let AI decide</span>
                <span className="text-xs font-normal text-slate-400">Gemini</span>
              </CategoryChip>
            )}
            {editing && (
              <CategoryChip active={category === null} onClick={() => setCategory(null)}>
                <span>📄</span> Uncategorized
              </CategoryChip>
            )}
            {CATEGORIES.map((c) => (
              <CategoryChip key={c.id} active={category === c.id} onClick={() => setCategory(c.id)}>
                <span>{c.emoji}</span>
                <span className="truncate">{c.name}</span>
              </CategoryChip>
            ))}
          </div>
        </div>

        {error && <p className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">{error}</p>}

        <div className="flex items-center gap-3 pt-1">
          {editing &&
            (confirmDelete ? (
              <Button type="button" variant="danger" onClick={remove} loading={saving}>
                Confirm delete
              </Button>
            ) : (
              <Button type="button" variant="ghost" onClick={() => setConfirmDelete(true)} className="text-rose-600 hover:bg-rose-50 hover:text-rose-700">
                <Trash2 className="size-4" /> Delete
              </Button>
            ))}
          <div className="flex-1" />
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            {editing ? "Save changes" : category === AUTO ? "Add & categorize" : "Add transaction"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function CategoryChip({
  active,
  onClick,
  className,
  children,
}: {
  active: boolean;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "flex items-center gap-2 rounded-xl border px-3 py-2 text-[13px] font-medium transition",
        active
          ? "border-emerald-500 bg-emerald-50/60 text-slate-900 ring-4 ring-emerald-500/10"
          : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50",
        className,
      )}
    >
      {children}
    </button>
  );
}
