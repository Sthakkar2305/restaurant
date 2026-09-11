/**
 * Real-time sync for MongoDB using smart active-order polling
 */

type OrderChangeCallback = (data: any) => void;

interface SubscriptionManager {
  pollIntervalId: NodeJS.Timeout | null;
  lastSyncTime: Date;
  previousOrders: Map<string, any>;
}

const subscriptionManagers = new Map<string, SubscriptionManager>();

/**
 * Setup real-time listener for active kitchen/waiter orders
 * Polls ONLY active orders (pending, preparing, served) every 3 seconds
 */
export function subscribeToOrders(
  onInsert?: OrderChangeCallback,
  onUpdate?: OrderChangeCallback,
  onDelete?: OrderChangeCallback,
  pollIntervalMs: number = 3000
) {
  const subscriptionId = `orders-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const manager: SubscriptionManager = {
    pollIntervalId: null,
    lastSyncTime: new Date(),
    previousOrders: new Map(),
  };

  const pollOrders = async () => {
    try {
      // 🚀 Performance fix: Poll ONLY active orders (status: pending, preparing, served)
      const response = await fetch('/api/orders?active=true&limit=100');
      if (!response.ok) {
        return;
      }

      const data = await response.json();
      const orders = data.orders || [];

      // Check for new and updated orders
      const currentOrderIds = new Set<string>();

      orders.forEach((order: any) => {
        const orderId = order._id || order.orderId;
        currentOrderIds.add(orderId);

        const previousOrder = manager.previousOrders.get(orderId);

        if (!previousOrder) {
          onInsert?.(order);
        } else if (JSON.stringify(previousOrder) !== JSON.stringify(order)) {
          onUpdate?.(order);
        }

        manager.previousOrders.set(orderId, order);
      });

      // Check for completed/cancelled/deleted orders
      manager.previousOrders.forEach((order, orderId) => {
        if (!currentOrderIds.has(orderId)) {
          onDelete?.(order);
          manager.previousOrders.delete(orderId);
        }
      });

      manager.lastSyncTime = new Date();
    } catch (error) {
      console.warn('Real-time sync polling notice:', error);
    }
  };

  // Start polling
  manager.pollIntervalId = setInterval(pollOrders, pollIntervalMs);

  // Initial fetch
  pollOrders();

  subscriptionManagers.set(subscriptionId, manager);

  return {
    id: subscriptionId,
    unsubscribe: () => unsubscribeFromChannel(subscriptionId),
  };
}

/**
 * Setup real-time listener for a single specific order
 */
export function subscribeToOrder(
  orderId: string,
  onUpdate?: OrderChangeCallback,
  pollIntervalMs: number = 3000
) {
  const subscriptionId = `order-${orderId}-${Date.now()}`;
  const manager: SubscriptionManager = {
    pollIntervalId: null,
    lastSyncTime: new Date(),
    previousOrders: new Map(),
  };

  const pollOrder = async () => {
    try {
      // 🚀 Direct single-order fetch instead of scanning all orders
      const response = await fetch(`/api/orders/${orderId}`);
      if (!response.ok) return;

      const data = await response.json();
      const order = data.order;
      if (!order) return;

      const previousOrder = manager.previousOrders.get(orderId);

      if (!previousOrder || JSON.stringify(previousOrder) !== JSON.stringify(order)) {
        onUpdate?.(order);
        manager.previousOrders.set(orderId, order);
      }

      manager.lastSyncTime = new Date();
    } catch (error) {
      console.warn('Single-order polling notice:', error);
    }
  };

  // Start polling
  manager.pollIntervalId = setInterval(pollOrder, pollIntervalMs);

  // Initial fetch
  pollOrder();

  subscriptionManagers.set(subscriptionId, manager);

  return {
    id: subscriptionId,
    unsubscribe: () => unsubscribeFromChannel(subscriptionId),
  };
}

/**
 * Unsubscribe from polling channel
 */
export function unsubscribeFromChannel(subscriptionId: string) {
  const manager = subscriptionManagers.get(subscriptionId);
  if (manager) {
    if (manager.pollIntervalId) {
      clearInterval(manager.pollIntervalId);
    }
    subscriptionManagers.delete(subscriptionId);
  }
}

/**
 * Unsubscribe all active subscriptions
 */
export function unsubscribeAll() {
  subscriptionManagers.forEach((manager) => {
    if (manager.pollIntervalId) {
      clearInterval(manager.pollIntervalId);
    }
  });
  subscriptionManagers.clear();
}
