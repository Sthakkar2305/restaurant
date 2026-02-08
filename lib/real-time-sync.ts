/**
 * Real-time sync for MongoDB using polling
 * MongoDB doesn't have native WebSocket subscriptions like Supabase,
 * so we use polling with an interval as the fallback mechanism
 */

type OrderChangeCallback = (data: any) => void;

interface SubscriptionManager {
  pollIntervalId: NodeJS.Timeout | null;
  lastSyncTime: Date;
  previousOrders: Map<string, any>;
}

const subscriptionManagers = new Map<string, SubscriptionManager>();

/**
 * Setup real-time listener for orders using polling
 * Checks for new/updated orders every 3 seconds
 */
export function subscribeToOrders(
  onInsert?: OrderChangeCallback,
  onUpdate?: OrderChangeCallback,
  onDelete?: OrderChangeCallback,
  pollIntervalMs: number = 3000
) {
  const subscriptionId = `orders-${Date.now()}`;
  const manager: SubscriptionManager = {
    pollIntervalId: null,
    lastSyncTime: new Date(),
    previousOrders: new Map(),
  };

  const pollOrders = async () => {
    try {
      const response = await fetch('/api/orders');
      if (!response.ok) {
        console.error('[v0] Failed to poll orders');
        return;
      }

      const { orders } = await response.json();

      // Check for new and updated orders
      const currentOrderIds = new Set<string>();

      orders.forEach((order: any) => {
        const orderId = order._id || order.orderId;
        currentOrderIds.add(orderId);

        const previousOrder = manager.previousOrders.get(orderId);

        if (!previousOrder) {
          // New order
          console.log('[v0] New order detected:', order);
          onInsert?.(order);
        } else if (JSON.stringify(previousOrder) !== JSON.stringify(order)) {
          // Updated order
          console.log('[v0] Order updated:', order);
          onUpdate?.(order);
        }

        manager.previousOrders.set(orderId, order);
      });

      // Check for deleted orders
      manager.previousOrders.forEach((order, orderId) => {
        if (!currentOrderIds.has(orderId)) {
          console.log('[v0] Order deleted:', orderId);
          onDelete?.(order);
          manager.previousOrders.delete(orderId);
        }
      });

      manager.lastSyncTime = new Date();
    } catch (error) {
      console.error('[v0] Polling error:', error);
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
 * Setup real-time listener for specific order
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
      const response = await fetch(`/api/orders`);
      if (!response.ok) return;

      const { orders } = await response.json();
      const order = orders.find(
        (o: any) => (o._id || o.orderId) === orderId
      );

      if (!order) return;

      const previousOrder = manager.previousOrders.get(orderId);

      if (!previousOrder || JSON.stringify(previousOrder) !== JSON.stringify(order)) {
        console.log('[v0] Order details updated:', order);
        onUpdate?.(order);
        manager.previousOrders.set(orderId, order);
      }

      manager.lastSyncTime = new Date();
    } catch (error) {
      console.error('[v0] Polling error:', error);
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
 * Unsubscribe from polling
 */
export function unsubscribeFromChannel(subscriptionId: string) {
  const manager = subscriptionManagers.get(subscriptionId);
  if (manager) {
    if (manager.pollIntervalId) {
      clearInterval(manager.pollIntervalId);
    }
    subscriptionManagers.delete(subscriptionId);
    console.log('[v0] Unsubscribed from:', subscriptionId);
  }
}

/**
 * Unsubscribe all active subscriptions
 */
export function unsubscribeAll() {
  subscriptionManagers.forEach((manager, subscriptionId) => {
    if (manager.pollIntervalId) {
      clearInterval(manager.pollIntervalId);
    }
  });
  subscriptionManagers.clear();
  console.log('[v0] Unsubscribed from all channels');
}
