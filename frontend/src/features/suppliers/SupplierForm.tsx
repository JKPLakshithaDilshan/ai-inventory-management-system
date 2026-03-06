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
import type { SupplierCreateInput } from '@/services/suppliers';

export const supplierSchema = z.object({
    name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
    code: z.string().min(1, { message: 'Code is required.' }),
    contact_person: z.string().optional(),
    email: z.string().email({ message: 'Invalid email.' }).optional().or(z.literal('')),
    phone: z.string().optional(),
    payment_terms: z.string().optional(),
    city: z.string().optional(),
    country: z.string().optional(),
    is_active: z.boolean().default(true),
});

export type SupplierFormValues = z.infer<typeof supplierSchema>;

export function SupplierForm({
    children,
    defaultValues,
    open,
    setOpen,
    onSubmit,
    mode = 'create',
}: {
    children: React.ReactNode;
    defaultValues?: Partial<SupplierFormValues>;
    open: boolean;
    setOpen: (open: boolean) => void;
    onSubmit: (data: SupplierCreateInput) => Promise<void>;
    mode?: 'create' | 'edit';
}) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const form = useForm<SupplierFormValues>({
        resolver: zodResolver(supplierSchema) as any,
        defaultValues: {
            name: defaultValues?.name || '',
            code: defaultValues?.code || '',
            contact_person: defaultValues?.contact_person || '',
            email: defaultValues?.email || '',
            phone: defaultValues?.phone || '',
            payment_terms: defaultValues?.payment_terms || '',
            city: defaultValues?.city || '',
            country: defaultValues?.country || '',
            is_active: defaultValues?.is_active ?? true,
        },
    });

    const handleSubmit = async (data: SupplierFormValues) => {
        try {
            setIsSubmitting(true);
            await onSubmit({
                name: data.name,
                code: data.code,
                contact_person: data.contact_person || undefined,
                email: data.email || undefined,
                phone: data.phone || undefined,
                payment_terms: data.payment_terms || undefined,
                city: data.city || undefined,
                country: data.country || undefined,
                is_active: data.is_active,
            });

            form.reset({
                name: '',
                code: '',
                contact_person: '',
                email: '',
                phone: '',
                payment_terms: '',
                city: '',
                country: '',
                is_active: true,
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
                    <DialogTitle>{mode === 'edit' ? 'Edit Supplier' : 'Add New Supplier'}</DialogTitle>
                    <DialogDescription>
                        {mode === 'edit'
                            ? 'Update supplier details below.'
                            : 'Fill in the details below to add a new supplier.'}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit as any)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control as any}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="TechWiz Supplies" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control as any}
                                name="code"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Code</FormLabel>
                                        <FormControl>
                                            <Input placeholder="SUP-001" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control as any}
                                name="contact_person"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Contact Person</FormLabel>
                                        <FormControl>
                                            <Input placeholder="John Doe" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control as any}
                                name="email"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Email</FormLabel>
                                        <FormControl>
                                            <Input type="email" placeholder="john@supplier.com" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control as any}
                                name="phone"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Phone</FormLabel>
                                        <FormControl>
                                            <Input placeholder="+1 555-1234" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control as any}
                                name="payment_terms"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Payment Terms</FormLabel>
                                        <FormControl>
                                            <Input placeholder="30 days" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control as any}
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
                                control={form.control as any}
                                name="country"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Country</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Sri Lanka" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control as any}
                            name="is_active"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                                    <div className="space-y-0.5">
                                        <FormLabel>Active Supplier</FormLabel>
                                    </div>
                                    <FormControl>
                                        <input
                                            type="checkbox"
                                            checked={field.value}
                                            onChange={(e) => field.onChange(e.target.checked)}
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
                                {isSubmitting ? 'Saving...' : mode === 'edit' ? 'Save Changes' : 'Create Supplier'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
