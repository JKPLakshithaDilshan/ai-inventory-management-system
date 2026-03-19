import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import type { Resolver, SubmitHandler } from 'react-hook-form';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { CreateWarehouseInput } from '@/services/warehouses';

const warehouseSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  code: z.string().trim().min(1, 'Code is required').max(50, 'Code cannot exceed 50 characters'),
  address: z.string().optional(),
  city: z.string().optional(),
  contact_person: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  is_active: z.boolean().default(true),
});

export type WarehouseFormInputValues = z.input<typeof warehouseSchema>;
export type WarehouseFormValues = z.output<typeof warehouseSchema>;

interface WarehouseFormProps {
  children: React.ReactNode;
  defaultValues?: Partial<WarehouseFormValues>;
  open: boolean;
  setOpen: (open: boolean) => void;
  onSubmit: (data: CreateWarehouseInput) => Promise<void>;
  mode?: 'create' | 'edit';
}

export function WarehouseForm({
  children,
  defaultValues,
  open,
  setOpen,
  onSubmit,
  mode = 'create',
}: WarehouseFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<WarehouseFormInputValues, unknown, WarehouseFormValues>({
    resolver: (zodResolver(warehouseSchema) as Resolver<
      WarehouseFormInputValues,
      unknown,
      WarehouseFormValues
    >),
    defaultValues: {
      name: defaultValues?.name ?? '',
      code: defaultValues?.code ?? '',
      address: defaultValues?.address ?? '',
      city: defaultValues?.city ?? '',
      contact_person: defaultValues?.contact_person ?? '',
      phone: defaultValues?.phone ?? '',
      email: defaultValues?.email ?? '',
      is_active: defaultValues?.is_active ?? true,
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      name: defaultValues?.name ?? '',
      code: defaultValues?.code ?? '',
      address: defaultValues?.address ?? '',
      city: defaultValues?.city ?? '',
      contact_person: defaultValues?.contact_person ?? '',
      phone: defaultValues?.phone ?? '',
      email: defaultValues?.email ?? '',
      is_active: defaultValues?.is_active ?? true,
    });
    setSubmitError(null);
  }, [open, defaultValues, form]);

  const handleSubmit: SubmitHandler<WarehouseFormValues> = async (data) => {
    try {
      setIsSubmitting(true);
      setSubmitError(null);

      await onSubmit({
        name: data.name.trim(),
        code: data.code.trim(),
        address: data.address?.trim() || undefined,
        city: data.city?.trim() || undefined,
        contact_person: data.contact_person?.trim() || undefined,
        phone: data.phone?.trim() || undefined,
        email: data.email?.trim() || undefined,
        is_active: data.is_active,
      });

      setOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save warehouse';
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[680px]">
        <DialogHeader>
          <DialogTitle>{mode === 'edit' ? 'Edit Warehouse' : 'Create Warehouse'}</DialogTitle>
          <DialogDescription>
            {mode === 'edit' ? 'Update warehouse details.' : 'Add a new warehouse location.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {submitError && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {submitError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Main Warehouse" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code</FormLabel>
                    <FormControl>
                      <Input placeholder="WH-MAIN" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input placeholder="Colombo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contact_person"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Person</FormLabel>
                    <FormControl>
                      <Input placeholder="Warehouse manager" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input placeholder="123 Main Street" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="+94 11 123 4567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="warehouse@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div>
                    <FormLabel>Active Warehouse</FormLabel>
                  </div>
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={(event) => field.onChange(event.target.checked)}
                      className="h-4 w-4"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : mode === 'edit' ? 'Update Warehouse' : 'Create Warehouse'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
