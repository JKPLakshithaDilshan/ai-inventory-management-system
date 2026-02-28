// Centralized mock data for the application

export interface Product {
    id: string;
    name: string;
    sku: string;
    stock: number;
    reorderPoint: number;
    category: string;
    supplierId: string;
    price: number;
    costPrice: number;
}

export interface Supplier {
    id: string;
    name: string;
    contact: string;
    email: string;
    phone: string;
}

export const mockSuppliers: Supplier[] = [
    { id: 'sup_1', name: 'Tech Supplies Inc.', contact: 'John Smith', email: 'john@techsupplies.com', phone: '+1-555-0101' },
    { id: 'sup_2', name: 'Office Furniture Co.', contact: 'Sarah Johnson', email: 'sarah@officefurniture.com', phone: '+1-555-0102' },
    { id: 'sup_3', name: 'Electronics Wholesale', contact: 'Mike Chen', email: 'mike@electronics-wh.com', phone: '+1-555-0103' },
    { id: 'sup_4', name: 'Stationery World', contact: 'Emma Davis', email: 'emma@stationery.com', phone: '+1-555-0104' },
];

export const mockProducts: Product[] = [
    { id: 'prod_1', sku: 'CH-001', name: 'Ergonomic Chair', stock: 45, reorderPoint: 20, category: 'Furniture', supplierId: 'sup_2', price: 199.99, costPrice: 120.00 },
    { id: 'prod_2', sku: 'LT-012', name: 'MacBook Pro M3', stock: 5, reorderPoint: 10, category: 'Electronics', supplierId: 'sup_3', price: 1999.00, costPrice: 1600.00 },
    { id: 'prod_3', sku: 'MS-099', name: 'Wireless Mouse', stock: 0, reorderPoint: 15, category: 'Electronics', supplierId: 'sup_3', price: 49.99, costPrice: 25.00 },
    { id: 'prod_4', sku: 'KB-204', name: 'Mechanical Keyboard', stock: 3, reorderPoint: 12, category: 'Electronics', supplierId: 'sup_3', price: 129.99, costPrice: 75.00 },
    { id: 'prod_5', sku: 'DK-088', name: 'Standing Desk', stock: 8, reorderPoint: 5, category: 'Furniture', supplierId: 'sup_2', price: 499.99, costPrice: 300.00 },
    { id: 'prod_6', sku: 'MT-156', name: 'Monitor 27"', stock: 2, reorderPoint: 8, category: 'Electronics', supplierId: 'sup_3', price: 349.99, costPrice: 220.00 },
    { id: 'prod_7', sku: 'NB-441', name: 'Notebook Pack (10)', stock: 100, reorderPoint: 50, category: 'Stationery', supplierId: 'sup_4', price: 15.99, costPrice: 8.00 },
    { id: 'prod_8', sku: 'PN-332', name: 'Pen Set', stock: 18, reorderPoint: 30, category: 'Stationery', supplierId: 'sup_4', price: 12.99, costPrice: 6.00 },
    { id: 'prod_9', sku: 'HD-789', name: 'Headset USB', stock: 1, reorderPoint: 10, category: 'Electronics', supplierId: 'sup_1', price: 79.99, costPrice: 45.00 },
    { id: 'prod_10', sku: 'WC-512', name: 'Webcam HD', stock: 0, reorderPoint: 8, category: 'Electronics', supplierId: 'sup_1', price: 89.99, costPrice: 50.00 },
];

// Helper to get supplier by ID
export function getSupplierById(id: string): Supplier | undefined {
    return mockSuppliers.find(s => s.id === id);
}

// Helper to get products below reorder point
export function getLowStockProducts(): Product[] {
    return mockProducts.filter(p => p.stock <= p.reorderPoint);
}

// AI Reorder Suggestion Interface
export interface AIReorderSuggestion {
    id: string;
    productId: string;
    sku: string;
    name: string;
    currentStock: number;
    reorderPoint: number;
    suggestedQty: number;
    supplierId: string;
    supplierName: string;
    confidence: number; // 0-100
    reason: string;
    estimatedCost: number;
}

// Mock AI Reorder Logic
export function generateAIReorderSuggestions(): AIReorderSuggestion[] {
    const lowStockProducts = getLowStockProducts();
    
    return lowStockProducts.map(product => {
        const supplier = getSupplierById(product.supplierId);
        
        // Mock AI logic for suggested quantity
        const deficit = product.reorderPoint - product.stock;
        const buffer = Math.ceil(product.reorderPoint * 0.5); // 50% buffer
        const suggestedQty = deficit + buffer;
        
        // Mock confidence score (higher for more critical items)
        const stockoutRisk = product.stock === 0 ? 100 : (1 - product.stock / product.reorderPoint) * 100;
        const confidence = Math.min(95, Math.max(70, Math.round(stockoutRisk)));
        
        // Generate reason
        let reason = '';
        if (product.stock === 0) {
            reason = 'Critical: Out of stock';
        } else if (product.stock < product.reorderPoint * 0.3) {
            reason = 'Urgent: Very low stock';
        } else {
            reason = 'Warning: Below reorder point';
        }
        
        return {
            id: `ai_${product.id}`,
            productId: product.id,
            sku: product.sku,
            name: product.name,
            currentStock: product.stock,
            reorderPoint: product.reorderPoint,
            suggestedQty,
            supplierId: product.supplierId,
            supplierName: supplier?.name || 'Unknown Supplier',
            confidence,
            reason,
            estimatedCost: suggestedQty * product.costPrice,
        };
    }).sort((a, b) => b.confidence - a.confidence); // Sort by confidence (most urgent first)
}
