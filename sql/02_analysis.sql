-- SQLite dialect. Revenue excludes tax/shipping; profit is gross profit, not net income.
-- 1. Executive KPIs; distinct orders avoid double-counting order lines.
SELECT SUM(net_sales) AS revenue, SUM(profit) AS gross_profit,
 SUM(profit)/NULLIF(SUM(net_sales),0) AS gross_margin,
 COUNT(DISTINCT order_id) AS orders, SUM(quantity) AS units,
 SUM(net_sales)/NULLIF(COUNT(DISTINCT order_id),0) AS average_order_value
FROM sales_detail WHERE year=2025;
-- 2. Monthly performance, including months with no sales.
WITH monthly AS (
 SELECT d.year_month, COALESCE(SUM(f.net_sales),0) AS revenue
 FROM dim_date d LEFT JOIN fact_sales f ON d.date=f.order_date GROUP BY d.year_month
), compared AS (
 SELECT *, LAG(revenue,12) OVER(ORDER BY year_month) AS previous_year FROM monthly
)
SELECT *, (revenue-previous_year)/NULLIF(previous_year,0) AS yoy_growth FROM compared;
-- 3. Region and category performance.
SELECT region,category,SUM(net_sales) AS revenue,SUM(profit) AS profit,
 SUM(profit)/NULLIF(SUM(net_sales),0) AS margin
FROM sales_detail WHERE year=2025 GROUP BY region,category ORDER BY revenue DESC;
-- 4. Top products by revenue, with rank.
SELECT product_name,category,SUM(net_sales) AS revenue,SUM(profit) AS profit,
 DENSE_RANK() OVER(ORDER BY SUM(net_sales) DESC) AS revenue_rank
FROM sales_detail WHERE year=2025 GROUP BY product_id,product_name,category ORDER BY revenue DESC;
-- 5. Customer segments.
SELECT segment,COUNT(DISTINCT customer_id) AS customers,COUNT(DISTINCT order_id) AS orders,
 SUM(net_sales) AS revenue FROM sales_detail WHERE year=2025 GROUP BY segment;
-- 6. Channel contribution.
SELECT channel,SUM(net_sales) AS revenue,
 SUM(net_sales)/SUM(SUM(net_sales)) OVER() AS revenue_share
FROM sales_detail WHERE year=2025 GROUP BY channel;
