# Sales Analytics Dashboard — SQL + Power BI

A reproducible sales analytics portfolio project with a SQLite warehouse, executable SQL analysis, Power BI model setup assets, and an interactive browser preview. All data is synthetic. No real company performance is represented.

## Open the dashboard

Open `dashboard.html` in a browser. No installation or server is needed. Select year, region, category and channel; all KPIs, charts, product rankings and CSV export follow these filters. The default view is full-year 2025. Prior-year comparisons use identical filters in 2024; no 2023 data exists, so 2024 YoY is unavailable.

## Rebuild

Requires Node.js 22.13+ with the built-in `node:sqlite` module (validated using Node 26.4):

```powershell
cd sales-analytics
node build.mjs
```

Recreates generated CSVs, `data/sales.db`, preview data and a validation summary. Seed 42 makes the sample reproducible. This replaces the generated database, so use a separate file for your own data. The project has no npm dependencies.

## SQL warehouse

`sql/01_schema.sql` defines a star schema. `sql/02_analysis.sql` contains six executable SQLite queries: executive KPIs, monthly YoY, regional/category results, ranked products, segments and channel share. Open `data/sales.db` in a SQLite client and run the analysis file. SQL Server users must adapt date functions/types and import the four CSVs; these scripts target SQLite.

Grain: one product line per order. An order can have multiple lines; always use DISTINCTCOUNT for orders. `dim_date` has every day of 2024–2025; `dim_customer` contains 500 pseudonymous customers; `dim_product` contains 12 products. Each order has one customer, date and channel. No returns, cancellations, tax, shipping or overhead are modeled. Currency: USD. Revenue = quantity × unit price × (1 − discount), rounded per line. Gross profit = revenue − quantity × unit cost. Gross margin = total gross profit / total revenue.

## Build the native Power BI report

Power BI Desktop is required for this step. A `.pbix` is **not included**; the browser preview is a working companion, not a Power BI report file.

1. Open a blank report. In Power Query, create a Text parameter `DataFolder` pointing to this project's absolute `data` directory, with no trailing slash.
2. Follow `powerbi/import.pq`: create the `LoadSalesCSV` function, then four named table queries. Paste each block separately; the file is a collection of queries, not a single query. Close & Apply.
3. In Model view, create these active relationships, with single-direction filtering from dimensions to fact: `dim_date[date]` 1 → * `fact_sales[order_date]`; `dim_customer[customer_id]` 1 → * `fact_sales[customer_id]`; `dim_product[product_id]` 1 → * `fact_sales[product_id]`. Remove conflicting auto-created relationships.
4. Mark `dim_date` as the date table using `[date]`. Sort `[month_name]` by `[month_number]`. Disable Auto date/time for this file. Use only dimension date fields in slicers and axes.
5. Create each measure in `powerbi/measures.dax` separately. Format currency measures as USD, margins/share/YoY as percentages and counts as whole numbers. Hide fact foreign keys and numeric input columns from report view to discourage accidental aggregation.
6. Import `powerbi/theme.json` from View → Themes → Browse for themes.
7. Set a 1440 × 900 custom report page, background `#F3F5F9`. Use `dashboard.html` as the visual reference and the layout below. Set the year slicer to single-select 2025, with region/category/channel set to All. Save as `Sales Analytics.pbix`.

| Visual | Fields / configuration | x, y, width, height |
|---|---|---|
| Title | Sales overview; subtitle Synthetic sales data · USD | 30, 20, 1380, 70 |
| Slicers | dim_date[year], dim_customer[region], dim_product[category], fact_sales[channel] | 30, 100, 1380, 65 |
| Five cards | Revenue, Gross Profit, Gross Margin, Orders, Average Order Value | 30, 185, 1380, 115 |
| Monthly line chart | dim_date[month_name]; Revenue and Revenue LY | 30, 320, 865, 240 |
| Region bar chart | dim_customer[region]; Revenue; descending | 915, 320, 495, 240 |
| Top products table | product_name, category, Revenue, Gross Profit, Gross Margin; Top N=7 by Revenue | 30, 580, 865, 260 |
| Category bar chart | dim_product[category]; Revenue; Category Share as tooltip | 915, 580, 495, 260 |

For the five cards, divide the indicated area into five cards with 15px gaps. Add Revenue YoY % as a separate small card or tooltip alongside Revenue. Format tables with light dividers and teal accents. Configure visual interactions so slicers filter every visual. Save a Reset bookmark with the default slicers and bind a reset button to it. Test one-year and region/category combinations, zero-result filters, export totals and prior-year totals before sharing.

## Validation

`node build.mjs` executes all six SQL analyses, checks foreign keys, order consistency and per-line revenue/profit arithmetic, and writes `data/validation.json`. The preview and Power BI imports use the same generated fact and dimension data. SQL checks ran locally; Power Query, DAX, report interactions and rendering in Power BI Desktop have not been executed here.

Power BI date modeling follows [Microsoft date-table guidance](https://learn.microsoft.com/en-us/power-bi/guidance/model-date-tables) and [SAMEPERIODLASTYEAR documentation](https://learn.microsoft.com/en-us/dax/sameperiodlastyear-function-dax).

## Refined dashboard (v2)

The browser dashboard opens in dark mode and remembers your light/dark choice locally. Use the sun/moon button in the top bar. New controls include quarter selection, a revenue/gross-profit chart switch, clickable region filters, product search, ranking by revenue/profit/margin/units, and an expandable product list. Product search and ranking affect only the product table; CSV export includes all sales lines matching the reporting filters.

The detail panels show channel revenue, distinct orders, gross margin, active customers, repeat buyers and customer segments. Repeat buyers placed at least two matching orders in the selected period; this is not customer retention. Card sparklines show monthly values within the selected year/quarter. Gross margin changes use percentage points; other changes use relative percentages. Observations are calculated from the current filters and do not imply causation.

For a matching native Power BI dark appearance, import `powerbi/theme-dark.json`. Use page background `#0D1117`, visual background `#151B23`, text `#E9EDF3`, secondary text `#8F9AA9`, and teal `#74D6B1`. Theme JSON is supplied as an authoring asset and has not been imported into Desktop here. Add `dim_date[quarter]` as a slicer. Add channel and customer detail on a second report page, and use the extra measures appended to `measures.dax`.

The refined frontend is split into `dashboard.html`, `dashboard.css` and `dashboard.js`. Keep these together with the `data` folder. Run `node verify-dashboard.cjs` for data-driven logic checks. Browser screenshot verification was unavailable because the browser tool blocks local file URLs.
