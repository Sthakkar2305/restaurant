import { ObjectId } from 'mongodb';

// User Schema
export interface User {
  _id?: ObjectId;
  email: string;
  pinHash: string; // Changed from passwordHash
  name: string;
  role: 'waiter' | 'admin';
  createdAt: Date;
  updatedAt: Date;
}

// Menu Item Schema
export interface MenuItem {
  _id?: ObjectId;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  available: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Table Schema - UPDATED
export interface Table {
  _id?: ObjectId;
  name: string;
  table_number: number;
  seating_capacity: number;
  status: 'available' | 'occupied' | 'reserved';
  currentWaiterId?: string; // Locks the table to a specific waiter
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  menuItemId: string;
  itemName: string;
  price: number;
  quantity: number;
  subtotal: number;
}

// UPDATE: Added customer details
export interface Order {
  _id?: ObjectId;
  orderId: string;
  tableNumber: number;
  waiterId: string;
  waiterName: string;
  customerName?: string;  // NEW
  customerEmail?: string; // NEW
  items: OrderItem[];
  status: 'pending' | 'preparing' | 'served' | 'paid' | 'cancelled';
  subtotal: number;
  tax: number;
  serviceCharge: number;
  total: number;
  paymentStatus: 'unpaid' | 'paid';
  createdAt: Date;
  updatedAt: Date;
}
// Session Schema
export interface SessionDoc {
  _id?: ObjectId;
  sessionId: string;
  userId: string;
  userEmail: string;
  userRole: string;
  userName: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface PaymentSession {
    _id?: ObjectId;
    sessionId: string;
    orderId: string;
    amount: number;
    currency: string;
    status: 'pending' | 'completed' | 'cancelled';
    stripeSessionId?: string;
    qrCodeData?: string;
    createdAt: Date;
    expiresAt: Date;
}

export interface Invoice {
    _id?: ObjectId;
    invoiceNumber: string;
    orderId: string;
    tableNumber: number;
    items: OrderItem[];
    subtotal: number;
    tax: number;
    serviceCharge: number;
    total: number;
    paymentMethod: string;
    restaurantName: string;
    restaurantLogo: string;
    createdAt: Date;
    updatedAt: Date;
}