export interface User {
  id: string;
  name: string;
  email: string;
}

/**
 * Service for managing users.
 */
export class UserService {
  private users: Map<string, User> = new Map();

  createUser(name: string, email: string): User {
    const user: User = { id: `user-${Date.now()}`, name, email };
    this.users.set(user.id, user);
    return user;
  }

  findById(id: string): User | undefined {
    return this.users.get(id);
  }

  findByEmail(email: string): User | undefined {
    for (const user of this.users.values()) {
      if (user.email === email) return user;
    }
    return undefined;
  }
}
