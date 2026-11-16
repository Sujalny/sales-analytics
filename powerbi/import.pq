// 1. Create a Text parameter called DataFolder pointing to the absolute data directory.
// 2. Create a blank query called LoadSalesCSV, open Advanced Editor and paste this function.
(FileName as text, Types as list) as table =>
let
    Source = Csv.Document(File.Contents(DataFolder & "\" & FileName & ".csv"), [Delimiter=",", Encoding=65001, QuoteStyle=QuoteStyle.Csv]),
    Headers = Table.PromoteHeaders(Source, [PromoteAllScalars=true]),
    Typed = Table.TransformColumnTypes(Headers, Types, "en-US")
in Typed

// 3. Create four separate blank queries with the exact names below.
// dim_date
let Source = LoadSalesCSV("dim_date", {{"date", type date}, {"year", Int64.Type}, {"month_number", Int64.Type}, {"month_name", type text}, {"year_month", type text}, {"quarter", type text}}) in Source

// dim_customer
let Source = LoadSalesCSV("dim_customer", {{"customer_id", type text}, {"customer_name", type text}, {"region", type text}, {"segment", type text}}) in Source

// dim_product
let Source = LoadSalesCSV("dim_product", {{"product_id", type text}, {"product_name", type text}, {"category", type text}, {"unit_price", Currency.Type}, {"unit_cost", Currency.Type}}) in Source

// fact_sales
let Source = LoadSalesCSV("fact_sales", {{"line_id", Int64.Type}, {"order_id", type text}, {"order_date", type date}, {"customer_id", type text}, {"product_id", type text}, {"channel", type text}, {"quantity", Int64.Type}, {"unit_price", Currency.Type}, {"discount_rate", type number}, {"net_sales", Currency.Type}, {"cost", Currency.Type}, {"profit", Currency.Type}}) in Source
