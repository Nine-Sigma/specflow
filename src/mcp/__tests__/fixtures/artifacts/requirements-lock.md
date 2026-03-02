## Requirements Lock

### Functional Requirements
- FR-01: User Registration — system allows user registration with name and email
- FR-02: Order Creation — authenticated users can create orders with positive amount
- FR-03: Order Retrieval — users can retrieve order details by ID

### Technical Concerns
- TC-01: Input Validation — all inputs validated before processing

### Success Criteria
- SC-01: Email Uniqueness — unique email enforcement

### Acceptance Criteria
- AC-01: Registration Endpoint — POST /users returns 201 with user ID
- AC-02: Order Endpoint — POST /orders returns 201 with order ID
