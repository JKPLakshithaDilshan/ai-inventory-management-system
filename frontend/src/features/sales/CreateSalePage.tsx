import { PageHeader } from '@/components/shell/PageHeader';
import { Button } from '@/components/ui/button';
import { SaleForm } from './components/SaleForm';
import { InvoicePreview } from './components/InvoicePreview';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function CreateSalePage() {
    const navigate = useNavigate();

    return (
        <div className="flex flex-col gap-4 h-full print:bg-white print:p-0">
            {/* Header - Hidden on Print */}
            <div className="print:hidden">
                <PageHeader
                    title="New Sale"
                    description="Create a new sales invoice and deduct stock."
                    action={
                        <Button variant="outline" onClick={() => navigate('/sales')}>
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Sales
                        </Button>
                    }
                />
            </div>

            {/* Split View - Will collapse to tabs on mobile, stack on tablet, split on desktop */}
            {/* On Print, only the InvoicePreview will be visible (handled via CSS classes within) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

                {/* Left side: Form Panel */}
                <div className="print:hidden space-y-6">
                    <SaleForm />
                </div>

                {/* Right side: Live Preview / Print Target */}
                <div className="sticky top-6 print:static print:w-full print:block">
                    <InvoicePreview />
                </div>

            </div>
        </div>
    );
}
