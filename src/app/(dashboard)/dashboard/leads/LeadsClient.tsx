"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CreateLeadSchema, type CreateLeadInput } from "@/schemas/lead.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Download } from "lucide-react";
import { cn } from "@/lib/utils";

interface Lead {
  id: string;
  phone: string;
  name: string | null;
  status: string;
  tags: string[];
  notes: string | null;
  assignedTo: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface LeadsClientProps {
  initialLeads: Lead[];
  canManage: boolean;
  organizationId: string;
}

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-100 text-blue-700",
  interested: "bg-green-100 text-green-700",
  follow_up: "bg-yellow-100 text-yellow-700",
  won: "bg-emerald-100 text-emerald-700",
  lost: "bg-red-100 text-red-700",
};

const STATUS_LABELS: Record<string, string> = {
  new: "New",
  interested: "Interested",
  follow_up: "Follow Up",
  won: "Won",
  lost: "Lost",
};

export function LeadsClient({ initialLeads, canManage }: LeadsClientProps) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateLeadInput>({
    resolver: zodResolver(CreateLeadSchema),
  });

  const filteredLeads =
    statusFilter === "all"
      ? leads
      : leads.filter((l) => l.status === statusFilter);

  const handleCreateLead = async (data: CreateLeadInput) => {
    setIsCreating(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to create lead");
      }
      const newLead = await res.json();
      setLeads((prev) => [newLead, ...prev]);
      reset();
      setIsCreateOpen(false);
      toast.success("Lead created successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create lead");
    } finally {
      setIsCreating(false);
    }
  };

  const handleStatusChange = async (leadId: string, status: string) => {
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, status } : l))
      );
      if (selectedLead?.id === leadId) {
        setSelectedLead((prev) => prev ? { ...prev, status } : null);
      }
      toast.success("Status updated");
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleExportCsv = () => {
    window.open("/api/leads/export", "_blank");
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Leads list */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <div className="flex h-14 items-center justify-between border-b bg-white px-6">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-semibold text-gray-900">Leads</h1>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
              {filteredLeads.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* Status filter */}
            <Select value={statusFilter} onValueChange={(val: string | null) => setStatusFilter(val ?? "all")}>
              <SelectTrigger className="h-8 w-36 text-xs">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {canManage && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportCsv}
                  className="h-8 text-xs"
                >
                  <Download className="mr-1 h-3 w-3" />
                  Export CSV
                </Button>

                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                  <DialogTrigger>
                    <Button size="sm" className="h-8 text-xs bg-green-500 hover:bg-green-600">
                      <Plus className="mr-1 h-3 w-3" />
                      New Lead
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create new lead</DialogTitle>
                    </DialogHeader>
                    <form
                      onSubmit={handleSubmit(handleCreateLead)}
                      className="space-y-4 pt-2"
                    >
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Phone number *
                        </label>
                        <Input
                          {...register("phone")}
                          placeholder="e.g. 923001234567"
                        />
                        {errors.phone && (
                          <p className="mt-1 text-xs text-red-500">
                            {errors.phone.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Name (optional)
                        </label>
                        <Input {...register("name")} placeholder="Customer name" />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsCreateOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          disabled={isCreating}
                          className="bg-green-500 hover:bg-green-600"
                        >
                          {isCreating ? "Creating..." : "Create lead"}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          {filteredLeads.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-gray-400">No leads found</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tags
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {filteredLeads.map((lead) => (
                  <tr
                    key={lead.id}
                    onClick={() => setSelectedLead(lead)}
                    className={cn(
                      "cursor-pointer hover:bg-gray-50 transition-colors",
                      selectedLead?.id === lead.id && "bg-green-50"
                    )}
                  >
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-900">
                          {lead.name ?? lead.phone}
                        </p>
                        {lead.name && (
                          <p className="text-xs text-gray-500">{lead.phone}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                          STATUS_COLORS[lead.status] ?? "bg-gray-100 text-gray-700"
                        )}
                      >
                        {STATUS_LABELS[lead.status] ?? lead.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {lead.tags.slice(0, 3).map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="text-xs"
                          >
                            {tag}
                          </Badge>
                        ))}
                        {lead.tags.length > 3 && (
                          <span className="text-xs text-gray-400">
                            +{lead.tags.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {new Date(lead.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Lead detail panel */}
      {selectedLead && (
        <div className="w-80 flex-shrink-0 border-l bg-white overflow-y-auto">
          <div className="p-6 space-y-6">
            <div>
              <h2 className="text-base font-semibold text-gray-900">
                {selectedLead.name ?? selectedLead.phone}
              </h2>
              {selectedLead.name && (
                <p className="text-sm text-gray-500">{selectedLead.phone}</p>
              )}
            </div>

            {/* Status selector */}
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                Status
              </label>
              <Select
                value={selectedLead.status}
                onValueChange={(val: string | null) => val && handleStatusChange(selectedLead.id, val)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tags */}
            {selectedLead.tags.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                  Tags
                </label>
                <div className="flex flex-wrap gap-1">
                  {selectedLead.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {selectedLead.notes && (
              <div>
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                  Notes
                </label>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {selectedLead.notes}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
