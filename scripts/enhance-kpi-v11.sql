-- enhance-kpi-v11.sql: P1 feature test data enhancement
-- Purpose: Ensure alerts and efficiency endpoints return meaningful data
-- Features covered:
--   1. Alert system: overdue plans, due-soon plans, long-vacant units, urgent expiring contracts
--   2. Efficiency table: is_renewal distribution, monthly signing activity

BEGIN;

-- 1. Make one leasing plan due within 3 days (triggers "due_soon_plan" critical alert)
UPDATE leasing_plans
SET due_date = CURRENT_DATE + INTERVAL '3 days',
    status = 'in_progress'
WHERE name LIKE '%品牌引入%' AND due_date > CURRENT_DATE + INTERVAL '10 days'
LIMIT 1;

-- 2. Make one leasing plan overdue (triggers "overdue_plan" critical alert)
UPDATE leasing_plans
SET due_date = CURRENT_DATE - INTERVAL '5 days',
    status = 'active'
WHERE name LIKE '%去化%' AND status = 'draft'
LIMIT 1;

-- 3. Set ~30% of active contracts as renewals (for efficiency table "renewed_this_month" column)
UPDATE contracts
SET is_renewal = true
WHERE id IN (
    SELECT id FROM contracts
    WHERE status = 'ACTIVE'
      AND is_renewal = false
    ORDER BY RANDOM()
    LIMIT (SELECT CAST(COUNT(*) * 0.30 AS INTEGER) FROM contracts WHERE status = 'ACTIVE')
);

-- 4. Adjust some contract lease_end dates to be within 7 days (urgent expiring alerts)
UPDATE contracts
SET lease_end = CURRENT_DATE + INTERVAL '5 days'
WHERE status = 'ACTIVE'
  AND lease_end > CURRENT_DATE + INTERVAL '30 days'
ORDER BY lease_end ASC
LIMIT 2;

-- 5. Ensure some contracts have created_at in current month (for efficiency table monthly activity)
UPDATE contracts
SET created_at = DATE_TRUNC('month', CURRENT_DATE) + (RANDOM() * 20)::INTEGER * INTERVAL '1 day'
WHERE status = 'ACTIVE'
  AND (created_at < DATE_TRUNC('month', CURRENT_DATE) OR created_at IS NULL)
LIMIT 10;

COMMIT;

-- Verification queries
SELECT '=== Alerts Data Check ===' AS info;
SELECT 'Overdue plans:' AS category, COUNT(*) AS count FROM leasing_plans WHERE due_date < CURRENT_DATE AND status NOT IN ('completed', 'cancelled')
UNION ALL
SELECT 'Due-soon (<=14d):', COUNT(*) FROM leasing_plans WHERE due_date BETWEEN CURRENT_DATE + INTERVAL '1 day' AND CURRENT_DATE + INTERVAL '14 days' AND status IN ('draft','active','in_progress')
UNION ALL
SELECT 'Long-vacant (>=90d):', COUNT(*) FROM units WHERE status = 'vacant' AND vacancy_days >= 90
UNION ALL
SELECT 'Urgent expiring (<=7d):', COUNT(*) FROM contracts WHERE status = 'ACTIVE' AND lease_end BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days';

SELECT '=== Efficiency Data Check ===' AS info;
SELECT 'Renewal contracts:', COUNT(*) FROM contracts WHERE is_renewal = true AND status = 'ACTIVE';
SELECT 'New-sign contracts:', COUNT(*) FROM contracts WHERE (is_renewal = false OR is_renewal IS NULL) AND status = 'ACTIVE';
SELECT 'This-month created:', COUNT(*) FROM contracts WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE);
