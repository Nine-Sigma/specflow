## Requirements Specification

### FR-01: User Registration
The system shall allow users to register with name and email.
Users receive a unique identifier upon successful registration.

### FR-02: Order Creation
The system shall allow authenticated users to create orders.
Each order must have a positive amount value.

### FR-03: Order Retrieval
The system shall allow users to retrieve order details by ID.
The response includes a formatted summary with currency and date.

### TC-01: Input Validation
All user inputs shall be validated before processing.
Invalid email addresses are rejected with a descriptive error.

### AC-01: Registration Endpoint
Given a valid name and email, when POST /users is called,
then a 201 response with the user ID is returned.

### AC-02: Order Endpoint
Given a valid user ID and amount, when POST /orders is called,
then a 201 response with the order ID is returned.

### SC-01: Email Uniqueness
The system shall enforce unique email addresses across users.
