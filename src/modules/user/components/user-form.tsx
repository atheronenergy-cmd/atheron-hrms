"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createUserAction, updateUserAction } from "@/modules/user/actions/user.actions";
import { RoleSelector } from "@/modules/user/components/role-selector";
import { USER_ROUTES } from "@/modules/user/domain/types";
import {
  type CreateUserInput,
  createUserSchema,
  type UpdateUserInput,
  updateUserSchema,
} from "@/modules/user/validation/schemas";

type RoleOption = { id: string; name: string; slug: string };

type UserFormProps = {
  mode: "create" | "edit";
  roles: RoleOption[];
  defaultValues?: Partial<UpdateUserInput>;
};

export function UserForm({ mode, roles, defaultValues }: UserFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  const isCreate = mode === "create";

  const createForm = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      sendInvitation: true,
      roleIds: [],
      remarks: "",
    },
  });

  const editForm = useForm<UpdateUserInput>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: defaultValues ?? {
      id: "",
      name: "",
      email: "",
      phone: "",
      version: 1,
    },
  });

  function handleRoleChange(roleIds: string[]) {
    setSelectedRoles(roleIds);
    createForm.setValue("roleIds", roleIds, { shouldValidate: true, shouldDirty: true });
  }

  async function onCreateSubmit(values: CreateUserInput) {
    setIsSubmitting(true);
    const result = await createUserAction({ ...values, roleIds: selectedRoles });
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.message);
      if (result.fieldErrors) {
        for (const [field, messages] of Object.entries(result.fieldErrors)) {
          if (messages?.[0]) {
            createForm.setError(field as keyof CreateUserInput, { message: messages[0] });
          }
        }
      }
      return;
    }

    toast.success(result.message);
    router.push(USER_ROUTES.detail(result.data!.id));
  }

  function onCreateInvalid() {
    toast.error("Please fix the highlighted fields before submitting.");
  }

  async function onEditSubmit(values: UpdateUserInput) {
    setIsSubmitting(true);
    const result = await updateUserAction(values);
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.message);
      return;
    }

    toast.success(result.message);
    router.push(USER_ROUTES.detail(values.id));
  }

  if (isCreate) {
    const sendInvitation = createForm.watch("sendInvitation");

    return (
      <form onSubmit={createForm.handleSubmit(onCreateSubmit, onCreateInvalid)} className="space-y-6 max-w-2xl">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" {...createForm.register("name")} />
            {createForm.formState.errors.name && (
              <p className="text-sm text-destructive">{createForm.formState.errors.name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...createForm.register("email")} />
            {createForm.formState.errors.email && (
              <p className="text-sm text-destructive">{createForm.formState.errors.email.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" type="tel" {...createForm.register("phone")} />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Roles</Label>
          {roles.length === 0 ? (
            <p className="text-sm text-destructive">No roles are available. Seed roles or contact an administrator.</p>
          ) : (
            <RoleSelector
              roles={roles}
              selectedIds={selectedRoles}
              onChange={handleRoleChange}
            />
          )}
          {createForm.formState.errors.roleIds?.message && (
            <p className="text-sm text-destructive">{createForm.formState.errors.roleIds.message}</p>
          )}
          {selectedRoles.length === 0 && !createForm.formState.errors.roleIds && roles.length > 0 && (
            <p className="text-sm text-muted-foreground">Select at least one role to enable user creation.</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="remarks">Remarks</Label>
          <Textarea id="remarks" {...createForm.register("remarks")} rows={3} />
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="sendInvitation"
            checked={sendInvitation}
            onCheckedChange={(v) => createForm.setValue("sendInvitation", v === true)}
          />
          <Label htmlFor="sendInvitation" className="font-normal">
            Send invitation email (user sets password on acceptance)
          </Label>
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={isSubmitting || selectedRoles.length === 0 || roles.length === 0}>
            {isSubmitting ? "Creating…" : "Create user"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-6 max-w-2xl">
      <input type="hidden" {...editForm.register("id")} />
      <input type="hidden" {...editForm.register("version", { valueAsNumber: true })} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="edit-name">Full name</Label>
          <Input id="edit-name" {...editForm.register("name")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-email">Email</Label>
          <Input id="edit-email" type="email" {...editForm.register("email")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-phone">Phone</Label>
          <Input id="edit-phone" type="tel" {...editForm.register("phone")} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-remarks">Remarks</Label>
        <Textarea id="edit-remarks" {...editForm.register("remarks")} rows={3} />
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : "Save changes"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
