import { cookies } from 'next/headers';

/**
 * Get authenticated user from session cookie
 */
export async function getAuthenticatedUser() {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;

    if (!sessionToken) {
      return null;
    }

    const decoded = JSON.parse(Buffer.from(sessionToken, 'base64').toString());
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Verify user role
 */
export async function hasRole(role: string | string[]) {
  const user = await getAuthenticatedUser();
  if (!user) return false;

  const roles = Array.isArray(role) ? role : [role];
  return roles.includes(user.role);
}

/**
 * Calculate order totals
 */
export function calculateTotals(subtotal: number) {
  const tax = subtotal * 0.05; // 5% tax
  const serviceCharge = subtotal * 0.1; // 10% service charge
  const total = subtotal + tax + serviceCharge;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    tax: Math.round(tax * 100) / 100,
    serviceCharge: Math.round(serviceCharge * 100) / 100,
    total: Math.round(total * 100) / 100,
  };
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number, currency: string = 'INR'): string {
  if (currency === 'INR') {
    return `₹${amount.toFixed(2)}`;
  }
  return `$${amount.toFixed(2)}`;
}

/**
 * Format date and time
 */
export function formatDateTime(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleString('en-IN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * Validate order items
 */
export interface OrderItemInput {
  menuItemId: string;
  quantity: number;
  price: number;
  specialInstructions?: string;
}

export function validateOrderItems(items: OrderItemInput[]): boolean {
  if (!Array.isArray(items) || items.length === 0) {
    return false;
  }

  return items.every((item) => {
    return (
      item.menuItemId &&
      typeof item.quantity === 'number' &&
      item.quantity > 0 &&
      typeof item.price === 'number' &&
      item.price >= 0
    );
  });
}

/**
 * Generate invoice number
 */
export function generateInvoiceNumber(): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0');
  return `INV-${timestamp}-${random}`;
}
