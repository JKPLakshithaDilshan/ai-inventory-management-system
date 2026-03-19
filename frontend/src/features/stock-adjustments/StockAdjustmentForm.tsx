import { useEffect, useMemo, useState } from 'react';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Product } from '@/services/products';
import type { Warehouse } from '@/services/warehouses';
import type { StockAdjustmentCreateInput } from '@/services/stock-adjustments';

const schema = z.object({
  product_id: z.number().int().gt(0, 'Product is required'),
  warehouse_id: z.number().int().gt(0, 'Warehouse is required'),
  adjustment_type: z.enum(['increase', 'decrease']),
  quantity: z.number().int().gt(0, 'Quantity must be greater than 0'),
  reason: z.string().trim().min(2, 'Reason is required').max(255, 'Reason is too long'),
  note: z.string().optional(),
  adjustment_reference: z.string().optional(),
  allow_negative: z.boolean().default(false),
});

type FormInputValues = z.input<typeof schema>;
type FormValues = z.output<typeof schema>;

interface StockAdjustmentFormProps {
  children: React.ReactNode;
  open: boolean;
  setOpen: (open: boolean) => void;
  products: Product[];
  warehouses: Warehouse[];
  onSubmit: (data: StockAdjustmentCreateInput) => Promise<void>;
}

export function StockAdjustmentForm({
  children,
  open,
  setOpen,
  products,
  warehouses,
  onSubmit,
}: StockAdjustmentFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<FormInputValues, unknown, FormValues>({
    resolver: zodResolver(schema) as Resolver<FormInputValues, unknown, FormValues>,
    defaultValues: {
      product_id: 0,
      warehouse_id: 0,
      adjustment_type: 'increase',
      quantity: 1,
      reason: '',
      note: '',
      adjustment_reference: '',
      allow_negative: false,
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      product_id: products[0]?.id ?? 0,
      warehouse_id: warehouses[0]?.id ?? 0,
      adjustment_type: 'increase',
      quantity: 1,
      reason: '',
      note: '',
      adjustment_reference: '',
      allow_negative: false,
    });
    setSubmitError(null);
  }, [open, form, products, warehouses]);

  const selectedProductId = form.watch('product_id');
  const selectedWarehouseId = form.watch('warehouse_id');

  const canShowStock = useMemo(() => selectedProductId > 0 && selectedWarehouseId > 0, [selectedProductId, selectedWarehouseId]);

  const handleSubmit: SubmitHandler<FormValues> = async (values) => {
    try {
      setIsSubmitting(true);
      setSubmitError(null);

      await onSubmit({
        product_id: values.product_id,
        warehouse_id: values.warehouse_id,
        adjustment_type: values.adjustment_type,
        quantity: values.quantity,
        reason: values.reason.trim(),
        note: values.note?.trim() || undefined,
        adjustment_reference: values.adjustment_reference?.trim() || undefined,
        allow_negative: values.allow_negative,
      });

      setOpen(false);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to create stock adjustment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[760px]">
        <DialogHeader>
          <DialogTitle>Create Stock Adjustment</DialogTitle>
          <DialogDescription>
            Apply controlled inventory corrections with automatic stock ledger tracking.
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
                name="product_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product</FormLabel>
                    <Select value={field.value ? String(field.value) : ''} onValueChange={(v) => field.onChange(Number(v))}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select product" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {products.map((product) => (
                          <SelectItem key={product.id} value={String(product.id)}>
                            {product.sku} - {product.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="warehouse_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Warehouse</FormLabel>
                    <Select value={field.value ? String(field.value) : ''} onValueChange={(v) => field.onChange(Number(v))}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select warehouse" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {warehouses.map((warehouse) => (
                          <SelectItem key={warehouse.id} value={String(warehouse.id)}>
                            {warehouse.code} - {warehouse.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="adjustment_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adjustment Type</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="increase">Increase (+)</SelectItem>
                        <SelectItem value="decrease">Decrease (-)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantity</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        step="1"
                        value={field.value}
                        onChange={(event) => field.onChange(Number(event.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="adjustment_reference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reference</FormLabel>
                    <FormControl>
                      <Input placeholder="ADJ-0001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason</FormLabel>
                  <FormControl>
                    <Input placeholder="Damaged items write-off" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Note</FormLabel>
                  <FormControl>
                    <Input placeholder="Optional details" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="allow_negative"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-1">
                    <FormLabel>Allow Negative Stock</FormLabel>
                    <p className="text-xs text-muted-foreground">Use only for exceptional reconciliation cases.</p>
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

            {canShowStock ? (
              <p className="text-xs text-muted-foreground">
                Current stock for selected product/location is shown in the page before submission.
              </p>
            ) : null}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Create Adjustment'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
