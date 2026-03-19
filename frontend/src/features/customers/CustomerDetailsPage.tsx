import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { customerApi, type CustomerSummary } from '@/services/customers';

export function CustomerDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [summary, setSummary] = useState<CustomerSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      try {
        setLoading(true);
        setError(null);
        const response = await customerApi.getSummary(Number(id));
        setSummary(response);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load customer details');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

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

  if (error || !summary) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => navigate('/customers')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Customers
        </Button>
        <Card className="p-6 border-destructive/30 bg-destructive/5">
          <p className="font-medium text-destructive">{error ?? 'Customer not found'}</p>
        </Card>
      </div>
    );
  }

  const customer = summary.customer;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/customers')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{customer.full_name}</h1>
          <p className="text-muted-foreground">Customer Profile</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Profile</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Code:</span><span>{customer.customer_code}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Type:</span><span>{customer.customer_type.toUpperCase()}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Status:</span><Badge variant={customer.is_active ? 'default' : 'secondary'}>{customer.is_active ? 'ACTIVE' : 'INACTIVE'}</Badge></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Company:</span><span>{customer.company_name || '—'}</span></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Contact</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Email:</span><span>{customer.email || '—'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Phone:</span><span>{customer.phone || '—'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">City:</span><span>{customer.city || '—'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Address:</span><span>{customer.address || '—'}</span></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Sales Summary</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Total Orders:</span><span>{summary.total_orders}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Total Value:</span><span>${summary.total_purchase_value.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Credit Limit:</span><span>${customer.credit_limit.toFixed(2)}</span></div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Recent Sales</CardTitle></CardHeader>
        <CardContent>
          {summary.recent_sales.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sales found for this customer.</p>
          ) : (
            <div className="space-y-2">
              {summary.recent_sales.map((sale) => (
                <div key={sale.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                  <div>
                    <div className="font-medium">{sale.invoice_number}</div>
                    <div className="text-muted-foreground">{new Date(sale.sale_date).toLocaleDateString()}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">${sale.total_amount.toFixed(2)}</div>
                    <Badge variant="outline">{sale.status.toUpperCase()}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
