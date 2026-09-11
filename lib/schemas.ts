import { ObjectId } from 'mongodb';

// User Schema
export interface User {
  _id?: ObjectId;
  email: string;
  pinHash: string;
  name: string;
  role: 'waiter' | 'admin' | 'chef' | 'superadmin';
  createdAt: Date;
  updatedAt: Date;
}

// Menu Item Schema
export interface MenuItem {
  _id?: ObjectId;
  name: string;
  description?: string;
  price: number;
  category: string;
  image?: string;
  foodType?: 'veg' | 'non-veg' | 'egg' | 'beverage';
  available: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Table Schema
export interface Table {
  _id?: ObjectId;
  name: string;
  table_number: number;
  seating_capacity: number;
  section?: string;
  status: 'available' | 'occupied' | 'reserved';
  currentWaiterId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  menuItemId: string;
  itemName: string;
  price: number;
  quantity: number;
  subtotal: number;
  notes?: string;
  category?: string;
}

export interface Order {
  _id?: ObjectId;
  orderId: string;
  tableNumber: number;
  waiterId: string;
  waiterName: string;
  customerName?: string;
  customerEmail?: string;
  items: OrderItem[];
  status: 'pending' | 'preparing' | 'served' | 'paid' | 'cancelled';
  subtotal: number;
  tax: number;
  discount?: number;
  discountReason?: string;
  serviceCharge: number;
  total: number;
  paymentStatus: 'unpaid' | 'paid';
  paymentMethod?: 'cash' | 'upi' | 'card' | 'split';
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
  paymentMethod?: string;
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
  discount?: number;
  total: number;
  paymentMethod: string;
  createdAt: Date;
}