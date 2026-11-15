# PricePilot AI – Hackathon Demonstration Script

## Real-Time Dynamic Pricing and Promotion Intelligence

### 1. Introduction

Good morning everyone.

Today, I'm presenting **PricePilot AI**, a dynamic pricing and promotion decision intelligence platform developed for the YottaFlex AI Hackathon.

The idea behind this project is simple. In retail and e-commerce, prices change constantly. Businesses need to consider competitor prices, product costs, inventory levels, customer demand, and ongoing promotions before deciding what price to offer.

Managing all these factors manually can be difficult and time-consuming. A pricing decision that looks profitable initially could also reduce the actual profit margin or violate business rules.

That's the problem PricePilot AI is designed to address.

It helps businesses make pricing decisions using real database records, business rules, and explainable recommendations.

### 2. Technology and Architecture

The application follows a three-tier architecture.

- **Frontend:** React, TypeScript, Vite, Tailwind CSS and Recharts.
- **Backend:** Python, FastAPI, SQLAlchemy and Pydantic.
- **Database:** PostgreSQL 18, with Alembic for database migrations.

I've also implemented JWT authentication and role-based access for three types of users: Analyst, Manager and Admin.

The pricing engine is deterministic and rule-based. Rather than presenting recommendations as unexplained AI predictions, it shows the business factors and constraints behind each decision.

### 3. Live Application Demonstration

**Step 1 – Login**

I'll start by logging into the application using the demo Analyst account.

The application provides different access permissions depending on the user's role.

Once logged in, we are redirected to the dashboard.

**Step 2 – Dashboard**

The dashboard gives us an overview of the business.

We can see important metrics such as revenue, gross profit, average margin, inventory value, active promotions and open exceptions.

These metrics are calculated from the PostgreSQL database rather than being displayed as hard-coded values.

This gives users a quick understanding of the current business situation.

**Step 3 – Product Management**

Next, let's look at the Products page.

Here, we can explore the product catalogue, search for individual SKUs and filter products based on available information.

The starter dataset contains 100 products, generated using the fixed seed value `20261022`.

This makes the demonstration data reproducible.

**Step 4 – Cost Management**

The Costs page contains product cost information and cost history.

Cost is one of the most important inputs in pricing because the system uses it to calculate the minimum acceptable selling price.

If the cost of a product changes, the pricing calculations should reflect that change.

**Step 5 – Pricing Simulator**

This is one of the main features of PricePilot AI.

In the Pricing Simulator, we can select a product and evaluate a pricing scenario.

The engine considers the product cost, current price, demand, inventory, competitor information and applicable promotion rules.

It then calculates a recommended price while checking the minimum margin and maximum pricing constraints.

For example, if a proposed price falls below the permitted price floor, the system identifies the violation and prevents the decision from being approved.

The important part is that the result is explainable. We can understand why the system recommended a particular price and which business rules influenced the result.

**Step 6 – Decision Center**

After running a simulation, users can review pricing decisions in the Decision Center.

A manager can review a recommendation and approve or block it, depending on the business rules and permissions.

When a decision is approved, the corresponding price history is updated.

A blocked decision does not update the price history. Instead, it remains available for review.

This separation helps prevent unapproved pricing changes from reaching the business records.

**Step 7 – Exception Management**

The Exceptions page helps identify situations where pricing rules or business conditions are violated.

The platform handles five important cases:

1. Price below the permitted floor.
2. Promotion stacking violations.
3. Stale competitor observations.
4. Incorrect margin calculations.
5. Missing reasons for price changes.

For example, if competitor information is outdated, the system flags it as a warning and excludes that observation from the pricing calculation. It does not automatically block the entire pricing decision.

Users can review the exception, understand its cause and track its resolution.

**Step 8 – Competitor Intelligence**

The Competitors page provides visibility into competitor pricing information.

Users can compare observed competitor prices with their own product prices.

The system also checks whether competitor observations are fresh enough to be used in pricing decisions.

This helps avoid making pricing recommendations based on outdated information.

**Step 9 – Promotion Management**

Promotions are another important part of pricing.

On this page, users can review existing promotions and manage promotion details.

The platform checks promotion eligibility, discount limits and stacking rules.

For example, when multiple promotions apply to the same product, the system checks whether combining those discounts would exceed the permitted limit.

This helps protect product margins.

**Step 10 – Analytics and Audit**

The Analytics page provides a broader view of business performance through KPIs and charts.

Users can explore revenue trends, margin performance, product performance and inventory-related information.

The Audit page provides traceability for important system activities.

It helps administrators understand which actions were performed, who performed them and what changes were made.

This is particularly important in enterprise applications, where pricing decisions need to be reviewable and accountable.

**Step 11 – Settings**

Finally, the Settings page provides access to system-level configuration.

Administrators can review pricing policies and other configuration values.

The application also enforces role-based permissions, so users can only perform actions allowed for their assigned roles.

### 4. Technical Highlights

There are a few important technical decisions behind this project.

First, the synthetic dataset uses a fixed seed of `20261022`, allowing the data generation process to be reproduced.

Second, the pricing engine checks price floors, ceilings, margins and applicable business constraints before a decision can be approved.

Third, stale competitor observations are treated as warnings, and their signals are excluded from the pricing calculation.

Fourth, only approved pricing decisions update price history.

Finally, the platform uses PostgreSQL as its source of truth, Alembic for schema migrations, JWT for authentication and Pytest for backend business-rule testing.

The project also includes Docker configuration, Swagger API documentation and a Postman collection.

### 5. Closing

To conclude, PricePilot AI brings product costs, competitor information, inventory, promotions and pricing decisions together in one platform.

The main goal was not just to calculate a new selling price. It was to build a system where every pricing recommendation can be understood, validated and tracked.

The platform demonstrates how explainable pricing logic and well-structured backend systems can support better business decisions.

Thank you for your time. I'm happy to demonstrate any feature or answer your questions.

### Project Links

- **Frontend:** http://localhost:5173
- **Backend API Documentation:** http://localhost:8000/docs
- **GitHub:** https://github.com/GudepuRakshitha/PricePilot-AI-Dynamic-Pricing-Promotion-Decision-Intelligence-Platform-YottaFlex-AI-Hackathon

