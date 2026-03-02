import { formatDate, formatCurrency } from '../utils/format.js';

export interface Order {
  id: string;
  amount: number;
  createdAt: Date;
}

/**
 * Service for managing orders.
 */
export class OrderService {
  private orders: Order[] = [];

  createOrder(amount: number): Order {
    const order: Order = {
      id: `order-${Date.now()}`,
      amount,
      createdAt: new Date(),
    };
    this.orders.push(order);
    return order;
  }

  getOrderSummary(id: string): string | null {
    const order = this.orders.find(o => o.id === id);
    if (!order) return null;
    return `Order ${id}: ${formatCurrency(order.amount)} on ${formatDate(order.createdAt)}`;
  }

  listOrders(): Order[] {
    return [...this.orders];
  }
}
