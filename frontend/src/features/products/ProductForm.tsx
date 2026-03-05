import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useState } from 'react';
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

export const productSchema = z.object({
    sku: z.string().min(1, { message: 'SKU is required.' }),
    name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
    description: z.string().optional(),
    cost_price: z.coerce.number().min(0, { message: 'Cost price must be a positive number.' }),
    selling_price: z.coerce.number().min(0, { message: 'Selling price must be a positive number.' }),
    quantity: z.coerce.number().min(0, { message: 'Quantity must be a positive number.' }),
    reorder_level: z.coerce.number().min(0, { message: 'Reorder level must be a positive number.' }),
    reorder_quantity: z.coerce.number().min(0, { message: 'Reorder quantity must be a positive number.' }),
    unit: z.string().min(1, { message: 'Unit is required.' }),
    barcode: z.string().optional(),
    image_url: z.string().optional(),
});

export type ProductFormValues = z.infer<typeof productSchema>;

export function ProductForm({
    children,
    defaultValues,
    open,
    setOpen,
    onSubmit,
    mode = 'create',
}: {
    children: React.ReactNode;
    defaultValues?: Partial<ProductFormValues>;
    open: boolean;
    setOpen: (open: boolean) => void;
    onSubmit: (data: ProductCreateInput) => Promise<void>;
    mode?: 'create' | 'edit';
}) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const form = useForm<ProductFormValues>({
        resolver: zodResolver(productSchema) as any,
        defaultValues: {
            sku: defaultValues?.sku || '',
            name: defaultValues?.name || '',
            description: defaultValues?.description || '',
            cost_price: defaultValues?.cost_price ?? 0,
            selling_price: defaultValues?.selling_price ?? 0,
            quantity: defaultValues?.quantity ?? 0,
            reorder_level: defaultValues?.reorder_level ?? 0,
            reorder_quantity: defaultValues?.reorder_quantity ?? 0,
            unit: defaultValues?.unit || 'pcs',
            barcode: defaultValues?.barcode || '',
            image_url: defaultValues?.image_url || '',
        },
    });

    const handleSubmit = async (data: ProductFormValues) => {
        try {
            setIsSubmitting(true);
            await onSubmit({
                sku: data.sku,
                name: data.name,
                description: data.description || undefined,
                cost_price: data.cost_price,
                selling_price: data.selling_price,
                quantity: data.quantity,
                reorder_level: data.reorder_level,
                reorder_quantity: data.reorder_quantity,
                unit: data.unit,
                barcode: data.barcode || undefined,
                image_url: data.image_url || undefined,
            });
            form.reset({
                sku: '',
                name: '',
                description: '',
                cost_price: 0,
                selling_price: 0,
                quantity: 0,
                reorder_level: 0,
                reorder_quantity: 0,
                unit: 'pcs',
                barcode: '',
                image_url: '',
            });
            setOpen(false);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-[560px]">
                <DialogHeader>
                    <DialogTitle>{mode === 'edit' ? 'Edit Product' : 'Add New Product'}</DialogTitle>
                    <DialogDescription>
                        {mode === 'edit'
                            ? 'Update the product details below.'
                            : 'Fill in the details below to add a new product.'}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit as any)} className="space-y-4">
                        <FormField
                            control={form.control as any}
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
                            control={form.control as any}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ergonomic Chair" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control as any}
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
                                control={form.control as any}
                                name="cost_price"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Cost Price</FormLabel>
                                        <FormControl>
                                            <Input type="number" step="0.01" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control as any}
                                name="selling_price"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Selling Price</FormLabel>
                                        <FormControl>
                                            <Input type="number" step="0.01" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control as any}
                                name="quantity"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Quantity</FormLabel>
                                        <FormControl>
                                            <Input type="number" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control as any}
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
                                control={form.control as any}
                                name="reorder_level"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Reorder Level</FormLabel>
                                        <FormControl>
                                            <Input type="number" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control as any}
                                name="reorder_quantity"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Reorder Quantity</FormLabel>
                                        <FormControl>
                                            <Input type="number" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control as any}
                                name="barcode"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Barcode</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Optional" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control as any}
                                name="image_url"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Image URL</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Optional" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="flex justify-end pt-4">
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
