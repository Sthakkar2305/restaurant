'use client';

import { useEffect, useRef } from 'react';
import {
  subscribeToOrders,
  subscribeToOrder,
  unsubscribeFromChannel,
} from '@/lib/real-time-sync';

/**
 * Custom hook for real-time order updates using MongoDB polling
 * Provides automatic order syncing with configurable poll intervals
 */
export function useRealtimeOrders(
  onOrdersUpdate: (orders: any[]) => void,
  pollIntervalMs = 3000
) {
  const subscriptionRef = useRef<any>(null);

  const fetchAndUpdateOrders = async () => {
    try {
      const response = await fetch('/api/orders');
      if (!response.ok) throw new Error('Failed to fetch orders');
      const data = await response.json();
      if (subscriptionRef.current?.mounted) {
        onOrdersUpdate(data.orders || []);
      }
    } catch (error) {
      console.error('[v0] Order fetch error:', error);
    }
  };

  const setupFallbackPolling = () => {
    const intervalId = setInterval(fetchAndUpdateOrders, pollIntervalMs);
    subscriptionRef.current = { id: `fallback-${Date.now()}`, intervalId, mounted: true };
  };

  useEffect(() => {
    let mounted = true;
    subscriptionRef.current = { mounted };

    // Setup polling-based real-time listener
    try {
      subscriptionRef.current.id = subscribeToOrders(
        (newOrder) => {
          console.log('[v0] New order detected:', newOrder);
          if (mounted) {
            fetchAndUpdateOrders();
          }
        },
        (updatedOrder) => {
          console.log('[v0] Order updated:', updatedOrder);
          if (mounted) {
            fetchAndUpdateOrders();
          }
        },
        (deletedOrder) => {
          console.log('[v0] Order deleted:', deletedOrder);
          if (mounted) {
            fetchAndUpdateOrders();
          }
        },
        pollIntervalMs
      );
    } catch (error) {
      console.error('[v0] Subscription error:', error);
      // Fallback to manual polling
      setupFallbackPolling();
    }

    // Initial fetch
    fetchAndUpdateOrders();

    return () => {
      mounted = false;
      subscriptionRef.current.mounted = false;

      // Cleanup subscription
      if (subscriptionRef.current?.intervalId) {
        clearInterval(subscriptionRef.current.intervalId);
      }
      if (subscriptionRef.current?.id) {
        unsubscribeFromChannel(subscriptionRef.current.id);
      }
    };
  }, [onOrdersUpdate, pollIntervalMs]);
}

/**
 * Hook for real-time updates on a specific order
 */
export function useRealtimeOrder(
  orderId: string,
  onOrderUpdate: (order: any) => void,
  pollIntervalMs = 3000
) {
  const subscriptionRef = useRef<any>(null);

  useEffect(() => {
    let mounted = true;

    if (!orderId) return;

    try {
      subscriptionRef.current = subscribeToOrder(
        orderId,
        (updatedOrder) => {
          console.log('[v0] Order details updated:', updatedOrder);
          if (mounted) {
            onOrderUpdate(updatedOrder);
          }
        },
        pollIntervalMs
      );
    } catch (error) {
      console.error('[v0] Order subscription error:', error);
    }

    return () => {
      mounted = false;
      if (subscriptionRef.current?.id) {
        unsubscribeFromChannel(subscriptionRef.current.id);
      }
    };
  }, [orderId, onOrderUpdate, pollIntervalMs]);
}

/**
 * Hook for real-time table status updates
 */
export function useRealtimeTables(
  onTablesUpdate: (tables: any[]) => void,
  pollIntervalMs = 5000
) {
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchAndUpdateTables = async () => {
      try {
        const response = await fetch('/api/tables');
        if (!response.ok) throw new Error('Failed to fetch tables');
        const data = await response.json();
        if (mounted) {
          onTablesUpdate(data.tables || []);
        }
      } catch (error) {
        console.error('[v0] Table fetch error:', error);
      }
    };

    // Start polling
    pollIntervalRef.current = setInterval(
      fetchAndUpdateTables,
      pollIntervalMs
    );

    // Initial fetch
    fetchAndUpdateTables();

    return () => {
      mounted = false;

      // Cleanup polling
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [onTablesUpdate, pollIntervalMs]);
}
