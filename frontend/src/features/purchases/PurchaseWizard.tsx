import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { usePurchaseStore } from '@/stores/usePurchaseStore';
import { Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { StepSupplier } from './components/StepSupplier';

import { StepItems } from './components/StepItems';
import { StepReview } from './components/StepReview';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';

const STEPS = [
    { id: 1, name: 'Supplier Details' },
    { id: 2, name: 'Add Items' },
    { id: 3, name: 'Review & Confirm' },
];

export function PurchaseWizard() {
    const navigate = useNavigate();
    const { step } = usePurchaseStore();
    const [cancelOpen, setCancelOpen] = useState(false);

    const handleCancel = () => {
        usePurchaseStore.getState().clearDraft();
        navigate('/purchases');
    };

    return (
        <div className="mx-auto max-w-5xl flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Create Purchase</h2>
                    <p className="text-muted-foreground">
                        Draft a new stock-in purchase order.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" onClick={() => setCancelOpen(true)}>
                        Cancel
                    </Button>
                </div>
            </div>

            <Card>
                <div className="border-b px-6 py-4">
                    <nav aria-label="Progress">
                        <ol role="list" className="flex items-center">
                            {STEPS.map((s, stepIdx) => (
                                <li key={s.name} className={`relative ${stepIdx !== STEPS.length - 1 ? 'pr-8 sm:pr-20' : ''}`}>
                                    <div className="flex items-center">
                                        <div
                                            className={`
                                                flex h-8 w-8 items-center justify-center rounded-full border-2 
                                                ${step > s.id
                                                    ? 'border-primary bg-primary'
                                                    : step === s.id
                                                        ? 'border-primary'
                                                        : 'border-muted bg-transparent'
                                                }
                                            `}
                                        >
                                            {step > s.id ? (
                                                <Check className="h-4 w-4 text-primary-foreground" />
                                            ) : (
                                                <span
                                                    className={`
                                                    text-sm font-medium
                                                    ${step === s.id ? 'text-primary' : 'text-muted-foreground'}
                                                `}
                                                >
                                                    {s.id}
                                                </span>
                                            )}
                                        </div>
                                        <span
                                            className={`ml-4 text-sm font-medium ${step >= s.id ? 'text-foreground' : 'text-muted-foreground'
                                                }`}
                                        >
                                            {s.name}
                                        </span>
                                    </div>
                                    {stepIdx !== STEPS.length - 1 ? (
                                        <div className="absolute top-4 w-full left-0 -ml-10 sm:-ml-20">
                                            <div
                                                className={`h-0.5 w-full ${step > s.id ? 'bg-primary' : 'bg-muted'
                                                    }`}
                                            ></div>
                                        </div>
                                    ) : null}
                                </li>
                            ))}
                        </ol>
                    </nav>
                </div>

                <CardContent className="p-6">
                    {/* Render specific step based on Zustand store step index here */}
                    {step === 1 && <StepSupplier />}
                    {step === 2 && <StepItems />}
                    {step === 3 && <StepReview />}
                </CardContent>
            </Card>

            <ConfirmDialog
                open={cancelOpen}
                onOpenChange={setCancelOpen}
                title="Cancel purchase creation"
                description="Are you sure you want to cancel? Unsaved progress will be lost."
                confirmLabel="Yes, cancel"
                onConfirm={handleCancel}
            />
        </div>
    );
}
