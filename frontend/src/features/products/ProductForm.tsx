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
import type { ProductCreateInput } from '@/services/products';

const productSchema = z.object({
  sku: z.string().trim().min(1, 'SKU is required'),
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
  category_id: z
    .union([z.coerce.number().int().positive(), z.nan()])
    .optional()
    .transform((value) => (typeof value === 'number' && !Number.isNaN(value) ? value : undefined)),
  cost_price: z.coerce.number().min(0, 'Cost price must be at least 0'),
  selling_price: z.coerce.number().min(0, 'Selling price must be at least 0'),
  quantity: z.coerce.number().int().min(0, 'Quantity must be at least 0'),
  reorder_level: z.coerce.number().int().min(0, 'Reorder level must be at least 0'),
  reorder_quantity: z.coerce.number().int().min(0, 'Reorder quantity must be at least 0'),
  unit: z.string().trim().min(1, 'Unit is required'),
  barcode: z.string().optional(),
  image_url: z.string().optional(),
});

export type ProductFormValues = z.infer<typeof productSchema>;

interface ProductFormProps {
  children: React.ReactNode;
  defaultValues?: Partial<ProductFormValues>;
  open: boolean;
  setOpen: (open: boolean) => void;
  onSubmit: (data: ProductCreateInput) => Promise<void>;
  mode?: 'create' | 'edit';
}

export function ProductForm({
  children,
  defaultValues,
  open,
  setOpen,
  onSubmit,
  mode = 'create',
}: ProductFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<ProductFormValues, unknown, ProductFormValues>({
    resolver: (zodResolver(productSchema) as Resolver<
      ProductFormValues,
      unknown,
      ProductFormValues
    >),
    defaultValues: {
      sku: defaultValues?.sku ?? '',
      name: defaultValues?.name ?? '',
      description: defaultValues?.description ?? '',
      category_id: defaultValues?.category_id,
      cost_price: defaultValues?.cost_price ?? 0,
      selling_price: defaultValues?.selling_price ?? 0,
      quantity: defaultValues?.quantity ?? 0,
      reorder_level: defaultValues?.reorder_level ?? 0,
      reorder_quantity: defaultValues?.reorder_quantity ?? 0,
      unit: defaultValues?.unit ?? 'pcs',
      barcode: defaultValues?.barcode ?? '',
      image_url: defaultValues?.image_url ?? '',
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      sku: defaultValues?.sku ?? '',
      name: defaultValues?.name ?? '',
      description: defaultValues?.description ?? '',
      category_id: defaultValues?.category_id,
      cost_price: defaultValues?.cost_price ?? 0,
      selling_price: defaultValues?.selling_price ?? 0,
      quantity: defaultValues?.quantity ?? 0,
      reorder_level: defaultValues?.reorder_level ?? 0,
      reorder_quantity: defaultValues?.reorder_quantity ?? 0,
      unit: defaultValues?.unit ?? 'pcs',
      barcode: defaultValues?.barcode ?? '',
      image_url: defaultValues?.image_url ?? '',
    });
    setSubmitError(null);
  }, [open, defaultValues, form]);

  const handleSubmit: SubmitHandler<ProductFormValues> = async (data) => {
    try {
      setIsSubmitting(true);
      setSubmitError(null);

      await onSubmit({
        sku: data.sku.trim(),
        name: data.name.trim(),
        description: data.description?.trim() || undefined,
        category_id: data.category_id,
        cost_price: data.cost_price,
        selling_price: data.selling_price,
        quantity: data.quantity,
        reorder_level: data.reorder_level,
        reorder_quantity: data.reorder_quantity,
        unit: data.unit.trim(),
        barcode: data.barcode?.trim() || undefined,
        image_url: data.image_url?.trim() || undefined,
      });

      setOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save product';
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>{mode === 'edit' ? 'Edit Product' : 'Create Product'}</DialogTitle>
          <DialogDescription>
            {mode === 'edit' ? 'Update product details.' : 'Add a new product to inventory.'}
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
                name="sku"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SKU</FormLabel>
                    <FormControl>
                      <Input placeholder="PRD-001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Product name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input placeholder="Optional description" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category ID</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Optional"
                        value={field.value ?? ''}
                        onChange={(event) => {
                          field.onChange(event.target.value === '' ? undefined : Number(event.target.value));
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit</FormLabel>
                    <FormControl>
                      <Input placeholder="pcs" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="cost_price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cost Price</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="selling_price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Selling Price</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" step="0.01" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="reorder_level"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reorder Level</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="reorder_quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reorder Quantity</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="barcode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Barcode</FormLabel>
                    <FormControl>
                      <Input placeholder="Optional barcode" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="image_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Image URL</FormLabel>
                    <FormControl>
                      <Input placeholder="Optional image URL" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : mode === 'edit' ? 'Update Product' : 'Create Product'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
