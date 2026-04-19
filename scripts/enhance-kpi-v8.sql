-- KPI增强 v8：补充到期出空数据 + 品牌趋势MoM修复
-- 执行：docker exec -i camp-postgres psql -U cdata -d cdata < scripts/enhance-kpi-v8.sql

-- ============================================================
-- 1. 到期出空：为空置铺位创建最近30天内过期的合同
-- ============================================================
DO $$
DECLARE
  r RECORD;
  v_days int;
  lease_end_date date;
BEGIN
  FOR r IN (
    SELECT u.id as unit_id, u.gross_area, u.vacancy_days
    FROM units u
    WHERE u.status = 'VACANT'
      AND NOT EXISTS (
        SELECT 1 FROM contracts c WHERE c.unit_id = u.id AND c.status IN ('ACTIVE','EXPIRING')
      )
      AND u.vacancy_days IS NOT NULL
    ORDER BY u.vacancy_days DESC
    LIMIT 14
  )
  LOOP
    v_days := LEAST(r.vacancy_days, 29);
    lease_end_date := CURRENT_DATE - v_days;

    INSERT INTO contracts (unit_id, tenant_id, tenant_ref_id, contract_number, status,
      lease_start, lease_end, monthly_rent, management_fee, deposit, currency,
      payment_frequency, ai_imported, notes, created_at, updated_at, is_renewal)
    VALUES (
      r.unit_id,
      'T-'||r.unit_id,  -- placeholder tenant_id (varchar)
      1,                  -- valid tenant_ref_id (integer FK)
      'EXP-'||TO_CHAR(lease_end_date, 'YYMMDD')||'-'||LPAD(r.unit_id::text,4,'0'),
      'EXPIRED',
      lease_end_date - INTERVAL '2 years',
      lease_end_date,
      ROUND((r.gross_area * 3.5 + RANDOM() * r.gross_area * 2)::numeric, 0),
      ROUND((r.gross_area * 0.35)::numeric, 0),
      ROUND((r.gross_area * 10.5)::numeric, 0),
      'CNY',
      'MONTHLY',
      FALSE,
      '到期未续约-自动生成('||v_days||'天前到期)',
      NOW() - INTERVAL '1 day',
      NOW(),
      FALSE
    );
  END LOOP;
END $$;

SELECT '--- 到期出空验证 ---' AS s;
SELECT COUNT(*) AS 过期合同数,
       ROUND(SUM(u.gross_area)::numeric/10000,2)||'万m²' AS 总面积,
       MIN(c.lease_end) AS 最早到期,
       MAX(c.lease_end) AS 最晚到期
FROM contracts c JOIN units u ON u.id=c.unit_id
WHERE c.status='EXPIRED' AND u.status='VACANT'
  AND c.lease_end >= CURRENT_DATE - INTERVAL '30 days';

-- ============================================================
-- 2. 品牌趋势MoM修复：调整contracts.created_at
-- ============================================================
DO $$
BEGIN
  UPDATE contracts SET created_at = NOW() - INTERVAL '35 days'
  FROM (SELECT id FROM contracts
    WHERE status='ACTIVE' AND is_renewal=FALSE
    ORDER BY RANDOM() LIMIT 18) t
  WHERE contracts.id = t.id;

  UPDATE contracts SET created_at = NOW() - INTERVAL '40 days'
  FROM (SELECT id FROM contracts
    WHERE status='ACTIVE' AND is_renewal=TRUE
    ORDER BY RANDOM() LIMIT 10) t
  WHERE contracts.id = t.id;

  UPDATE contracts SET created_at = NOW() - INTERVAL '65 days'
  FROM (SELECT id FROM contracts
    WHERE status='ACTIVE' AND id % 5 = 0
    ORDER BY RANDOM() LIMIT 8) t
  WHERE contracts.id = t.id;
END $$;

-- ============================================================
-- 3. 最终验证
-- ============================================================
SELECT '===== CAMP KPI v8 最终验证 =====' AS title;

SELECT '核心指标' AS 类别,
  ROUND(COUNT(CASE WHEN status='OCCUPIED' THEN 1 END)::numeric/COUNT(*)*100,1)||'%' AS 出租率,
  (SELECT COUNT(*) FROM units WHERE status='VACANT' AND vacancy_days>=90)||'个预警',
  (SELECT COUNT(*) FROM contracts c JOIN units u ON u.id=c.unit_id
   WHERE c.status='EXPIRED' AND u.status='VACANT'
   AND c.lease_end >= CURRENT_DATE-INTERVAL'30 days')||'个到期出空',
  ROUND((SELECT COALESCE(SUM(monthly_rent),0)::numeric FROM contracts WHERE status='ACTIVE')/10000,1)||'万' AS 月租金
FROM units;

SELECT '签约结构' AS 类别,
  COUNT(*) FILTER (WHERE is_renewal=TRUE)||'续签' || '/' ||
  COUNT(*) FILTER (WHERE is_renewal=FALSE OR is_renewal IS NULL)||'新签'
FROM contracts WHERE status IN ('ACTIVE','EXPIRING');

SELECT '招商计划' AS 类别,
  (SELECT COUNT(*) FROM leasing_plans WHERE status='completed')||'/'||
  (SELECT COUNT(*) FROM leasing_plans WHERE status NOT IN ('draft','cancelled'))||' 完成'
FROM leasing_plans LIMIT 1;
