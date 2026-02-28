import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SaleItem {
    id: string; // Internal id for table rows
    productId: string;
    sku: string;
    name: string;
    availableQty: number; // Mocked stock limit
    qty: number;
    unitPrice: number;
    lineTotal: number;
}

export interface SaleDraft {
    customerName: string;
    saleDate: string;
    referenceNo: string;
    notes: string;
    items: SaleItem[];
    discount: number;
    taxRate: number;
}

interface SaleStore {
    draft: SaleDraft;
    updateDraftMeta: (meta: Partial<Omit<SaleDraft, 'items'>>) => void;
    addItem: (item: SaleItem) => void;
    updateItem: (id: string, updates: Partial<SaleItem>) => void;
    removeItem: (id: string) => void;
    clearDraft: () => void;
}

const defaultDraft: SaleDraft = {
    customerName: '',
    saleDate: new Date().toISOString().split('T')[0],
    referenceNo: '',
    notes: '',
    items: [],
    discount: 0,
    taxRate: 0,
};

export const useSaleStore = create<SaleStore>()(
    persist(
        (set) => ({
            draft: defaultDraft,
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
                                updated.lineTotal = updated.qty * updated.unitPrice;
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
            clearDraft: () => set({ draft: defaultDraft }),
        }),
        {
            name: 'saleDraft',
        }
    )
);
