import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
const root=path.dirname(fileURLToPath(import.meta.url));
for(const d of ['data','sql','powerbi']) fs.mkdirSync(path.join(root,d),{recursive:true});
let seed=42; const rand=()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296); const pick=a=>a[Math.floor(rand()*a.length)];
const products=[['P01','Studio Headphones','Electronics',149,83],['P02','Wireless Keyboard','Electronics',79,39],['P03','4K Monitor','Electronics',349,245],['P04','Ergonomic Chair','Furniture',299,178],['P05','Standing Desk','Furniture',549,345],['P06','Desk Lamp','Furniture',59,29],['P07','Notebook Set','Office Supplies',24,9],['P08','Pen Collection','Office Supplies',19,6],['P09','Travel Backpack','Accessories',89,42],['P10','Laptop Sleeve','Accessories',39,16],['P11','USB-C Hub','Electronics',69,31],['P12','Desk Organizer','Office Supplies',34,13]].map(([product_id,product_name,category,unit_price,unit_cost])=>({product_id,product_name,category,unit_price,unit_cost}));
const customers=Array.from({length:500},(_,i)=>({customer_id:`C${String(i+1).padStart(4,'0')}`,customer_name:`Customer ${String(i+1).padStart(3,'0')}`,region:['North','South','East','West'][i%4],segment:['Consumer','Corporate','Small Business'][i%3]}));
const dates=[];for(let d=new Date('2024-01-01T00:00:00Z');d<=new Date('2025-12-31T00:00:00Z');d.setUTCDate(d.getUTCDate()+1))dates.push({date:d.toISOString().slice(0,10),year:d.getUTCFullYear(),month_number:d.getUTCMonth()+1,month_name:d.toLocaleString('en-US',{month:'short',timeZone:'UTC'}),year_month:d.toISOString().slice(0,7),quarter:`Q${Math.floor(d.getUTCMonth()/3)+1}`});
const sales=[];let order=0;for(const d of dates){const count=Math.floor(7+rand()*10+(d.year===2025?3:0)+(d.month_number>=10?5:0));for(let n=0;n<count;n++){order++;const c=pick(customers),channel=pick(['Online','Online','Retail','Partner']),seen=new Set();for(let l=0,len=1+Math.floor(rand()*3);l<len;l++){let p;do{p=pick(products)}while(seen.has(p.product_id));seen.add(p.product_id);const quantity=1+Math.floor(rand()*5),discount_rate=pick([0,0,0.05,0.10,0.15]),net_sales=Math.round(quantity*p.unit_price*(1-discount_rate)*100)/100,cost=quantity*p.unit_cost;sales.push({line_id:sales.length+1,order_id:`SO${String(order).padStart(6,'0')}`,order_date:d.date,customer_id:c.customer_id,product_id:p.product_id,channel,quantity,unit_price:p.unit_price,discount_rate,net_sales,cost,profit:Math.round((net_sales-cost)*100)/100});}}}
const tables={dim_date:dates,dim_customer:customers,dim_product:products,fact_sales:sales};
const csv=rows=>[Object.keys(rows[0]).join(','),...rows.map(r=>Object.values(r).map(v=>`"${String(v).replaceAll('"','""')}"`).join(','))].join('\n');
for(const [name,rows] of Object.entries(tables))fs.writeFileSync(path.join(root,'data',name+'.csv'),csv(rows));
const schema=`PRAGMA foreign_keys = ON;
CREATE TABLE dim_date (date TEXT PRIMARY KEY, year INTEGER, month_number INTEGER, month_name TEXT, year_month TEXT, quarter TEXT);
CREATE TABLE dim_customer (customer_id TEXT PRIMARY KEY, customer_name TEXT, region TEXT, segment TEXT);
CREATE TABLE dim_product (product_id TEXT PRIMARY KEY, product_name TEXT, category TEXT, unit_price REAL, unit_cost REAL);
CREATE TABLE fact_sales (line_id INTEGER PRIMARY KEY, order_id TEXT NOT NULL, order_date TEXT REFERENCES dim_date(date), customer_id TEXT REFERENCES dim_customer(customer_id), product_id TEXT REFERENCES dim_product(product_id), channel TEXT, quantity INTEGER CHECK(quantity>0), unit_price REAL, discount_rate REAL CHECK(discount_rate BETWEEN 0 AND 1), net_sales REAL, cost REAL, profit REAL);
CREATE INDEX ix_sales_date ON fact_sales(order_date);
CREATE INDEX ix_sales_product ON fact_sales(product_id);
CREATE INDEX ix_sales_customer ON fact_sales(customer_id);
CREATE VIEW sales_detail AS SELECT f.*, d.year,d.month_number,d.month_name,d.year_month,d.quarter,c.customer_name,c.region,c.segment,p.product_name,p.category FROM fact_sales f JOIN dim_date d ON f.order_date=d.date JOIN dim_customer c USING(customer_id) JOIN dim_product p USING(product_id);
`;
fs.writeFileSync(path.join(root,'sql','01_schema.sql'),schema);
const dbPath=path.join(root,'data','sales.db');if(fs.existsSync(dbPath))fs.unlinkSync(dbPath);const db=new DatabaseSync(dbPath);db.exec(schema);db.exec('BEGIN');for(const [name,rows] of Object.entries(tables)){const stmt=db.prepare(`INSERT INTO ${name} VALUES (${Object.keys(rows[0]).map(()=>'?').join(',')})`);for(const r of rows)stmt.run(...Object.values(r));}db.exec('COMMIT');
const queries=`-- SQLite dialect. Revenue excludes tax/shipping; profit is gross profit, not net income.
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
`;
fs.writeFileSync(path.join(root,'sql','02_analysis.sql'),queries);
for(const q of queries.replace(/--[^\n]*/g,'').split(';').filter(q=>q.trim()))db.prepare(q).all();
const check=db.prepare('SELECT COUNT(*) AS lines,COUNT(DISTINCT order_id) AS orders,SUM(net_sales) AS revenue,SUM(profit) AS profit FROM fact_sales').get();
if(db.prepare('PRAGMA foreign_key_check').all().length)throw Error('Foreign keys failed');
if(db.prepare('SELECT order_id FROM fact_sales GROUP BY order_id HAVING COUNT(DISTINCT customer_id)>1 OR COUNT(DISTINCT order_date)>1 OR COUNT(DISTINCT channel)>1').all().length)throw Error('Inconsistent order');
if(db.prepare('SELECT COUNT(*) n FROM fact_sales WHERE ABS(net_sales-cost-profit)>0.001 OR ABS(net_sales-ROUND(quantity*unit_price*(1-discount_rate),2))>0.001').get().n)throw Error('Amount reconciliation failed');
fs.writeFileSync(path.join(root,'data','validation.json'),JSON.stringify({seed:42,period:'2024-01-01 to 2025-12-31',...check,checks:['All six SQL analysis queries executed','Foreign keys valid','Revenue and profit reconcile','Order IDs unique across customers and dates']},null,2));
db.close();
const detail=sales.map(s=>({...s,...customers.find(c=>c.customer_id===s.customer_id),...Object.fromEntries(Object.entries(products.find(p=>p.product_id===s.product_id)).filter(([k])=>!['unit_price','unit_cost'].includes(k)))}));
fs.writeFileSync(path.join(root,'data','preview-data.js'),'window.SALES='+JSON.stringify(detail)+';');
console.log(JSON.stringify(check));
