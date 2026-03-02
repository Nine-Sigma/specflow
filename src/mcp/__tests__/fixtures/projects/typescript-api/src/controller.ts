import { OrderService } from './services/order-service.js';
import { UserService } from './services/user-service.js';

const orderService = new OrderService();
const userService = new UserService();

/**
 * Handle a create-order request.
 */
export function handleCreateOrder(userId: string, amount: number): { order: string } | { error: string } {
  const user = userService.findById(userId);
  if (!user) {
    return { error: 'User not found' };
  }
  const order = orderService.createOrder(amount);
  return { order: order.id };
}

/**
 * Handle a get-order request.
 */
export function handleGetOrder(orderId: string): { summary: string } | { error: string } {
  const summary = orderService.getOrderSummary(orderId);
  if (!summary) {
    return { error: 'Order not found' };
  }
  return { summary };
}

/**
 * Handle user registration.
 */
export function handleRegister(name: string, email: string): { userId: string } {
  const user = userService.createUser(name, email);
  return { userId: user.id };
}
