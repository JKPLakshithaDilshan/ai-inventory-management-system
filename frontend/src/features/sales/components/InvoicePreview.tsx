import { useSaleStore } from '@/stores/useSaleStore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { format } from 'date-fns';

export function InvoicePreview() {
    const { draft } = useSaleStore();

    // Derived totals
    const subtotal = draft.items.reduce((s, i) => s + i.lineTotal, 0);
    const discountAmount = subtotal * (draft.discount / 100);
    const taxableAmount = subtotal - discountAmount;
    const taxAmount = taxableAmount * (draft.taxRate / 100);
    const grandTotal = subtotal - discountAmount + taxAmount;

    const handlePrint = () => {
        window.print();
    };

    return (
        <Card className="print:shadow-none print:border-0">
            <CardContent className="p-6 print:p-8">
                {/* Print Button - Hidden on Print */}
                <div className="flex justify-end mb-4 print:hidden">
                    <Button variant="outline" size="sm" onClick={handlePrint}>
                        <Printer className="mr-2 h-4 w-4" />
                        Print Invoice
                    </Button>
                </div>

                {/* Invoice Header */}
                <div className="mb-8 pb-6 border-b print:border-black">
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-primary print:text-black">
                                AI Inventory
                            </h1>
                            <p className="text-sm text-muted-foreground print:text-gray-700 mt-1">
                                Modern Inventory Management
                            </p>
                        </div>
                        <div className="text-right">
                            <h2 className="text-2xl font-bold print:text-black">INVOICE</h2>
                            <p className="text-sm text-muted-foreground print:text-gray-700 mt-1">
                                Invoice #: {draft.referenceNo || 'DRAFT'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Invoice Details */}
                <div className="grid grid-cols-2 gap-6 mb-8">
                    <div>
                        <h3 className="text-sm font-semibold text-muted-foreground print:text-gray-700 uppercase tracking-wide mb-2">
                            Bill To
                        </h3>
                        <p className="font-medium print:text-black">
                            {draft.customerName || 'Walk-in Customer'}
                        </p>
                    </div>
                    <div className="text-right">
                        <h3 className="text-sm font-semibold text-muted-foreground print:text-gray-700 uppercase tracking-wide mb-2">
                            Invoice Date
                        </h3>
                        <p className="font-medium print:text-black">
                            {draft.saleDate
                                ? format(new Date(draft.saleDate), 'MMM dd, yyyy')
                                : format(new Date(), 'MMM dd, yyyy')}
                        </p>
                    </div>
                </div>

                {/* Items Table */}
                <div className="mb-8">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b print:border-black">
                                <th className="text-left py-3 font-semibold text-muted-foreground print:text-black">
                                    Item
                                </th>
                                <th className="text-center py-3 font-semibold text-muted-foreground print:text-black w-20">
                                    Qty
                                </th>
                                <th className="text-right py-3 font-semibold text-muted-foreground print:text-black w-24">
                                    Price
                                </th>
                                <th className="text-right py-3 font-semibold text-muted-foreground print:text-black w-28">
                                    Total
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {draft.items.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="py-12 text-center text-muted-foreground print:text-gray-500">
                                        No items added yet
                                    </td>
                                </tr>
                            ) : (
                                draft.items.map((item) => (
                                    <tr key={item.id} className="border-b border-muted print:border-gray-300">
                                        <td className="py-3 print:text-black">
                                            <div className="font-medium">{item.name}</div>
                                            <div className="text-xs text-muted-foreground print:text-gray-600">
                                                {item.sku}
                                            </div>
                                        </td>
                                        <td className="text-center py-3 print:text-black">{item.qty}</td>
                                        <td className="text-right py-3 print:text-black">
                                            ${item.unitPrice.toFixed(2)}
                                        </td>
                                        <td className="text-right py-3 font-medium print:text-black">
                                            ${item.lineTotal.toFixed(2)}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Totals Section */}
                <div className="flex justify-end">
                    <div className="w-64 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground print:text-gray-700">Subtotal:</span>
                            <span className="font-medium print:text-black">${subtotal.toFixed(2)}</span>
                        </div>
                        {draft.discount > 0 && (
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground print:text-gray-700">
                                    Discount ({draft.discount}%):
                                </span>
                                <span className="font-medium text-red-600 print:text-black">
                                    -${discountAmount.toFixed(2)}
                                </span>
                            </div>
                        )}
                        {draft.taxRate > 0 && (
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground print:text-gray-700">
                                    Tax ({draft.taxRate}%):
                                </span>
                                <span className="font-medium print:text-black">
                                    +${taxAmount.toFixed(2)}
                                </span>
                            </div>
                        )}
                        <div className="flex justify-between pt-2 border-t print:border-black">
                            <span className="font-bold text-lg print:text-black">Total:</span>
                            <span className="font-bold text-lg text-primary print:text-black">
                                ${grandTotal.toFixed(2)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Notes */}
                {draft.notes && (
                    <div className="mt-8 pt-6 border-t print:border-gray-300">
                        <h3 className="text-sm font-semibold text-muted-foreground print:text-gray-700 uppercase tracking-wide mb-2">
                            Notes
                        </h3>
                        <p className="text-sm text-muted-foreground print:text-gray-700">
                            {draft.notes}
                        </p>
                    </div>
                )}

                {/* Footer */}
                <div className="mt-12 pt-6 border-t print:border-gray-300 text-center">
                    <p className="text-xs text-muted-foreground print:text-gray-600">
                        Thank you for your business!
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}
