# globalViewHandlerPagination — API Documentation

One endpoint that reads any SQL view with **pagination + sorting + projection +
filtering (all SQL operators) + multiple date ranges + multiple number ranges +
multi-column search + gie/globalViewHandlerPagination?viewname=<ID>&...
```

- All param names are **case-insensitive** (`datecolumn1` == `DateColumn1`).
- Every condition is combined with **AND**.
- Every column name is whitelisted (`A-Z a-z 0-9 _ space`); every value is a bound
  SQL parameter → **no SQL injection**.
- Bad column name / unknown operator → `400` listing the offenders.

---

## 1. Which view

| Param | Example | Meaning |
|---|---|---|
| `viewname` | `viewname=1539` | the SQL view to read (required) |

## 2. Pagination

| Param | Default | Meaning |
|---|---|---|
| `page` | `1` | page number |
| `pagesize` | `50` | rows per page |

Response always returns `totalRecords`, `totalPages`, `dataCount` for building pagers.

## 3. Sorting

| Param | Example | Meaning |
|---|---|---|
| `orderby` | `orderby=FINALAMOUNT` | legacy single sort column (still works) |
| `sortby` | `sortby=DESC` | `ASC` or `DESC` (default `DESC`) |
| `orderby1..6` + `sortby1..6` | `orderby1=CLIENT&sortby1=ASC&orderby2=FINALAMOUNT&sortby2=DESC` | **multi-column sort** |

Multi-column sort builds `ORDER BY [CLIENT] ASC, [FINALAMOUNT] DESC` — columns applied
left-to-right. In grouped mode each sort column may be a group column **or** an aggregate
alias (`orderby1=TOTAL`).

## 4. Projection — bring only the columns you want (up to 20)

| Param | Example |
|---|---|
| `bringOnlyColumn1` .. `bringOnlyColumn20` | `bringOnlyColumn1=DATE&bringOnlyColumn2=CLIENT` |

Omit them → `SELECT *` (all columns).

## 5. Exact-match filter (any column)

| Pattern | Example | SQL |
|---|---|---|
| `[COLUMN]=value` | `LOCATION=HYD` | `[LOCATION] = 'HYD'` |

## 6. Date ranges — up to 4

| Param | Example |
|---|---|
| `datecolumn1` + `fromdate1` + `todate1` | `datecolumn1=DATE&fromdate1=2026-06-05&todate1=2026-06-10` |
| … up to `datecolumn4` + `fromdate4` + `todate4` | |
| legacy `datecolumn` + `fromdate` + `todate` | still works |

SQL: `CAST([col] AS DATE) BETWEEN @from AND @to`. All ranges AND-ed. Dates: `YYYY-MM-DD`.

## 7. Number / amount ranges — up to 4

| Param | Example | SQL |
|---|---|---|
| `amountcolumn1` + `fromamount1` + `toamount1` | `amountcolumn1=FINALAMOUNT&fromamount1=1000&toamount1=5000` | `[col] >= 1000 AND [col] <= 5000` |
| … up to `amountcolumn4` | | |

Bound as **numbers** (not text). One-sided OK: only `fromamount` = `>=`, only `toamount` = `<=`.

## 8. Text search — up to 10 columns (LIKE %text%)

| Param | Example | SQL |
|---|---|---|
| `searchcolumn1` + `searchtext1` | `searchcolumn1=CLIENT&searchtext1=TRADING` | `LOWER([CLIENT]) LIKE LOWER('%TRADING%')` |
| … up to `searchcolumn10` + `searchtext10` | | |
| legacy `searchcolumn` + `searchtext` | still works | |

Case-insensitive, all AND-ed.

## 9. Generic operator filters — ALL SQL operators (up to 10 columns)

Use `filtercolumnN` + `filteropN` + `filtervalueN`:

| `filterop` | SQL | Meaning |
|---|---|---|
| `eq` | `[col] = @v` | equal |
| `ne` / `neq` | `[col] <> @v` | **not equal to** |
| `gt` | `[col] > @v` | greater than |
| `gte` | `[col] >= @v` | greater or equal |
| `lt` | `[col] < @v` | less than |
| `lte` | `[col] <= @v` | less or equal |
| `like` | `[col] LIKE %v%` | contains |
| `notlike` | `[col] NOT LIKE %v%` | does not contain |
| `startswith` | `[col] LIKE v%` | begins with |
| `endswith` | `[col] LIKE %v` | ends with |
| `in` | `[col] IN (a,b,c)` | any of (comma-separated value) |
| `notin` | `[col] NOT IN (a,b,c)` | none of |
| `isnull` | `[col] IS NULL` | empty (no `filtervalue` needed) |
| `isnotnull` | `[col] IS NOT NULL` | has value (no `filtervalue` needed) |

Numbers auto-bind numerically so `gt`/`lt`/`gte`/`lte` compare as numbers, not text.

```
&filtercolumn1=STATUS&filterop1=ne&filtervalue1=CANCELLED
&filtercolumn2=QTY&filterop2=gt&filtervalue2=5
&filtercolumn3=ROUTE&filterop3=in&filtervalue3=DURBAN,JHB,CPT
&filtercolumn4=REMARKS&filterop4=isnotnull
```

All the filters above (exact, date, amount, search, operator) are **AND-ed** together.
For **OR** logic, use OR groups ↓.

## 9b. OR logic — OR groups (up to 4 groups, 6 members each)

Members inside one group are **OR-ed**; each group is **AND-ed** with everything else.

| Param | Meaning |
|---|---|
| `orgroup{G}col{M}` | column of group `G`, member `M` |
| `orgroup{G}op{M}` | operator (same set as `filterop`) |
| `orgroup{G}val{M}` | value (omit for `isnull`/`isnotnull`) |

Example — "STATUS is OPEN **or** PENDING":

```
&orgroup1col1=STATUS&orgroup1op1=eq&orgroup1val1=OPEN
&orgroup1col2=STATUS&orgroup1op2=eq&orgroup1val2=PENDING
```
→ `AND ([STATUS] = 'OPEN' OR [STATUS] = 'PENDING')`

Two groups AND-ed together:

```
&orgroup1col1=ROUTE&orgroup1op1=eq&orgroup1val1=DURBAN
&orgroup1col2=ROUTE&orgroup1op2=eq&orgroup1val2=JHB
&orgroup2col1=CLIENT&orgroup2op1=like&orgroup2val1=TRADING
&orgroup2col2=CLIENT&orgroup2op2=like&orgroup2val2=LIMITED
```
→ `AND ([ROUTE] = 'DURBAN' OR [ROUTE] = 'JHB') AND ([CLIENT] LIKE '%TRADING%' OR [CLIENT] LIKE '%LIMITED%')`

## 10. Distinct values — for filter dropdowns (up to 8 columns)

| Param | Example |
|---|---|
| `distinctColumn1` .. `distinctColumn8` | `distinctColumn1=CLIENT&distinctColumn2=ROUTE` |

- Returns the **unique values** of each column so you can populate filter dropdowns
  **without pulling every row**.
- Honours the **same** date / amount / search / operator filters — so the dropdown
  only lists values that exist in the currently-filtered set.
- **Returned inside the SAME response** (key `distinctValues`) — it is NOT a separate
  API call and NOT a separate response. One request gives you both the page of `data`
  AND the `distinctValues`.

## 11. GROUP BY + aggregates (up to 8 group cols, 10 aggregates)

Group rows and roll up totals — like a pivot / summary.

| Param | Example |
|---|---|
| `groupByColumn1` .. `groupByColumn8` | `groupByColumn1=CLIENT&groupByColumn2=ROUTE` |
| `aggfunc1` + `aggcolumn1` [+ `aggalias1`] | `aggfunc1=SUM&aggcolumn1=FINALAMOUNT&aggalias1=TOTAL` |
| … up to `aggfunc10` / `aggcolumn10` / `aggalias10` | |

- `aggfunc` = `SUM` \| `COUNT` \| `AVG` \| `MIN` \| `MAX`
- `aggcolumn=*` is allowed for `COUNT` → `COUNT(*)`
- `aggalias` = the output column name (optional; defaults to `FUNC_COL`)

Builds:

```sql
SELECT [CLIENT],[ROUTE], SUM([FINALAMOUNT]) AS [TOTAL], COUNT(*) AS [TRIPS]
FROM [1539]
WHERE ...            -- all the filters above still apply (before grouping)
GROUP BY [CLIENT],[ROUTE]
```

- When you group, `SELECT` is built from the group cols + aggregates — `bringOnlyColumn`
  is ignored.
- `totalRecords` becomes the **number of groups** (not raw rows).
- `orderby` may target a group column **or** an aggregate alias (`orderby=TOTAL`).

## 12. HAVING — filter on the aggregates (up to 10)

Keep only groups whose aggregate passes a test.

| Param | Example |
|---|---|
| `havingfunc1` + `havingcolumn1` + `havingop1` + `havingvalue1` | `havingfunc1=SUM&havingcolumn1=FINALAMOUNT&havingop1=gt&havingvalue1=10000` |
| … up to `havingfunc10` / `havingcolumn10` / `havingop10` / `havingvalue10` | |

- `havingfunc` = `SUM`\|`COUNT`\|`AVG`\|`MIN`\|`MAX` (omit for a plain grouped column)
- `havingop`   = `eq`\|`ne`\|`gt`\|`gte`\|`lt`\|`lte`

Builds: `HAVING SUM([FINALAMOUNT]) > 10000` (all HAVING terms AND-ed).

---

## Response shape

```json
{
  "page": 1,
  "pagesize": 30,
  "totalRecords": 240,
  "totalPages": 8,
  "dataCount": 30,
  "data": [ { "DATE": "...", "CLIENT": "...", ... } ],

  // present ONLY when you asked for distinctColumnN — same response, one call
  "distinctValues": {
    "CLIENT": ["ABC TRADING", "XYZ LIMITED", ...],
    "ROUTE":  ["CPT", "DURBAN", "JHB", ...]
  }
}
```

---

## Full example — everything at once

```
https://devapi.tech23.net/global/globalViewHandlerPagination
?viewname=1539
&page=1
&pagesize=30
&orderby=FINALAMOUNT
&sortby=DESC
&bringOnlyColumn1=DATE
&bringOnlyColumn2=CLIENT
&bringOnlyColumn3=ROUTE
&bringOnlyColumn4=FINALAMOUNT
&bringOnlyColumn5=CURRENCY
&distinctColumn1=CLIENT
&distinctColumn2=ROUTE
&datecolumn1=DATE&fromdate1=2026-06-05&todate1=2026-06-10
&datecolumn2=CREATEDDATE&fromdate2=2026-06-01&todate2=2026-06-30
&amountcolumn1=FINALAMOUNT&fromamount1=1000&toamount1=5000
&searchcolumn1=CLIENT&searchtext1=TRADING%20LIMITED
&searchcolumn2=ROUTE&searchtext2=DURBAN
&searchcolumn3=EXPENSETYPE&searchtext3=TOLLS
&filtercolumn1=STATUS&filterop1=ne&filtervalue1=CANCELLED
&filtercolumn2=QTY&filterop2=gt&filtervalue2=5
&filtercolumn3=ROUTE&filterop3=in&filtervalue3=DURBAN,JHB,CPT
&filtercolumn4=REMARKS&filterop4=isnotnull
```

Single line:

```
https://devapi.tech23.net/global/globalViewHandlerPagination?viewname=1539&page=1&pagesize=30&orderby=FINALAMOUNT&sortby=DESC&bringOnlyColumn1=DATE&bringOnlyColumn2=CLIENT&bringOnlyColumn3=ROUTE&bringOnlyColumn4=FINALAMOUNT&bringOnlyColumn5=CURRENCY&distinctColumn1=CLIENT&distinctColumn2=ROUTE&datecolumn1=DATE&fromdate1=2026-06-05&todate1=2026-06-10&datecolumn2=CREATEDDATE&fromdate2=2026-06-01&todate2=2026-06-30&amountcolumn1=FINALAMOUNT&fromamount1=1000&toamount1=5000&searchcolumn1=CLIENT&searchtext1=TRADING%20LIMITED&searchcolumn2=ROUTE&searchtext2=DURBAN&searchcolumn3=EXPENSETYPE&searchtext3=TOLLS&filtercolumn1=STATUS&filterop1=ne&filtervalue1=CANCELLED&filtercolumn2=QTY&filterop2=gt&filtervalue2=5&filtercolumn3=ROUTE&filterop3=in&filtervalue3=DURBAN,JHB,CPT&filtercolumn4=REMARKS&filterop4=isnotnull
```

---

## GROUP BY / HAVING example — summary report

"Total & trip-count per CLIENT+ROUTE in June, only groups over 10 000, biggest first":

```
https://devapi.tech23.net/global/globalViewHandlerPagination
?viewname=1539
&page=1
&pagesize=30
&orderby=TOTAL
&sortby=DESC
&groupByColumn1=CLIENT
&groupByColumn2=ROUTE
&aggfunc1=SUM&aggcolumn1=FINALAMOUNT&aggalias1=TOTAL
&aggfunc2=COUNT&aggcolumn2=*&aggalias2=TRIPS
&aggfunc3=AVG&aggcolumn3=FINALAMOUNT&aggalias3=AVGAMT
&havingfunc1=SUM&havingcolumn1=FINALAMOUNT&havingop1=gt&havingvalue1=10000
&datecolumn1=DATE&fromdate1=2026-06-01&todate1=2026-06-30
```

Single line:

```
https://devapi.tech23.net/global/globalViewHandlerPagination?viewname=1539&page=1&pagesize=30&orderby=TOTAL&sortby=DESC&groupByColumn1=CLIENT&groupByColumn2=ROUTE&aggfunc1=SUM&aggcolumn1=FINALAMOUNT&aggalias1=TOTAL&aggfunc2=COUNT&aggcolumn2=*&aggalias2=TRIPS&aggfunc3=AVG&aggcolumn3=FINALAMOUNT&aggalias3=AVGAMT&havingfunc1=SUM&havingcolumn1=FINALAMOUNT&havingop1=gt&havingvalue1=10000&datecolumn1=DATE&fromdate1=2026-06-01&todate1=2026-06-30
```

Returns:

```json
{
  "page": 1, "pagesize": 30, "totalRecords": 2, "totalPages": 1, "dataCount": 2,
  "data": [
    { "CLIENT": "XYZ LIMITED", "ROUTE": "JHB",    "TOTAL": 30500, "TRIPS": 9, "AVGAMT": 3388 },
    { "CLIENT": "ABC TRADING", "ROUTE": "DURBAN", "TOTAL": 12000, "TRIPS": 4, "AVGAMT": 3000 }
  ]
}
```

---

## OR-logic + multi-column-sort example

"(STATUS OPEN or PENDING) AND (ROUTE DURBAN or JHB), sorted by CLIENT then amount":

```
https://devapi.tech23.net/global/globalViewHandlerPagination
?viewname=1539
&page=1
&pagesize=30
&orderby1=CLIENT&sortby1=ASC
&orderby2=FINALAMOUNT&sortby2=DESC
&orgroup1col1=STATUS&orgroup1op1=eq&orgroup1val1=OPEN
&orgroup1col2=STATUS&orgroup1op2=eq&orgroup1val2=PENDING
&orgroup2col1=ROUTE&orgroup2op1=eq&orgroup2val1=DURBAN
&orgroup2col2=ROUTE&orgroup2op2=eq&orgroup2val2=JHB
```

Single line:

```
https://devapi.tech23.net/global/globalViewHandlerPagination?viewname=1539&page=1&pagesize=30&orderby1=CLIENT&sortby1=ASC&orderby2=FINALAMOUNT&sortby2=DESC&orgroup1col1=STATUS&orgroup1op1=eq&orgroup1val1=OPEN&orgroup1col2=STATUS&orgroup1op2=eq&orgroup1val2=PENDING&orgroup2col1=ROUTE&orgroup2op1=eq&orgroup2val1=DURBAN&orgroup2col2=ROUTE&orgroup2op2=eq&orgroup2val2=JHB
```

Builds:

```sql
... WHERE ([STATUS] = 'OPEN' OR [STATUS] = 'PENDING')
      AND ([ROUTE] = 'DURBAN' OR [ROUTE] = 'JHB')
    ORDER BY [CLIENT] ASC, [FINALAMOUNT] DESC
```

---

## Current limits

| Feature | Max |
|---|---|
| projection (`bringOnlyColumn`) | 20 |
| date ranges (`datecolumn`) | 4 |
| amount ranges (`amountcolumn`) | 4 |
| search columns (`searchcolumn`) | 10 |
| operator filters (`filtercolumn`) | 10 |
| distinct columns (`distinctColumn`) | 8 |
| group-by columns (`groupByColumn`) | 8 |
| aggregates (`aggfunc`/`aggcolumn`) | 10 |
| having conditions (`havingfunc`…) | 10 |
| sort columns (`orderby`/`orderbyN`) | 6 |
| OR groups (`orgroup{G}…`) | 4 |
| OR members per group | 6 |

Bump these in the handler's `MAX_*` constants at the top of the file.

---

## Not (yet) supported — heads-up

- **Joins** — reads one view only (build the join into the SQL view itself).

Everything else — pagination, **multi-column sort**, projection, exact match,
date/amount ranges, multi-search, all operators, **OR-group logic**, distinct dropdowns,
GROUP BY, aggregates, HAVING — is **live and tested**.

If you need cross-view joins, say so and they can be added the same way.
