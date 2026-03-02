## Architecture

### Overview
Three-layer architecture: Controller → Service → Data Access.

### Components
- **Controller Layer**: Handles HTTP request routing and response formatting
- **Service Layer**: Business logic, validation, and orchestration
- **Data Layer**: In-memory storage with interface abstraction

### Modified Files
| File | Purpose |
|------|---------|
| `src/controller.ts` | Request handlers |
| `src/services/order-service.ts` | Order business logic |
| `src/services/user-service.ts` | User management |
| `src/utils/format.ts` | Formatting utilities |

### Integration Points
- IP-01: Controller depends on OrderService and UserService
- IP-02: OrderService depends on format utilities

### Technical Concerns
- TC-01: Input validation at controller boundary
- TC-02: Concurrent order creation safety
