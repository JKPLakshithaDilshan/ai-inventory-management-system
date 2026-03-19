import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { useToast } from '@/hooks/use-toast';
import { saleApi, type Sale } from '@/services/sales';

export function SaleDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [sale, setSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [completing, setCompleting] = useState(false);

  const loadSale = async () => {
    if (!id) return;

    try {
      setLoading(true);
      setError(null);
      const response = await saleApi.getById(Number(id));
      setSale(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sale');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSale();
  }, [id]);

  const handleCompleteSale = async () => {
    if (!sale) return;

    try {
      setCompleting(true);
      await saleApi.complete(sale.id);
      toast({
        title: 'Sale completed',
        description: 'Stock has been deducted and the sale is now completed.',
      });
      setCompleteDialogOpen(false);
      await loadSale();
    } catch (err) {
      toast({
        title: 'Complete failed',
        description: err instanceof Error ? err.message : 'Could not complete sale',
        variant: 'destructive',
      });
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-56" />
        <Card className="p-6 space-y-3">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-full" />
        </Card>
      </div>
    );
  }

  if (error || !sale) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate('/sales')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Sales
        </Button>
        <Card className="p-6 border-destructive/30 bg-destructive/5">
          <p className="font-medium text-destructive">{error ?? 'Sale not found'}</p>
          <Button variant="outline" className="mt-3" onClick={loadSale}>
            Retry
          </Button>
        </Card>
      </div>
    );
  }

  const canComplete = sale.status === 'draft';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/sales')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{sale.invoice_number}</h1>
            <p className="text-muted-foreground">Sale Details</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={sale.status === 'completed' ? 'default' : sale.status === 'draft' ? 'secondary' : 'destructive'}>
            {sale.status.toUpperCase()}
          </Badge>
          {canComplete && (
            <Button onClick={() => setCompleteDialogOpen(true)}>
              <CheckCircle2 className="mr-2 h-4 w-4" /> Complete Sale
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Order Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Warehouse:</span><span>{sale.warehouse_id}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Date:</span><span>{new Date(sale.sale_date).toLocaleDateString()}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Customer:</span><span>{sale.customer_name || 'Walk-in'}</span></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Payment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Status:</span><span>{sale.payment_status}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Paid:</span><span>${sale.paid_amount.toFixed(2)}</span></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Amount</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal:</span><span>${sale.subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Tax:</span><span>${sale.tax_amount.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Discount:</span><span>${sale.discount_amount.toFixed(2)}</span></div>
            <div className="flex justify-between border-t pt-2 font-bold"><span>Total:</span><span>${sale.total_amount.toFixed(2)}</span></div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Line Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Line Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sale.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="font-medium">{item.product?.name || 'Unknown'}</div>
                      <div className="text-xs text-muted-foreground">{item.product?.sku || '-'}</div>
                      <div className="text-xs text-muted-foreground">Available Stock: {item.product?.quantity ?? 'N/A'}</div>
                    </TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">${item.unit_price.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-medium">${item.total_price.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={completeDialogOpen}
        onOpenChange={setCompleteDialogOpen}
        title="Complete sale"
        description="This will deduct stock and finalize the sale. Continue?"
        confirmLabel="Complete Sale"
        onConfirm={handleCompleteSale}
        isLoading={completing}
      />
    </div>
  );
}
