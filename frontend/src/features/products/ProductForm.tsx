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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

export const productSchema = z.object({
    name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
    sku: z.string().min(3, { message: 'SKU must be at least 3 characters.' }),
    stock: z.coerce.number().min(0, { message: 'Stock must be a positive number.' }),
    price: z.coerce.number().min(0, { message: 'Price must be a positive number.' }),
    status: z.enum(['OK', 'LOW', 'OUT']),
});

export type ProductFormValues = {
    name: string;
    sku: string;
    stock: number;
    price: number;
    status: 'OK' | 'LOW' | 'OUT';
};

export function ProductForm({
    children,
    defaultValues,
    open,
    setOpen,
    onSuccess,
}: {
    children: React.ReactNode;
    defaultValues?: Partial<ProductFormValues>;
    open: boolean;
    setOpen: (open: boolean) => void;
    onSuccess?: () => void;
}) {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false); // Added isSubmitting state
    const form = useForm<ProductFormValues>({
        resolver: zodResolver(productSchema) as any, // Modified resolver
        defaultValues: {
            name: defaultValues?.name || '',
            sku: defaultValues?.sku || '',
            stock: defaultValues?.stock ?? 0,
            price: defaultValues?.price ?? 0,
            status: defaultValues?.status || 'OK',
        } as ProductFormValues,
    });

    const onSubmit = (data: ProductFormValues) => {
        setIsSubmitting(true);
        // Simulate API call
        setTimeout(() => {
            setIsSubmitting(false);
            onSuccess?.();
            toast({
                title: defaultValues ? 'Product updated' : 'Product created',
                description: `${data.name} has been successfully saved.`,
            });
        }, 1000);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}> {/* Modified Dialog props */}
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-[500px]"> {/* Modified DialogContent className */}
                <DialogHeader>
                    <DialogTitle>{defaultValues ? 'Edit Product' : 'Add New Product'}</DialogTitle> {/* Modified DialogTitle */}
                    <DialogDescription>
                        {defaultValues
                            ? 'Update the details of your existing product below.'
                            : 'Fill in the details below to add a new product to your inventory.'} {/* Modified DialogDescription */}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-4"> {/* Modified onSubmit */}
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

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control as any}
                                name="sku"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>SKU</FormLabel>
                                        <FormControl>
                                            <Input placeholder="CH-001" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control as any}
                                name="status"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Status</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value as string}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select status" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="OK">OK</SelectItem>
                                                <SelectItem value="LOW">LOW</SelectItem>
                                                <SelectItem value="OUT">OUT</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control as any}
                                name="stock"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Stock Quantity</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                {...field}
                                                onChange={(e) => field.onChange(parseInt(e.target.value, 10) || 0)}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control as any}
                                name="price"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Price ($)</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                {...field}
                                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="flex justify-end pt-4">
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? 'Saving...' : 'Save Product'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
