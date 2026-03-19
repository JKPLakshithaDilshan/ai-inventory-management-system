import { PageHeader } from '@/components/shell/PageHeader';
import { Button } from '@/components/ui/button';
import { SaleForm } from './components/SaleForm';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function CreateSalePage() {
    const navigate = useNavigate();

    return (
        <div className="flex flex-col gap-6">
            <PageHeader
                title="New Sale"
                description="Create a draft sale with warehouse and product line items."
                action={
                    <Button variant="outline" onClick={() => navigate('/sales')}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Sales
                    </Button>
                }
            />

            <SaleForm />
        </div>
    );
}
