import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';
import { requireAdmin } from '@/lib/api-helpers';

function getDateBounds(range: string, fromDate?: string, toDate?: string) {
  const now = new Date();
  let start = new Date();
  let end = new Date();

  if (range === 'today') {
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  } else if (range === 'yesterday') {
    start.setDate(now.getDate() - 1);
    start.setHours(0, 0, 0, 0);
    end.setDate(now.getDate() - 1);
    end.setHours(23, 59, 59, 999);
  } else if (range === 'last7days') {
    start.setDate(now.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  } else if (range === 'month') {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  } else if (range === 'custom' && fromDate) {
    start = new Date(fromDate);
    start.setHours(0, 0, 0, 0);
    end = toDate ? new Date(toDate) : new Date();
    end.setHours(23, 59, 59, 999);
  } else {
    start.setDate(now.getDate() - 29);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  }

  return { start, end };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);
    if (auth.response) return auth.response;

    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || 'last7days';
    const fromDate = searchParams.get('fromDate') || undefined;
    const toDate = searchParams.get('toDate') || undefined;

    const { start, end } = getDateBounds(range, fromDate, toDate);

    const ordersCollection = await getCollection('orders');
    const menuCollection = await getCollection('menu_items');

    // Fetch orders within indexed date range
    const orders = await ordersCollection
      .find({
        createdAt: { $gte: start, $lte: end },
      })
      .sort({ createdAt: -1 })
      .toArray();

    const allMenuItems = await menuCollection.find({}).toArray();

    const paidOrders = orders.filter((o) => o.status === 'paid' || o.paymentStatus === 'paid');
    const cancelledOrders = orders.filter((o) => o.status === 'cancelled');

    // Compute key macro metrics
    const totalGrossSales = paidOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const totalNetSales = paidOrders.reduce((sum, o) => sum + (o.subtotal || 0), 0);
    const totalTax = paidOrders.reduce((sum, o) => sum + (o.tax || 0), 0);
    const totalServiceCharge = paidOrders.reduce((sum, o) => sum + (o.serviceCharge || 0), 0);
    const totalDiscounts = paidOrders.reduce((sum, o) => sum + (o.discount || 0), 0);
    const totalOrdersCount = orders.length;
    const paidOrdersCount = paidOrders.length;
    const averageOrderValue = paidOrdersCount > 0 ? Math.round(totalGrossSales / paidOrdersCount) : 0;

    // Item-level aggregation
    const itemSalesMap: Record<string, { name: string; quantity: number; revenue: number; category: string }> = {};
    const categorySalesMap: Record<string, { category: string; revenue: number; quantity: number }> = {};
    const waiterSalesMap: Record<string, { name: string; revenue: number; orders: number; aov: number }> = {};
    const tableSalesMap: Record<string, { tableNumber: number; revenue: number; orders: number }> = {};
    const paymentModeMap: Record<string, { mode: string; count: number; total: number }> = {
      cash: { mode: 'Cash', count: 0, total: 0 },
      upi: { mode: 'UPI / QR Code', count: 0, total: 0 },
      card: { mode: 'Card / POS', count: 0, total: 0 },
      split: { mode: 'Split Payment', count: 0, total: 0 },
    };

    const hourlySales: { hour: string; sales: number; orders: number }[] = Array.from({ length: 24 }, (_, i) => ({
      hour: `${i.toString().padStart(2, '0')}:00`,
      sales: 0,
      orders: 0,
    }));

    const daySalesMap: Record<string, { date: string; gross: number; net: number; tax: number; orders: number }> = {};

    paidOrders.forEach((o) => {
      const dateStr = new Date(o.createdAt).toISOString().split('T')[0];
      if (!daySalesMap[dateStr]) {
        daySalesMap[dateStr] = { date: dateStr, gross: 0, net: 0, tax: 0, orders: 0 };
      }
      daySalesMap[dateStr].gross += o.total || 0;
      daySalesMap[dateStr].net += o.subtotal || 0;
      daySalesMap[dateStr].tax += o.tax || 0;
      daySalesMap[dateStr].orders += 1;

      const hour = new Date(o.createdAt).getHours();
      if (hourlySales[hour]) {
        hourlySales[hour].sales += o.total || 0;
        hourlySales[hour].orders += 1;
      }

      const waiter = o.waiterName || 'Staff';
      if (!waiterSalesMap[waiter]) {
        waiterSalesMap[waiter] = { name: waiter, revenue: 0, orders: 0, aov: 0 };
      }
      waiterSalesMap[waiter].revenue += o.total || 0;
      waiterSalesMap[waiter].orders += 1;

      const tNum = o.tableNumber || 0;
      const tKey = `Table ${tNum}`;
      if (!tableSalesMap[tKey]) {
        tableSalesMap[tKey] = { tableNumber: tNum, revenue: 0, orders: 0 };
      }
      tableSalesMap[tKey].revenue += o.total || 0;
      tableSalesMap[tKey].orders += 1;

      const pMode = (o.paymentMethod || 'cash').toLowerCase();
      if (paymentModeMap[pMode]) {
        paymentModeMap[pMode].count += 1;
        paymentModeMap[pMode].total += o.total || 0;
      } else {
        paymentModeMap['cash'].count += 1;
        paymentModeMap['cash'].total += o.total || 0;
      }

      if (Array.isArray(o.items)) {
        o.items.forEach((item: any) => {
          const iName = item.itemName || 'Item';
          const iCat = item.category || 'general';
          const iQty = item.quantity || 1;
          const iRev = item.subtotal || (item.price || 0) * iQty;

          if (!itemSalesMap[iName]) {
            itemSalesMap[iName] = { name: iName, quantity: 0, revenue: 0, category: iCat };
          }
          itemSalesMap[iName].quantity += iQty;
          itemSalesMap[iName].revenue += iRev;

          if (!categorySalesMap[iCat]) {
            categorySalesMap[iCat] = { category: iCat, revenue: 0, quantity: 0 };
          }
          categorySalesMap[iCat].revenue += iRev;
          categorySalesMap[iCat].quantity += iQty;
        });
      }
    });

    Object.values(waiterSalesMap).forEach((w) => {
      w.aov = w.orders > 0 ? Math.round(w.revenue / w.orders) : 0;
    });

    const topSellingItems = Object.values(itemSalesMap)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 25);

    const highestRevenueItems = Object.values(itemSalesMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 25);

    const nonMovingItems = allMenuItems
      .filter((m) => !itemSalesMap[m.name])
      .map((m) => ({ name: m.name, category: m.category, price: m.price, quantity: 0, revenue: 0 }));

    const categoryBreakdown = Object.values(categorySalesMap).map((c) => ({
      category: c.category.toUpperCase().replace(/_/g, ' '),
      revenue: c.revenue,
      quantity: c.quantity,
      sharePercentage: totalNetSales > 0 ? Math.round((c.revenue / totalNetSales) * 100) : 0,
    }));

    const dayWiseSales = Object.values(daySalesMap).sort((a, b) => b.date.localeCompare(a.date));

    // 80 Report Catalog Definition
    const reportCatalog = [
      { id: 'daily_z_report', name: '1. Daily Day-Close Z-Report', category: 'Sales & Revenue' },
      { id: 'day_wise_sales', name: '2. Day-wise Net & Gross Sales', category: 'Sales & Revenue' },
      { id: 'hourly_peak_sales', name: '3. Hourly Sales & Peak Hour Trend', category: 'Sales & Revenue' },
      { id: 'payment_mode_recon', name: '4. Payment Mode Summary (Cash/UPI/Card)', category: 'Sales & Revenue' },
      { id: 'tax_gst_breakdown', name: '5. GST & Tax Collection (CGST / SGST)', category: 'Sales & Revenue' },
      { id: 'table_wise_revenue', name: '6. Table-wise Revenue & Utilization', category: 'Sales & Revenue' },
      { id: 'section_revenue', name: '7. Section & Area Revenue Distribution', category: 'Sales & Revenue' },
      { id: 'waiter_sales_summary', name: '8. Waiter-wise Total Sales & Volume', category: 'Sales & Revenue' },
      { id: 'aov_trend_report', name: '9. Average Order Value (AOV) Trend', category: 'Sales & Revenue' },
      { id: 'discount_audit', name: '10. Discount & Offer Loss Audit', category: 'Sales & Revenue' },
      { id: 'void_cancelled_bills', name: '11. Void & Cancelled Orders Report', category: 'Sales & Revenue' },
      { id: 'service_charge_report', name: '12. Service Charge Collection Summary', category: 'Sales & Revenue' },
      { id: 'dine_in_summary', name: '13. Dine-in Revenue & Cover Report', category: 'Sales & Revenue' },
      { id: 'shift_cash_register', name: '14. Shift-wise Cash Register Report', category: 'Sales & Revenue' },
      { id: 'round_off_audit', name: '15. Round-off & Adjustment Audit', category: 'Sales & Revenue' },
      { id: 'weekly_sales_trend', name: '16. Week-on-Week Sales Growth', category: 'Sales & Revenue' },
      { id: 'month_to_date_sales', name: '17. Month-to-Date (MTD) Performance', category: 'Sales & Revenue' },
      { id: 'split_payment_audit', name: '18. Split Bill & Multi-tender Report', category: 'Sales & Revenue' },
      { id: 'refund_analysis', name: '19. Refund & Return Analysis', category: 'Sales & Revenue' },
      { id: 'executive_kpi_report', name: '20. Executive Top-Level KPI Summary', category: 'Sales & Revenue' },
      { id: 'top_items_quantity', name: '21. Top 20 Selling Items (Quantity)', category: 'Menu & Product' },
      { id: 'top_items_revenue', name: '22. Top 20 Revenue Generating Dishes', category: 'Menu & Product' },
      { id: 'category_contribution', name: '23. Category Contribution % Matrix', category: 'Menu & Product' },
      { id: 'non_moving_items', name: '24. Slow Moving / Dead Stock Items', category: 'Menu & Product' },
      { id: 'veg_non_veg_split', name: '25. Food Preference Breakdown (Veg vs Non-Veg)', category: 'Menu & Product' },
      { id: 'beverage_performance', name: '26. Drinks & Beverage Sales Performance', category: 'Menu & Product' },
      { id: 'dessert_attachment', name: '27. Dessert Attachment & Upsell Ratio', category: 'Menu & Product' },
      { id: 'starters_contribution', name: '28. Starters & Appetizers Popularity', category: 'Menu & Product' },
      { id: 'main_course_analytics', name: '29. Main Course Revenue Breakdown', category: 'Menu & Product' },
      { id: 'high_margin_items', name: '30. High Value Item Sales Index', category: 'Menu & Product' },
      { id: 'item_price_elasticity', name: '31. Menu Item Pricing Distribution', category: 'Menu & Product' },
      { id: 'out_of_stock_impact', name: '32. Out-of-Stock Opportunity Audit', category: 'Menu & Product' },
      { id: 'daily_dishes_leaderboard', name: '33. Daily Dish Leaderboard & Rank', category: 'Menu & Product' },
      { id: 'average_items_per_bill', name: '34. Items per Bill (Basket Size) Index', category: 'Menu & Product' },
      { id: 'item_cancellation_rate', name: '35. Dish Cancellation & Return Rate', category: 'Menu & Product' },
      { id: 'combo_pairing_report', name: '36. Frequently Ordered Pairs & Combos', category: 'Menu & Product' },
      { id: 'lunch_dinner_split', name: '37. Lunch vs Dinner Dish Preferences', category: 'Menu & Product' },
      { id: 'special_dish_report', name: '38. Chef Special Item Performance', category: 'Menu & Product' },
      { id: 'low_volume_high_price', name: '39. Premium Low Volume Dish Report', category: 'Menu & Product' },
      { id: 'menu_engineering_matrix', name: '40. Menu Engineering Stars & Dogs Matrix', category: 'Menu & Product' },
      { id: 'waiter_leaderboard', name: '41. Waiter Performance & Sales Rank', category: 'Staff & Operations' },
      { id: 'waiter_order_count', name: '42. Waiter Order Processing Volume', category: 'Staff & Operations' },
      { id: 'waiter_aov_index', name: '43. Waiter Average Ticket Size (AOV)', category: 'Staff & Operations' },
      { id: 'waiter_discount_log', name: '44. Waiter-wise Discount Grant Log', category: 'Staff & Operations' },
      { id: 'chef_sla_report', name: '45. Chef Kitchen Preparation SLA', category: 'Staff & Operations' },
      { id: 'kitchen_load_hourly', name: '46. Kitchen Hourly Load & KOT Count', category: 'Staff & Operations' },
      { id: 'delayed_orders_audit', name: '47. Delayed Orders (>15 Min Prep) Log', category: 'Staff & Operations' },
      { id: 'kot_speed_index', name: '48. KOT Dispatch Speed Index', category: 'Staff & Operations' },
      { id: 'staff_attendance_log', name: '49. Staff System Login & Activity Log', category: 'Staff & Operations' },
      { id: 'shift_performance', name: '50. Morning vs Evening Shift Sales', category: 'Staff & Operations' },
      { id: 'waiter_table_turn_time', name: '51. Waiter Table Turnaround Efficiency', category: 'Staff & Operations' },
      { id: 'captain_incentive_calc', name: '52. Captain Incentive & Commission Estimate', category: 'Staff & Operations' },
      { id: 'cash_handling_staff', name: '53. Cash Collections by Waiter', category: 'Staff & Operations' },
      { id: 'modified_kot_audit', name: '54. Running KOT Item Modification Audit', category: 'Staff & Operations' },
      { id: 'kitchen_waste_estimate', name: '55. Cancelled KOT Food Wastage Estimate', category: 'Staff & Operations' },
      { id: 'staff_efficiency_score', name: '56. Overall Staff Efficiency Scorecard', category: 'Staff & Operations' },
      { id: 'table_lock_duration', name: '57. Table Lock vs Order Time Ratio', category: 'Staff & Operations' },
      { id: 'unassigned_orders_log', name: '58. Unassigned / System Order Log', category: 'Staff & Operations' },
      { id: 'cross_waiter_handover', name: '59. Shift Handover Order Transfer Log', category: 'Staff & Operations' },
      { id: 'operational_bottleneck', name: '60. Operational Speed & SLA Bottlenecks', category: 'Staff & Operations' },
      { id: 'gstr1_summary', name: '61. GSTR-1 Monthly Taxable Summary', category: 'Taxes & Audit' },
      { id: 'cgst_sgst_ledger', name: '62. CGST (2.5%) & SGST (2.5%) Ledger', category: 'Taxes & Audit' },
      { id: 'bill_reprint_audit', name: '63. Bill Reprint & Duplicate Invoice Log', category: 'Taxes & Audit' },
      { id: 'discount_approval_log', name: '64. Authorized Discount Approval Log', category: 'Taxes & Audit' },
      { id: 'unsettled_bills_risk', name: '65. Unsettled / Open Table Credit Risk', category: 'Taxes & Audit' },
      { id: 'tax_exempt_sales', name: '66. Zero-rated / Tax Exempt Sales', category: 'Taxes & Audit' },
      { id: 'digital_payment_fee', name: '67. Digital Payment Gateway Reconcile', category: 'Taxes & Audit' },
      { id: 'invoice_sequence_audit', name: '68. Invoice Number Sequence Continuity', category: 'Taxes & Audit' },
      { id: 'manager_override_log', name: '69. Manager Security Override Log', category: 'Taxes & Audit' },
      { id: 'complimentary_food_tax', name: '70. Complimentary Food Value & Tax Loss', category: 'Taxes & Audit' },
      { id: 'table_occupancy_rate', name: '71. Table Occupancy Rate & Turn Count', category: 'Tables & Day-Close' },
      { id: 'seating_capacity_apc', name: '72. Average Spend Per Cover (APC)', category: 'Tables & Day-Close' },
      { id: 'peak_hour_utilization', name: '73. Peak Hour Seating Capacity Load', category: 'Tables & Day-Close' },
      { id: 'table_idle_duration', name: '74. Table Idle / Vacant Time Analysis', category: 'Tables & Day-Close' },
      { id: 'fast_turn_tables', name: '75. Fast-Turn Table Leaderboard', category: 'Tables & Day-Close' },
      { id: 'section_efficiency', name: '76. Floor & Section Table Efficiency', category: 'Tables & Day-Close' },
      { id: 'average_dining_time', name: '77. Average Dining Time by Party Size', category: 'Tables & Day-Close' },
      { id: 'large_group_dining', name: '78. Large Group Table Sales Performance', category: 'Tables & Day-Close' },
      { id: 'end_of_day_financial', name: '79. End of Day Financial Reconciliation', category: 'Tables & Day-Close' },
      { id: 'annual_business_review', name: '80. Annual / Period Business Review', category: 'Tables & Day-Close' },
    ];

    return NextResponse.json({
      success: true,
      range,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      summary: {
        totalGrossSales,
        totalNetSales,
        totalTax,
        totalServiceCharge,
        totalDiscounts,
        totalOrdersCount,
        paidOrdersCount,
        cancelledOrdersCount: cancelledOrders.length,
        averageOrderValue,
      },
      topSellingItems,
      highestRevenueItems,
      nonMovingItems,
      categoryBreakdown,
      dayWiseSales,
      hourlySales,
      waiterSales: Object.values(waiterSalesMap).sort((a, b) => b.revenue - a.revenue),
      tableSales: Object.values(tableSalesMap).sort((a, b) => b.revenue - a.revenue),
      paymentModes: Object.values(paymentModeMap),
      ordersList: paidOrders.slice(0, 100),
      catalog: reportCatalog,
    });
  } catch (error: any) {
    console.error('Reports calculation error:', error);
    return NextResponse.json({ error: 'Failed to generate reports' }, { status: 500 });
  }
}
