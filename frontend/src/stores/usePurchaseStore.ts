import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface PurchaseItem {
    id: string; // Internal ID to track table rows
    productId: string;
    sku: string;
    name: string;
    qty: number;
    unitCost: number;
    lineTotal: number;
}

export interface PurchaseDraft {
    supplierId: string;
    referenceNo: string;
    purchaseDate: string;
    notes: string;
    items: PurchaseItem[];
}

interface PurchaseStore {
    step: number;
    draft: PurchaseDraft;
    setStep: (step: number) => void;
    updateDraftMeta: (meta: Partial<Omit<PurchaseDraft, 'items'>>) => void;
    addItem: (item: PurchaseItem) => void;
    updateItem: (id: string, updates: Partial<PurchaseItem>) => void;
    removeItem: (id: string) => void;
    clearDraft: () => void;
}

const defaultDraft: PurchaseDraft = {
    supplierId: '',
    referenceNo: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    notes: '',
    items: [],
};

export const usePurchaseStore = create<PurchaseStore>()(
    persist(
        (set) => ({
            step: 1,
            draft: defaultDraft,
            setStep: (step) => set({ step }),
            updateDraftMeta: (meta) =>
                set((state) => ({
                    draft: { ...state.draft, ...meta },
                })),
            addItem: (item) =>
                set((state) => ({
                    draft: {
                        ...state.draft,
                        items: [...state.draft.items, item],
                    },
                })),
            updateItem: (id, updates) =>
                set((state) => ({
                    draft: {
                        ...state.draft,
                        items: state.draft.items.map((item) => {
                            if (item.id === id) {
                                const updated = { ...item, ...updates };
                                updated.lineTotal = updated.qty * updated.unitCost;
                                return updated;
                            }
                            return item;
                        }),
                    },
                })),
            removeItem: (id) =>
                set((state) => ({
                    draft: {
                        ...state.draft,
                        items: state.draft.items.filter((item) => item.id !== id),
                    },
                })),
            clearDraft: () => set({ step: 1, draft: defaultDraft }),
        }),
        {
            name: 'purchaseDraft',
        }
    )
);
