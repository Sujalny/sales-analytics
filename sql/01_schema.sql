PRAGMA foreign_keys = ON;
CREATE TABLE dim_date (date TEXT PRIMARY KEY, year INTEGER, month_number INTEGER, month_name TEXT, year_month TEXT, quarter TEXT);
CREATE TABLE dim_customer (customer_id TEXT PRIMARY KEY, customer_name TEXT, region TEXT, segment TEXT);
CREATE TABLE dim_product (product_id TEXT PRIMARY KEY, product_name TEXT, category TEXT, unit_price REAL, unit_cost REAL);
CREATE TABLE fact_sales (line_id INTEGER PRIMARY KEY, order_id TEXT NOT NULL, order_date TEXT REFERENCES dim_date(date), customer_id TEXT REFERENCES dim_customer(customer_id), product_id TEXT REFERENCES dim_product(product_id), channel TEXT, quantity INTEGER CHECK(quantity>0), unit_price REAL, discount_rate REAL CHECK(discount_rate BETWEEN 0 AND 1), net_sales REAL, cost REAL, profit REAL);
CREATE INDEX ix_sales_date ON fact_sales(order_date);
CREATE INDEX ix_sales_product ON fact_sales(product_id);
CREATE INDEX ix_sales_customer ON fact_sales(customer_id);
CREATE VIEW sales_detail AS SELECT f.*, d.year,d.month_number,d.month_name,d.year_month,d.quarter,c.customer_name,c.region,c.segment,p.product_name,p.category FROM fact_sales f JOIN dim_date d ON f.order_date=d.date JOIN dim_customer c USING(customer_id) JOIN dim_product p USING(product_id);
